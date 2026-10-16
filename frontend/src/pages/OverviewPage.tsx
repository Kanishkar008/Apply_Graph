import React from 'react';
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
  Cpu,
  Layers,
  FileCheck,
  Search,
  AlertTriangle,
  Code2,
  ExternalLink,
} from 'lucide-react';
import { UseHealthCheckReturn } from '../hooks/useHealthCheck';
import { API_BASE_URL } from '../services/api';

export const OverviewPage: React.FC = () => {
  const { health } = useOutletContext<{ health: UseHealthCheckReturn }>();
  const {
    status,
    data,
    error,
    latencyMs,
    lastChecked,
    refetch,
    isPolling,
    togglePolling,
  } = health;

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Phase 1 — Project Foundation Established</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Evidence-Based AI Job Matching & Application Tracking
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              ApplyGraph bridges the gap between candidate resumes and job postings by extracting verified proof points, identifying exact skill gaps, and tracking applications with complete provenance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <a
              href="http://localhost:8000/api/v1/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/30 hover:shadow-indigo-500/40"
            >
              <span>Explore Swagger API</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Ping Health Probe</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backend Live Health Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-400" />
              <span>Backend Core Service Status</span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time telemetry from <code className="text-indigo-300 bg-slate-800/80 px-1 py-0.5 rounded">{API_BASE_URL}/api/v1/health</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePolling}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
            >
              {isPolling ? 'Disable Polling' : 'Enable Polling'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Status Card */}
          <div className="md:col-span-2 rounded-xl bg-slate-900/90 border border-slate-800 p-5 shadow-sm">
            {status === 'loading' && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative">
                  <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Contacting Backend API...</p>
                  <p className="text-xs text-slate-400">Querying {API_BASE_URL}/api/v1/health</p>
                </div>
              </div>
            )}

            {status === 'success' && data && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">
                          {data.service}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {data.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Environment: <span className="text-slate-200 font-medium capitalize">{data.environment}</span> • Version: <span className="text-slate-200 font-mono">{data.version}</span>
                      </p>
                    </div>
                  </div>

                  {latencyMs !== null && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Latency</span>
                      <span className="text-sm font-mono font-bold text-emerald-400">
                        {latencyMs} ms
                      </span>
                    </div>
                  )}
                </div>

                {/* Subsystem status badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${data.database.connected ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">PostgreSQL Engine</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${data.database.connected ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>
                          {data.database.connected ? 'Connected' : 'Pending Docker / Standby'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {data.database.details || (data.database.connected ? 'Operational' : 'Database container not running yet')}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200">Server Clock</span>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {new Date(data.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Backend Unreachable</h4>
                    <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">
                      {error || 'Unable to connect to FastAPI at ' + API_BASE_URL}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-900/50 text-xs text-slate-300 space-y-2">
                  <p className="font-semibold text-rose-200">Troubleshooting Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                    <li>Ensure backend server is running: <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">uvicorn app.main:app --port 8000</code></li>
                    <li>Verify <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">VITE_API_BASE_URL</code> points to <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">http://localhost:8000</code></li>
                    <li>Check CORS origins in <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">.env</code> include <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">http://localhost:5173</code></li>
                  </ol>
                  <button
                    onClick={() => refetch()}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Connection</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Inspector Card */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                <Code2 className="h-4 w-4 text-indigo-400" />
                <span>Runtime Parameters</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Target API</span>
                  <span className="font-mono text-indigo-300 text-[11px] truncate max-w-[150px]">
                    {API_BASE_URL}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Frontend Port</span>
                  <span className="font-mono text-slate-200 text-[11px]">5173 (Vite)</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Backend Port</span>
                  <span className="font-mono text-slate-200 text-[11px]">8000 (FastAPI)</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Database Port</span>
                  <span className="font-mono text-slate-200 text-[11px]">5432 (PostgreSQL)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Checked</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {lastChecked ? lastChecked.toLocaleTimeString() : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <a
                href={`${API_BASE_URL}/api/v1/health`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-colors"
              >
                <span>Direct JSON Endpoint</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Product Vision / Evidence-Based Matching Engine Demo */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <span>ApplyGraph Evidence Grounding Engine — Architectural Preview</span>
          </h3>
          <p className="text-xs text-slate-400">
            How ApplyGraph connects resume evidence to requirements (Phase 2 Roadmap Preview)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sample Match Card with Provenance */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Supported Skill
                </span>
                <span className="font-bold text-white text-sm">
                  FastAPI & Python Microservices
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                96% Confidence
              </span>
            </div>

            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-300">Target Requirement:</span> "Experience designing and shipping resilient RESTful APIs in Python with FastAPI or modern ASGI frameworks."
            </p>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300">
                <FileCheck className="h-3.5 w-3.5 text-indigo-400" />
                <span>Extracted Resume Evidence (Staff Engineer @ CloudScale):</span>
              </div>
              <blockquote className="text-xs text-slate-300 italic border-l-2 border-indigo-500 pl-2.5">
                "Architected core ingestion pipeline with FastAPI 0.110 and SQLAlchemy 2.x handling 15M daily requests with sub-40ms latency."
              </blockquote>
            </div>
          </div>

          {/* Sample Gap Card */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Identified Skill Gap
                </span>
                <span className="font-bold text-white text-sm">
                  Kubernetes Cluster Orchestration
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                Actionable Gap
              </span>
            </div>

            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-300">Target Requirement:</span> "Hands-on experience deploying and managing multi-tenant Kubernetes clusters in AWS/GCP."
            </p>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span>Evidence Diagnostic:</span>
              </div>
              <p className="text-xs text-slate-400">
                Docker & Compose experience found; no explicit K8s cluster administration or Helm chart deployment found in parsed experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Module Navigation Cards */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-white">Upcoming Functional Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/resumes"
            className="group p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileCheck className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
              Resumes
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Upload CVs, parse skills, and extract structural career evidence.
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
              <span>View Module</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/jobs"
            className="group p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Search className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-sm group-hover:text-violet-300 transition-colors">
              Find Jobs
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Ingest job postings and break down hard and soft requirements.
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-violet-400">
              <span>View Module</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/applications"
            className="group p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
              Applications
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Kanban application pipeline, interview tracking, and match logs.
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-blue-400">
              <span>View Module</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/analytics"
            className="group p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm"
          >
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Cpu className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
              Analytics
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Skill graph alignment, market demand heatmaps, and ROI metrics.
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <span>View Module</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};
