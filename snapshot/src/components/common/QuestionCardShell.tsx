import type { ComponentChildren } from 'preact';

interface QuestionCardShellProps {
  hintText?: string;
  hintIcon?: (props: { className?: string }) => ComponentChildren;
  showCanvasHints?: boolean;
  maxWidth?: string;
  className?: string;
  footer?: ComponentChildren;
  children: ComponentChildren;
}

export function QuestionCardShell({
  hintText,
  hintIcon: HintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-lg',
  className = '',
  footer,
  children,
}: QuestionCardShellProps) {
  return (
    <div
      className={`w-full ${maxWidth} bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto ${className}`}
    >
      {showCanvasHints && hintText && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60 text-center">
          {HintIcon && <HintIcon className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
          <span>{hintText}</span>
        </div>
      )}

      {children}

      {footer}
    </div>
  );
}