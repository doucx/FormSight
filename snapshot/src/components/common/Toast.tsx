import { type VariantProps, cva } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';

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

export const toastVariants = cva(
  'pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl border shadow-lg backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200',
  {
    variants: {
      type: {
        success:
          'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
        error:
          'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800',
        info: 'bg-accent/90 text-indigo-800 dark:text-indigo-200 border-border dark:border-border',
      },
    },
    defaultVariants: {
      type: 'info',
    },
  },
);

const toastIconMap = {
  success: { icon: CheckCircle, className: 'text-emerald-600' },
  error: { icon: AlertCircle, className: 'text-rose-600' },
  info: { icon: Info, className: 'text-primary' },
};

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

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
} & VariantProps<typeof toastVariants>) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const { icon: Icon, className: iconStyle } = toastIconMap[toast.type] || toastIconMap.info;

  return (
    <div className={cn(toastVariants({ type: toast.type }))}>
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 flex-shrink-0 ${iconStyle}`} />
        <span className="text-xs font-bold leading-tight">{toast.message}</span>
      </div>
      <Button
        variant="ghost"
        size="iconSm"
        onClick={onDismiss}
        className="text-muted-foreground hover:text-foreground ml-2 h-6 w-6"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}