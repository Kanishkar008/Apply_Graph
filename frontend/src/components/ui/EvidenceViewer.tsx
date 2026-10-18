import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import type { SourceSpan } from '../../types/resume';

interface EvidenceViewerProps {
  label: string;
  source: SourceSpan | null | undefined;
  className?: string;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ label, source, className = '' }) => {
  const [open, setOpen] = useState(false);

  if (!source?.source_text) return null;

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-0.5 rounded text-slate-500 hover:text-teal-400 transition-colors"
        title="Inspect verbatim evidence span"
        aria-label="View evidence"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute z-20 left-0 top-6 w-72 bg-[#1c2128] border border-[#30363d] rounded-xl shadow-modal p-3 space-y-2 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-teal-400">{label}</span>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Close evidence"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <blockquote className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg font-mono text-[11px] text-teal-200 leading-relaxed border-l-2 border-l-teal-500">
            "{source.source_text}"
          </blockquote>
          {(source.char_start != null || source.char_end != null) && (
            <p className="text-[10px] text-slate-500 font-mono">
              Chars {source.char_start ?? '?'} – {source.char_end ?? '?'}
            </p>
          )}
        </div>
      )}
    </span>
  );
};

interface DualEvidenceViewerProps {
  label: string;
  jobSource?: SourceSpan | null;
  resumeSource?: SourceSpan | null;
  className?: string;
}

export const DualEvidenceViewer: React.FC<DualEvidenceViewerProps> = ({
  label,
  jobSource,
  resumeSource,
  className = '',
}) => {
  const [open, setOpen] = useState(false);

  if (!jobSource?.source_text && !resumeSource?.source_text) return null;

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-0.5 rounded text-slate-500 hover:text-brand-400 transition-colors"
        title="Inspect dual source evidence spans"
        aria-label="View dual evidence"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute z-20 left-0 top-6 w-80 bg-[#1c2128] border border-[#30363d] rounded-xl shadow-modal p-3 space-y-2.5 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-brand-300">{label}</span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {jobSource?.source_text && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Job Description</p>
              <blockquote className="px-3 py-2 bg-[#0d1117] border border-[#30363d] border-l-2 border-l-brand-500 rounded-lg font-mono text-[11px] text-brand-200 leading-relaxed">
                "{jobSource.source_text}"
              </blockquote>
              {(jobSource.char_start != null) && (
                <p className="text-[10px] text-slate-500 font-mono">Chars {jobSource.char_start} – {jobSource.char_end}</p>
              )}
            </div>
          )}

          {resumeSource?.source_text && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Resume</p>
              <blockquote className="px-3 py-2 bg-[#0d1117] border border-[#30363d] border-l-2 border-l-teal-500 rounded-lg font-mono text-[11px] text-teal-200 leading-relaxed">
                "{resumeSource.source_text}"
              </blockquote>
              {(resumeSource.char_start != null) && (
                <p className="text-[10px] text-slate-500 font-mono">Chars {resumeSource.char_start} – {resumeSource.char_end}</p>
              )}
            </div>
          )}
        </div>
      )}
    </span>
  );
};
