import React from 'react';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  breadcrumbs,
  actions,
  className = '',
}) => (
  <div className={`flex items-start justify-between gap-4 mb-6 ${className}`}>
    <div className="min-w-0">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
              <span className={i === breadcrumbs.length - 1 ? 'text-slate-400' : ''}>
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="p-2 rounded-lg bg-[#21262d] border border-[#30363d] text-brand-400 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-100 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
    {actions && (
      <div className="flex items-center gap-2 shrink-0">{actions}</div>
    )}
  </div>
);
