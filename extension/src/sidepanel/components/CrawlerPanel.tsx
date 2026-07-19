import { useState, useEffect } from 'react';
import { Compass, AlertTriangle, Loader2, CheckCircle2, StopCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface CrawlProgress { done: number; total: number; url: string }

export default function CrawlerPanel() {
  const [expanded, setExpanded] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [progress, setProgress] = useState<CrawlProgress | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const handler = (msg: { type: string; payload?: unknown }) => {
      switch (msg.type) {
        case 'CRAWL_PROGRESS':
          setCrawling(true);
          setResult(null);
          setProgress(msg.payload as CrawlProgress);
          break;
        case 'CRAWL_COMPLETE': {
          const p = msg.payload as { pages: number; stopped: boolean };
          setCrawling(false);
          setProgress(null);
          setResult({ ok: true, text: p.stopped ? `Остановлено — изучено разделов: ${p.pages}` : `Готово — изучено разделов: ${p.pages}` });
          break;
        }
        case 'CRAWL_ERROR':
          setCrawling(false);
          setProgress(null);
          setResult({ ok: false, text: (msg.payload as { error: string }).error });
          break;
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const start = () => {
    setShowWarning(false);
    setCrawling(true);
    setResult(null);
    setProgress(null);
    chrome.runtime.sendMessage({ type: 'CRAWL_START' });
  };

  const stop = () => chrome.runtime.sendMessage({ type: 'CRAWL_STOP' });

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Compass size={14} className="text-sky-400" />
          <span className="section-label text-sky-400/80">Изучение портала</span>
          {crawling && <Loader2 size={11} className="text-sky-400 animate-spin" />}
        </div>
        {expanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 animate-fade-in">
          <p className="text-white/40 text-xs leading-relaxed">
            Автоматически пройдёт по разделам портала и запомнит их структуру — гид станет точнее без ручного обучения.
          </p>

          {!crawling && (
            <button
              onClick={() => setShowWarning(true)}
              className="w-full px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-500/30"
            >
              <Compass size={13} /> Изучить портал
            </button>
          )}

          {crawling && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/25">
                <Loader2 size={12} className="text-sky-400 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sky-300 text-xs">
                    Изучаю {progress ? `${progress.done}/${progress.total}` : '…'}
                  </p>
                  {progress && (
                    <p className="text-white/25 text-[10px] truncate">{new URL(progress.url).pathname}</p>
                  )}
                </div>
              </div>
              {progress && (
                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                  />
                </div>
              )}
              <button
                onClick={stop}
                className="w-full px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors"
              >
                <StopCircle size={12} /> Остановить
              </button>
            </div>
          )}

          {result && !crawling && (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${result.ok ? 'bg-green-500/10 border border-green-500/25 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {result.ok && <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />}
              <span className="leading-relaxed">{result.text}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Warning popup ── */}
      {showWarning && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowWarning(false)}>
          <div
            className="bg-surface-2 border border-white/10 rounded-xl p-4 max-w-sm w-full space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
              <h3 className="text-white text-sm font-semibold">Изучение портала</h3>
            </div>

            <ul className="space-y-2 text-xs text-white/60 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-sky-400 flex-shrink-0">•</span>
                Откроется <span className="text-white/85 font-medium">фоновая вкладка</span>, которая пройдёт по разделам портала (до 12 страниц, ~1–2 минуты).
              </li>
              <li className="flex gap-2">
                <span className="text-sky-400 flex-shrink-0">•</span>
                Режим <span className="text-white/85 font-medium">только для чтения</span>: расширение не нажимает кнопки и не изменяет данные.
              </li>
              <li className="flex gap-2">
                <span className="text-sky-400 flex-shrink-0">•</span>
                AI-запросы не используются — изучение <span className="text-white/85 font-medium">бесплатно</span>.
              </li>
              <li className="flex gap-2">
                <span className="text-sky-400 flex-shrink-0">•</span>
                Можно продолжать работать в своей вкладке, но <span className="text-white/85 font-medium">не закрывай браузер</span> до завершения.
              </li>
            </ul>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={start}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 transition-colors"
              >
                Начать изучение
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
