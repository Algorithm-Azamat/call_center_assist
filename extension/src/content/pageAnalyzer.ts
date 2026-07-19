import type { PageContext, FormField, ButtonInfo, TableInfo } from '../shared/types';
import { AI_CONFIG } from '../shared/constants';
import { NAV_ITEM_SELECTOR, detectCRMFamily } from './siteMapLearner';

/**
 * Extracts a structured PageContext from the current DOM.
 */
export function extractPageContext(tabId: number): PageContext {
  return {
    url: window.location.href,
    title: document.title,
    visibleText: extractVisibleText(),
    forms: extractForms(),
    buttons: extractButtons(),
    tables: extractTables(),
    timestamp: Date.now(),
    tabId,
    crmFamily: detectCRMFamily(),
  };
}

// ─── Visible Text ────────────────────────────────────────────────────────────
function extractVisibleText(): string {
  // Clone body, remove scripts/styles/hidden elements
  const clone = document.body.cloneNode(true) as HTMLElement;

  // Remove noise elements
  const noiseSelectors = [
    'script', 'style', 'noscript', 'svg', 'canvas', 'iframe',
    '[aria-hidden="true"]', '.sr-only', '[hidden]',
  ];
  noiseSelectors.forEach((sel) => {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  });

  const raw = clone.innerText ?? clone.textContent ?? '';

  // Normalise whitespace and truncate
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, AI_CONFIG.MAX_VISIBLE_TEXT);
}

// ─── Forms ───────────────────────────────────────────────────────────────────
function extractForms(): FormField[] {
  const fields: FormField[] = [];
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
  );

  inputs.forEach((el) => {
    const label = findLabel(el);
    fields.push({
      label: label || el.getAttribute('placeholder') || el.name || '',
      type: (el as HTMLInputElement).type || el.tagName.toLowerCase(),
      name: el.name || el.id || '',
      placeholder: (el as HTMLInputElement).placeholder || '',
      value: el.value?.slice(0, 100) || '',
      required: el.required,
    });
  });

  return fields.slice(0, 20); // Cap at 20 fields
}

function findLabel(el: Element): string {
  const id = el.id;
  if (id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
    if (label) return label.textContent?.trim() ?? '';
  }
  const closest = el.closest('label');
  if (closest) return closest.textContent?.trim() ?? '';
  // Try aria-label
  return el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '';
}

// ─── Buttons ─────────────────────────────────────────────────────────────────
function extractButtons(): ButtonInfo[] {
  const buttons: ButtonInfo[] = [];
  const seen = new Set<string>();

  const push = (el: HTMLElement) => {
    const text = (el.textContent ?? el.getAttribute('value') ?? '').trim();
    if (!text || text.length > 80 || seen.has(text)) return; // Skip empty / giant / duplicate
    seen.add(text);
    buttons.push({
      text: text.slice(0, 60),
      type: (el as HTMLInputElement).type || el.tagName.toLowerCase(),
      id: el.id || '',
      className: el.className?.toString().slice(0, 80) || '',
    });
  };

  document.querySelectorAll<HTMLElement>(
    'button, input[type="submit"], input[type="button"], [role="button"], a[class*="btn"]'
  ).forEach(push);

  // Navigation links — discovered structurally (works on any CRM, no vendor classes)
  document.querySelectorAll<HTMLElement>(NAV_ITEM_SELECTOR).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return; // hidden nav templates
    push(el);
  });

  return buttons.slice(0, 30); // room for buttons + nav links
}

// ─── Tables ──────────────────────────────────────────────────────────────────
function extractTables(): TableInfo[] {
  const tables: TableInfo[] = [];
  document.querySelectorAll('table').forEach((table) => {
    const headers: string[] = [];
    table.querySelectorAll('th').forEach((th) => {
      headers.push(th.textContent?.trim() ?? '');
    });

    const rows = table.querySelectorAll('tbody tr');
    const sampleRow: string[] = [];
    if (rows.length > 0) {
      rows[0].querySelectorAll('td').forEach((td) => {
        sampleRow.push(td.textContent?.trim().slice(0, 50) ?? '');
      });
    }

    tables.push({
      headers: headers.slice(0, 10),
      rowCount: rows.length,
      sampleRow: sampleRow.slice(0, 10),
    });
  });

  return tables.slice(0, 5);
}
