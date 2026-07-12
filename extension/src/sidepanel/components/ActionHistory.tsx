import { useState } from 'react';
import { History, ChevronDown, ChevronUp, Clock, ExternalLink } from 'lucide-react';
import { useExtensionStore } from '../store/extensionStore';
import { clearActionHistory } from '../../shared/utils/storage';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function ActionHistory() {
  const { actionHistory, setActionHistory } = useExtensionStore();
  const [expanded, setExpanded] = useState(false);

  if (actionHistory.length === 0) return null;

  const visible = expanded ? actionHistory : actionHistory.slice(0, 3);

  const handleClear = async () => {
    await clearActionHistory();
    setActionHistory([]);
  };

  return (
    <div className="glass-card p-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-slate-500/20 flex items-center justify-center">
            <History size={11} className="text-slate-400" />
          </div>
          <span className="section-label">History</span>
          <span className="badge text-slate-400 bg-white/5">{actionHistory.length}</span>
        </div>
        <button
          onClick={handleClear}
          className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="space-y-1.5">
        {visible.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group"
          >
            {/* Timeline dot */}
            <div className="flex flex-col items-center mt-1 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-medium text-slate-300 truncate">
                  {entry.screenName}
                </p>
                <span className="text-[10px] text-slate-600 flex-shrink-0 flex items-center gap-0.5">
                  <Clock size={9} />
                  {formatRelativeTime(entry.timestamp)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{entry.title}</p>
              <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">{entry.aiHint}</p>
            </div>
          </div>
        ))}
      </div>

      {actionHistory.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors py-1"
        >
          {expanded ? (
            <><ChevronUp size={12} /> Show less</>
          ) : (
            <><ChevronDown size={12} /> Show {actionHistory.length - 3} more</>
          )}
        </button>
      )}
    </div>
  );
}
