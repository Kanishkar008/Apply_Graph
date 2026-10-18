import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 hover:bg-brand-500 text-white shadow-sm hover:shadow-glow-brand border border-brand-500/20',
  secondary: 'bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] hover:border-[#444c56]',
  ghost: 'text-slate-400 hover:text-slate-200 hover:bg-[#21262d] border border-transparent',
  danger: 'bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-600/30 hover:border-rose-500/50',
  teal: 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:border-teal-400/50',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-[11px] gap-1.5 rounded-md',
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0d1117]
        disabled:opacity-50 disabled:cursor-not-allowed select-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'ghost',
  size = 'sm',
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      title={label}
      aria-label={label}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${size === 'xs' ? 'p-1 rounded-md' : size === 'sm' ? 'p-1.5 rounded-lg' : 'p-2 rounded-lg'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
    </button>
  );
};
