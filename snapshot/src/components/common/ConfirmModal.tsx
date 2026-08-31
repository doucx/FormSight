import { AlertTriangle } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import { ModalShell } from './ModalShell';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const effectiveConfirmText = confirmText || t('common.confirm');
  const effectiveCancelText = cancelText || t('common.cancel');
  if (!isOpen) return null;

  return (
    <ModalShell title={title} icon={AlertTriangle} onClose={onCancel} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-3 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-all active:scale-95"
          >
            {effectiveCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full py-2.5 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
            }`}
          >
            {effectiveConfirmText}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
