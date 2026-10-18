import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Server,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Layers,
  FileText,
  Briefcase,
  GitCompare,
  Plus,
  Scale,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { UseHealthCheckReturn } from '../hooks/useHealthCheck';
import { API_BASE_URL } from '../services/api';
import { fetchResumes, fetchParsedResume } from '../services/resumeService';
import { fetchJobs } from '../services/jobService';
import { fetchMatchReports } from '../services/matchService';
import { ResumeSummary } from '../types/resume';
import { JobSummary } from '../types/job';
import { MatchReportSummary } from '../types/match';
import { StatCard, Button, Badge, ScoreRing } from '../components/ui';

export const OverviewPage: React.FC = () => {
  const { health } = useOutletContext<{ health: UseHealthCheckReturn }>();
  const {
    status: healthStatus,
    data: healthData,
    latencyMs,
    refetch: refetchHealth,
    isPolling,
    togglePolling,
  } = health;

  // Real API state
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [matches, setMatches] = useState<MatchReportSummary[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      // 1. Fetch real resumes, jobs, and match reports in parallel
      const [resumesRes, jobsRes, matchesRes] = await Promise.allSettled([
        fetchResumes(),
        fetchJobs(1, 100),
        fetchMatchReports(1, 10),
      ]);

      let loadedResumes: ResumeSummary[] = [];
      if (resumesRes.status === 'fulfilled') {
        loadedResumes = resumesRes.value;
        setResumes(loadedResumes);
      }

      if (jobsRes.status === 'fulfilled') {
        setJobs(jobsRes.value.items);
        setTotalJobs(jobsRes.value.total);
      }

      if (matchesRes.status === 'fulfilled') {
        setMatches(matchesRes.value.items);
        setTotalMatches(matchesRes.value.total);
      }

      // Check how many resumes have parsed intelligence
      if (loadedResumes.length > 0) {
        const parsedChecks = await Promise.allSettled(
          loadedResumes.slice(0, 20).map((r) => fetchParsedResume(r.id))
        );
        const count = parsedChecks.filter((c) => c.status === 'fulfilled').length;
        setParsedCount(count);
      } else {
        setParsedCount(0);
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to query workspace API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const resumeMap = React.useMemo(() => {
    const map = new Map<string, string>();
    resumes.forEach((r) => map.set(r.id, r.filename));
    return map;
  }, [resumes]);

  const jobMap = React.useMemo(() => {
    const map = new Map<string, string>();
    jobs.forEach((j) => map.set(j.id, j.title || 'Job Posting'));
    return map;
  }, [jobs]);

  // Guided workflow step progress
  const hasResumes = resumes.length > 0;
  const hasJobs = totalJobs > 0;
  const hasMatches = totalMatches > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Evidence Workspace
            </h1>
            <Badge variant="brand" icon={<Sparkles className="h-3 w-3" />}>
              Production SaaS
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Deterministic AI job qualification with dual-source proof verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link to="/resumes">
            <Button
              variant="secondary"
              size="sm"
              icon={<FileText className="h-3.5 w-3.5 text-slate-400" />}
            >
              Add Resume
            </Button>
          </Link>
          <Link to="/jobs">
            <Button
              variant="secondary"
              size="sm"
              icon={<Briefcase className="h-3.5 w-3.5 text-slate-400" />}
            >
              Add Job
            </Button>
          </Link>
          <Link to="/match">
            <Button
              variant="primary"
              size="sm"
              icon={<GitCompare className="h-3.5 w-3.5" />}
            >
              Run Match
            </Button>
          </Link>
          <button
            onClick={() => {
              refetchHealth();
              loadDashboardData();
            }}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[#161b22] text-slate-400 hover:text-white border border-[#30363d] hover:border-[#444c56] transition-colors disabled:opacity-50"
            title="Refresh dashboard metrics"
            aria-label="Refresh dashboard metrics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Backend / API Connectivity Notice if offline */}
      {healthStatus === 'error' && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-rose-200">FastAPI Backend Unreachable</p>
            <p className="text-rose-300/80 leading-relaxed">
              Unable to reach backend service at <code className="bg-slate-900/80 px-1 py-0.5 rounded">{API_BASE_URL}</code>. Ensure the FastAPI process is active on port 8000.
            </p>
          </div>
          <Button variant="danger" size="xs" onClick={() => refetchHealth()}>
            Retry
          </Button>
        </div>
      )}

      {apiError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>{apiError}</span>
          </div>
          <button onClick={() => setApiError(null)} className="text-amber-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Key Metrics Grid (Actual API Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Uploaded Resumes"
          value={isLoading ? '—' : resumes.length}
          icon={<FileText className="h-4 w-4" />}
          accent="brand"
          loading={isLoading}
        />
        <StatCard
          label="Parsed Intelligence"
          value={isLoading ? '—' : parsedCount !== null ? `${parsedCount} / ${resumes.length}` : '—'}
          icon={<Zap className="h-4 w-4" />}
          accent="teal"
          loading={isLoading}
        />
        <StatCard
          label="Target Job Postings"
          value={isLoading ? '—' : totalJobs}
          icon={<Briefcase className="h-4 w-4" />}
          accent="muted"
          loading={isLoading}
        />
        <StatCard
          label="Match Evaluations"
          value={isLoading ? '—' : totalMatches}
          icon={<Scale className="h-4 w-4" />}
          accent="amber"
          loading={isLoading}
        />
      </div>

      {/* 3. Guided 3-Step Workflow Card */}
      <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#21262d]">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-400" />
              <span>Evidence Pipeline Workflow</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete these steps to generate deterministic qualification match reports with verbatim proof.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {Number(hasResumes) + Number(hasJobs) + Number(hasMatches)} of 3 Complete
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Add Resume */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              hasResumes
                ? 'bg-[#0d1117]/60 border-teal-500/30'
                : 'bg-[#0d1117] border-[#30363d]'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Step 1
              </span>
              {hasResumes ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {resumes.length} Ingested
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400">Pending</span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-100 mt-2">Add Candidate Resume</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Upload PDF or plain-text CV. Extracts raw text, parsed skills, and verifiable source spans.
            </p>
            <div className="mt-3">
              <Link
                to="/resumes"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300"
              >
                <span>{hasResumes ? 'Manage Resumes' : 'Upload Resume'}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Step 2: Add Target Job */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              hasJobs
                ? 'bg-[#0d1117]/60 border-teal-500/30'
                : hasResumes
                ? 'bg-[#0d1117] border-brand-500/30'
                : 'bg-[#0d1117] border-[#30363d]'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Step 2
              </span>
              {hasJobs ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {totalJobs} Saved
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400">Pending</span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-100 mt-2">Add Job Description</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Paste or upload job posting text. Segregates mandatory requirements from preferred traits.
            </p>
            <div className="mt-3">
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300"
              >
                <span>{hasJobs ? 'Manage Jobs' : 'Ingest Job'}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Step 3: Run Match */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              hasMatches
                ? 'bg-[#0d1117]/60 border-teal-500/30'
                : hasResumes && hasJobs
                ? 'bg-[#0d1117] border-brand-500/40'
                : 'bg-[#0d1117] border-[#30363d]'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Step 3
              </span>
              {hasMatches ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {totalMatches} Evaluated
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400">Ready</span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-100 mt-2">Generate Match Report</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Computes Qualification Index, breaks down requirement coverage, and provides verbatim proof.
            </p>
            <div className="mt-3">
              <Link
                to="/match"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300"
              >
                <span>{hasMatches ? 'View Workspace' : 'Run Match'}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: Recent Match Evaluations & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Recent Match Reports */}
        <div className="lg:col-span-2 rounded-xl bg-[#161b22] border border-[#30363d] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#21262d] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Scale className="h-4 w-4 text-brand-400" />
                <span>Recent Match Evaluations</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Qualification Index scores and evidence provenance
              </p>
            </div>
            {matches.length > 0 && (
              <Link
                to="/match"
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-1"
              >
                <span>All Reports</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-brand-400" />
              <span>Loading recent evaluations...</span>
            </div>
          ) : matches.length === 0 ? (
            <div className="py-12 px-6 text-center space-y-3">
              <Scale className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-200">No match reports yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Once you upload a resume and ingest a job description, generate an explainable match evaluation to view Qualification Index scores here.
              </p>
              <Link to="/match" className="inline-block mt-2">
                <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
                  Run First Match
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#21262d]">
              {matches.slice(0, 5).map((match) => {
                const resumeName = resumeMap.get(match.resume_id) || `Resume ${match.resume_id.slice(0, 8)}`;
                const jobTitle = jobMap.get(match.job_id) || `Job ${match.job_id.slice(0, 8)}`;

                return (
                  <div
                    key={match.id}
                    className="p-4 hover:bg-[#1c2128]/50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 text-xs truncate max-w-[220px]">
                          {resumeName}
                        </span>
                        <span className="text-slate-600 text-xs">vs</span>
                        <span className="font-medium text-slate-300 text-xs truncate max-w-[220px]">
                          {jobTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                        <span>{new Date(match.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        {match.is_provisional ? (
                          <Badge variant="amber" icon={<AlertTriangle className="h-3 w-3" />}>
                            Provisional
                          </Badge>
                        ) : (
                          <Badge variant="teal" icon={<CheckCircle2 className="h-3 w-3" />}>
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <ScoreRing
                        score={match.overall_score}
                        size="sm"
                        label="QI"
                        provisional={match.is_provisional}
                      />
                      <Link to="/match">
                        <Button variant="ghost" size="xs">
                          Inspect
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right (1 col): System Telemetry & Architecture */}
        <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-brand-400" />
                <h2 className="text-sm font-bold text-slate-100">Core Telemetry</h2>
              </div>
              <button
                onClick={togglePolling}
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#21262d] text-slate-400 hover:text-white border border-[#30363d] transition-colors"
              >
                {isPolling ? 'Pause Polling' : 'Enable Polling'}
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {/* Service status */}
              <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
                <span className="text-slate-400">FastAPI Service</span>
                <span className="font-mono text-xs">
                  {healthStatus === 'success' ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Operational
                    </span>
                  ) : healthStatus === 'loading' ? (
                    <span className="text-amber-400">Connecting...</span>
                  ) : (
                    <span className="text-rose-400">Offline</span>
                  )}
                </span>
              </div>

              {/* Database status */}
              <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
                <span className="text-slate-400">PostgreSQL Engine</span>
                <span className="font-mono text-xs">
                  {healthData?.database.connected ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <Database className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Database className="h-3 w-3" /> Standby
                    </span>
                  )}
                </span>
              </div>

              {/* Latency */}
              <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
                <span className="text-slate-400">Roundtrip Latency</span>
                <span className="font-mono text-xs text-slate-200">
                  {latencyMs !== null ? `${latencyMs} ms` : '—'}
                </span>
              </div>

              {/* Environment */}
              <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
                <span className="text-slate-400">Environment</span>
                <span className="font-mono text-xs text-slate-200 capitalize">
                  {healthData?.environment || 'development'}
                </span>
              </div>

              {/* Version */}
              <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
                <span className="text-slate-400">API Version</span>
                <span className="font-mono text-xs text-brand-300">
                  v{healthData?.version || '0.1.0'}
                </span>
              </div>

              {/* Server Clock */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Server Timestamp
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#21262d]">
            <a
              href={`${API_BASE_URL}/api/v1/docs`}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white text-xs font-semibold border border-[#30363d] transition-colors"
            >
              <span>Swagger REST Documentation</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
