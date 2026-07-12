import { Sparkles } from 'lucide-react';
import { useExtensionStore } from '../store/extensionStore';

export default function AIHint() {
  const { aiResponse, isLoading } = useExtensionStore();

  return (
    <div className="glass-card p-3 border-brand-500/20 bg-gradient-to-br from-brand-500/10 to-purple-500/5 animate-fade-in">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-5 h-5 rounded-md bg-brand-500/20 flex items-center justify-center">
          <Sparkles size={11} className="text-brand-400" />
        </div>
        <span className="section-label text-brand-400">AI Hint</span>
        {isLoading && (
          <span className="ml-auto text-[10px] text-brand-400 animate-pulse-soft">
            Analyzing<span className="typing-dots" />
          </span>
        )}
      </div>

      {aiResponse ? (
        <p className="text-sm text-slate-300 leading-relaxed">
          {aiResponse.aiHint}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="h-3 bg-white/5 rounded-full w-full animate-pulse" />
          <div className="h-3 bg-white/5 rounded-full w-4/5 animate-pulse" />
          <div className="h-3 bg-white/5 rounded-full w-3/5 animate-pulse" />
        </div>
      )}
    </div>
  );
}
