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
  leftTitleColor = 'text-muted-foreground',
  rightTitleColor = 'text-primary',
  leftContent,
  rightContent,
  className = '',
}: DualViewportContainerProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 w-full ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <span className={`text-[11px] font-bold ${leftTitleColor} uppercase tracking-wider`}>
          {leftTitle}
        </span>
        {leftContent}
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className={`text-[11px] font-bold ${rightTitleColor} uppercase tracking-wider`}>
          {rightTitle}
        </span>
        {rightContent}
      </div>
    </div>
  );
}
