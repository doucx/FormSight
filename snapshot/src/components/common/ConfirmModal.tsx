import { AlertTriangle } from 'lucide-preact';
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
  confirmText = '确认',
  cancelText = '取消',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <ModalShell
      title={title}
      icon={AlertTriangle}
      onClose={onCancel}
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">{message}</p>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full py-2.5 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}