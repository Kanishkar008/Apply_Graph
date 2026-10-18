import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, onClick }) => (
  <div
    onClick={onClick}
    className={`
      bg-[#161b22] border border-[#30363d] rounded-xl
      ${hover ? 'hover:border-[#444c56] hover:shadow-card-hover cursor-pointer transition-all duration-150' : ''}
      ${onClick ? 'cursor-pointer' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ')}
  >
    {children}
  </div>
);

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  accent?: 'brand' | 'teal' | 'amber' | 'rose' | 'muted';
  loading?: boolean;
  className?: string;
  href?: string;
  onClick?: () => void;
}

const accentStyles = {
  brand: { bg: 'bg-brand-500/10', border: 'border-brand-500/20', icon: 'text-brand-400', value: 'text-brand-300' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/20', icon: 'text-teal-400', value: 'text-teal-300' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400', value: 'text-amber-300' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: 'text-rose-400', value: 'text-rose-300' },
  muted: { bg: 'bg-[#21262d]', border: 'border-[#30363d]', icon: 'text-slate-400', value: 'text-slate-200' },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  accent = 'muted',
  loading = false,
  className = '',
  onClick,
}) => {
  const a = accentStyles[accent];

  return (
    <div
      onClick={onClick}
      className={`
        bg-[#161b22] border border-[#30363d] rounded-xl p-4
        ${onClick ? 'cursor-pointer hover:border-[#444c56] transition-all duration-150' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`p-2 rounded-lg ${a.bg} border ${a.border} shrink-0`}>
            <span className={a.icon}>{icon}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          {loading ? (
            <div className="mt-1.5 h-6 w-16 rounded bg-[#21262d] animate-pulse" />
          ) : (
            <p className={`text-2xl font-bold mt-0.5 ${a.value}`}>{value}</p>
          )}
        </div>
      </div>
    </div>
  );
};
