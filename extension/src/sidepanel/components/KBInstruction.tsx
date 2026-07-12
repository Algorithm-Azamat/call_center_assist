import { BookOpen, FileText } from 'lucide-react';
import { useExtensionStore } from '../store/extensionStore';

export default function KBInstruction() {
  const { aiResponse } = useExtensionStore();
  const instruction = aiResponse?.relevantInstruction;

  if (!instruction) return null;

  const similarityPct = instruction.similarity
    ? Math.round(instruction.similarity * 100)
    : null;

  return (
    <div className="glass-card p-3 border-amber-500/20 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center">
            <BookOpen size={11} className="text-amber-400" />
          </div>
          <span className="section-label text-amber-400/80">Knowledge Base</span>
        </div>
        {similarityPct && (
          <span className="badge text-amber-400 bg-amber-400/10">
            {similarityPct}% match
          </span>
        )}
      </div>

      {/* Source file */}
      <div className="flex items-center gap-1.5 mb-2">
        <FileText size={11} className="text-slate-500 flex-shrink-0" />
        <span className="text-[10px] text-slate-500 truncate">{instruction.docName}</span>
      </div>

      {/* Instruction text */}
      <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-6">
          {instruction.text}
        </p>
      </div>
    </div>
  );
}
