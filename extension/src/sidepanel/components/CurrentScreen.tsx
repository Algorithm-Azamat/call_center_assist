import { Monitor, Globe } from 'lucide-react';
import { useExtensionStore } from '../store/extensionStore';

export default function CurrentScreen() {
  const { aiResponse } = useExtensionStore();
  if (!aiResponse) return null;

  const confidence = Math.round(aiResponse.confidence * 100);
  const confColor =
    confidence >= 80
      ? 'text-emerald-400 bg-emerald-400/10'
      : confidence >= 50
      ? 'text-amber-400 bg-amber-400/10'
      : 'text-red-400 bg-red-400/10';

  return (
    <div className="glass-card p-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="section-label flex items-center gap-1.5">
          <Monitor size={11} />
          Current Screen
        </span>
        <span className={`badge ${confColor}`}>
          {confidence}% confident
        </span>
      </div>

      <h2 className="text-base font-semibold gradient-text mb-1">
        {aiResponse.screenName}
      </h2>
      <p className="text-xs text-slate-400 leading-relaxed">
        {aiResponse.screenDescription}
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
        <Globe size={10} />
        <span className="truncate">{aiResponse.screenName}</span>
      </div>
    </div>
  );
}
