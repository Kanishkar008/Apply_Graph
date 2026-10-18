import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Database,
  Radio,
  ChevronRight,
} from 'lucide-react';
import { UseHealthCheckReturn } from '../hooks/useHealthCheck';

interface TopNavProps {
  onToggleSidebar: () => void;
  health: UseHealthCheckReturn;
}

const routeTitles: Record<string, { title: string; category: string }> = {
  '/': { title: 'Overview', category: 'Platform' },
  '/resumes': { title: 'Resume Vault & Ingestion', category: 'Candidate' },
  '/jobs': { title: 'Job Ingestion & Breakdown', category: 'Target Roles' },
  '/match': { title: 'Explainable Job Matching', category: 'Flagship Engine' },
  '/applications': { title: 'Application Tracking', category: 'Roadmap' },
  '/analytics': { title: 'Market & Skill Analytics', category: 'Roadmap' },
};

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar, health }) => {
  const location = useLocation();
  const currentRoute = routeTitles[location.pathname] || { title: 'Workspace', category: 'ApplyGraph' };
  const { status, data, latencyMs, refetch, isPolling, togglePolling } = health;

  return (
    <header className="sticky top-0 z-30 h-14 bg-[#0d1117]/85 backdrop-blur-md border-b border-[#21262d] px-4 sm:px-6 flex items-center justify-between">
      {/* Left side: mobile toggle & clean breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#161b22] transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs truncate">
          <span className="text-slate-400 font-medium hidden sm:inline">
            {currentRoute.category}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600 hidden sm:inline" />
          <span className="font-semibold text-slate-100 truncate">
            {currentRoute.title}
          </span>
        </nav>
      </div>

      {/* Right side: Real-time Telemetry & Controls */}
      <div className="flex items-center gap-2.5">
        {/* Backend & DB Health Indicator */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            status === 'loading'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : status === 'success'
              ? 'bg-[#161b22] text-slate-200 border-[#30363d]'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
          title={
            status === 'success'
              ? `Backend: ${data?.service} v${data?.version} • DB: ${
                  data?.database.connected ? 'Connected' : 'Offline'
                } • Latency: ${latencyMs ?? '?'}ms`
              : status === 'error'
              ? 'Backend unreachable. Click refresh to retry.'
              : 'Connecting to API...'
          }
        >
          {status === 'loading' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
              <span className="text-[11px]">Connecting...</span>
            </>
          )}

          {status === 'success' && (
            <>
              {/* API Online pill */}
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                API Online
              </span>

              {/* Latency */}
              {latencyMs !== null && (
                <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                  {latencyMs}ms
                </span>
              )}

              {/* Database status separate badge */}
              {data?.database.connected ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 hidden sm:inline-flex items-center gap-1">
                  <Database className="h-2.5 w-2.5" /> DB Connected
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 hidden sm:inline-flex items-center gap-1">
                  <Database className="h-2.5 w-2.5" /> DB Standby
                </span>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-[11px] font-semibold text-rose-300">API Offline</span>
            </>
          )}
        </div>

        {/* Polling live toggle */}
        <button
          onClick={togglePolling}
          className={`p-1.5 rounded-lg text-xs font-medium border transition-colors hidden sm:flex items-center gap-1.5 ${
            isPolling
              ? 'bg-[#161b22] text-slate-300 border-[#30363d] hover:border-[#444c56]'
              : 'bg-[#0d1117] text-slate-500 border-[#21262d] hover:text-slate-300'
          }`}
          title={isPolling ? 'Live polling active (30s interval)' : 'Live polling paused'}
          aria-label={isPolling ? 'Live polling active' : 'Live polling paused'}
        >
          <Radio
            className={`h-3.5 w-3.5 ${
              isPolling ? 'text-brand-400 animate-pulse' : 'text-slate-600'
            }`}
          />
          <span className="text-[11px] hidden lg:inline">
            {isPolling ? 'Live' : 'Paused'}
          </span>
        </button>

        {/* Manual Refresh */}
        <button
          onClick={() => refetch()}
          disabled={status === 'loading'}
          className="p-1.5 rounded-lg bg-[#161b22] text-slate-300 border border-[#30363d] hover:border-[#444c56] hover:text-white transition-colors disabled:opacity-50"
          title="Refresh backend telemetry"
          aria-label="Refresh backend telemetry"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${status === 'loading' ? 'animate-spin text-brand-400' : ''}`}
          />
        </button>

        {/* User Badge */}
        <div
          className="h-7 w-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold text-[11px] flex items-center justify-center ring-1 ring-white/10"
          title="User Workspace"
        >
          AG
        </div>
      </div>
    </header>
  );
};
