import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { renderSessionTrendChartCanvas } from '../../core/canvas/charts/drawTrendChart';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import { ModalShell } from '../common/ModalShell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MetricCard } from '../ui/metric-card';

export interface SessionHistoryItem {
  trialIndex: number;
  levelBefore: number;
  levelAfter: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  onClose: () => void;
  onRestart: () => void;
}

export function SessionSummaryModal({
  card,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].levelBefore : 5;
  const endLevel = history.length > 0 ? history[history.length - 1].levelAfter : startLevel;
  const levelDiff = endLevel - startLevel;

  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && history.length > 0) {
      renderSessionTrendChartCanvas(canvas, history);
    }
  }, [history]);

  const subTitle = `${cardTitle} • ${
    sessionType === 'benchmark' ? t('summary.benchmarkSubtitle') : t('summary.trainingSubtitle')
  }`;

  return (
    <ModalShell
      title={t('summary.title')}
      subTitle={subTitle}
      icon={Award}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-primary" />
              {t('summary.accuracyCount')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">{accuracy}%</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('summary.trialsDone', { hits: hitCount, total: totalTrials })}
              </span>
            </div>
          </MetricCard>

          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t('summary.duration')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">
                {formatSecondsToTimer(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('summary.secPerTrial', { sec: avgResponseTimeSec })}
              </span>
            </div>
          </MetricCard>
        </div>

        {/* 层阶提升高亮卡片 */}
        <div className="bg-accent border border-border/60 dark:border-border/60 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-xs">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">{t('summary.levelEvolution')}</div>
              <div className="text-xs text-primary font-medium">
                {levelDiff > 0
                  ? t('summary.levelUp', { diff: levelDiff })
                  : levelDiff < 0
                    ? t('summary.levelDown', { diff: Math.abs(levelDiff) })
                    : t('summary.levelMaintain')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-foreground text-sm">
            <Badge variant="secondary" size="default" className="font-mono">
              Lvl {startLevel}
            </Badge>
            <ArrowRight className="w-4 h-4 text-primary" />
            <Badge variant="default" size="default" className="font-mono">
              Lvl {endLevel}
            </Badge>
          </div>
        </div>

        {/* 折线图 Canvas 区 */}
        <div className="bg-muted/60 p-3.5 rounded-2xl border border-border w-full overflow-hidden">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-xs font-bold text-muted-foreground">
              {t('summary.curveTitle')}
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Badge
                  variant="success"
                  size="sm"
                  className="w-2 h-2 p-0 rounded-full border-none"
                />{' '}
                {t('summary.hitLegend')}
              </span>
              <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-semibold">
                <Badge
                  variant="destructive"
                  size="sm"
                  className="w-2 h-2 p-0 rounded-full border-none"
                />{' '}
                {t('summary.missLegend')}
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full max-w-full aspect-[11/4] rounded-xl block border border-border/60 shadow-inner"
          />
        </div>

        {/* 底部操作按钮 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="h-11 gap-1.5">
            <Home className="w-4 h-4" />
            <span>{t('summary.backHome')}</span>
          </Button>
          <Button variant="default" onClick={onRestart} className="h-11 gap-1.5">
            <RotateCcw className="w-4 h-4" />
            <span>{t('summary.trainAgain')}</span>
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
