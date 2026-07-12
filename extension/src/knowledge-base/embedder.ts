import type { KBChunk } from '../shared/types';
import { AIClient } from '../api/client';

export async function embedChunks(
  chunks: KBChunk[],
  client: AIClient,
  onProgress?: (done: number, total: number) => void
): Promise<KBChunk[]> {
  const results: KBChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const embedding = await client.createEmbedding(chunk.text);
      results.push({ ...chunk, embedding });
    } catch {
      // Skip failed chunks — they won't match in search but won't break the pipeline
      results.push(chunk);
    }
    onProgress?.(i + 1, chunks.length);
  }

  return results;
}
