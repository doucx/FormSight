import { ArrowDown, ArrowUp, RotateCcw, Trash2, Zap } from 'lucide-preact';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { TrainingPlan } from '../../../types/plan';
import { Button } from '../../ui/button';

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
          <span className="text-muted-foreground font-normal">
            • {t('plan.totalTrialsSummary', { trials: totalTrials })} ·{' '}
            {t('plan.estimatedTime', { min: estimatedMin })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentPlan.items.length > 0 && (
            <div className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-xl border border-border/60">
              <span className="text-xs font-bold text-muted-foreground">
                {t('plan.batchTrials')}
              </span>
              {trialPresets.map((num) => (
                <Button
                  key={num}
                  variant="ghost"
                  size="sm"
                  onClick={() => onBatchUpdateTrials(num)}
                  className="h-6 px-1.5 py-0 text-xs font-bold rounded-lg text-muted-foreground hover:text-foreground"
                >
                  {num}
                  {t('common.trialsUnit')}
                </Button>
              ))}
            </div>
          )}

          {currentPlan.items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-7 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('plan.clearStages')}</span>
            </Button>
          )}
        </div>
      </div>

      {currentPlan.items.length === 0 ? (
        <div className="flex-1 min-h-[220px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs bg-muted/40">
          <Zap className="w-6 h-6 text-muted-foreground/60" />
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
                {/* 模块信息区 */}
                <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto sm:flex-1">
                  <div className="w-6 h-6 rounded-lg bg-foreground text-background font-mono text-xs font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-accent text-primary flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground truncate">{cardTitle}</div>
                    <div className="text-xs text-muted-foreground truncate">{cardDesc}</div>
                  </div>
                </div>

                {/* 题量选择与操作控制区 */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <div className="flex items-center bg-muted p-0.5 rounded-xl border border-border/40">
                    {trialPresets.map((preset) => (
                      <Button
                        key={preset}
                        variant={item.targetTrials === preset ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`h-6 px-2 py-0 text-xs font-bold rounded-lg ${
                          item.targetTrials === preset
                            ? 'shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 border-l border-border pl-1.5 ml-1">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="text-muted-foreground hover:text-foreground"
                      title={t('plan.moveUpTitle')}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="text-muted-foreground hover:text-foreground"
                      title={t('plan.moveDownTitle')}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 ml-0.5"
                      title={t('plan.removeTitle')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
