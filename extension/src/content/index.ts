import { extractPageContext } from './pageAnalyzer';
import { DOMObserver } from './domObserver';
import { OverlayInjector } from './overlayInjector';
import type { ExtensionMessage, PageContextUpdateMessage } from '../shared/types/messages';
import { getSettings } from '../shared/utils/storage';

let observer: DOMObserver | null = null;
let tabId = -1;
const overlay = new OverlayInjector();

// ─── Capture mode ─────────────────────────────────────────────────────────────
let captureMode = false;
let captureLabel = '';
let captureHighlight: HTMLElement | null = null;
const CAPTURE_STYLE_ID = 'aoc-capture-style';
const CAPTURE_BANNER_ID = 'aoc-capture-banner';

function buildSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;

  // Try a stable data attribute
  for (const attr of ['data-id', 'data-name', 'name', 'aria-label']) {
    const val = el.getAttribute(attr);
    if (val) return `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(val)}"]`;
  }

  // Class-based: pick ui-btn / crm- / first stable-looking class
  const classes = Array.from(el.classList).filter(
    (c) => c.match(/^(ui-btn|crm-|b24-|bx-)/)
  );
  if (classes.length > 0) {
    return `${el.tagName.toLowerCase()}.${classes.slice(0, 2).map(CSS.escape).join('.')}`;
  }

  // nth-child fallback
  const parent = el.parentElement;
  if (parent) {
    const idx = Array.from(parent.children).indexOf(el) + 1;
    const parentSel = buildSelector(parent);
    return `${parentSel} > ${el.tagName.toLowerCase()}:nth-child(${idx})`;
  }

  return el.tagName.toLowerCase();
}

function injectCaptureStyles() {
  if (document.getElementById(CAPTURE_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = CAPTURE_STYLE_ID;
  s.textContent = `
    .aoc-capture-hover {
      outline: 2px dashed #f59e0b !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
    }
    #${CAPTURE_BANNER_ID} {
      position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
      background: #f59e0b; color: #1c1917;
      font: 600 13px/1 system-ui, sans-serif;
      padding: 10px 16px;
      text-align: center;
      pointer-events: none;
    }
  `;
  document.head.appendChild(s);
}

function startCapture(label: string) {
  captureMode = true;
  captureLabel = label;
  injectCaptureStyles();

  const banner = document.createElement('div');
  banner.id = CAPTURE_BANNER_ID;
  banner.textContent = `🎯 Режим записи: кликни на элемент "${label}"`;
  document.body.appendChild(banner);

  document.addEventListener('mouseover', onCaptureHover, true);
  document.addEventListener('click', onCaptureClick, true);
}

function stopCapture() {
  captureMode = false;
  captureLabel = '';
  document.removeEventListener('mouseover', onCaptureHover, true);
  document.removeEventListener('click', onCaptureClick, true);
  captureHighlight?.classList.remove('aoc-capture-hover');
  captureHighlight = null;
  document.getElementById(CAPTURE_BANNER_ID)?.remove();
}

function onCaptureHover(e: MouseEvent) {
  const el = e.target as Element;
  if (captureHighlight && captureHighlight !== el) {
    captureHighlight.classList.remove('aoc-capture-hover');
  }
  el.classList.add('aoc-capture-hover');
  captureHighlight = el as HTMLElement;
}

function onCaptureClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  const el = e.target as Element;
  const selector = buildSelector(el);

  chrome.runtime.sendMessage({
    type: 'ELEMENT_CAPTURED',
    payload: { label: captureLabel, selector, url: window.location.href },
  });

  stopCapture();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const response = await chrome.runtime.sendMessage<ExtensionMessage, { tabId: number }>({ type: 'PING' });
    if (response?.tabId) tabId = response.tabId;
  } catch { /* background not yet ready */ }

  const settings = await getSettings();
  if (!settings.enabled) return;

  observer = new DOMObserver(analyzeAndSend, settings.debounceMs);
  observer.start();
}

async function analyzeAndSend() {
  const settings = await getSettings();
  if (!settings.enabled) return;
  const context = extractPageContext(tabId);
  const msg: PageContextUpdateMessage = { type: 'PAGE_CONTEXT_UPDATE', payload: context };
  chrome.runtime.sendMessage(msg).catch(() => {});
}

// ─── Message listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  switch (message.type) {
    case 'GET_PAGE_CONTEXT':
      sendResponse({ type: 'PAGE_CONTEXT_RESPONSE', payload: extractPageContext(tabId) });
      return true;

    case 'SETTINGS_RESPONSE': {
      const settings = message.payload;
      if (!settings.enabled && observer) { observer.stop(); observer = null; }
      else if (settings.enabled && !observer) {
        observer = new DOMObserver(analyzeAndSend, settings.debounceMs);
        observer.start();
      }
      break;
    }

    case 'GUIDE_HIGHLIGHT':
      overlay.showSteps(message.payload.steps, message.payload.activeStep);
      break;

    case 'GUIDE_CLEAR':
      overlay.clearOverlays();
      break;

    case 'CAPTURE_MODE_START':
      startCapture(message.payload.label);
      sendResponse();
      break;

    case 'CAPTURE_MODE_STOP':
      stopCapture();
      sendResponse();
      break;
  }
});

init();
