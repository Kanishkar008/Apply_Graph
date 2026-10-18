import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  const iconColor = variant === 'danger' ? 'text-rose-400' : variant === 'warning' ? 'text-amber-400' : 'text-brand-400';
  const iconBg = variant === 'danger' ? 'bg-rose-500/10 border-rose-500/25' : variant === 'warning' ? 'bg-amber-500/10 border-amber-500/25' : 'bg-brand-500/10 border-brand-500/25';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#161b22] border border-[#30363d] rounded-2xl shadow-modal p-6 max-w-sm w-full animate-slide-up">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-xl border ${iconBg} shrink-0`}>
            <AlertTriangle className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-100">{title}</h3>
            {description && (
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 mt-6">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
