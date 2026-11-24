import { ArrowLeft, Coffee, FastForward, Plus, Timer } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { RestStageItem } from '../../../types/plan';
import { playRestChime } from '../../../utils/sound';
import { formatSecondsToTimer } from '../../../utils/time';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface StageRestViewProps {
  stage: RestStageItem;
  currentStage: number;
  totalStages: number;
  onAdvance: () => void;
  onExit: () => void;
}

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const EXTEND_SECONDS = 30;

/** 训练流中的强制休息段：倒计时、延长与跳过。 */
export function StageRestView({
  stage,
  currentStage,
  totalStages,
  onAdvance,
  onExit,
}: StageRestViewProps) {
  const { t } = useTranslation();
  const [totalSeconds, setTotalSeconds] = useState(() => Math.max(1, stage.durationSeconds));
  const [remaining, setRemaining] = useState(stage.durationSeconds);
  const endAtRef = useRef<number>(Date.now() + stage.durationSeconds * 1000);
  const hasChimedRef = useRef(false);

  // 基于绝对结束时刻计算，切后台或主线程繁忙时不会累积漂移
  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !hasChimedRef.current) {
        hasChimedRef.current = true;
        playRestChime();
      }
    };

    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, []);

  const handleExtend = () => {
    endAtRef.current += EXTEND_SECONDS * 1000;
    setTotalSeconds((prev) => prev + EXTEND_SECONDS);
    setRemaining(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
    hasChimedRef.current = false;
  };

  const isFinished = remaining === 0;
  const ratio = Math.max(0, Math.min(1, remaining / totalSeconds));
  const canSkip = stage.allowSkip !== false;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col min-h-[calc(100dvh-2.5rem)] sm:min-h-[calc(100vh-3.5rem)] px-2 py-2 sm:px-4 sm:py-3 select-none">
      <header className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-card/60 dark:bg-card/40 backdrop-blur-md border border-border/50 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onExit}
            className="h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground flex-shrink-0"
            title={t('plan.exitPlan')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Badge
            variant="accent"
            size="sm"
            className="font-mono text-xs px-2 py-0.5 rounded-lg flex-shrink-0"
          >
            {currentStage}/{totalStages}
          </Badge>
          <span className="text-xs font-bold text-foreground truncate">
            {t('plan.stageTypeRest')}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-6">
        <section className="w-full bg-card border border-border rounded-3xl shadow-sm p-6 sm:p-9 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Coffee className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {isFinished ? t('plan.restFinishedTitle') : t('plan.restTitle')}
            </h1>
            <p className="text-xs text-muted-foreground font-medium max-w-md">
              {stage.tips?.trim() || t('plan.restDefaultTips')}
            </p>
          </div>

          <div className="relative w-44 h-44 mx-auto">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden="true">
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                strokeWidth="8"
                className="stroke-muted"
              />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
                className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className="font-mono text-4xl font-black text-foreground tabular-nums">
                {formatSecondsToTimer(remaining)}
              </span>
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {t('plan.restCountdownLabel')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="secondary"
              onClick={handleExtend}
              className="gap-1.5 rounded-2xl"
              title={t('plan.restExtendTitle')}
            >
              <Plus className="w-4 h-4" />
              <span>{t('plan.restExtend', { seconds: EXTEND_SECONDS })}</span>
            </Button>

            {canSkip && !isFinished && (
              <Button variant="ghost" onClick={onAdvance} className="gap-1.5 rounded-2xl">
                <FastForward className="w-4 h-4" />
                <span>{t('plan.restSkip')}</span>
              </Button>
            )}

            {isFinished && (
              <Button variant="default" onClick={onAdvance} className="gap-1.5 rounded-2xl px-5">
                <span>{t('plan.restContinueAction')}</span>
              </Button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
