import { AIClient } from '../api/client';
import { saveChunks, saveDocument, getAllDocuments, deleteDocument } from '../knowledge-base/vectorStore';
import { chunkText } from '../knowledge-base/chunker';
import { embedChunks } from '../knowledge-base/embedder';
import { parsePDF } from '../knowledge-base/parser/pdfParser';
import { parseDOCX } from '../knowledge-base/parser/docxParser';
import { getSettings, saveSettings, addActionEntry, saveElementRecord, getElementMap, deleteElementRecord } from '../shared/utils/storage';
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
        // User-recorded selectors take priority over builtin ones
        const elementMap = [...userElements, ...builtinElements];
        const guide = await aiClient.askGuide(message.payload.query, context, elementMap);
        broadcast({ type: 'GUIDE_RESPONSE', payload: guide } as GuideResponseMessage);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'GUIDE_HIGHLIGHT',
            payload: { steps: guide.steps, activeStep: 1 },
          } as GuideHighlightMessage).catch(() => {});
        }
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

    case 'ELEMENT_CAPTURED': {
      const { label, selector, url } = message.payload;
      await saveElementRecord({
        id: `el_${Date.now()}`,
        label, selector, url,
        capturedAt: Date.now(),
      });
      sendResponse({ ok: true });
      // Notify side panel so UI refreshes
      broadcast({ type: 'ELEMENT_MAP_UPDATED' } as ExtensionMessage);
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
      const { instruction, stepNumber } = message.payload;
      try {
        const settings = await getSettings();
        if (!settings.anthropicApiKey) {
          broadcast({ type: 'VISION_LOCATE_RESPONSE', payload: { stepNumber, error: 'no_key' } } as ExtensionMessage);
          break;
        }
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) break;

        // Capture screenshot of the active tab
        const screenshotDataUrl = await chrome.tabs.captureVisibleTab(
          tab.windowId,
          { format: 'jpeg', quality: 85 }
        );

        // Get viewport dimensions from tab
        const viewportWidth = tab.width ?? 1280;
        const viewportHeight = tab.height ?? 800;

        aiClient.updateSettings(settings);
        const coords = await aiClient.locateByVision(
          screenshotDataUrl,
          instruction,
          viewportWidth,
          viewportHeight
        );

        if (coords) {
          broadcast({
            type: 'VISION_LOCATE_RESPONSE',
            payload: { stepNumber, x: coords.x, y: coords.y },
          } as ExtensionMessage);
        } else {
          broadcast({
            type: 'VISION_LOCATE_RESPONSE',
            payload: { stepNumber, error: 'not_found' },
          } as ExtensionMessage);
        }
      } catch (err) {
        broadcast({
          type: 'VISION_LOCATE_RESPONSE',
          payload: { stepNumber, error: err instanceof Error ? err.message : 'error' },
        } as ExtensionMessage);
      }
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
