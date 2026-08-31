import { X } from 'lucide-preact';
import type { ComponentChildren } from 'preact';

interface ModalShellProps {
  title: string;
  subTitle?: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  maxWidth?: string;
  onClose: () => void;
  headerAction?: ComponentChildren;
  children: ComponentChildren;
}

export function ModalShell({
  title,
  subTitle,
  icon: Icon,
  maxWidth = 'max-w-md',
  onClose,
  headerAction,
  children,
}: ModalShellProps) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
              {subTitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subTitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
