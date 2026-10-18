import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  GitCompare,
  Kanban,
  BarChart3,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Database,
  Cpu,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: 'brand' | 'teal' | 'muted';
}

const mainNavItems: NavItem[] = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Resumes', path: '/resumes', icon: FileText },
  { name: 'Find Jobs', path: '/jobs', icon: Briefcase },
  { name: 'Job Matching', path: '/match', icon: GitCompare, badge: 'Flagship', badgeVariant: 'brand' },
];

const secondaryNavItems: NavItem[] = [
  { name: 'Applications', path: '/applications', icon: Kanban, badge: 'Planned', badgeVariant: 'muted' },
  { name: 'Analytics', path: '/analytics', icon: BarChart3, badge: 'Planned', badgeVariant: 'muted' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50
          bg-[#0d1117] border-r border-[#21262d]
          flex flex-col justify-between
          transition-all duration-200 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
          w-64
        `}
      >
        {/* Top Header & Brand */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#21262d]">
            <NavLink
              to="/"
              className="flex items-center gap-3 group min-w-0"
              title="ApplyGraph — Evidence-Based AI Job Matching"
            >
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-brand-500/25 ring-1 ring-white/10 shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="18" cy="6" r="3" />
                  <path d="M8.5 7.5L15.5 16.5M8.5 6h7M18 8.5v7" strokeLinecap="round" />
                </svg>
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-100 tracking-tight text-sm truncate">
                      ApplyGraph
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300 border border-brand-500/30">
                      SaaS
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    Evidence Matcher
                  </p>
                </div>
              )}
            </NavLink>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#21262d] transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            {/* Main navigation */}
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Platform
                </div>
              )}
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => onClose()}
                    title={isCollapsed ? item.name : undefined}
                    className={({ isActive }) => `
                      flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 rounded-lg font-medium text-xs transition-all duration-150
                      ${
                        isActive
                          ? 'bg-brand-500/15 text-brand-200 border border-brand-500/30 shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-[#161b22]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Secondary navigation / Roadmap */}
            <div className="space-y-1 pt-3 border-t border-[#21262d]">
              {!isCollapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Roadmap
                </div>
              )}
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => onClose()}
                    title={isCollapsed ? item.name : undefined}
                    className={({ isActive }) => `
                      flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 rounded-lg font-medium text-xs transition-all duration-150
                      ${
                        isActive
                          ? 'bg-[#161b22] text-slate-200 border border-[#30363d]'
                          : 'text-slate-300 hover:text-white hover:bg-[#161b22]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#21262d] text-slate-400 border border-[#30363d]">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#21262d] space-y-2">
          {!isCollapsed ? (
            <div className="p-3 rounded-xl bg-[#161b22] border border-[#21262d] text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                  <Cpu className="h-3.5 w-3.5 text-brand-400" /> Core Engine
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#21262d]">
                <span className="flex items-center gap-1">
                  <Database className="h-3 w-3 text-slate-400" /> PostgreSQL
                </span>
                <a
                  href={`${API_BASE_URL}/api/v1/docs`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 font-medium"
                >
                  API Docs <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <a
                href={`${API_BASE_URL}/api/v1/docs`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#161b22] transition-colors"
                title="Swagger API Documentation"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#161b22] transition-colors text-xs gap-1.5"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-[11px] font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
