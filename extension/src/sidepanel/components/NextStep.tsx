import { ArrowRight, ListOrdered } from 'lucide-react';
import { useExtensionStore } from '../store/extensionStore';

export default function NextStep() {
  const { aiResponse } = useExtensionStore();
  if (!aiResponse) return null;

  // Parse numbered steps from the string
  const steps = aiResponse.nextStepDetails
    ? aiResponse.nextStepDetails
        .split(/\n|\d+\.\s/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="glass-card p-3 animate-fade-in">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center">
          <ArrowRight size={11} className="text-emerald-400" />
        </div>
        <span className="section-label text-emerald-400/80">Next Step</span>
      </div>

      {/* Main action */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-2">
        <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <ArrowRight size={9} className="text-white" />
        </span>
        <p className="text-sm font-medium text-emerald-300 leading-snug">
          {aiResponse.nextStep}
        </p>
      </div>

      {/* Step-by-step details */}
      {steps.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 mb-1">
            <ListOrdered size={10} className="text-slate-500" />
            <span className="text-[10px] text-slate-500">Step by step</span>
          </div>
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-brand-400/60 w-4 flex-shrink-0 mt-0.5">
                {i + 1}.
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
