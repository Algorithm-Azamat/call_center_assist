import { openDB, type IDBPDatabase } from 'idb';
import { IDB_CONFIG } from '../shared/constants';
import type { KBChunk, KBDocument } from '../shared/types';

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(IDB_CONFIG.DB_NAME, IDB_CONFIG.DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(IDB_CONFIG.DOCS_STORE)) {
        database.createObjectStore(IDB_CONFIG.DOCS_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(IDB_CONFIG.CHUNKS_STORE)) {
        const chunkStore = database.createObjectStore(IDB_CONFIG.CHUNKS_STORE, { keyPath: 'id' });
        chunkStore.createIndex('docId', 'docId');
      }
    },
  });
  return db;
}

// ─── Documents ───────────────────────────────────────────────────────────────
export async function saveDocument(doc: KBDocument): Promise<void> {
  const database = await getDB();
  await database.put(IDB_CONFIG.DOCS_STORE, doc);
}

export async function getAllDocuments(): Promise<KBDocument[]> {
  const database = await getDB();
  return database.getAll(IDB_CONFIG.DOCS_STORE);
}

export async function deleteDocument(docId: string): Promise<void> {
  const database = await getDB();
  const tx = database.transaction([IDB_CONFIG.DOCS_STORE, IDB_CONFIG.CHUNKS_STORE], 'readwrite');

  await tx.objectStore(IDB_CONFIG.DOCS_STORE).delete(docId);

  // Delete all chunks belonging to this document
  const chunkIndex = tx.objectStore(IDB_CONFIG.CHUNKS_STORE).index('docId');
  let cursor = await chunkIndex.openCursor(IDBKeyRange.only(docId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

// ─── Chunks ───────────────────────────────────────────────────────────────────
export async function saveChunks(chunks: KBChunk[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction(IDB_CONFIG.CHUNKS_STORE, 'readwrite');
  await Promise.all(chunks.map((chunk) => tx.store.put(chunk)));
  await tx.done;
}

export async function getAllChunks(): Promise<KBChunk[]> {
  const database = await getDB();
  return database.getAll(IDB_CONFIG.CHUNKS_STORE);
}

export async function getChunksByDocId(docId: string): Promise<KBChunk[]> {
  const database = await getDB();
  return database.getAllFromIndex(IDB_CONFIG.CHUNKS_STORE, 'docId', docId);
}
