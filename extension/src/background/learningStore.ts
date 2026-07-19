import { openDB, type IDBPDatabase } from 'idb';
import type { ElementRecord } from '../shared/types';

/**
 * Persistent learning database. Stores one profile per site origin, tagged
 * with a CRM product family — so a brand-new portal of a familiar CRM
 * (e.g. another *.bitrix24.ru) starts with knowledge from sibling portals.
 */

const DB_NAME = 'aoc-learning';
const DB_VERSION = 1;
const PROFILES_STORE = 'site_profiles';
const MAX_ELEMENTS = 80;

export interface SiteProfile {
  origin: string;            // e.g. https://mycompany.bitrix24.ru
  family: string;            // CRM product family, e.g. 'bitrix24'
  elements: ElementRecord[]; // learned navigation/UI elements
  visits: number;            // how many learn cycles contributed
  updatedAt: number;
}

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(PROFILES_STORE)) {
        const store = database.createObjectStore(PROFILES_STORE, { keyPath: 'origin' });
        store.createIndex('family', 'family');
      }
    },
  });
  return db;
}

/** Merge freshly scanned elements into the origin's profile. */
export async function upsertSiteProfile(
  origin: string,
  family: string,
  found: ElementRecord[]
): Promise<void> {
  const database = await getDB();
  const existing = (await database.get(PROFILES_STORE, origin)) as SiteProfile | undefined;
  const byLabel = new Map((existing?.elements ?? []).map((e) => [e.label, e]));
  const now = Date.now();

  for (const f of found) {
    const prev = byLabel.get(f.label);
    if (prev) {
      // Refresh: selectors drift when the site updates
      prev.selector = f.selector;
      prev.capturedAt = now;
    } else {
      byLabel.set(f.label, f);
    }
  }

  const profile: SiteProfile = {
    origin,
    family,
    // Most recently seen elements survive the cap
    elements: [...byLabel.values()].sort((a, b) => b.capturedAt - a.capturedAt).slice(0, MAX_ELEMENTS),
    visits: (existing?.visits ?? 0) + 1,
    updatedAt: now,
  };
  await database.put(PROFILES_STORE, profile);
}

/**
 * Familiar-CRM lookup: this origin's own knowledge first, then elements
 * learned on sibling portals of the same family (deduped by label).
 */
export async function getKnownElements(origin: string, family: string): Promise<ElementRecord[]> {
  const database = await getDB();
  const own = (await database.get(PROFILES_STORE, origin)) as SiteProfile | undefined;
  const siblings = (await database.getAllFromIndex(PROFILES_STORE, 'family', family)) as SiteProfile[];

  const byLabel = new Map<string, ElementRecord>();
  for (const el of own?.elements ?? []) byLabel.set(el.label, el);
  for (const sib of siblings) {
    if (sib.origin === origin) continue;
    for (const el of sib.elements) {
      if (!byLabel.has(el.label)) byLabel.set(el.label, el);
    }
  }
  return [...byLabel.values()];
}
