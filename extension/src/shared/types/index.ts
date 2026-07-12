// ─── Page Context ──────────────────────────────────────────────────────────
export interface FormField {
  label: string;
  type: string;
  name: string;
  placeholder: string;
  value: string;
  required: boolean;
}

export interface ButtonInfo {
  text: string;
  type: string;
  id: string;
  className: string;
}

export interface TableInfo {
  headers: string[];
  rowCount: number;
  sampleRow: string[];
}

export interface PageContext {
  url: string;
  title: string;
  visibleText: string;      // truncated to 3000 chars
  forms: FormField[];
  buttons: ButtonInfo[];
  tables: TableInfo[];
  timestamp: number;
  tabId: number;
}

// ─── AI Response ───────────────────────────────────────────────────────────
export interface AIResponse {
  screenName: string;          // e.g. "Customer List", "Create Ticket"
  screenDescription: string;   // What this screen is for
  aiHint: string;              // Main contextual tip
  nextStep: string;            // Recommended next action
  nextStepDetails: string;     // Step-by-step breakdown
  confidence: number;          // 0–1
  relevantInstruction?: KBChunk; // Matched KB chunk (if any)
  timestamp: number;
}

// ─── Knowledge Base ────────────────────────────────────────────────────────
export interface KBDocument {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'docx';
  uploadedAt: number;
  chunkCount: number;
  totalTokens: number;
}

export interface KBChunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  tokenCount: number;
  chunkIndex: number;
  embedding?: number[];
  similarity?: number;        // populated at query time
}

// ─── Action History ────────────────────────────────────────────────────────
export interface ActionEntry {
  id: string;
  url: string;
  title: string;
  screenName: string;
  aiHint: string;
  timestamp: number;
}

// ─── Element Map (recorded selectors) ─────────────────────────────────────
export interface ElementRecord {
  id: string;
  label: string;       // Human name, e.g. "Создать сделку"
  selector: string;    // CSS selector captured from live page
  url: string;         // Page URL where it was captured
  capturedAt: number;
}

// ─── Settings ──────────────────────────────────────────────────────────────
export interface ExtensionSettings {
  openaiApiKey: string;
  anthropicApiKey: string;  // for Computer Use vision — cursor precision
  model: string;
  embeddingModel: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  debounceMs: number;
  enabled: boolean;
}

