import { X } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { Button } from '../ui/button';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 dark:bg-background/80 backdrop-blur-sm p-4 overflow-y-auto"
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
        className={`w-full ${maxWidth} bg-card text-foreground rounded-3xl shadow-2xl border border-border/60 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 bg-accent text-primary rounded-xl">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              {subTitle && <p className="text-xs text-muted-foreground">{subTitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <Button
              variant="ghost"
              size="iconSm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
