import React from 'react';
import { FileText, ArrowLeft, Upload, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ResumesPlaceholder: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-white">Resumes & Evidence Vault</h2>
          <p className="text-xs text-slate-400">Phase 2 Planned Module</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-8 text-center space-y-5">
        <div className="h-14 w-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center">
          <FileText className="h-7 w-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-bold text-white">Resume Parsing & Evidence Ingestion</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            In subsequent phases, ApplyGraph will accept PDF/DOCX resumes, perform structural entity recognition, and map career achievements to an evidence knowledge graph.
          </p>
        </div>

        <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Multi-Format Ingestion
            </span>
            <p className="text-[11px] text-slate-400">PDF, DOCX, Markdown, and plain text.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Evidence Extraction
            </span>
            <p className="text-[11px] text-slate-400">Verifiable quotes linked to specific roles.</p>
          </div>
        </div>

        <div className="pt-2">
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-500 text-xs font-semibold cursor-not-allowed border border-slate-700/50"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Resume (Unlocks in Phase 2)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
