import type { PageContext, AIResponse, KBChunk, KBDocument, ExtensionSettings } from './index';
import type { GuideResponse, GuideStep } from './guide';

// ─── Message Types (chrome.runtime) ────────────────────────────────────────

export type MessageType =
  | 'PAGE_CONTEXT_UPDATE'
  | 'REQUEST_ANALYSIS'
  | 'AI_RESPONSE'
  | 'AI_LOADING'
  | 'AI_ERROR'
  | 'KB_UPLOAD_START'
  | 'KB_UPLOAD_PROGRESS'
  | 'KB_UPLOAD_COMPLETE'
  | 'KB_UPLOAD_ERROR'
  | 'KB_LIST_REQUEST'
  | 'KB_LIST_RESPONSE'
  | 'KB_DELETE_REQUEST'
  | 'KB_DELETE_RESPONSE'
  | 'SETTINGS_GET'
  | 'SETTINGS_SET'
  | 'SETTINGS_RESPONSE'
  | 'OPEN_SIDE_PANEL'
  | 'PING'
  | 'GUIDE_REQUEST'
  | 'GUIDE_RESPONSE'
  | 'GUIDE_LOADING'
  | 'GUIDE_ERROR'
  | 'GUIDE_HIGHLIGHT'
  | 'GUIDE_CLEAR'
  | 'GUIDE_SCROLL'
  | 'GUIDE_STEP_DONE'
  | 'GET_PAGE_CONTEXT'
  | 'PAGE_CONTEXT_RESPONSE'
  | 'VISION_LOCATE_REQUEST'
  | 'VISION_LOCATE_RESPONSE'
  | 'CAPTURE_MODE_START'
  | 'CAPTURE_MODE_STOP'
  | 'CAPTURE_MODE_STOPPED'
  | 'ELEMENT_CAPTURED'
  | 'SITE_MAP_LEARNED'
  | 'ELEMENT_MAP_REQUEST'
  | 'ELEMENT_MAP_RESPONSE'
  | 'ELEMENT_MAP_UPDATED'
  | 'ELEMENT_DELETE_REQUEST'
  | 'GET_NAV_LINKS'
  | 'CRAWL_START'
  | 'CRAWL_STOP'
  | 'CRAWL_PROGRESS'
  | 'CRAWL_COMPLETE'
  | 'CRAWL_ERROR';

export interface BaseMessage {
  type: MessageType;
}

export interface PageContextUpdateMessage extends BaseMessage {
  type: 'PAGE_CONTEXT_UPDATE';
  payload: PageContext;
}

export interface AIResponseMessage extends BaseMessage {
  type: 'AI_RESPONSE';
  payload: AIResponse;
}

export interface AILoadingMessage extends BaseMessage {
  type: 'AI_LOADING';
  payload: { loading: boolean };
}

export interface AIErrorMessage extends BaseMessage {
  type: 'AI_ERROR';
  payload: { error: string };
}

export interface KBUploadStartMessage extends BaseMessage {
  type: 'KB_UPLOAD_START';
  payload: { fileName: string; fileType: 'pdf' | 'docx'; fileData: string }; // base64
}

export interface KBUploadProgressMessage extends BaseMessage {
  type: 'KB_UPLOAD_PROGRESS';
  payload: { fileName: string; progress: number; stage: string };
}

export interface KBUploadCompleteMessage extends BaseMessage {
  type: 'KB_UPLOAD_COMPLETE';
  payload: { document: KBDocument };
}

export interface KBUploadErrorMessage extends BaseMessage {
  type: 'KB_UPLOAD_ERROR';
  payload: { error: string };
}

export interface KBListRequestMessage extends BaseMessage {
  type: 'KB_LIST_REQUEST';
}

export interface KBListResponseMessage extends BaseMessage {
  type: 'KB_LIST_RESPONSE';
  payload: { documents: KBDocument[] };
}

export interface KBDeleteRequestMessage extends BaseMessage {
  type: 'KB_DELETE_REQUEST';
  payload: { docId: string };
}

export interface KBDeleteResponseMessage extends BaseMessage {
  type: 'KB_DELETE_RESPONSE';
  payload: { success: boolean; docId: string };
}

export interface SettingsGetMessage extends BaseMessage {
  type: 'SETTINGS_GET';
}

export interface SettingsSetMessage extends BaseMessage {
  type: 'SETTINGS_SET';
  payload: Partial<ExtensionSettings>;
}

export interface SettingsResponseMessage extends BaseMessage {
  type: 'SETTINGS_RESPONSE';
  payload: ExtensionSettings;
}

export interface OpenSidePanelMessage extends BaseMessage {
  type: 'OPEN_SIDE_PANEL';
}

export interface PingMessage extends BaseMessage {
  type: 'PING';
}

export interface RequestAnalysisMessage extends BaseMessage {
  type: 'REQUEST_ANALYSIS';
}

export interface GuideRequestMessage extends BaseMessage {
  type: 'GUIDE_REQUEST';
  payload: { query: string };
}

export interface GuideResponseMessage extends BaseMessage {
  type: 'GUIDE_RESPONSE';
  payload: GuideResponse;
}

export interface GuideLoadingMessage extends BaseMessage {
  type: 'GUIDE_LOADING';
  payload: { loading: boolean };
}

export interface GuideErrorMessage extends BaseMessage {
  type: 'GUIDE_ERROR';
  payload: { error: string };
}

