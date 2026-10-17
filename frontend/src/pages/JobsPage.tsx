import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Briefcase,
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
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileUp,
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

export const JobsPage: React.FC = () => {
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

  // Modals & Inspection State
  const [activeJobDetail, setActiveJobDetail] = useState<JobDetail | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Structured Job Intelligence Modal
  const [activeParsedJob, setActiveParsedJob] = useState<ParsedJobResponse | null>(null);
  const [parsingJobId, setParsingJobId] = useState<string | null>(null);
  const [activeJobTitle, setActiveJobTitle] = useState<string>('');

  // Alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    loadJobs(currentPage);
  }, [loadJobs, currentPage]);

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

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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

      setSuccessMessage(`Successfully ingested job "${created.title || 'Job'}" (${created.raw_text.length} characters).`);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title?: string | null) => {
    if (!window.confirm(`Are you sure you want to delete "${title || 'this job'}"?`)) {
      return;
    }

    setDeletingId(id);
    setErrorMessage(null);
    try {
      await deleteJobById(id);
      setSuccessMessage('Job description deleted successfully.');
      if (activeJobDetail?.id === id) setActiveJobDetail(null);
      if (activeParsedJob?.job_id === id) setActiveParsedJob(null);
      await loadJobs(currentPage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete job description.';
      setErrorMessage(msg);
    } finally {
      setDeletingId(null);
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
      setErrorMessage(msg);
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleOpenIntelligence = async (job: JobSummary) => {
    setParsingJobId(job.id);
    setActiveJobTitle(job.title || 'Job Requirements');
    setErrorMessage(null);
    try {
      let parsed: ParsedJobResponse;
      try {
        parsed = await fetchParsedJob(job.id);
      } catch (err: unknown) {
        // If 404, parse first
        parsed = await parseJob(job.id);
      }
      setActiveParsedJob(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve job intelligence.';
      setErrorMessage(msg);
    } finally {
      setParsingJobId(null);
    }
  };

  const handleCopyText = async () => {
    if (!activeJobDetail) return;
    try {
      await navigator.clipboard.writeText(activeJobDetail.raw_text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const totalPages = Math.ceil(totalJobs / pageSize) || 1;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Job Descriptions
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Create, ingest, parse, and review structured job requirements with verifiable evidence spans.
        </p>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl flex items-start space-x-3 text-red-200">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-start space-x-3 text-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ingestion Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Ingest Job Description</h2>
              <p className="text-xs text-slate-400">Paste text or upload PDF/TXT documents (OCR supported)</p>
            </div>
          </div>

          <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => {
                setIngestMode('text');
                setErrorMessage(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                ingestMode === 'text'
                  ? 'bg-indigo-600 text-white shadow-sm'
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
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                ingestMode === 'upload'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              id="tab-upload-file"
            >
              Upload Document
            </button>
          </div>
        </div>

        <form onSubmit={handleCreateJob} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Job Title (Optional)
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                id="job-title-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Company (Optional)
              </label>
              <input
                type="text"
                value={jobCompany}
                onChange={(e) => setJobCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                id="job-company-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Location (Optional)
              </label>
              <input
                type="text"
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                placeholder="e.g. Remote / San Francisco, CA"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                id="job-location-input"
              />
            </div>
          </div>

          {ingestMode === 'text' ? (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Job Description Text *
              </label>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                rows={6}
                placeholder="Paste the complete job description text here, including requirements, responsibilities, and qualifications..."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                id="job-raw-text-textarea"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Upload File (.pdf, .txt) *
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.txt"
                  className="hidden"
                  id="job-file-upload-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <FileUp className="w-4 h-4 mr-2 text-indigo-400" />
                  Select File
                </button>
                <span className="text-xs text-slate-400">
                  {selectedFile ? selectedFile.name : 'No file chosen (PDF, TXT up to 5MB)'}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              id="submit-job-btn"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {ingestMode === 'text' ? 'Ingest Job Description' : 'Upload & Process Document'}
            </button>
          </div>
        </form>
      </div>

      {/* Jobs Collection Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Ingested Job Descriptions</h2>
              <p className="text-xs text-slate-400">Total: {totalJobs} jobs stored</p>
            </div>
          </div>

          <button
            onClick={() => loadJobs(currentPage)}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh list"
            id="refresh-jobs-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            <p className="text-sm">Loading job descriptions...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Briefcase className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-medium text-slate-400">No job descriptions ingested yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Use the form above to paste a job description or upload a PDF/TXT document.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Job Title & Details</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-100">
                      <div className="font-semibold text-sm text-slate-100">{job.title || 'Untitled Role'}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{job.id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{job.company || '—'}</td>
                    <td className="py-3 px-4 text-slate-300">{job.location || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {job.source_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {(job.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenIntelligence(job)}
                        disabled={parsingJobId === job.id}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md transition-colors"
                        title="Extract & Inspect Job Requirements"
                        id={`job-intelligence-btn-${job.id}`}
                      >
                        {parsingJobId === job.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 text-indigo-400" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                        )}
                        Intelligence
                      </button>

                      <button
                        onClick={() => handleViewRawText(job.id)}
                        disabled={isFetchingDetail}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                        title="View Raw Text"
                        id={`view-raw-btn-${job.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(job.id, job.title)}
                        disabled={deletingId === job.id}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
                        title="Delete Job"
                        id={`delete-job-btn-${job.id}`}
                      >
                        {deletingId === job.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalJobs > pageSize && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Page {currentPage} of {totalPages} ({totalJobs} total)
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1 || isLoading}
                className="p-1.5 border border-slate-800 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages || isLoading}
                className="p-1.5 border border-slate-800 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Raw Text Modal */}
      {activeJobDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-slate-100">
                  {activeJobDetail.title || 'Job Description Text'}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyText}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                  id="copy-raw-text-btn"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      Copy Text
                    </>
                  )}
                </button>
                <button
                  onClick={() => setActiveJobDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                  id="close-raw-text-modal-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800">
                {activeJobDetail.raw_text}
              </pre>
            </div>
          </div>
        </div>
      )}

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
