import { AI_CONFIG } from '../shared/constants';
import type { KBChunk } from '../shared/types';

/**
 * Splits text into overlapping chunks of approximately `chunkSize` tokens.
 * Uses a simple word-based approximation (1 token ≈ 0.75 words).
 */
export function chunkText(
  text: string,
  docId: string,
  docName: string,
  chunkSize = AI_CONFIG.CHUNK_SIZE_TOKENS,
  overlap = AI_CONFIG.CHUNK_OVERLAP_TOKENS
): KBChunk[] {
  // Rough token estimate: 1 token ≈ 0.75 words
  const wordsPerChunk = Math.floor(chunkSize * 0.75);
  const wordsOverlap = Math.floor(overlap * 0.75);

  // Split into sentences first for more coherent chunks
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: KBChunk[] = [];
  let currentWords: string[] = [];
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/);
    currentWords.push(...sentenceWords);

    if (currentWords.length >= wordsPerChunk) {
      const chunkText = currentWords.join(' ');
      const tokenCount = Math.ceil(currentWords.length / 0.75);

      chunks.push({
        id: `${docId}_chunk_${chunkIndex}`,
        docId,
        docName,
        text: chunkText,
        tokenCount,
        chunkIndex,
      });

      chunkIndex++;
      // Keep overlap words for context continuity
      currentWords = currentWords.slice(-wordsOverlap);
    }
  }

  // Push remaining words as last chunk
  if (currentWords.length > 0) {
    chunks.push({
      id: `${docId}_chunk_${chunkIndex}`,
      docId,
      docName,
      text: currentWords.join(' '),
      tokenCount: Math.ceil(currentWords.length / 0.75),
      chunkIndex,
    });
  }

  return chunks;
}
