import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  Sparkles,
  FileText,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
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

export const MatchWorkspacePage: React.FC = () => {
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [matchReports, setMatchReports] = useState<MatchReportSummary[]>([]);

  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [activeReport, setActiveReport] = useState<MatchReportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load matching workspace data.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedResumeId, selectedJobId]);

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
    setSuccessMessage(null);

    try {
      const report = await createMatchReport(selectedResumeId, selectedJobId, true);
      setActiveReport(report);
      setSuccessMessage(`Match evaluation complete: Qualification Index ${report.overall_score}%`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate match report.');
    } finally {
      setIsMatching(false);
    }
  };

  const handleOpenReport = async (matchId: string) => {
    try {
      const report = await fetchMatchReportById(matchId);
      setActiveReport(report);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to retrieve match report.');
    }
  };

  const handleDeleteReport = async (matchId: string) => {
    if (!window.confirm('Delete this match report?')) return;

    setDeletingId(matchId);
    try {
      await deleteMatchReport(matchId);
      setSuccessMessage('Match report deleted.');
      if (activeReport?.id === matchId) setActiveReport(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete report.');
    } finally {
      setDeletingId(null);
    }
  };

  const getResumeName = (id: string) => {
    const r = resumes.find((res) => res.id === id);
    return r ? r.filename : id.slice(0, 8);
  };

  const getJobTitle = (id: string) => {
    const j = jobs.find((jb) => jb.id === id);
    return j ? (j.title || 'Job') : id.slice(0, 8);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Explainable Job Matching
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Compare candidate resumes against job descriptions with deterministic scoring and dual-source evidence provenance.
        </p>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl flex items-start space-x-3 text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{errorMessage}</div>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-start space-x-3 text-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{successMessage}</div>
        </div>
      )}

      {/* Comparison Setup Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">Run New Match Evaluation</h2>
            <p className="text-xs text-slate-400">Select a candidate resume and a job description to calculate evidence coverage</p>
          </div>
        </div>

        <form onSubmit={handleRunMatch} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resume selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center">
                <FileText className="w-4 h-4 mr-1.5 text-indigo-400" />
                Select Candidate Resume
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                id="select-resume"
              >
                {resumes.length === 0 ? (
                  <option value="">No resumes available (upload in Resumes page first)</option>
                ) : (
                  resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.filename} ({r.file_type.toUpperCase()}, {(r.file_size / 1024).toFixed(1)} KB)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Job selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center">
                <Briefcase className="w-4 h-4 mr-1.5 text-indigo-400" />
                Select Job Description
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                id="select-job"
              >
                {jobs.length === 0 ? (
                  <option value="">No job descriptions available (ingest in Jobs page first)</option>
                ) : (
                  jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title || 'Untitled Role'} {j.company ? `• ${j.company}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isMatching || resumes.length === 0 || jobs.length === 0}
              className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              id="run-match-btn"
            >
              {isMatching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Evaluate Match & Provenance
            </button>
          </div>
        </form>
      </div>

      {/* Reports History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Match Reports History</h2>
            <p className="text-xs text-slate-400">Total: {matchReports.length} reports generated</p>
          </div>
          <button
            onClick={() => loadData()}
            disabled={isLoadingHistory}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh reports"
            id="refresh-matches-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {isLoadingHistory ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            <p className="text-sm">Loading match reports...</p>
          </div>
        ) : matchReports.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Scale className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-medium text-slate-400">No match evaluations run yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Select a candidate and job description above to calculate qualification match.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Candidate Resume</th>
                  <th className="py-3 px-4">Job Description</th>
                  <th className="py-3 px-4">Qualification Index</th>
                  <th className="py-3 px-4">Evidence Status</th>
                  <th className="py-3 px-4">Generated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {matchReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-100">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{getResumeName(report.resume_id)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{getJobTitle(report.job_id)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-sm text-indigo-300">
                      {report.overall_score}%
                    </td>
                    <td className="py-3 px-4">
                      {report.is_provisional ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
                          Provisional
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                          Verified
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReport(report.id)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md transition-colors"
                        title="View Detailed Match Breakdown"
                        id={`view-match-btn-${report.id}`}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Inspect
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        disabled={deletingId === report.id}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
                        title="Delete Match Report"
                        id={`delete-match-btn-${report.id}`}
                      >
                        {deletingId === report.id ? (
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
      </div>

      {/* Match Report Detail Modal */}
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
