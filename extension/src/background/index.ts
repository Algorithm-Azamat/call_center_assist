import { AIClient } from '../api/client';
import { saveChunks, saveDocument, getAllDocuments, deleteDocument } from '../knowledge-base/vectorStore';
import { chunkText } from '../knowledge-base/chunker';
import { embedChunks } from '../knowledge-base/embedder';
import { parsePDF } from '../knowledge-base/parser/pdfParser';
import { parseDOCX } from '../knowledge-base/parser/docxParser';
import { getSettings, saveSettings, addActionEntry, saveElementRecord, getElementMap, deleteElementRecord } from '../shared/utils/storage';
import { upsertSiteProfile, getKnownElements } from './learningStore';
import { getRelevantElements } from '../shared/bitrix24Map';
import { searchKB, buildSearchQuery } from '../knowledge-base/searcher';
import { DEFAULT_SETTINGS } from '../shared/constants';
import type {
  ExtensionMessage,
  AIResponseMessage,
  AILoadingMessage,
  AIErrorMessage,
  KBUploadProgressMessage,
  KBUploadCompleteMessage,
  KBUploadErrorMessage,
  KBListResponseMessage,
  KBDeleteResponseMessage,
  SettingsResponseMessage,
  GuideResponseMessage,
  GuideLoadingMessage,
  GuideErrorMessage,
  GuideHighlightMessage,
  VisionLocateResponseMessage,
} from '../shared/types/messages';
import type { KBChunk, KBDocument, PageContext } from '../shared/types';

const aiClient = new AIClient(DEFAULT_SETTINGS);

let lastContext: PageContext | null = null;
let isProcessing = false;
let lastCallTime = 0;
let debounceMs = DEFAULT_SETTINGS.debounceMs;
let sidePanelPort: chrome.runtime.Port | null = null;

async function init() {
  const settings = await getSettings();
  aiClient.updateSettings(settings);
  debounceMs = settings.debounceMs;
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

  // Restore last context from session storage (survives SW sleep cycles)
  const session = await chrome.storage.session.get('lastContext').catch(() => ({ lastContext: null }));
  if (session['lastContext']) lastContext = session['lastContext'] as PageContext;
}
init();

function saveContextToSession(ctx: PageContext) {
  chrome.storage.session.set({ lastContext: ctx }).catch(() => {});
}

// ─── Side panel port ──────────────────────────────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'sidepanel') return;
  sidePanelPort = port;
  if (lastContext) runAnalysis(lastContext);
  port.onDisconnect.addListener(() => { sidePanelPort = null; });
});

// ─── Broadcast helper ─────────────────────────────────────────────────────────
function broadcast(message: ExtensionMessage) {
  if (sidePanelPort) {
    try { sidePanelPort.postMessage(message); return; } catch { sidePanelPort = null; }
  }
  chrome.runtime.sendMessage(message).catch(() => {});
}

// ─── Get context from active tab (fallback when SW woke up cold) ──────────────
async function getContextFromTab(): Promise<PageContext | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT' });
    return resp?.payload ?? null;
  } catch {
    return null;
  }
}

