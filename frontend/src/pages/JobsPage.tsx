import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Briefcase,
  Upload,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FileUp,
  MapPin,
  Building,
  Info,
} from 'lucide-react';
import {
  JobSummary,
  JobDetail,
  ParsedJobResponse,
} from '../types/job';
import {
  fetchJobs,
  fetchJobById,
  createJobFromText,
  uploadJobFile,
  deleteJobById,
  fetchParsedJob,
  parseJob,
} from '../services/jobService';
import { JobIntelligenceModal } from '../components/JobIntelligenceModal';
import {
  Button,
  Badge,
  Modal,
  ConfirmDialog,
  useToast,
  TableRowSkeleton,
  EmptyState,
} from '../components/ui';

export const JobsPage: React.FC = () => {
  const { addToast } = useToast();

  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Ingestion Mode ('text' | 'upload')
  const [ingestMode, setIngestMode] = useState<'text' | 'upload'>('text');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [jobCompany, setJobCompany] = useState<string>('');
  const [jobLocation, setJobLocation] = useState<string>('');
  const [jobText, setJobText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Modals & Inspection State
  const [activeJobDetail, setActiveJobDetail] = useState<JobDetail | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Deletion Dialog State
  const [deletingJob, setDeletingJob] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Structured Job Intelligence Modal
  const [activeParsedJob, setActiveParsedJob] = useState<ParsedJobResponse | null>(null);
  const [parsingJobId, setParsingJobId] = useState<string | null>(null);
  const [activeJobTitle, setActiveJobTitle] = useState<string>('');

  // Alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadJobs = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const data = await fetchJobs(page, pageSize);
      setJobs(data.items);
      setTotalJobs(data.total);
      setCurrentPage(data.page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load job descriptions.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, addToast]);

  useEffect(() => {
    loadJobs(currentPage);
  }, [loadJobs, currentPage]);

  const validateAndSelectFile = (file: File) => {
    setErrorMessage(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'txt') {
      const err = 'Unsupported format. Please select a .pdf or .txt document.';
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

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let created: JobDetail;
      if (ingestMode === 'text') {
        if (!jobText.trim()) {
          setErrorMessage('Please enter the job description text.');
          setIsSubmitting(false);
          return;
        }
        created = await createJobFromText(jobText, jobTitle, jobCompany, jobLocation);
      } else {
        if (!selectedFile) {
          setErrorMessage('Please select a file to upload.');
          setIsSubmitting(false);
          return;
        }
        created = await uploadJobFile(selectedFile, jobTitle, jobCompany, jobLocation);
      }

      addToast(
        `Successfully ingested job "${created.title || 'Job Posting'}" (${created.raw_text.length.toLocaleString()} characters).`,
        'success'
      );
      // Reset inputs
      setJobText('');
      setJobTitle('');
      setJobCompany('');
      setJobLocation('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadJobs(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to ingest job description.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteJob = async () => {
    if (!deletingJob) return;

    setIsDeleting(true);
    try {
      await deleteJobById(deletingJob.id);
      addToast(`Job "${deletingJob.title}" deleted successfully.`, 'success');
      if (activeJobDetail?.id === deletingJob.id) setActiveJobDetail(null);
      if (activeParsedJob?.job_id === deletingJob.id) setActiveParsedJob(null);
      setDeletingJob(null);
      await loadJobs(currentPage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete job description.';
      addToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewRawText = async (id: string) => {
    setIsFetchingDetail(true);
    setErrorMessage(null);
    try {
      const detail = await fetchJobById(id);
      setActiveJobDetail(detail);
      setIsCopied(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch job content.';
      addToast(msg, 'error');
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleOpenIntelligence = async (job: JobSummary) => {
    setParsingJobId(job.id);
    setActiveJobTitle(job.title || 'Job Requirements');
    try {
      let parsed: ParsedJobResponse;
      try {
        parsed = await fetchParsedJob(job.id);
      } catch {
        // If 404, parse first
        parsed = await parseJob(job.id);
        addToast('Structured job requirements extracted', 'success');
      }
      setActiveParsedJob(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve job intelligence.';
      addToast(msg, 'error');
    } finally {
      setParsingJobId(null);
    }
  };

  const handleCopyText = async () => {
    if (!activeJobDetail) return;
    try {
      await navigator.clipboard.writeText(activeJobDetail.raw_text);
      setIsCopied(true);
      addToast('Job description text copied to clipboard', 'info', 2000);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const totalPages = Math.ceil(totalJobs / pageSize) || 1;

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#21262d] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Job Target Workspace
            </h1>
            <Badge variant="teal" icon={<CheckCircle2 className="h-3 w-3" />}>
              Active Roles
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ingest and parse job postings to extract mandatory skills, preferred qualifications, and experience thresholds.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadJobs(currentPage)}
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

      {/* Ingestion Form Card */}
      <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#21262d]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Ingest Target Job Posting</h2>
              <p className="text-xs text-slate-400">Direct text entry or PDF / TXT upload with local OCR support</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setIngestMode('text');
                setErrorMessage(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                ingestMode === 'text'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              id="tab-paste-text"
            >
              Paste Text
            </button>
            <button
              type="button"
              onClick={() => {
                setIngestMode('upload');
                setErrorMessage(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                ingestMode === 'upload'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              id="tab-upload-file"
            >
              Upload Document
            </button>
          </div>
        </div>

        <form onSubmit={handleCreateJob} className="space-y-4">
          {/* Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Role Title (Optional)
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/60"
                id="job-title-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Company (Optional)
              </label>
              <input
                type="text"
                value={jobCompany}
                onChange={(e) => setJobCompany(e.target.value)}
                placeholder="e.g. Stripe, Linear"
                className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/60"
                id="job-company-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Location (Optional)
              </label>
              <input
                type="text"
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                placeholder="e.g. Remote / San Francisco, CA"
                className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/60"
                id="job-location-input"
              />
            </div>
          </div>

          {/* Mode Body */}
          {ingestMode === 'text' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Job Description Text *
              </label>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                rows={6}
                placeholder="Paste the complete job posting here (including requirements, responsibilities, preferred qualifications, and salary disclosures)..."
                className="w-full px-3 py-2.5 text-xs font-mono bg-[#0d1117] border border-[#30363d] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/60 leading-relaxed resize-y"
                id="job-text-input"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Upload File (.pdf or .txt) *
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.length) validateAndSelectFile(e.dataTransfer.files[0]);
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
                  isDragging
                    ? 'border-brand-500 bg-brand-500/10'
                    : selectedFile
                    ? 'border-brand-500/50 bg-brand-500/5'
                    : 'border-[#30363d] hover:border-[#444c56] bg-[#0d1117]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileUp className="h-8 w-8 text-brand-400 mx-auto mb-2" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-100">{selectedFile.name}</p>
                    <p className="text-[11px] text-brand-400 font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop to change
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      Click to choose a file or drag and drop here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      PDF and TXT supported (Max 5 MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              <span>Job requirements are segmented into Mandatory vs Preferred automatically.</span>
            </span>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              icon={<Upload className="h-3.5 w-3.5" />}
              id="submit-job-btn"
            >
              {isSubmitting ? 'Ingesting...' : 'Ingest Job Posting'}
            </Button>
          </div>
        </form>
      </div>

      {/* Jobs Table Card */}
      <div className="rounded-xl bg-[#161b22] border border-[#30363d] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-brand-400" />
              Job Postings List
            </h2>
            <Badge variant="muted">{totalJobs}</Badge>
          </div>
          <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
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
        ) : jobs.length === 0 ? (
          <EmptyState
            variant="default"
            title="No job descriptions stored yet"
            description="Paste or upload target job postings above to analyze requirements and compare with candidate resumes."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Upload className="h-3.5 w-3.5" />}
                onClick={() => {
                  setIngestMode('text');
                  const el = document.getElementById('job-text-input');
                  el?.focus();
                }}
              >
                Add Target Job
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#21262d] bg-[#0d1117]/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Title / Role</th>
                  <th className="py-3 px-4">Company & Location</th>
                  <th className="py-3 px-4">Extracted Length</th>
                  <th className="py-3 px-4">Date Ingested</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] text-slate-300">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[#1c2128]/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-brand-400 shrink-0" />
                        <span className="truncate max-w-xs">{job.title || 'Untitled Role'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="space-y-0.5">
                        {job.company && (
                          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                            <Building className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{job.company}</span>
                          </div>
                        )}
                        {job.location && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>{job.location}</span>
                          </div>
                        )}
                        {!job.company && !job.location && (
                          <span className="text-slate-500 italic">Not specified</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {job.file_size < 1024 ? `${job.file_size} B` : `${(job.file_size / 1024).toFixed(1)} KB`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Intelligence action */}
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleOpenIntelligence(job)}
                        loading={parsingJobId === job.id}
                        icon={<Sparkles className="h-3 w-3 text-brand-400" />}
                        id={`intel-job-btn-${job.id}`}
                      >
                        Intelligence
                      </Button>

                      {/* Inspect Raw Text */}
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleViewRawText(job.id)}
                        disabled={isFetchingDetail}
                        icon={<Eye className="h-3 w-3" />}
                        id={`inspect-job-btn-${job.id}`}
                      >
                        Inspect
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => setDeletingJob({ id: job.id, title: job.title || 'Untitled Role' })}
                        icon={<Trash2 className="h-3 w-3" />}
                        id={`delete-job-btn-${job.id}`}
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-[#21262d] flex items-center justify-between text-xs text-slate-400">
            <span>Showing {jobs.length} of {totalJobs} jobs</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="xs"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                icon={<ChevronLeft className="h-3.5 w-3.5" />}
                id="prev-page-btn"
              >
                Previous
              </Button>
              <span className="font-mono">{currentPage} / {totalPages}</span>
              <Button
                variant="ghost"
                size="xs"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                iconRight={<ChevronRight className="h-3.5 w-3.5" />}
                id="next-page-btn"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Raw Extracted Text Modal */}
      {activeJobDetail && (
        <Modal
          isOpen={true}
          onClose={() => setActiveJobDetail(null)}
          title={activeJobDetail.title || 'Job Description Raw Content'}
          subtitle={`${activeJobDetail.company ? `${activeJobDetail.company} • ` : ''}${activeJobDetail.raw_text.length.toLocaleString()} characters`}
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
              <span>Job ID: <code className="text-slate-300 font-mono">{activeJobDetail.id}</code></span>
              <Button variant="secondary" size="xs" onClick={() => setActiveJobDetail(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="p-6 bg-[#0d1117] font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text max-h-[60vh] overflow-y-auto">
            {activeJobDetail.raw_text}
          </div>
        </Modal>
      )}

      {/* Safe Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingJob !== null}
        title="Delete Job Description"
        description={`Are you sure you want to permanently delete "${deletingJob?.title}"? Any match reports referencing this job description will be affected.`}
        confirmLabel="Delete Job"
        variant="danger"
        loading={isDeleting}
        onConfirm={confirmDeleteJob}
        onCancel={() => setDeletingJob(null)}
      />

      {/* Structured Job Intelligence Modal */}
      {activeParsedJob && (
        <JobIntelligenceModal
          profile={activeParsedJob}
          title={activeJobTitle}
          onClose={() => setActiveParsedJob(null)}
          onProfileUpdated={(updated) => setActiveParsedJob(updated)}
        />
      )}
    </div>
  );
};
