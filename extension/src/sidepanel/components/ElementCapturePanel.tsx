import { useState, useEffect, useRef } from 'react';
import { Crosshair, Trash2, BookMarked, StopCircle, ChevronDown, ChevronUp, Plus, Target } from 'lucide-react';
import type { ElementRecord } from '../../shared/types';
import clsx from 'clsx';

export default function ElementCapturePanel() {
  const [expanded, setExpanded] = useState(false);
  const [label, setLabel] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [elements, setElements] = useState<ElementRecord[]>([]);
  const isCapturingRef = useRef(false);

  useEffect(() => { loadElements(); }, []);

  // Single listener — handles both map refresh and capture-completion reset
  useEffect(() => {
    const handler = (msg: { type: string }) => {
      if (msg.type !== 'ELEMENT_MAP_UPDATED') return;
      loadElements();
      if (isCapturingRef.current) {
        isCapturingRef.current = false;
        setIsCapturing(false);
        setLabel('');
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  // Keep ref in sync so the single listener above always sees the latest value
  useEffect(() => { isCapturingRef.current = isCapturing; }, [isCapturing]);

  async function loadElements() {
    const res = await chrome.runtime.sendMessage({ type: 'ELEMENT_MAP_REQUEST' }).catch(() => null);
    if (res?.payload?.elements) setElements(res.payload.elements);
  }

  async function startCapture() {
    const l = label.trim();
    if (!l) return;
    setIsCapturing(true);
    await chrome.runtime.sendMessage({ type: 'CAPTURE_MODE_START', payload: { label: l } });
  }

  async function stopCapture() {
    setIsCapturing(false);
    isCapturingRef.current = false;
    await chrome.runtime.sendMessage({ type: 'CAPTURE_MODE_STOP' });
  }

  async function deleteElement(id: string) {
    await chrome.runtime.sendMessage({ type: 'ELEMENT_DELETE_REQUEST', payload: { id } });
    setElements((prev) => prev.filter((e) => e.id !== id));
  }

  // Quick-add suggestions for Bitrix24
  const SUGGESTIONS = ['Создать сделку', 'Создать лид', 'Добавить контакт', 'Позвонить', 'Сохранить'];

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target size={14} className="text-amber-400" />
          <span className="section-label text-amber-400/80">Обучение элементам</span>
          {elements.length > 0 && (
            <span className="badge bg-amber-500/20 text-amber-300 text-[10px]">
              {elements.length} записано
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 animate-fade-in">

          {/* How-to hint */}
          <div className="bg-amber-500/8 border border-amber-500/15 rounded-lg px-3 py-2 text-xs text-amber-200/60 leading-relaxed">
            Введи название → нажми <span className="text-amber-300 font-medium">Записать</span> → кликни на элемент в Bitrix24. Гид будет использовать точный селектор.
          </div>

          {/* Quick suggestions */}
          {!isCapturing && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.filter(s => !elements.some(e => e.label === s)).map(s => (
                <button
                  key={s}
                  onClick={() => setLabel(s)}
                  className="text-[10px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-amber-500/30 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}

          {/* Input + capture button */}
          <div className="flex gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isCapturing && startCapture()}
              placeholder="Название кнопки или действия…"
              disabled={isCapturing}
              className={clsx(
                'flex-1 bg-surface-2 border border-white/10 rounded-lg px-3 py-2',
                'text-sm text-white placeholder-white/25 outline-none',
                'focus:border-amber-500/50 transition-colors',
                isCapturing && 'opacity-40'
              )}
            />
            {isCapturing ? (
              <button
                onClick={stopCapture}
                className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-1.5 hover:bg-red-500/30 transition-colors flex-shrink-0"
              >
                <StopCircle size={13} /> Стоп
              </button>
            ) : (
              <button
                onClick={startCapture}
                disabled={!label.trim()}
                className={clsx(
                  'px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors flex-shrink-0',
                  'bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30',
                  !label.trim() && 'opacity-30 cursor-not-allowed'
                )}
              >
                <Crosshair size={13} /> Записать
              </button>
            )}
          </div>

          {/* Capture active state */}
          {isCapturing && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              <p className="text-amber-300 text-xs">
                Кликни на <span className="font-semibold">«{label}»</span> на странице
              </p>
            </div>
          )}

          {/* Recorded elements */}
          {elements.length > 0 && (
            <div className="space-y-1">
              <p className="text-white/25 text-[10px] uppercase tracking-wide px-1">Записано</p>
              {elements.map((el) => (
                <div key={el.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 group hover:bg-white/8 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-white/80 font-medium">{el.label}</span>
                    <span className="text-[10px] text-white/25 font-mono ml-2 truncate">{el.selector}</span>
                  </div>
                  <button
                    onClick={() => deleteElement(el.id)}
                    className="flex-shrink-0 p-1 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {elements.length === 0 && !isCapturing && (
            <p className="text-white/20 text-[10px] text-center py-1">
              Нет записей. Используй подсказки выше или введи своё название.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
