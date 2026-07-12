import type { ExtensionSettings } from './types';

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'aoc_settings',
  ACTION_HISTORY: 'aoc_action_history',
  KB_DOCUMENTS: 'aoc_kb_documents',
  ELEMENT_MAP: 'aoc_element_map',
} as const;

// IndexedDB config
export const IDB_CONFIG = {
  DB_NAME: 'ai-onboarding-copilot',
  DB_VERSION: 1,
  CHUNKS_STORE: 'kb_chunks',
  DOCS_STORE: 'kb_documents',
} as const;

// AI / Chunking config
export const AI_CONFIG = {
  CHUNK_SIZE_TOKENS: 512,
  CHUNK_OVERLAP_TOKENS: 50,
  MAX_KB_RESULTS: 3,
  MAX_VISIBLE_TEXT: 3000,
  MAX_HISTORY_ITEMS: 50,
  DEBOUNCE_MS: 3000,
} as const;

// Supported models
export const SUPPORTED_MODELS = [
  { id: 'gpt-4o-mini',   label: 'GPT-4o Mini (Fast & Cheap)' },
  { id: 'gpt-4o',        label: 'GPT-4o (Best Quality)' },
  { id: 'gpt-4-turbo',   label: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Legacy)' },
] as const;

export const SUPPORTED_EMBEDDING_MODELS = [
  { id: 'text-embedding-3-small', label: 'Embedding 3 Small (Recommended)' },
  { id: 'text-embedding-3-large', label: 'Embedding 3 Large (Higher Quality)' },
  { id: 'text-embedding-ada-002', label: 'Ada 002 (Legacy)' },
] as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  openaiApiKey: '',
  model: 'gpt-4o-mini',
  embeddingModel: 'text-embedding-3-small',
  baseUrl: 'https://api.openai.com/v1',
  maxTokens: 1024,
  temperature: 0.3,
  debounceMs: 3000,
  enabled: true,
};
