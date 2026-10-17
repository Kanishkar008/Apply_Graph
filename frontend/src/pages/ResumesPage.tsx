import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  X,
  FileUp,
  FileCode,
  Info,
  Sparkles,
} from 'lucide-react';
import { ResumeSummary, ResumeDetail, ParsedResumeResponse } from '../types/resume';
import {
  fetchResumes,
  fetchResumeById,
  uploadResumeFile,
  deleteResumeById,
  fetchParsedResume,
  parseResume,
} from '../services/resumeService';
import { ResumeIntelligenceModal } from '../components/ResumeIntelligenceModal';

export const ResumesPage: React.FC = () => {
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal inspection state
  const [activeResume, setActiveResume] = useState<ResumeDetail | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Structured Intelligence state (Phase 2B)
  const [activeParsedProfile, setActiveParsedProfile] = useState<ParsedResumeResponse | null>(null);
  const [parsingResumeId, setParsingResumeId] = useState<string | null>(null);
  const [activeProfileFilename, setActiveProfileFilename] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadResumes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchResumes();
      setResumes(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load resumes.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' && ext !== 'txt') {
        setErrorMessage('Unsupported file format. Please select a .pdf or .txt file.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('File size exceeds the 5 MB limit.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await uploadResumeFile(selectedFile);
      setSuccessMessage(
        `Successfully ingested "${created.filename}" (${created.raw_text.length} characters extracted).`
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadResumes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setDeletingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteResumeById(id);
      setSuccessMessage(`Resume "${name}" deleted.`);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      if (activeResume?.id === id) setActiveResume(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed.';
      setErrorMessage(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleInspect = async (id: string) => {
    setIsFetchingDetail(true);
    setErrorMessage(null);
    try {
      const detail = await fetchResumeById(id);
      setActiveResume(detail);
      setIsCopied(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve resume text.';
      setErrorMessage(msg);
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleCopyText = () => {
    if (!activeResume) return;
    navigator.clipboard.writeText(activeResume.raw_text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenIntelligence = async (id: string, name: string) => {
    setParsingResumeId(id);
    setActiveProfileFilename(name);
    setErrorMessage(null);
    try {
      // Check if already parsed, or parse automatically
      let profile: ParsedResumeResponse;
      try {
        profile = await fetchParsedResume(id);
      } catch {
        // Not yet parsed, run parse
        profile = await parseResume(id);
      }
      setActiveParsedProfile(profile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract structured intelligence.';
      setErrorMessage(msg);
    } finally {
      setParsingResumeId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Resume Vault & Ingestion
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Phase 2A Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Upload candidate resumes (PDF / TXT). Extracts text and stores metadata for AI matching.
          </p>
        </div>

        <button
          onClick={loadResumes}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Upload Dropzone Card */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-sm">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <FileUp className="h-4 w-4 text-indigo-400" />
            <span>Upload New Resume</span>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              selectedFile
                ? 'border-indigo-500/60 bg-indigo-950/20'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center mb-3">
              <Upload className="h-5 w-5" />
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-indigo-400 font-mono">
                  {formatFileSize(selectedFile.size)} • Click to choose a different file
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-300">
                  Click to select or drag and drop your resume
                </p>
                <p className="text-xs text-slate-500">
                  Supported formats: <span className="text-slate-400 font-medium">PDF, TXT</span> (Max 5 MB)
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Scanned / image-only PDFs requiring OCR are not supported in Phase 2A.</span>
            </div>

            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Processing & Extracting...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload & Ingest</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Resumes List Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <span>Stored Resumes ({resumes.length})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            <span>Loading resume vault...</span>
          </div>
        ) : resumes.length === 0 ? (
          <div className="rounded-xl bg-slate-900/40 border border-slate-800/80 p-10 text-center space-y-2">
            <FileCode className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No resumes stored yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your first PDF or plain-text resume above to extract its structural text.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Date Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {resumes.map((resume) => (
                  <tr key={resume.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-xs">{resume.filename}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`uppercase text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          resume.file_type === 'pdf'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {resume.file_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {formatFileSize(resume.file_size)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(resume.created_at).toLocaleDateString()} {new Date(resume.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenIntelligence(resume.id, resume.filename)}
                        disabled={parsingResumeId === resume.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition-colors disabled:opacity-50"
                      >
                        {parsingResumeId === resume.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                        )}
                        <span>Intelligence</span>
                      </button>

                      <button
                        onClick={() => handleInspect(resume.id)}
                        disabled={isFetchingDetail}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Inspect Text</span>
                      </button>

                      <button
                        onClick={() => handleDelete(resume.id, resume.filename)}
                        disabled={deletingId === resume.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 transition-colors disabled:opacity-50"
                      >
                        {deletingId === resume.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        )}
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Text Inspection Modal */}
      {activeResume && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base truncate max-w-md">
                    {activeResume.filename}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {formatFileSize(activeResume.file_size)} • {activeResume.raw_text.split(/\s+/).filter(Boolean).length} words • {activeResume.raw_text.length} characters
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setActiveResume(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950/70 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
              {activeResume.raw_text}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Resume ID: <code className="text-slate-400">{activeResume.id}</code></span>
              <button
                onClick={() => setActiveResume(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Resume Intelligence Modal (Phase 2B) */}
      {activeParsedProfile && (
        <ResumeIntelligenceModal
          profile={activeParsedProfile}
          filename={activeProfileFilename}
          onClose={() => setActiveParsedProfile(null)}
          onProfileUpdated={(updated) => setActiveParsedProfile(updated)}
        />
      )}
    </div>
  );
};
