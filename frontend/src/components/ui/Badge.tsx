import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Zap, Info } from 'lucide-react';

type BadgeVariant = 'brand' | 'teal' | 'amber' | 'rose' | 'muted' | 'success' | 'blue';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  brand: 'bg-brand-500/10 text-brand-300 border-brand-500/25',
  teal: 'bg-teal-500/10 text-teal-300 border-teal-500/25',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  rose: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
  muted: 'bg-[#21262d] text-slate-400 border-[#30363d]',
  success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'muted',
  children,
  icon,
  className = '',
}) => (
  <span
    className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded-md
      text-[11px] font-semibold border leading-none
      ${variantStyles[variant]}
      ${className}
    `.trim().replace(/\s+/g, ' ')}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    {children}
  </span>
);

type StatusType = 'online' | 'offline' | 'loading' | 'warning' | 'parsed' | 'pending' | 'exact' | 'partial' | 'missing' | 'ambiguous';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusType, { variant: BadgeVariant; icon: React.ReactNode; defaultLabel: string }> = {
  online: { variant: 'success', icon: <CheckCircle2 className="h-3 w-3" />, defaultLabel: 'Online' },
  offline: { variant: 'rose', icon: <XCircle className="h-3 w-3" />, defaultLabel: 'Offline' },
  loading: { variant: 'amber', icon: <Clock className="h-3 w-3" />, defaultLabel: 'Connecting' },
  warning: { variant: 'amber', icon: <AlertTriangle className="h-3 w-3" />, defaultLabel: 'Warning' },
  parsed: { variant: 'teal', icon: <Zap className="h-3 w-3" />, defaultLabel: 'Parsed' },
  pending: { variant: 'muted', icon: <Clock className="h-3 w-3" />, defaultLabel: 'Not Parsed' },
  exact: { variant: 'teal', icon: <CheckCircle2 className="h-3 w-3" />, defaultLabel: 'Match' },
  partial: { variant: 'amber', icon: <Info className="h-3 w-3" />, defaultLabel: 'Partial' },
  missing: { variant: 'rose', icon: <XCircle className="h-3 w-3" />, defaultLabel: 'Missing' },
  ambiguous: { variant: 'amber', icon: <AlertTriangle className="h-3 w-3" />, defaultLabel: 'Ambiguous' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} icon={config.icon} className={className}>
      {label ?? config.defaultLabel}
    </Badge>
  );
};