// ─── Core analysis ────────────────────────────────────────────────────────────
async function runAnalysis(context: PageContext) {
  if (isProcessing) return;
  isProcessing = true;
  lastCallTime = Date.now();
  broadcast({ type: 'AI_LOADING', payload: { loading: true } } as AILoadingMessage);
  try {
    const settings = await getSettings();
    aiClient.updateSettings(settings);

    let kbChunks: KBChunk[] = [];
    try {
      const query = buildSearchQuery(context.url, context.title, context.visibleText);
      const embedding = await aiClient.createEmbedding(query);
      kbChunks = await searchKB(embedding);
    } catch { /* KB is optional */ }

    const aiResponse = await aiClient.analyzePageContext(context, kbChunks);

    await addActionEntry({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url: context.url,
      title: context.title,
      screenName: aiResponse.screenName,
      aiHint: aiResponse.aiHint,
      timestamp: aiResponse.timestamp,
    });

    broadcast({ type: 'AI_RESPONSE', payload: aiResponse } as AIResponseMessage);
  } catch (err) {
    broadcast({ type: 'AI_ERROR', payload: { error: err instanceof Error ? err.message : String(err) } } as AIErrorMessage);
  } finally {
    isProcessing = false;
    broadcast({ type: 'AI_LOADING', payload: { loading: false } } as AILoadingMessage);
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (r?: unknown) => void
) {
  switch (message.type) {
    case 'PING':
      sendResponse({ tabId: sender.tab?.id ?? -1 });
      break;

    case 'PAGE_CONTEXT_UPDATE': {
      // Crawler tab: learning arrives via SITE_MAP_LEARNED — skip AI analysis
      // and don't clobber the user's active-tab context
      if (sender.tab?.id !== undefined && sender.tab.id === crawlerTabId) {
        sendResponse();
        break;
      }
      lastContext = message.payload;
      saveContextToSession(lastContext);
      const canCall = Date.now() - lastCallTime >= debounceMs;
      if (!isProcessing && canCall) await runAnalysis(message.payload);
      sendResponse();
      break;
    }

    case 'REQUEST_ANALYSIS': {
      sendResponse();
      try {
        const ctx = lastContext ?? await getContextFromTab();
        if (ctx) await runAnalysis(ctx);
      } catch { /* silently ignore — SW may wake cold */ }
      break;
    }

    case 'SETTINGS_GET': {
      const settings = await getSettings();
      sendResponse({ type: 'SETTINGS_RESPONSE', payload: settings } as SettingsResponseMessage);
      break;
    }

    case 'SETTINGS_SET': {
      await saveSettings(message.payload);
      const updated = await getSettings();
      aiClient.updateSettings(updated);
      debounceMs = updated.debounceMs;
      sendResponse({ type: 'SETTINGS_RESPONSE', payload: updated } as SettingsResponseMessage);
      break;
    }

    case 'GUIDE_REQUEST': {
      sendResponse();
      broadcast({ type: 'GUIDE_LOADING', payload: { loading: true } } as GuideLoadingMessage);
      try {
        const context = lastContext ?? await getContextFromTab();
        if (!context) {
          broadcast({ type: 'GUIDE_ERROR', payload: { error: 'Перезагрузи страницу (F5) и попробуй снова — расширение ещё не видит её содержимое.' } } as GuideErrorMessage);
          return;
        }
        const settings = await getSettings();
        aiClient.updateSettings(settings);
        const userElements = await getElementMap();
        const builtinElements = getRelevantElements(context.url);
        // Learning DB: this portal's knowledge + sibling portals of the same CRM family
        let learnedElements: Awaited<ReturnType<typeof getKnownElements>> = [];
        try {
          const origin = new URL(context.url).origin;
          learnedElements = await getKnownElements(origin, context.crmFamily ?? origin);
        } catch { /* invalid URL or DB unavailable */ }
        // Priority: user-recorded → learned → builtin Bitrix24 seed
        const elementMap = [...userElements, ...learnedElements.slice(0, 40), ...builtinElements];
        const guide = await aiClient.askGuide(message.payload.query, context, elementMap);
        broadcast({ type: 'GUIDE_RESPONSE', payload: guide } as GuideResponseMessage);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'GUIDE_HIGHLIGHT',
            payload: { steps: guide.steps, activeStep: 1 },
          } as GuideHighlightMessage).catch(() => {});
        }
        // Kick off vision precision for step 1 right away — previously it only
        // ran when the user clicked a step in the panel
        const firstStep = guide.steps[0];
        if (firstStep) void visionLocate(firstStep.instruction, firstStep.stepNumber);
      } catch (err) {
        broadcast({ type: 'GUIDE_ERROR', payload: { error: err instanceof Error ? err.message : String(err) } } as GuideErrorMessage);
      } finally {
        broadcast({ type: 'GUIDE_LOADING', payload: { loading: false } } as GuideLoadingMessage);
      }
      break;
    }

    case 'GUIDE_CLEAR': {
      sendResponse();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'GUIDE_CLEAR' }).catch(() => {});
      break;
    }

    case 'CAPTURE_MODE_START': {
      sendResponse();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      break;
    }

    case 'CAPTURE_MODE_STOP': {
      sendResponse();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_MODE_STOP' }).catch(() => {});
      break;
    }

    case 'CRAWL_START': {
      sendResponse({ ok: true });
      void crawlPortal();
      break;
    }

    case 'CRAWL_STOP': {
      crawlStopRequested = true;
      sendResponse({ ok: true });
      break;
    }

    case 'SITE_MAP_LEARNED': {
      const { origin, family, elements } = message.payload;
      await upsertSiteProfile(origin, family, elements).catch(() => { /* DB unavailable */ });
      sendResponse({ ok: true });
      break;
    }

    case 'ELEMENT_CAPTURED': {
      const { label, selector, url } = message.payload;
      await saveElementRecord({
        id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        label, selector, url,
        capturedAt: Date.now(),
      });
      sendResponse({ ok: true });
      // Notify side panel so UI refreshes. NB: direct runtime.sendMessage —
      // the port-based broadcast() never reaches component-level listeners.
      chrome.runtime.sendMessage({ type: 'ELEMENT_MAP_UPDATED' } as ExtensionMessage).catch(() => {});
      break;
    }

    case 'ELEMENT_MAP_REQUEST': {
      const elements = await getElementMap();
      sendResponse({ type: 'ELEMENT_MAP_RESPONSE', payload: { elements } });
      break;
    }

    case 'ELEMENT_DELETE_REQUEST': {
      await deleteElementRecord(message.payload.id);
      sendResponse({ ok: true });
      break;
    }

    case 'VISION_LOCATE_REQUEST': {
      sendResponse();
      await visionLocate(message.payload.instruction, message.payload.stepNumber);
      break;
    }

    case 'KB_UPLOAD_START': {
      const { fileName, fileType, fileData } = message.payload;
      processKBUpload(fileName, fileType, fileData);
      sendResponse({ ok: true });
      break;
    }

    case 'KB_LIST_REQUEST': {
      const documents = await getAllDocuments();
      sendResponse({ type: 'KB_LIST_RESPONSE', payload: { documents } } as KBListResponseMessage);
      break;
    }

    case 'KB_DELETE_REQUEST': {
      await deleteDocument(message.payload.docId);
      sendResponse({ type: 'KB_DELETE_RESPONSE', payload: { success: true, docId: message.payload.docId } } as KBDeleteResponseMessage);
      break;
    }
  }
}

