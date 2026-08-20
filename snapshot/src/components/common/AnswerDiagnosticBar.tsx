import { Check, X } from 'lucide-preact';
import type { ComponentChildren } from 'preact';

interface AnswerDiagnosticBarProps {
  isHit: boolean;
  successTitle?: string;
  failTitle?: string;
  subText?: ComponentChildren;
  rightSlot?: ComponentChildren;
}

export function AnswerDiagnosticBar({
  isHit,
  successTitle = '回答完全正确！',
  failTitle = '判断出现偏差',
  subText,
  rightSlot,
}: AnswerDiagnosticBarProps) {
  return (
    <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
      <div className="flex items-center gap-2">
        <div
          className={`p-1.5 rounded-xl ${
            isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}
        >
          {isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </div>
        <div className="text-xs">
          <span className="font-bold text-slate-800">{isHit ? successTitle : failTitle}</span>
          {subText && <span className="text-slate-400 ml-2">{subText}</span>}
        </div>
      </div>
      {rightSlot && <div className="text-xs font-mono font-bold text-slate-600">{rightSlot}</div>}
    </div>
  );
}