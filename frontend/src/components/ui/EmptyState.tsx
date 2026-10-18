import React from 'react';
import { FileX, Search, Database, AlertTriangle } from 'lucide-react';

type EmptyStateVariant = 'default' | 'search' | 'error' | 'database';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const defaultIcons: Record<EmptyStateVariant, React.ReactNode> = {
  default: <FileX className="h-8 w-8 text-slate-500" />,
  search: <Search className="h-8 w-8 text-slate-500" />,
  error: <AlertTriangle className="h-8 w-8 text-amber-500" />,
  database: <Database className="h-8 w-8 text-slate-500" />,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'default',
  title,
  description,
  icon,
  action,
  className = '',
}) => (
  <div
    className={`
      flex flex-col items-center justify-center text-center
      py-16 px-6 space-y-4
      ${className}
    `}
  >
    <div className="h-14 w-14 rounded-2xl bg-[#21262d] border border-[#30363d] flex items-center justify-center">
      {icon ?? defaultIcons[variant]}
    </div>
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{description}</p>
      )}
    </div>
    {action && <div>{action}</div>}
  </div>
);
