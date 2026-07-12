import { useEffect } from 'react';
import { useExtensionStore } from './store/extensionStore';
import type { ExtensionMessage } from '../shared/types/messages';
import { getSettings } from '../shared/utils/storage';
import { getActionHistory } from '../shared/utils/storage';

// Components
import Header from './components/Header';
import CurrentScreen from './components/CurrentScreen';
import AIHint from './components/AIHint';
import NextStep from './components/NextStep';
import KBInstruction from './components/KBInstruction';
import ActionHistory from './components/ActionHistory';
import KBUploader from './components/KBUploader';
import SettingsPanel from './components/SettingsPanel';
import EmptyState from './components/EmptyState';
import LoadingOverlay from './components/LoadingOverlay';
import GuidePanel from './components/GuidePanel';
import ElementCapturePanel from './components/ElementCapturePanel';

export default function App() {
  const {
    isSettingsOpen,
    setAIResponse,
    setLoading,
    setError,
    setSettings,
    setActionHistory,
    setKBDocuments,
    addKBDocument,
    removeKBDocument,
    setUploadProgress,
    setIsUploading,
    aiResponse,
    isLoading,
    error,
    setGuide,
    setGuideLoading,
    setGuideError,
    setIsGuideOpen,
  } = useExtensionStore();

  // ─── Init: load settings, history, KB docs ──────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const settings = await getSettings();
        setSettings(settings);

        const history = await getActionHistory();
        setActionHistory(history);

        const docsResponse = await chrome.runtime.sendMessage({ type: 'KB_LIST_REQUEST' });
        if (docsResponse?.payload?.documents) {
          setKBDocuments(docsResponse.payload.documents);
        }
      } catch (err) {
        console.error('[AOC] Init error:', err);
      }
    };

    loadInitialData();
  }, []);

  // ─── Listen for messages from background ────────────────────────────────
  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'sidepanel' });

    // Ask background to re-run analysis on the current page immediately
    chrome.runtime.sendMessage({ type: 'REQUEST_ANALYSIS' }).catch(() => {});

    const handleMessage = (message: ExtensionMessage) => {
      switch (message.type) {
        case 'AI_RESPONSE':
          setAIResponse(message.payload);
          setLoading(false);
          break;

        case 'AI_LOADING':
          setLoading(message.payload.loading);
          break;

        case 'AI_ERROR':
          setError(message.payload.error);
          setLoading(false);
          break;

        case 'KB_UPLOAD_PROGRESS':
          setUploadProgress(message.payload);
          setIsUploading(true);
          break;

        case 'KB_UPLOAD_COMPLETE':
          addKBDocument(message.payload.document);
          setUploadProgress(null);
          setIsUploading(false);
          break;

        case 'KB_UPLOAD_ERROR':
          setError(`Upload failed: ${message.payload.error}`);
          setUploadProgress(null);
          setIsUploading(false);
          break;

        case 'GUIDE_RESPONSE':
          setGuide(message.payload);
          setGuideLoading(false);
          setIsGuideOpen(true);
          break;

        case 'GUIDE_LOADING':
          setGuideLoading(message.payload.loading);
          break;

        case 'GUIDE_ERROR':
          setGuideError(message.payload.error);
          break;

        default:
          break;
      }
    };

    port.onMessage.addListener(handleMessage);
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      port.disconnect();
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface text-white overflow-hidden">
      <Header />

      {isSettingsOpen ? (
        <SettingsPanel />
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {isLoading && !aiResponse && <LoadingOverlay />}

          {error && !isLoading && (
            <div className="glass-card p-3 border-red-500/30 bg-red-500/10 animate-fade-in">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!aiResponse && !isLoading && !error && <EmptyState />}

          {aiResponse && (
            <>
              <CurrentScreen />
              <AIHint />
              <NextStep />
              <KBInstruction />
            </>
          )}

          {/* ── Element map (recording) ── */}
          <ElementCapturePanel />

          {/* ── Interactive Guide ── */}
          <GuidePanel />

          <KBUploader />
          <ActionHistory />
        </div>
      )}
    </div>
  );
}
