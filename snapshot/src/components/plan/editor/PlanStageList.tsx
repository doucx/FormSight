import { ArrowDown, ArrowUp, RotateCcw, Trash2, Zap } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
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
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <span>{t('plan.stageCount', { count: currentPlan.items.length })}</span>
          <span className="text-slate-400 font-normal">
            • {t('plan.totalTrialsSummary', { trials: totalTrials })} · {t('plan.estimatedTime', { min: estimatedMin })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentPlan.items.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400">{t('plan.batchTrials')}</span>
              {trialPresets.map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => onBatchUpdateTrials(num)}
                  className="px-1.5 py-0.5 text-[10px] font-bold hover:text-indigo-600 rounded hover:bg-white transition-colors"
                >
                  {num}题
                </button>
              ))}
            </div>
          )}

          {currentPlan.items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              {t('plan.clearStages')}
            </button>
          )}
        </div>
      </div>

      {currentPlan.items.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50/50">
          <Zap className="w-6 h-6 text-slate-300" />
          <span>{t('plan.emptyPlanTip')}</span>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {currentPlan.items.map((item, idx) => {
            const card = registry.getCardById(item.cardId);
            if (!card) return null;
            const Icon = card.icon;
            const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';

            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400">{cardDesc.slice(0, 26)}...</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                    {trialPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                          item.targetTrials === preset
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                      title="上移"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                      title="下移"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1"
                      title="移除"
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