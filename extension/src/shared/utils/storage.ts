import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../constants';
import type { ExtensionSettings, ActionEntry, ElementRecord } from '../types';

// ─── Settings ───────────────────────────────────────────────────────────────
export async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEYS.SETTINGS, (result) => {
      const saved = result[STORAGE_KEYS.SETTINGS] as Partial<ExtensionSettings> | undefined;
      resolve({ ...DEFAULT_SETTINGS, ...(saved ?? {}) });
    });
  });
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: merged }, resolve);
  });
}

// ─── Action History ─────────────────────────────────────────────────────────
export async function getActionHistory(): Promise<ActionEntry[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.ACTION_HISTORY, (result) => {
      resolve((result[STORAGE_KEYS.ACTION_HISTORY] as ActionEntry[]) ?? []);
    });
  });
}

export async function addActionEntry(entry: ActionEntry, maxItems = 50): Promise<void> {
  const history = await getActionHistory();
  const updated = [entry, ...history].slice(0, maxItems);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.ACTION_HISTORY]: updated }, resolve);
  });
}

export async function clearActionHistory(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(STORAGE_KEYS.ACTION_HISTORY, resolve);
  });
}

// ─── Element Map ────────────────────────────────────────────────────────────
export async function getElementMap(): Promise<ElementRecord[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.ELEMENT_MAP, (result) => {
      resolve((result[STORAGE_KEYS.ELEMENT_MAP] as ElementRecord[]) ?? []);
    });
  });
}

export async function saveElementRecord(record: ElementRecord): Promise<void> {
  const map = await getElementMap();
  // Replace existing record with same label+url, or append
  const idx = map.findIndex((r) => r.label === record.label && r.url === record.url);
  if (idx >= 0) map[idx] = record; else map.push(record);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.ELEMENT_MAP]: map }, resolve);
  });
}

export async function deleteElementRecord(id: string): Promise<void> {
  const map = await getElementMap();
  const filtered = map.filter((r) => r.id !== id);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.ELEMENT_MAP]: filtered }, resolve);
  });
}
