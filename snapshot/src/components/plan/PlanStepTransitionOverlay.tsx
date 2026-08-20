import { ArrowRight, CheckCircle2 } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import type { CardDefinition } from '../../types/card';

interface PlanStepTransitionOverlayProps {
  completedCard: CardDefinition;
  nextCard: CardDefinition;
  completedStepIndex: number;
  totalSteps: number;
  onProceed: () => void;
}

export function PlanStepTransitionOverlay({
  completedCard,
  nextCard,
  completedStepIndex,
  totalSteps,
  onProceed,
}: PlanStepTransitionOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onProceed]);

  const CompletedIcon = completedCard.icon;
  const NextIcon = nextCard.icon;

  return (
    <div
      role="presentation"
      onClick={onProceed}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-pointer select-none"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-white/80 p-7 flex flex-col items-center gap-5 text-center my-auto animate-in zoom-in-95">
        <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            阶段 {completedStepIndex + 1} / {totalSteps} 达成
          </span>
          <h2 className="text-lg font-black text-slate-800 mt-2">
            【{completedCard.title}】训练完成！
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            即将进入下一个阶段：
            <span className="font-bold text-indigo-600">{nextCard.title}</span>
          </p>
        </div>

        {/* 下阶段预览 */}
        <div className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
          <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm border border-slate-100">
            <NextIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">{nextCard.title}</div>
            <div className="text-[11px] text-slate-400 line-clamp-1">
              {nextCard.instruction || nextCard.desc}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onProceed}
          className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          点击进入下一阶段 (Space)
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
