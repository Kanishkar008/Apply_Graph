import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  X,
  FileUp,
  Sparkles,
  Search,
  Info,
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
import {
  Button,
  Badge,
  Modal,
  ConfirmDialog,
  useToast,
  TableRowSkeleton,
  EmptyState,
} from '../components/ui';

export const ResumesPage: React.FC = () => {
  const { addToast } = useToast();

  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Deletion modal state
  const [deletingResume, setDeletingResume] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Raw text modal state
  const [activeResume, setActiveResume] = useState<ResumeDetail | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Structured Intelligence modal state
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
      addToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const validateAndSelectFile = (file: File) => {
    setErrorMessage(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'txt') {
      const err = 'Unsupported file format. Please select a .pdf or .txt file.';
      setErrorMessage(err);
      addToast(err, 'error');
      setSelectedFile(null);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      const err = 'File size exceeds the 5 MB limit.';
      setErrorMessage(err);
      addToast(err, 'error');
      setSelectedFile(null);
      return false;
    }
    setSelectedFile(file);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const created = await uploadResumeFile(selectedFile);
      addToast(
        `Successfully ingested "${created.filename}" (${created.raw_text.length.toLocaleString()} characters extracted).`,
        'success'
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadResumes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDeleteResume = async () => {
    if (!deletingResume) return;

    setIsDeleting(true);
    try {
      await deleteResumeById(deletingResume.id);
      addToast(`Resume "${deletingResume.name}" deleted.`, 'success');
      setResumes((prev) => prev.filter((r) => r.id !== deletingResume.id));
      if (activeResume?.id === deletingResume.id) setActiveResume(null);
      setDeletingResume(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed.';
      addToast(msg, 'error');
    } finally {
      setIsDeleting(false);
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
      addToast(msg, 'error');
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleCopyText = () => {
    if (!activeResume) return;
    navigator.clipboard.writeText(activeResume.raw_text);
    setIsCopied(true);
    addToast('Extracted resume text copied to clipboard', 'info', 2000);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenIntelligence = async (id: string, name: string) => {
    setParsingResumeId(id);
    setActiveProfileFilename(name);
    try {
      let profile: ParsedResumeResponse;
      try {
        profile = await fetchParsedResume(id);
      } catch {
        // Not yet parsed, run parse
        profile = await parseResume(id);
        addToast('Structured intelligence extracted from resume', 'success');
      }
      setActiveParsedProfile(profile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract structured intelligence.';
      addToast(msg, 'error');
    } finally {
      setParsingResumeId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredResumes = resumes.filter((r) =>
    r.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#21262d] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Resume Vault & Ingestion
            </h1>
            <Badge variant="teal" icon={<CheckCircle2 className="h-3 w-3" />}>
              Active Vault
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Upload candidate resumes (PDF / TXT). Extracts text and parses skills, education, and source spans.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadResumes}
          loading={isLoading}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-sm">
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

      {/* Upload Dropzone Card */}
      <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-5 shadow-sm">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileUp className="h-4 w-4 text-brand-400" />
              Upload Candidate Document
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Max 5 MB • PDF or TXT</span>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150
              ${
                isDragging
                  ? 'border-brand-500 bg-brand-500/10 scale-[0.99]'
                  : selectedFile
                  ? 'border-brand-500/50 bg-brand-500/5'
                  : 'border-[#30363d] hover:border-[#444c56] bg-[#0d1117]/60'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="h-11 w-11 rounded-xl bg-[#21262d] border border-[#30363d] text-brand-400 mx-auto flex items-center justify-center mb-3">
              <Upload className="h-5 w-5" />
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-100">{selectedFile.name}</p>
                <p className="text-xs text-brand-400 font-mono">
                  {formatFileSize(selectedFile.size)} • Click or drop another file to replace
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  Drag and drop candidate resume here, or <span className="text-brand-400 underline decoration-brand-500/40">browse files</span>
                </p>
                <p className="text-xs text-slate-400">
                  Text-based PDFs and plain-text files supported. Image-only PDFs utilize local Tesseract OCR.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Verbatim evidence offsets are extracted automatically for matching proof.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!selectedFile || isUploading}
              loading={isUploading}
              icon={<Upload className="h-3.5 w-3.5" />}
              className="w-full sm:w-auto"
            >
              {isUploading ? 'Extracting & Ingesting...' : 'Upload & Ingest'}
            </Button>
          </div>
        </form>
      </div>

      {/* Resumes List Table */}
      <div className="rounded-xl bg-[#161b22] border border-[#30363d] overflow-hidden shadow-sm">
        {/* Table Controls */}
        <div className="p-4 border-b border-[#21262d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-400" />
              Stored Resumes
            </h2>
            <Badge variant="muted">{resumes.length}</Badge>
          </div>

          {resumes.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search resumes by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/60"
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-6">
            <table className="w-full">
              <tbody>
                <TableRowSkeleton cols={5} />
                <TableRowSkeleton cols={5} />
                <TableRowSkeleton cols={5} />
              </tbody>
            </table>
          </div>
        ) : resumes.length === 0 ? (
          <EmptyState
            variant="default"
            title="No resumes stored yet"
            description="Upload your first candidate resume above (PDF or TXT) to parse skills and extract evidence spans."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Upload className="h-3.5 w-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Resume
              </Button>
            }
          />
        ) : filteredResumes.length === 0 ? (
          <EmptyState
            variant="search"
            title="No matching resumes"
            description={`No resumes found matching "${searchQuery}".`}
            action={
              <Button variant="ghost" size="xs" onClick={() => setSearchQuery('')}>
                Clear Filter
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#21262d] bg-[#0d1117]/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] text-slate-300">
                {filteredResumes.map((resume) => (
                  <tr key={resume.id} className="hover:bg-[#1c2128]/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-brand-400 shrink-0" />
                      <span className="truncate max-w-xs">{resume.filename}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`uppercase text-[10px] font-bold px-2 py-0.5 rounded border ${
                          resume.file_type === 'pdf'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                            : 'bg-brand-500/10 text-brand-300 border-brand-500/25'
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
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Intelligence action */}
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleOpenIntelligence(resume.id, resume.filename)}
                        loading={parsingResumeId === resume.id}
                        icon={<Sparkles className="h-3 w-3 text-brand-400" />}
                      >
                        Intelligence
                      </Button>

                      {/* Inspect Raw Text */}
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleInspect(resume.id)}
                        disabled={isFetchingDetail}
                        icon={<Eye className="h-3 w-3" />}
                      >
                        Inspect
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => setDeletingResume({ id: resume.id, name: resume.filename })}
                        icon={<Trash2 className="h-3 w-3" />}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Extracted Text Modal */}
      {activeResume && (
        <Modal
          isOpen={true}
          onClose={() => setActiveResume(null)}
          title={activeResume.filename}
          subtitle={`${formatFileSize(activeResume.file_size)} • ${activeResume.raw_text.split(/\s+/).filter(Boolean).length.toLocaleString()} words • ${activeResume.raw_text.length.toLocaleString()} characters`}
          size="xl"
          headerActions={
            <Button
              variant="secondary"
              size="xs"
              onClick={handleCopyText}
              icon={isCopied ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            >
              {isCopied ? 'Copied!' : 'Copy Text'}
            </Button>
          }
          footer={
            <div className="flex items-center justify-between text-xs text-slate-400 w-full">
              <span>Resume ID: <code className="text-slate-300 font-mono">{activeResume.id}</code></span>
              <Button variant="secondary" size="xs" onClick={() => setActiveResume(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="p-6 bg-[#0d1117] font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text max-h-[60vh] overflow-y-auto">
            {activeResume.raw_text}
          </div>
        </Modal>
      )}

      {/* Safe Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingResume !== null}
        title="Delete Resume"
        description={`Are you sure you want to permanently delete "${deletingResume?.name}"? Any match reports referencing this candidate resume will be orphaned.`}
        confirmLabel="Delete Resume"
        variant="danger"
        loading={isDeleting}
        onConfirm={confirmDeleteResume}
        onCancel={() => setDeletingResume(null)}
      />

      {/* Structured Resume Intelligence Modal */}
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