// ─── Vision locate: screenshot → gpt-4o → coords to the TAB's content script ──
// NB: the response must go via chrome.tabs.sendMessage — broadcast() delivers to
// the side panel, and chrome.runtime.sendMessage never reaches content scripts.
// If the element isn't in the current view, scrolls down one viewport at a time
// (up to MAX_SCROLL_ATTEMPTS screenshots) before giving up.
const SCROLL_SETTLE_MS = 600; // lets smooth-scroll/render finish; also respects captureVisibleTab rate limit
const MAX_SCROLL_ATTEMPTS = 3; // current view + 2 scrolled positions

async function visionLocate(instruction: string, stepNumber: number) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const tabId = tab.id;
  const sendToTab = (payload: VisionLocateResponseMessage['payload']) =>
    chrome.tabs.sendMessage(tabId, { type: 'VISION_LOCATE_RESPONSE', payload } as VisionLocateResponseMessage).catch(() => {});
  const scrollTab = (payload: { phase: 'begin' | 'down' | 'end'; restore?: boolean }) =>
    chrome.tabs.sendMessage(tabId, { type: 'GUIDE_SCROLL', payload })
      .then((r) => r as { atBottom?: boolean } | undefined)
      .catch(() => undefined);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  try {
    const settings = await getSettings();
    if (!settings.openaiApiKey) {
      sendToTab({ stepNumber, error: 'no_key' });
      return;
    }
    aiClient.updateSettings(settings);

    // Viewport dimensions in CSS px — the coordinate space the overlay uses
    const viewportWidth = tab.width ?? 1280;
    const viewportHeight = tab.height ?? 800;

    const begin = await scrollTab({ phase: 'begin' });
    let atBottom = begin?.atBottom ?? true; // content unreachable → don't scroll
    let coords: { x: number; y: number } | null = null;

    for (let attempt = 0; attempt < MAX_SCROLL_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        if (atBottom) break;
        const resp = await scrollTab({ phase: 'down' });
        if (!resp) break;
        atBottom = resp.atBottom ?? true;
      }
      await sleep(SCROLL_SETTLE_MS); // settle scroll/animations before screenshot
      const screenshotDataUrl = await chrome.tabs.captureVisibleTab(
        tab.windowId,
        { format: 'jpeg', quality: 85 }
      );
      coords = await aiClient.locateByVision(screenshotDataUrl, instruction, viewportWidth, viewportHeight);
      if (coords) break;
    }

    // Found: keep the scroll position (element is on screen). Not found: restore.
    await scrollTab({ phase: 'end', restore: !coords });

    if (coords) {
      sendToTab({ stepNumber, x: coords.x, y: coords.y });
    } else {
      sendToTab({ stepNumber, error: 'not_found' });
    }
  } catch (err) {
    sendToTab({ stepNumber, error: err instanceof Error ? err.message : 'error' });
  }
}

// ─── Portal crawler ───────────────────────────────────────────────────────────
// Read-only exploration: opens ONE background tab and walks it through the
// portal's nav links. Each page's content script scans + learns automatically
// (SITE_MAP_LEARNED); AI analysis is suppressed for this tab — zero API cost.
let crawlerTabId: number | null = null;
let crawlStopRequested = false;
const CRAWL_MAX_PAGES = 12;
const CRAWL_RENDER_MS = 2500;   // SPA render settle after 'complete'
const CRAWL_SKIP = /logout|signout|exit=|auth\/|login|delete|remove|\.(pdf|zip|docx?)($|\?)/i;

