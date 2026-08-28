import type { ComponentChildren } from 'preact';

interface DualViewportContainerProps {
  leftTitle: string;
  rightTitle: string;
  leftTitleColor?: string;
  rightTitleColor?: string;
  leftContent: ComponentChildren;
  rightContent: ComponentChildren;
  className?: string;
}

export function DualViewportContainer({
  leftTitle,
  rightTitle,
  leftTitleColor = 'text-slate-400',
  rightTitleColor = 'text-indigo-600',
  leftContent,
  rightContent,
  className = '',
}: DualViewportContainerProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 w-full items-start ${className}`}>
      <div className="flex flex-col items-center gap-2 w-full min-w-0">
        <span className={`text-[11px] font-bold ${leftTitleColor} uppercase tracking-wider`}>
          {leftTitle}
        </span>
        <div className="w-full flex justify-center items-center min-w-0">{leftContent}</div>
      </div>

      <div className="flex flex-col items-center gap-2 w-full min-w-0">
        <span className={`text-[11px] font-bold ${rightTitleColor} uppercase tracking-wider`}>
          {rightTitle}
        </span>
        <div className="w-full flex justify-center items-center min-w-0">{rightContent}</div>
      </div>
    </div>
  );
}