import React, { useCallback, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { ToastContext, Toast, ToastVariant } from '../../hooks/useToast';

const variantConfig: Record<ToastVariant, { icon: React.ReactNode; border: string; text: string; bg: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />,
    border: 'border-emerald-500/30',
    text: 'text-emerald-200',
    bg: 'bg-emerald-950/20',
  },
  error: {
    icon: <XCircle className="h-4 w-4 text-rose-400 shrink-0" />,
    border: 'border-rose-500/30',
    text: 'text-rose-200',
    bg: 'bg-rose-950/20',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />,
    border: 'border-amber-500/30',
    text: 'text-amber-200',
    bg: 'bg-amber-950/20',
  },
  info: {
    icon: <Info className="h-4 w-4 text-brand-400 shrink-0" />,
    border: 'border-brand-500/30',
    text: 'text-brand-200',
    bg: 'bg-brand-950/20',
  },
};

export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timerRefs.current[id]) {
      clearTimeout(timerRefs.current[id]);
      delete timerRefs.current[id];
    }
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [{ id, message, variant, duration }, ...prev].slice(0, 5));
      if (duration > 0) {
        timerRefs.current[id] = setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast viewport */}
      <div
        className="fixed bottom-5 right-5 z-[100] flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const cfg = variantConfig[toast.variant];
          return (
            <div
              key={toast.id}
              className={`
                pointer-events-auto flex items-start gap-3
                bg-[#161b22]/95 backdrop-blur-md border ${cfg.border} ${cfg.bg} rounded-xl
                px-4 py-3 shadow-modal
                animate-slide-up transition-all
              `}
            >
              {cfg.icon}
              <p className={`flex-1 text-xs sm:text-sm font-medium ${cfg.text} leading-relaxed`}>
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors mt-0.5 shrink-0 p-0.5 rounded"
                aria-label="Dismiss toast"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
