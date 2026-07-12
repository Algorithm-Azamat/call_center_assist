import { Brain, Sparkles } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center animate-fade-in">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/30 to-purple-600/30 flex items-center justify-center border border-brand-500/20">
          <Brain size={28} className="text-brand-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center">
          <Sparkles size={10} className="text-white" />
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-300 mb-1">
        Waiting for a page...
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed max-w-[180px]">
        Navigate to any CRM or web system and I'll analyze it for you automatically.
      </p>

      <div className="mt-4 flex flex-col gap-1.5 w-full max-w-[200px]">
        {['Detecting screen type', 'Analyzing context', 'Finding instructions'].map((step, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/3">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500/40" />
            <span className="text-[10px] text-slate-600">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
