import { Brain } from 'lucide-react';

export default function LoadingOverlay() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center animate-fade-in">
      <div className="relative mb-3">
        <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
          <Brain size={22} className="text-brand-400 animate-pulse-soft" />
        </div>
        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-xl border-2 border-transparent border-t-brand-500 animate-spin" />
      </div>

      <p className="text-xs font-medium text-brand-300 mb-0.5">
        Analyzing page<span className="typing-dots" />
      </p>
      <p className="text-[10px] text-slate-600">
        Extracting context and searching knowledge base
      </p>

      {/* Skeleton cards */}
      <div className="w-full mt-4 space-y-2">
        {[70, 100, 85].map((w, i) => (
          <div key={i} className="glass-card p-3">
            <div className="space-y-1.5">
              <div className="h-2 bg-white/5 rounded-full animate-pulse" style={{ width: `${w}%` }} />
              <div className="h-2 bg-white/5 rounded-full animate-pulse" style={{ width: `${w - 15}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
