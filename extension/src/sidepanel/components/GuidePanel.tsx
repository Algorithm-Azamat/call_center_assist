import { useState, useRef, useEffect } from 'react';
import { MapPin, Send, X, ChevronLeft, ChevronRight, Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp, PartyPopper } from 'lucide-react';
import { useExtensionStore } from '../store/extensionStore';
import clsx from 'clsx';

const QUICK_QUERIES = [
  'Как создать сделку?',
  'Как добавить контакт?',
  'Как позвонить клиенту?',
  'Как создать задачу?',
  'Как найти лид?',
];

export default function GuidePanel() {
  const {
    guide, isGuideLoading, guideError,
    guideActiveStep, isGuideOpen,
    setIsGuideOpen, setGuideActiveStep, clearGuide,
    settings,
  } = useExtensionStore();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (q = query.trim()) => {
    if (!q || isGuideLoading) return;
    chrome.runtime.sendMessage({ type: 'GUIDE_REQUEST', payload: { query: q } });
    setQuery('');
  };

  const goToStep = (step: number) => {
    if (!guide) return;
    const clamped = Math.max(1, Math.min(step, guide.steps.length));
    setGuideActiveStep(clamped);

    const currentStep = guide.steps.find(s => s.stepNumber === clamped);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      // Always show CSS-based highlight as immediate fallback
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'GUIDE_HIGHLIGHT',
        payload: { steps: guide.steps, activeStep: clamped },
      }).catch(() => {});
    });

    // If OpenAI key exists — request vision-precise coords via gpt-4o
    if (settings.openaiApiKey && currentStep) {
      chrome.runtime.sendMessage({
        type: 'VISION_LOCATE_REQUEST',
        payload: { instruction: currentStep.instruction, stepNumber: clamped },
      });
    }
  };

  const handleClear = () => {
    clearGuide();
    chrome.runtime.sendMessage({ type: 'GUIDE_CLEAR' });
  };

  // Auto-advance: content script reports the user clicked the step's target
  useEffect(() => {
    const handler = (msg: { type: string; payload?: { stepNumber?: number } }) => {
      if (msg.type !== 'GUIDE_STEP_DONE') return;
      if (!guide || msg.payload?.stepNumber !== guideActiveStep) return; // stale/duplicate
      if (guideActiveStep < guide.steps.length) {
        // Small delay so the click's result (slider, new screen) can render
        setTimeout(() => goToStep(guideActiveStep + 1), 500);
      } else {
        // Last step done — mark the whole guide complete, remove page overlays
        setGuideActiveStep(guide.steps.length + 1);
        chrome.runtime.sendMessage({ type: 'GUIDE_CLEAR' });
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [guide, guideActiveStep]);

  const isComplete = !!guide && guideActiveStep > guide.steps.length;
  const progress = guide
    ? Math.min(100, Math.round(((guideActiveStep - 1) / Math.max(guide.steps.length - 1, 1)) * 100))
    : 0;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsGuideOpen(!isGuideOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-indigo-400" />
          <span className="section-label">Пошаговый гид</span>
          {isGuideLoading && <Loader2 size={11} className="text-indigo-400 animate-spin" />}
          {guide && !isGuideLoading && (
            <span className={clsx('badge text-[10px]', isComplete ? 'bg-green-500/20 text-green-300' : 'bg-indigo-500/20 text-indigo-300')}>
              {isComplete ? '✓ готово' : `${guideActiveStep}/${guide.steps.length}`}
            </span>
          )}
        </div>
        {isGuideOpen ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>

      {/* Progress bar (visible even when collapsed if guide active) */}
      {guide && !isGuideOpen && (
        <div className="h-0.5 bg-white/5">
          <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      {isGuideOpen && (
        <div className="px-3 pb-3 space-y-3 animate-fade-in">

          {/* Input */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Что нужно сделать?"
              disabled={isGuideLoading}
              className={clsx(
                'flex-1 bg-surface-2 border border-white/10 rounded-lg px-3 py-2',
                'text-sm text-white placeholder-white/25 outline-none',
                'focus:border-indigo-500/50 transition-colors',
                isGuideLoading && 'opacity-40 cursor-not-allowed'
              )}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!query.trim() || isGuideLoading}
              className={clsx(
                'px-3 py-2 rounded-lg flex items-center justify-center transition-colors flex-shrink-0',
                'bg-indigo-600 hover:bg-indigo-500 text-white',
                (!query.trim() || isGuideLoading) && 'opacity-30 cursor-not-allowed'
              )}
            >
              {isGuideLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>

          {/* Quick queries — shown only when no guide active */}
          {!guide && !isGuideLoading && !guideError && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSubmit(q)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-indigo-300 hover:border-indigo-500/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {guideError && !isGuideLoading && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="text-red-400 text-xs leading-relaxed">{guideError}</span>
            </div>
          )}

          {/* Loading */}
          {isGuideLoading && (
            <div className="space-y-2">
              {[90, 70, 80].map((w, i) => (
                <div key={i} className="flex gap-2.5 items-center animate-pulse">
                  <div className="w-4 h-4 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="h-3 bg-white/10 rounded" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          )}

          {/* Guide steps */}
          {guide && !isGuideLoading && (
            <div className="space-y-2">

              {/* Completed banner */}
              {isComplete && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/25 animate-fade-in">
                  <PartyPopper size={14} className="text-green-400 flex-shrink-0" />
                  <span className="text-green-300 text-xs font-medium">Гид пройден — все шаги выполнены!</span>
                </div>
              )}

              {/* Summary */}
              {guide.summary && (
                <p className="text-white/40 text-xs leading-relaxed">{guide.summary}</p>
              )}

              {/* Progress bar */}
              <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-400"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Steps */}
              <div className="space-y-1">
                {guide.steps.map((step) => {
                  const isActive = step.stepNumber === guideActiveStep;
                  const isDone = step.stepNumber < guideActiveStep;
                  return (
                    <button
                      key={step.stepNumber}
                      onClick={() => goToStep(step.stepNumber)}
                      className={clsx(
                        'w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all',
                        isActive && 'bg-indigo-500/15 border border-indigo-500/25',
                        !isActive && 'border border-transparent hover:bg-white/5',
                      )}
                    >
                      <span className="flex-shrink-0 mt-0.5">
                        {isDone
                          ? <CheckCircle2 size={15} className="text-green-400" />
                          : isActive
                            ? <span className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold inline-flex">{step.stepNumber}</span>
                            : <Circle size={15} className="text-white/20" />
                        }
                      </span>
                      <span className={clsx(
                        'text-xs leading-relaxed flex-1',
                        isActive ? 'text-white font-medium' : isDone ? 'text-white/35 line-through' : 'text-white/55'
                      )}>
                        {step.instruction}
                        {step.isOptional && <span className="ml-1 text-white/25 font-normal">(необязательно)</span>}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Nav buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => goToStep(guideActiveStep - 1)}
                  disabled={guideActiveStep <= 1}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:cursor-not-allowed transition-colors border border-white/8"
                >
                  <ChevronLeft size={12} /> Назад
                </button>
                <span className="text-white/25 text-[10px] w-12 text-center tabular-nums">
                  {Math.min(guideActiveStep, guide.steps.length)} / {guide.steps.length}
                </span>
                <button
                  onClick={() => goToStep(guideActiveStep + 1)}
                  disabled={guideActiveStep >= guide.steps.length}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:cursor-not-allowed transition-colors border border-white/8"
                >
                  Далее <ChevronRight size={12} />
                </button>
              </div>

              <button
                onClick={handleClear}
                className="w-full text-[10px] text-white/20 hover:text-white/50 transition-colors py-1 flex items-center justify-center gap-1"
              >
                <X size={10} /> очистить гид
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
