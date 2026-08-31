import { ArrowDown, ArrowUp, RotateCcw, Trash2, Zap } from 'lucide-preact';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { TrainingPlan } from '../../../types/plan';

interface PlanStageListProps {
  currentPlan: TrainingPlan;
  totalTrials: number;
  estimatedMin: number;
  trialPresets: number[];
  onBatchUpdateTrials: (trials: number) => void;
  onClearAll: () => void;
  onUpdateTrials: (id: string, trials: number) => void;
  onMoveItem: (index: number, direction: 'up' | 'down') => void;
  onRemoveItem: (id: string) => void;
}

export function PlanStageList({
  currentPlan,
  totalTrials,
  estimatedMin,
  trialPresets,
  onBatchUpdateTrials,
  onClearAll,
  onUpdateTrials,
  onMoveItem,
  onRemoveItem,
}: PlanStageListProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full space-y-3 min-h-0">
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div className="text-xs font-bold text-foreground flex items-center gap-2">
          <span>{t('plan.stageCount', { count: currentPlan.items.length })}</span>
          <span className="text-slate-400 font-normal">
            • {t('plan.totalTrialsSummary', { trials: totalTrials })} ·{' '}
            {t('plan.estimatedTime', { min: estimatedMin })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentPlan.items.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-muted px-2 py-0.5 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400">{t('plan.batchTrials')}</span>
              {trialPresets.map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => onBatchUpdateTrials(num)}
                  className="px-1.5 py-0.5 text-[10px] font-bold hover:text-primary rounded hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {num}
                  {t('common.trialsUnit')}
                </button>
              ))}
            </div>
          )}

          {currentPlan.items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              {t('plan.clearStages')}
            </button>
          )}
        </div>
      </div>

      {currentPlan.items.length === 0 ? (
        <div className="flex-1 min-h-[220px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-muted/40">
          <Zap className="w-6 h-6 text-slate-300" />
          <span>{t('plan.emptyPlanTip')}</span>
        </div>
      ) : (
        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-0">
          {currentPlan.items.map((item, idx) => {
            const card = registry.getCardById(item.cardId);
            if (!card) return null;
            const Icon = card.icon;
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);

            return (
              <div
                key={item.id}
                className="p-3 bg-card border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
              >
                {/* 模块信息区：包含序号、图标、标题与描述，在窄屏下拥有完整横向展示空间 */}
                <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto sm:flex-1">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 dark:bg-slate-700 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-accent text-primary flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground truncate">
                      {cardTitle}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{cardDesc}</div>
                  </div>
                </div>

                {/* 题量选择与操作控制区：在紧凑宽度下换行并靠右/充满对齐 */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <div className="flex items-center bg-muted p-0.5 rounded-xl">
                    {trialPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          item.targetTrials === preset
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 border-l border-border pl-1.5 ml-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-lg hover:bg-accent cursor-pointer"
                      title={t('plan.moveUpTitle')}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-lg hover:bg-accent cursor-pointer"
                      title={t('plan.moveDownTitle')}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1 cursor-pointer"
                      title={t('plan.removeTitle')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
