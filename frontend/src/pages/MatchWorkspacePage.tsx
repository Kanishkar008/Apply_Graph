import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  FileText,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  RefreshCw,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { ResumeSummary } from '../types/resume';
import { JobSummary } from '../types/job';
import { MatchReportResponse, MatchReportSummary } from '../types/match';
import { fetchResumes } from '../services/resumeService';
import { fetchJobs } from '../services/jobService';
import {
  createMatchReport,
  fetchMatchReports,
  fetchMatchReportById,
  deleteMatchReport,
} from '../services/matchService';
import { MatchReportModal } from '../components/MatchReportModal';
import {
  Button,
  Badge,
  ScoreRing,
  ConfirmDialog,
  useToast,
  TableRowSkeleton,
  EmptyState,
} from '../components/ui';

export const MatchWorkspacePage: React.FC = () => {
  const { addToast } = useToast();

  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [matchReports, setMatchReports] = useState<MatchReportSummary[]>([]);

  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  // Deletion Dialog State
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Active / Last generated report modal state
  const [activeReport, setActiveReport] = useState<MatchReportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const [resumesList, jobsList, matchesList] = await Promise.all([
        fetchResumes(),
        fetchJobs(1, 100),
        fetchMatchReports(1, 50),
      ]);
      setResumes(resumesList);
      setJobs(jobsList.items);
      setMatchReports(matchesList.items);

      if (resumesList.length > 0 && !selectedResumeId) {
        setSelectedResumeId(resumesList[0].id);
      }
      if (jobsList.items.length > 0 && !selectedJobId) {
        setSelectedJobId(jobsList.items[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load matching workspace data.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedResumeId, selectedJobId, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResumeId || !selectedJobId) {
      setErrorMessage('Please select both a candidate resume and a job description.');
      return;
    }

    setIsMatching(true);
    setErrorMessage(null);

    try {
      const report = await createMatchReport(selectedResumeId, selectedJobId, true);
      setActiveReport(report);
      addToast(
        `Evaluation complete: Qualification Index ${report.overall_score}%`,
        'success'
      );
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate match report.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setIsMatching(false);
    }
  };

  const handleOpenReport = async (matchId: string) => {
    try {
      const report = await fetchMatchReportById(matchId);
      setActiveReport(report);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve match report.';
      addToast(msg, 'error');
    }
  };

  const confirmDeleteReport = async () => {
    if (!deletingReportId) return;

    setIsDeleting(true);
    try {
      await deleteMatchReport(deletingReportId);
      addToast('Match report deleted successfully.', 'success');
      if (activeReport?.id === deletingReportId) setActiveReport(null);
      setDeletingReportId(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete report.';
      addToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getResumeName = (id: string) => {
    const r = resumes.find((res) => res.id === id);
    return r ? r.filename : id.slice(0, 8);
  };

  const getJobTitle = (id: string) => {
    const j = jobs.find((jb) => jb.id === id);
    return j ? (j.title || 'Target Job') : id.slice(0, 8);
  };

  const selectedResume = resumes.find((r) => r.id === selectedResumeId);
  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#21262d] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Explainable Job Matching
            </h1>
            <Badge variant="brand" icon={<Sparkles className="h-3 w-3" />}>
              Flagship Engine
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Compare candidate profiles against job requirements with deterministic scoring and dual-source evidence provenance.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadData()}
          loading={isLoadingHistory}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          id="refresh-matches-btn"
        >
          Refresh
        </Button>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Flagship Comparison Setup Card */}
      <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#21262d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Configure Match Evaluation</h2>
              <p className="text-xs text-slate-400">
                Select a candidate resume and target role to generate verified evidence coverage
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Deterministic Engine v1
          </span>
        </div>

        <form onSubmit={handleRunMatch} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Candidate Resume Panel */}
            <div className="space-y-3 p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="select-resume"
                  className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <FileText className="h-4 w-4 text-brand-400" />
                  Candidate Resume
                </label>
                <span className="text-[11px] text-slate-400">{resumes.length} available</span>
              </div>

              <select
                id="select-resume"
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500/60"
              >
                {resumes.length === 0 ? (
                  <option value="">No resumes found (upload in Resumes page first)</option>
                ) : (
                  resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.filename} ({r.file_type.toUpperCase()}, {(r.file_size / 1024).toFixed(1)} KB)
                    </option>
                  ))
                )}
              </select>

              {/* Resume summary preview */}
              {selectedResume && (
                <div className="pt-2 border-t border-[#21262d] flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[200px] text-slate-300 font-medium">
                    {selectedResume.filename}
                  </span>
                  <span>Uploaded {new Date(selectedResume.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Target Job Panel */}
            <div className="space-y-3 p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="select-job"
                  className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Briefcase className="h-4 w-4 text-brand-400" />
                  Target Job Posting
                </label>
                <span className="text-[11px] text-slate-400">{jobs.length} available</span>
              </div>

              <select
                id="select-job"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500/60"
              >
                {jobs.length === 0 ? (
                  <option value="">No jobs found (ingest in Jobs page first)</option>
                ) : (
                  jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title || 'Untitled Role'} {j.company ? `• ${j.company}` : ''}
                    </option>
                  ))
                )}
              </select>

              {/* Job summary preview */}
              {selectedJob && (
                <div className="pt-2 border-t border-[#21262d] flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[200px] text-slate-300 font-medium">
                    {selectedJob.company ? `${selectedJob.company} • ` : ''}{selectedJob.title || 'Role'}
                  </span>
                  <span>{(selectedJob.file_size / 1024).toFixed(1)} KB</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0" />
              <span>Full provenance tracking with verbatim quotes from both documents.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isMatching || resumes.length === 0 || jobs.length === 0}
              loading={isMatching}
              icon={<Sparkles className="h-4 w-4" />}
              id="run-match-btn"
              className="w-full sm:w-auto"
            >
              {isMatching ? 'Evaluating Evidence Coverage...' : 'Evaluate Match & Provenance'}
            </Button>
          </div>
        </form>
      </div>

      {/* Match Reports History Card */}
      <div className="rounded-xl bg-[#161b22] border border-[#30363d] overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#21262d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand-400" />
              Evaluation History
            </h2>
            <Badge variant="muted">{matchReports.length}</Badge>
          </div>
          <span className="text-xs text-slate-400">Sorted by most recent</span>
        </div>

        {isLoadingHistory ? (
          <div className="p-6">
            <table className="w-full">
              <tbody>
                <TableRowSkeleton cols={6} />
                <TableRowSkeleton cols={6} />
                <TableRowSkeleton cols={6} />
              </tbody>
            </table>
          </div>
        ) : matchReports.length === 0 ? (
          <EmptyState
            variant="default"
            title="No match evaluations generated yet"
            description="Select a candidate resume and a job posting above to compute qualification index and inspect evidence."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles className="h-3.5 w-3.5" />}
                onClick={() => {
                  const btn = document.getElementById('run-match-btn');
                  btn?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Run First Match
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#21262d] bg-[#0d1117]/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Candidate Resume</th>
                  <th className="py-3 px-4">Target Job</th>
                  <th className="py-3 px-4">Qualification Index</th>
                  <th className="py-3 px-4">Evidence Status</th>
                  <th className="py-3 px-4">Evaluated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] text-slate-300">
                {matchReports.map((report) => (
                  <tr key={report.id} className="hover:bg-[#1c2128]/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-brand-400 shrink-0" />
                        <span className="truncate max-w-xs">{getResumeName(report.resume_id)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-teal-400 shrink-0" />
                        <span className="truncate max-w-xs">{getJobTitle(report.job_id)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <ScoreRing
                          score={report.overall_score}
                          size="sm"
                          provisional={report.is_provisional}
                        />
                        <span className="text-slate-100">{report.overall_score}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {report.is_provisional ? (
                        <Badge variant="amber" icon={<AlertTriangle className="h-3 w-3" />}>
                          Provisional
                        </Badge>
                      ) : (
                        <Badge variant="teal" icon={<CheckCircle2 className="h-3 w-3" />}>
                          Verified
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleOpenReport(report.id)}
                        icon={<Eye className="h-3 w-3" />}
                        id={`view-match-btn-${report.id}`}
                      >
                        Inspect Breakdown
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => setDeletingReportId(report.id)}
                        icon={<Trash2 className="h-3 w-3" />}
                        id={`delete-match-btn-${report.id}`}
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

      {/* Safe Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingReportId !== null}
        title="Delete Match Report"
        description="Are you sure you want to delete this match evaluation report? The underlying resume and job posting will not be affected."
        confirmLabel="Delete Report"
        variant="danger"
        loading={isDeleting}
        onConfirm={confirmDeleteReport}
        onCancel={() => setDeletingReportId(null)}
      />

      {/* Flagship Match Report Modal */}
      {activeReport && (
        <MatchReportModal
          report={activeReport}
          resumeFilename={getResumeName(activeReport.resume_id)}
          jobTitle={getJobTitle(activeReport.job_id)}
          onClose={() => setActiveReport(null)}
          onReportUpdated={(updated) => setActiveReport(updated)}
        />
      )}
    </div>
  );
};