// Sent from background → content script to draw overlays
export interface GuideHighlightMessage extends BaseMessage {
  type: 'GUIDE_HIGHLIGHT';
  payload: { steps: GuideStep[]; activeStep: number };
}

export interface GuideClearMessage extends BaseMessage {
  type: 'GUIDE_CLEAR';
}

// Background → content: step the page during vision scroll-search.
// Response: { atBottom: boolean }
export interface GuideScrollMessage extends BaseMessage {
  type: 'GUIDE_SCROLL';
  payload: { phase: 'begin' | 'down' | 'end'; restore?: boolean };
}

// Content → panel: the user actually clicked the step's target on the page
export interface GuideStepDoneMessage extends BaseMessage {
  type: 'GUIDE_STEP_DONE';
  payload: { stepNumber: number };
}

// ─── Portal crawler ────────────────────────────────────────────────────────
// Background → content: list this page's nav URLs. Response: { links: string[] }
export interface GetNavLinksMessage extends BaseMessage {
  type: 'GET_NAV_LINKS';
}

export interface CrawlStartMessage extends BaseMessage {
  type: 'CRAWL_START';
}

export interface CrawlStopMessage extends BaseMessage {
  type: 'CRAWL_STOP';
}

export interface CrawlProgressMessage extends BaseMessage {
  type: 'CRAWL_PROGRESS';
  payload: { done: number; total: number; url: string };
}

export interface CrawlCompleteMessage extends BaseMessage {
  type: 'CRAWL_COMPLETE';
  payload: { pages: number; stopped: boolean };
}

export interface CrawlErrorMessage extends BaseMessage {
  type: 'CRAWL_ERROR';
  payload: { error: string };
}

export interface CaptureModeStartMessage extends BaseMessage {
  type: 'CAPTURE_MODE_START';
  payload: { label: string };
}

export interface CaptureModeStopMessage extends BaseMessage {
  type: 'CAPTURE_MODE_STOP';
}

// Sent content → panel when capture ended on the page side (Esc key)
export interface CaptureModeStoppedMessage extends BaseMessage {
  type: 'CAPTURE_MODE_STOPPED';
}

// Sent content → background after user clicks an element in capture mode
export interface ElementCapturedMessage extends BaseMessage {
  type: 'ELEMENT_CAPTURED';
  payload: { label: string; selector: string; url: string };
}

// Sent content → background with auto-discovered navigation for the learning DB
export interface SiteMapLearnedMessage extends BaseMessage {
  type: 'SITE_MAP_LEARNED';
  payload: { origin: string; family: string; elements: import('./index').ElementRecord[] };
}

export interface ElementMapRequestMessage extends BaseMessage {
  type: 'ELEMENT_MAP_REQUEST';
}

export interface ElementMapResponseMessage extends BaseMessage {
  type: 'ELEMENT_MAP_RESPONSE';
  payload: { elements: import('./index').ElementRecord[] };
}

export interface ElementMapUpdatedMessage extends BaseMessage {
  type: 'ELEMENT_MAP_UPDATED';
}

export interface ElementDeleteRequestMessage extends BaseMessage {
  type: 'ELEMENT_DELETE_REQUEST';
  payload: { id: string };
}

export interface VisionLocateRequestMessage extends BaseMessage {
  type: 'VISION_LOCATE_REQUEST';
  payload: { instruction: string; stepNumber: number };
}

export interface VisionLocateResponseMessage extends BaseMessage {
  type: 'VISION_LOCATE_RESPONSE';
  payload: { stepNumber: number; x: number; y: number } | { stepNumber: number; error: string };
}

export interface GetPageContextMessage extends BaseMessage {
  type: 'GET_PAGE_CONTEXT';
}

export interface PageContextResponseMessage extends BaseMessage {
  type: 'PAGE_CONTEXT_RESPONSE';
  payload: PageContext;
}

export type ExtensionMessage =
  | PageContextUpdateMessage
  | AIResponseMessage
  | AILoadingMessage
  | AIErrorMessage
  | KBUploadStartMessage
  | KBUploadProgressMessage
  | KBUploadCompleteMessage
  | KBUploadErrorMessage
  | KBListRequestMessage
  | KBListResponseMessage
  | KBDeleteRequestMessage
  | KBDeleteResponseMessage
  | SettingsGetMessage
  | SettingsSetMessage
  | SettingsResponseMessage
  | OpenSidePanelMessage
  | PingMessage
  | RequestAnalysisMessage
  | GuideRequestMessage
  | GuideResponseMessage
  | GuideLoadingMessage
  | GuideErrorMessage
  | GuideHighlightMessage
  | GuideClearMessage
  | GuideScrollMessage
  | GuideStepDoneMessage
  | GetPageContextMessage
  | PageContextResponseMessage
  | CaptureModeStartMessage
  | CaptureModeStopMessage
  | CaptureModeStoppedMessage
  | ElementCapturedMessage
  | SiteMapLearnedMessage
  | ElementMapRequestMessage
  | ElementMapResponseMessage
  | ElementMapUpdatedMessage
  | ElementDeleteRequestMessage
  | VisionLocateRequestMessage
  | VisionLocateResponseMessage
  | GetNavLinksMessage
  | CrawlStartMessage
  | CrawlStopMessage
  | CrawlProgressMessage
  | CrawlCompleteMessage
  | CrawlErrorMessage;

// Re-export for convenience
export type { PageContext, AIResponse, KBChunk, KBDocument, ExtensionSettings };
export type { GuideResponse, GuideStep };
