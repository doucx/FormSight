import { ArrowRight, Award, Clock, Home, Layers, RotateCcw, Zap } from 'lucide-preact';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import { ModalShell } from '../common/ModalShell';
import type { SessionHistoryItem } from '../modals/SessionSummaryModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MetricCard } from '../ui/metric-card';

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

  // 统计各阶段的最终层阶与峰值
  const endLevels = stageResults.map((s) => {
    if (s.history.length === 0) return 5;
    return s.history[s.history.length - 1].levelAfter;
  });
  const peakLevelAchieved = endLevels.length > 0 ? Math.max(...endLevels) : 5;

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
        {/* 核心综合指标卡片 (以突破峰值与完成规模为核心) */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard variant="accent" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>{t('stats.todayPeakLevel')}</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              Lvl {peakLevelAchieved}
            </div>
          </MetricCard>

          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-muted-foreground">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>{t('plan.stageCount', { count: stageResults.length })}</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {totalTrials}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                {t('common.trialsUnit')}
              </span>
            </div>
          </MetricCard>

          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{t('common.totalTimeSpent')}</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {formatSecondsToTimer(totalElapsedSeconds)}
            </div>
          </MetricCard>
        </div>

        {/* 分阶段明细成果 (右侧大徽章突出最终晋级 Level) */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('common.stageBreakdown')}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stageResults.map((stage, idx) => {
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
                  className="p-3 bg-muted/60 border border-border rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-lg bg-foreground text-background font-mono text-xs font-black flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-card text-primary border border-border/60 shadow-xs flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate">{cardTitle}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {stage.history.length} {t('common.trialsUnit')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-muted-foreground bg-card px-2 py-1 rounded-xl border border-border/60">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                      <span className="text-primary font-black">L{endLvl}</span>
                    </div>

                    <Badge
                      variant={endLvl >= startLvl ? 'accent' : 'secondary'}
                      size="default"
                      className="font-mono text-xs font-black"
                    >
                      Lvl {endLvl}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部动作按钮 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="h-11 gap-1.5">
            <Home className="w-4 h-4" />
            <span>{t('common.completeAndReturnHome')}</span>
          </Button>
          <Button variant="default" onClick={onRestart} className="h-11 gap-1.5">
            <RotateCcw className="w-4 h-4" />
            <span>{t('common.restartPlan')}</span>
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
