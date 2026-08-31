import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target } from 'lucide-preact';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { ModalShell } from '../common/ModalShell';
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
          <MetricCard variant="accent" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-primary" />
              {t('common.overallAccuracy')}
            </div>
            <div className="text-2xl font-black text-foreground">{accuracy}%</div>
          </MetricCard>

          <MetricCard variant="success" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              {t('common.totalHits')}
            </div>
            <div className="text-2xl font-black text-foreground">
              {hitCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {totalTrials}</span>
            </div>
          </MetricCard>

          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t('common.totalTimeSpent')}
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {formatSecondsToTimer(totalElapsedSeconds)}
            </div>
          </MetricCard>
        </div>

        {/* 分阶段明细成果 */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
                  className="p-3 bg-muted/60 border border-border rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-foreground text-background font-mono text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-card text-primary border border-border/60 shadow-xs">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{cardTitle}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {t('common.trialsCorrect', {
                          hits: stageHits,
                          total: stage.history.length,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-muted-foreground bg-card px-2 py-1 rounded-xl border border-border/60">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                      <span className="text-primary font-black">L{endLvl}</span>
                    </div>

                    <Badge
                      variant={
                        stageAcc >= 80 ? 'success' : stageAcc >= 60 ? 'warning' : 'destructive'
                      }
                      size="default"
                      className="font-mono text-xs"
                    >
                      {stageAcc}%
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
            <HomeView className="w-4 h-4" />
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
