import type { KBChunk } from '../shared/types';
import { getAllChunks } from './vectorStore';
import { AI_CONFIG } from '../shared/constants';

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Search KB for the most relevant chunks given a query embedding.
 */
export async function searchKB(
  queryEmbedding: number[],
  topK = AI_CONFIG.MAX_KB_RESULTS
): Promise<KBChunk[]> {
  if (queryEmbedding.length === 0) return [];

  const allChunks = await getAllChunks();
  const chunksWithEmbeddings = allChunks.filter((c) => c.embedding && c.embedding.length > 0);

  if (chunksWithEmbeddings.length === 0) return [];

  const scored = chunksWithEmbeddings.map((chunk) => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding!),
  }));

  // Sort by similarity descending, return top K
  return scored
    .sort((a, b) => b.similarity! - a.similarity!)
    .slice(0, topK)
    .filter((c) => c.similarity! > 0.3); // Minimum relevance threshold
}

/**
 * Build a search query string from page context for embedding.
 */
export function buildSearchQuery(url: string, title: string, visibleText: string): string {
  const urlPath = new URL(url).pathname;
  const textSnippet = visibleText.slice(0, 300);
  return `${title} ${urlPath} ${textSnippet}`;
}
