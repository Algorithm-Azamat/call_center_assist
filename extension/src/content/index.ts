import { extractPageContext } from './pageAnalyzer';
import { DOMObserver } from './domObserver';
import { OverlayInjector } from './overlayInjector';
import { buildSelector } from './selectorBuilder';
import { learnSiteMap, collectNavUrls } from './siteMapLearner';
import type { ExtensionMessage, PageContextUpdateMessage } from '../shared/types/messages';
import { getSettings } from '../shared/utils/storage';

let observer: DOMObserver | null = null;
let tabId = -1;
let scrollSearchOrigin: number | null = null;
const overlay = new OverlayInjector();
// Auto-advance: notify the panel when the user clicks the step's target
overlay.onStepComplete = (stepNumber) => {
  chrome.runtime.sendMessage({ type: 'GUIDE_STEP_DONE', payload: { stepNumber } }).catch(() => {});
};

// ─── Capture mode ─────────────────────────────────────────────────────────────
let captureMode = false;
let captureLabel = '';
let captureCount = 0;
let captureHighlight: HTMLElement | null = null;
const CAPTURE_STYLE_ID = 'aoc-capture-style';
const CAPTURE_BANNER_ID = 'aoc-capture-banner';

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

// Auto-name an element from its own text when the user didn't type a label
function deriveLabel(el: Element): string {
  const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
  return (
    text.slice(0, 40) ||
    el.getAttribute('aria-label')?.slice(0, 40) ||
    el.getAttribute('title')?.slice(0, 40) ||
    (el as HTMLInputElement).value?.slice(0, 40) ||
    `${el.tagName.toLowerCase()}_${captureCount + 1}`
  );
}

function startCapture(label: string) {
  captureMode = true;
  captureLabel = label;
  captureCount = 0;
  injectCaptureStyles();

  const banner = document.createElement('div');
  banner.id = CAPTURE_BANNER_ID;
  banner.textContent = `🎯 Режим записи: кликай на элементы${label ? ` (первый: «${label}»)` : ''} · Esc — стоп`;
  document.body.appendChild(banner);

  document.addEventListener('mouseover', onCaptureHover, true);
  document.addEventListener('click', onCaptureClick, true);
  document.addEventListener('keydown', onCaptureKeydown, true);
}

function stopCapture() {
  captureMode = false;
  captureLabel = '';
  document.removeEventListener('mouseover', onCaptureHover, true);
  document.removeEventListener('click', onCaptureClick, true);
  document.removeEventListener('keydown', onCaptureKeydown, true);
  captureHighlight?.classList.remove('aoc-capture-hover');
  captureHighlight = null;
  document.getElementById(CAPTURE_BANNER_ID)?.remove();
}

function onCaptureKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  stopCapture();
  // Let the side panel reset its "recording" state
  chrome.runtime.sendMessage({ type: 'CAPTURE_MODE_STOPPED' }).catch(() => {});
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
  // No preventDefault/stopPropagation: the click performs normally (sliders/
  // windows open), so flows can be recorded across Bitrix24's SPA overlays
  const el = e.target as Element;
  const selector = buildSelector(el);
  // Typed name applies to the first click; further clicks auto-name themselves
  const label = captureLabel || deriveLabel(el);
  captureLabel = '';
  captureCount++;

  chrome.runtime.sendMessage({
    type: 'ELEMENT_CAPTURED',
    payload: { label, selector, url: window.location.href },
  }).catch(() => {});

  const banner = document.getElementById(CAPTURE_BANNER_ID);
  if (banner) banner.textContent = `🎯 Записано: ${captureCount} · кликай ещё · Esc — стоп`;
  // Keep capturing until the user stops (Esc or the panel's Стоп button)
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
  learnSiteMap(); // fire-and-forget: auto-discover this site's navigation
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

    case 'GET_NAV_LINKS':
      sendResponse({ links: collectNavUrls() });
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

    case 'VISION_LOCATE_RESPONSE': {
      const p = message.payload;
      if ('x' in p && 'y' in p) {
        // Find instruction for this step from current guide steps
        const step = overlay.getStep(p.stepNumber);
        overlay.flyToPageCoords(p.x, p.y, step?.instruction ?? '');
      } else {
        // CSS-fallback cursor stays in place; log so failures are diagnosable
        console.warn('[AOC] vision locate failed:', p.error);
      }
      break;
    }

    case 'GUIDE_CLEAR':
      overlay.clearOverlays();
      break;

    case 'GUIDE_SCROLL': {
      // Vision scroll-search: background steps the page down one viewport at a
      // time, screenshotting each position, until the element is found
      const { phase, restore } = message.payload;
      const atBottom = () =>
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (phase === 'begin') {
        scrollSearchOrigin = window.scrollY;
      } else if (phase === 'down') {
        window.scrollBy({ top: Math.round(window.innerHeight * 0.85), behavior: 'auto' });
      } else {
        if (restore && scrollSearchOrigin !== null) {
          window.scrollTo({ top: scrollSearchOrigin, behavior: 'auto' });
        }
        scrollSearchOrigin = null;
      }
      sendResponse({ atBottom: atBottom() });
      break;
    }

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
