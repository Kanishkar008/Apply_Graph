import React from 'react';
import {
  Menu,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Database,
  Radio,
} from 'lucide-react';
import { UseHealthCheckReturn } from '../hooks/useHealthCheck';

interface TopNavProps {
  onToggleSidebar: () => void;
  health: UseHealthCheckReturn;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar, health }) => {
  const { status, data, latencyMs, refetch, isPolling, togglePolling } = health;

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left side: mobile toggle & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 hidden sm:inline">
            Workspace
          </span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <h1 className="text-sm sm:text-base font-semibold text-slate-200">
            ApplyGraph Core
          </h1>
        </div>
      </div>

      {/* Right side: Backend Health Pill & Action controls */}
      <div className="flex items-center gap-3">
        {/* Backend health status badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            status === 'loading'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : status === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-950/40'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
          title={
            status === 'success'
              ? `Backend: ${data?.service} (${data?.environment}) - DB: ${
                  data?.database.connected ? 'Connected' : 'Disconnected'
                }`
              : status === 'error'
              ? 'Backend unreachable. Click refresh to retry.'
              : 'Checking backend status...'
          }
        >
          {status === 'loading' && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
              <span>Connecting...</span>
            </>
          )}

          {status === 'success' && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold">API Online</span>
              {latencyMs !== null && (
                <span className="text-[10px] text-emerald-400/80 font-mono hidden md:inline">
                  {latencyMs}ms
                </span>
              )}
              {data?.database.connected ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/40 hidden lg:inline flex items-center gap-1">
                  <Database className="h-2.5 w-2.5 inline" /> DB OK
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-700/40 hidden lg:inline">
                  DB Offline
                </span>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              <span className="font-semibold">Backend Offline</span>
            </>
          )}
        </div>

        {/* Polling indicator button */}
        <button
          onClick={togglePolling}
          className={`p-2 rounded-lg text-xs font-medium border transition-colors hidden sm:flex items-center gap-1.5 ${
            isPolling
              ? 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700/80'
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
          }`}
          title={isPolling ? 'Auto-check enabled (30s)' : 'Auto-check paused'}
        >
          <Radio
            className={`h-3.5 w-3.5 ${
              isPolling ? 'text-indigo-400 animate-pulse' : 'text-slate-500'
            }`}
          />
          <span className="hidden md:inline">
            {isPolling ? 'Live' : 'Paused'}
          </span>
        </button>

        {/* Re-check trigger button */}
        <button
          onClick={() => refetch()}
          disabled={status === 'loading'}
          className="p-2 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/80 hover:bg-slate-700/80 hover:text-white transition-colors disabled:opacity-50"
          title="Refresh Backend Status"
          aria-label="Refresh Backend Status"
        >
          <RefreshCw
            className={`h-4 w-4 ${status === 'loading' ? 'animate-spin text-indigo-400' : ''}`}
          />
        </button>

        {/* User avatar indicator */}
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-800">
          AG
        </div>
      </div>
    </header>
  );
};