function crawlNotify(msg: ExtensionMessage) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function waitForTabComplete(tabId: number, timeoutMs = 12000): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { cleanup(); resolve(); }, timeoutMs);
    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete') { cleanup(); resolve(); }
    };
    const cleanup = () => { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function crawlPortal() {
  if (crawlerTabId !== null) return; // already crawling
  crawlStopRequested = false;
  let scanned = 0;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id || !activeTab.url?.startsWith('http')) {
      crawlNotify({ type: 'CRAWL_ERROR', payload: { error: 'Открой портал в активной вкладке и попробуй снова' } } as ExtensionMessage);
      return;
    }
    const origin = new URL(activeTab.url).origin;

    // Collect candidate URLs: live nav links + href-selectors from the learning DB
    const candidates: string[] = [];
    try {
      const resp = await chrome.tabs.sendMessage(activeTab.id, { type: 'GET_NAV_LINKS' });
      candidates.push(...(resp?.links ?? []));
    } catch { /* content script not ready */ }
    try {
      const learned = await getKnownElements(origin, lastContext?.crmFamily ?? origin);
      for (const el of learned) {
        const m = el.selector.match(/^a\[href="(.+)"\]$/);
        if (m) {
          try { candidates.push(new URL(m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'), origin).href); } catch { /* bad href */ }
        }
      }
    } catch { /* DB unavailable */ }

    const seen = new Set<string>();
    const urls = candidates.filter((u) => {
      try {
        const url = new URL(u);
        if (url.origin !== origin || CRAWL_SKIP.test(u)) return false;
        const key = url.pathname + url.search;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      } catch { return false; }
    }).slice(0, CRAWL_MAX_PAGES);

    if (urls.length === 0) {
      crawlNotify({ type: 'CRAWL_ERROR', payload: { error: 'Не нашёл ссылок для изучения — открой главную страницу портала' } } as ExtensionMessage);
      return;
    }

    const tab = await chrome.tabs.create({ url: urls[0], active: false });
    if (tab.id === undefined) return;
    crawlerTabId = tab.id;

    for (let i = 0; i < urls.length; i++) {
      if (crawlStopRequested) break;
      crawlNotify({ type: 'CRAWL_PROGRESS', payload: { done: i + 1, total: urls.length, url: urls[i] } } as ExtensionMessage);
      if (i > 0) await chrome.tabs.update(crawlerTabId, { url: urls[i] });
      await waitForTabComplete(crawlerTabId);
      await new Promise((r) => setTimeout(r, CRAWL_RENDER_MS));
      scanned++;
    }

    crawlNotify({ type: 'CRAWL_COMPLETE', payload: { pages: scanned, stopped: crawlStopRequested } } as ExtensionMessage);
  } catch (err) {
    crawlNotify({ type: 'CRAWL_ERROR', payload: { error: err instanceof Error ? err.message : String(err) } } as ExtensionMessage);
  } finally {
    if (crawlerTabId !== null) chrome.tabs.remove(crawlerTabId).catch(() => {});
    crawlerTabId = null;
  }
}

// ─── KB upload pipeline ───────────────────────────────────────────────────────
async function processKBUpload(fileName: string, fileType: 'pdf' | 'docx', fileData: string) {
  const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const prog = (p: number, stage: string) =>
    broadcast({ type: 'KB_UPLOAD_PROGRESS', payload: { fileName, progress: p, stage } } as KBUploadProgressMessage);

  try {
    prog(10, 'Extracting text...');
    const rawText = fileType === 'pdf' ? await parsePDF(fileData) : await parseDOCX(fileData);

    prog(40, 'Splitting into chunks...');
    const chunks = chunkText(rawText, docId, fileName);

    prog(60, `Creating embeddings for ${chunks.length} chunks...`);
    const settings = await getSettings();
    aiClient.updateSettings(settings);
    const embeddedChunks = await embedChunks(chunks, aiClient, (done, total) => {
      if (done % 5 === 0) prog(60 + Math.floor((done / total) * 30), `Embedding ${done}/${total}...`);
    });

    prog(95, 'Saving to database...');
    await saveChunks(embeddedChunks);

    const doc: KBDocument = {
      id: docId, fileName, fileType,
      uploadedAt: Date.now(),
      chunkCount: chunks.length,
      totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
    };
    await saveDocument(doc);
    broadcast({ type: 'KB_UPLOAD_COMPLETE', payload: { document: doc } } as KBUploadCompleteMessage);

  } catch (err) {
    broadcast({ type: 'KB_UPLOAD_ERROR', payload: { error: err instanceof Error ? err.message : String(err) } } as KBUploadErrorMessage);
  }
}
