import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target } from 'lucide-preact';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { ModalShell } from '../common/ModalShell';

export interface PlanStageResult {
  card: CardDefinition;
  targetTrials: number;
  history: SessionHistoryItem[];
}

interface PlanSummaryModalProps {
  planName: string;
  stageResults: PlanStageResult[];
  totalElapsedSeconds: number;
  onClose: () => void;
  onRestart: () => void;
}

export function PlanSummaryModal({
  planName,
  stageResults,
  totalElapsedSeconds,
  onClose,
  onRestart,
}: PlanSummaryModalProps) {
  const { t } = useTranslation();
  const allHistory = stageResults.flatMap((s) => s.history);
  const totalTrials = allHistory.length;
  const hitCount = allHistory.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const subTitle = t('common.planSummaryCompleted', {
    name: planName,
    count: stageResults.length,
  });

  return (
    <ModalShell
      title={t('common.planSummaryTitle')}
      subTitle={subTitle}
      icon={Award}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <div className="flex flex-col gap-5">
        {/* 核心综合大盘卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.overallAccuracy')}
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{accuracy}%</div>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              {t('common.totalHits')}
            </div>
            <div className="text-2xl font-black text-slate-800">
              {hitCount} <span className="text-xs font-normal text-slate-400">/ {totalTrials}</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.totalTimeSpent')}
            </div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {formatSecondsToTimer(totalElapsedSeconds)}
            </div>
          </div>
        </div>

        {/* 分阶段明细成果 */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('common.stageBreakdown')}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stageResults.map((stage, idx) => {
              const stageHits = stage.history.filter((h) => h.isHit).length;
              const stageAcc =
                stage.history.length > 0 ? Math.round((stageHits / stage.history.length) * 100) : 0;
              const startLvl = stage.history.length > 0 ? stage.history[0].levelBefore : 5;
              const endLvl =
                stage.history.length > 0
                  ? stage.history[stage.history.length - 1].levelAfter
                  : startLvl;
              const Icon = stage.card.icon;
              const cardTitle = getCardTitle(stage.card, t);

              return (
                <div
                  key={`${stage.card.id}-${idx}`}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-slate-800 text-white font-mono text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{cardTitle}</div>
                      <div className="text-[10px] text-slate-400">
                        {t('common.trialsCorrect', {
                          hits: stageHits,
                          total: stage.history.length,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-600 bg-white dark:bg-slate-900 px-2 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-indigo-600">L{endLvl}</span>
                    </div>

                    <span
                      className={`text-xs font-black font-mono px-2 py-1 rounded-xl ${
                        stageAcc >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : stageAcc >= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {stageAcc}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部动作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {t('common.completeAndReturnHome')}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('common.restartPlan')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
