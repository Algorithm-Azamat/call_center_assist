import { create } from 'zustand';
import type { AIResponse, ActionEntry, KBDocument, ExtensionSettings } from '../../shared/types';
import type { GuideResponse } from '../../shared/types/guide';
import { DEFAULT_SETTINGS } from '../../shared/constants';

interface UploadProgress {
  fileName: string;
  progress: number;
  stage: string;
}

interface ExtensionState {
  aiResponse: AIResponse | null;
  isLoading: boolean;
  error: string | null;
  actionHistory: ActionEntry[];
  kbDocuments: KBDocument[];
  uploadProgress: UploadProgress | null;
  isUploading: boolean;
  settings: ExtensionSettings;
  isSettingsOpen: boolean;
  guide: GuideResponse | null;
  isGuideLoading: boolean;
  guideError: string | null;
  guideActiveStep: number;
  isGuideOpen: boolean;

  setAIResponse: (response: AIResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActionHistory: (history: ActionEntry[]) => void;
  addActionEntry: (entry: ActionEntry) => void;
  setKBDocuments: (docs: KBDocument[]) => void;
  addKBDocument: (doc: KBDocument) => void;
  removeKBDocument: (docId: string) => void;
  setUploadProgress: (progress: UploadProgress | null) => void;
  setIsUploading: (uploading: boolean) => void;
  setSettings: (settings: Partial<ExtensionSettings>) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setGuide: (guide: GuideResponse | null) => void;
  setGuideLoading: (loading: boolean) => void;
  setGuideError: (error: string | null) => void;
  setGuideActiveStep: (step: number) => void;
  setIsGuideOpen: (open: boolean) => void;
  clearGuide: () => void;
}

export const useExtensionStore = create<ExtensionState>((set) => ({
  aiResponse: null,
  isLoading: false,
  error: null,
  actionHistory: [],
  kbDocuments: [],
  uploadProgress: null,
  isUploading: false,
  settings: DEFAULT_SETTINGS,
  isSettingsOpen: false,
  guide: null,
  isGuideLoading: false,
  guideError: null,
  guideActiveStep: 1,
  isGuideOpen: false,

  setAIResponse: (response) => set({ aiResponse: response, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  setActionHistory: (history) => set({ actionHistory: history }),
  addActionEntry: (entry) =>
    set((state) => ({ actionHistory: [entry, ...state.actionHistory].slice(0, 50) })),
  setKBDocuments: (docs) => set({ kbDocuments: docs }),
  addKBDocument: (doc) =>
    set((state) => ({ kbDocuments: [...state.kbDocuments, doc] })),
  removeKBDocument: (docId) =>
    set((state) => ({ kbDocuments: state.kbDocuments.filter((d) => d.id !== docId) })),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  setSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setGuide: (guide) => set({ guide, guideError: null, guideActiveStep: 1 }),
  setGuideLoading: (loading) => set({ isGuideLoading: loading }),
  setGuideError: (error) => set({ guideError: error, isGuideLoading: false }),
  setGuideActiveStep: (step) => set({ guideActiveStep: step }),
  setIsGuideOpen: (open) => set({ isGuideOpen: open }),
  clearGuide: () => set({ guide: null, guideError: null, guideActiveStep: 1 }),
}));
