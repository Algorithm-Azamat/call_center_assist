import { useRef, useState } from 'react';
import { Upload, FileText, Trash2, X, CheckCircle } from 'lucide-react';
import { useExtensionStore } from '../store/extensionStore';
import clsx from 'clsx';

export default function KBUploader() {
  const { kbDocuments, isUploading, uploadProgress, removeKBDocument } =
    useExtensionStore();
  const [isDragging, setIsDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' && ext !== 'docx') {
        alert(`Unsupported file type: ${file.name}. Only PDF and DOCX are supported.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        await chrome.runtime.sendMessage({
          type: 'KB_UPLOAD_START',
          payload: {
            fileName: file.name,
            fileType: ext as 'pdf' | 'docx',
            fileData: base64,
          },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (docId: string) => {
    await chrome.runtime.sendMessage({
      type: 'KB_DELETE_REQUEST',
      payload: { docId },
    });
    removeKBDocument(docId);
  };

  return (
    <div className="glass-card p-3 animate-fade-in">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center">
            <Upload size={11} className="text-purple-400" />
          </div>
          <span className="section-label text-purple-400/80">Knowledge Base</span>
          {kbDocuments.length > 0 && (
            <span className="badge text-purple-400 bg-purple-400/10">
              {kbDocuments.length} docs
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-500">
          {expanded ? '▲ hide' : '▼ manage'}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-brand-400 bg-brand-500/10'
                : 'border-white/10 hover:border-brand-500/40 hover:bg-white/5'
            )}
          >
            <Upload size={20} className="mx-auto mb-2 text-slate-500" />
            <p className="text-xs text-slate-400">
              Drop PDF or DOCX files here
            </p>
            <p className="text-[10px] text-slate-600 mt-1">or click to browse</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Upload progress */}
          {isUploading && uploadProgress && (
            <div className="p-2.5 rounded-lg bg-brand-500/10 border border-brand-500/20">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-brand-300 truncate">{uploadProgress.fileName}</p>
                <span className="text-[10px] text-brand-400">{uploadProgress.progress}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{uploadProgress.stage}</p>
            </div>
          )}

          {/* Document list */}
          {kbDocuments.length > 0 && (
            <div className="space-y-1.5">
              {kbDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5 group"
                >
                  <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{doc.fileName}</p>
                    <p className="text-[10px] text-slate-600">
                      {doc.chunkCount} chunks · {doc.totalTokens.toLocaleString()} tokens
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {kbDocuments.length === 0 && !isUploading && (
            <p className="text-[10px] text-slate-600 text-center">
              No documents yet. Upload manuals, SOPs, or guides.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
