import { AlertTriangle } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import { Button } from '../ui/button';
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
          <Button variant="secondary" onClick={onCancel} className="w-full py-2.5 h-auto">
            {effectiveCancelText}
          </Button>
          <Button
            variant={isDangerous ? 'danger' : 'default'}
            onClick={onConfirm}
            className="w-full py-2.5 h-auto"
          >
            {effectiveConfirmText}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
