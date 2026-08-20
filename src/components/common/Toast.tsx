import { AlertCircle, CheckCircle, Info, X } from 'lucide-preact';
import { useEffect } from 'preact/hooks';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertCircle : Info;

  const bgStyle =
    toast.type === 'success'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : toast.type === 'error'
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : 'bg-indigo-50 text-indigo-800 border-indigo-200';

  const iconStyle =
    toast.type === 'success'
      ? 'text-emerald-600'
      : toast.type === 'error'
        ? 'text-rose-600'
        : 'text-indigo-600';

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl border shadow-lg backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200 ${bgStyle}`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 flex-shrink-0 ${iconStyle}`} />
        <span className="text-xs font-bold leading-tight">{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors ml-2"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
