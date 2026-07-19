import type { ElementRecord } from '../shared/types';
import { buildSelector } from './selectorBuilder';

/**
 * Auto-discovers the site's navigation structure as the user browses and
 * ships it to the background learning DB. The guide then uses these learned
 * selectors, so the extension adapts to any CRM (Bitrix24, amoCRM,
 * Freshdesk, …) without hardcoded vendor classes.
 */

// Structural signals only — no vendor-specific classes
export const NAV_ITEM_SELECTOR =
  'nav a[href], aside a[href], [role="navigation"] a[href], [role="menuitem"], ' +
  '[class*="menu"] a[href], [class*="sidebar"] a[href]';

const MAX_PER_SCAN = 100;
const LEARN_THROTTLE_MS = 30_000;
let lastLearnAt = 0;

/**
 * Identifies the CRM product family so knowledge transfers between portals
 * of the same product (portal-a.bitrix24.ru → portal-b.bitrix24.ru).
 * Unknown products fall back to their own hostname as a family of one.
 */
export function detectCRMFamily(): string {
  const host = window.location.hostname;
  if (/\.bitrix24\./.test(host) || document.querySelector('[class*="b24-"], .menu-item-link')) return 'bitrix24';
  if (/amocrm|kommo/.test(host)) return 'amocrm';
  if (/freshdesk|freshworks/.test(host)) return 'freshdesk';
  if (/zoho/.test(host)) return 'zoho';
  if (/hubspot/.test(host)) return 'hubspot';
  if (/salesforce|force\.com/.test(host)) return 'salesforce';
  return host;
}

function isVisible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function scanNavigation(): Omit<ElementRecord, 'id' | 'capturedAt'>[] {
  const seen = new Set<string>();
  const found: Omit<ElementRecord, 'id' | 'capturedAt'>[] = [];

  for (const el of document.querySelectorAll<HTMLElement>(NAV_ITEM_SELECTOR)) {
    if (found.length >= MAX_PER_SCAN) break;

    const label = el.textContent?.trim().replace(/\s+/g, ' ') ?? '';
    if (label.length < 2 || label.length > 40 || seen.has(label)) continue;
    if (!isVisible(el)) continue;

    // For links the href attribute is the most stable selector across reloads
    const href = el.getAttribute('href');
    const selector =
      href && href !== '#' && !href.startsWith('javascript:')
        ? `a[href="${href.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`
        : buildSelector(el);

    seen.add(label);
    found.push({ label, selector, url: window.location.origin });
  }

  return found;
}

/** Visible same-origin navigation URLs on this page — feed for the crawler. */
export function collectNavUrls(): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const el of document.querySelectorAll<HTMLElement>(NAV_ITEM_SELECTOR)) {
    const href = el.getAttribute('href');
    if (!href || href === '#' || /^(javascript:|mailto:|tel:)/.test(href)) continue;
    if (!isVisible(el)) continue;
    try {
      const abs = new URL(href, window.location.href);
      if (abs.origin !== window.location.origin) continue;
      const key = abs.pathname + abs.search;
      if (seen.has(key)) continue;
      seen.add(key);
      urls.push(abs.href);
    } catch { /* invalid href */ }
  }
  return urls;
}

/** Scan the page's navigation and ship findings to the learning DB. */
export function learnSiteMap(): void {
  const now = Date.now();
  if (now - lastLearnAt < LEARN_THROTTLE_MS) return;
  lastLearnAt = now;

  const found = scanNavigation();
  if (found.length === 0) return;

  chrome.runtime.sendMessage({
    type: 'SITE_MAP_LEARNED',
    payload: {
      origin: window.location.origin,
      family: detectCRMFamily(),
      elements: found.map((f, i) => ({ ...f, id: `learn_${now}_${i}`, capturedAt: now })),
    },
  }).catch(() => { /* background asleep — next cycle retries */ });
}
