import { ArrowLeft, Clock, FastForward, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';
import type { SessionHistoryItem } from '../modals/SessionSummaryModal';
import { SessionSummaryModal } from '../modals/SessionSummaryModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export interface PlanTrainingContext {
  planName: string;
  currentStage: number;
  totalStages: number;
  targetTrials: number;
  onSkipStage: () => void;
}

export interface TrainingSessionHandle {
  totalTrials: number;
  elapsedSeconds: number;
  isFinished: boolean;
  isIdle: boolean;
  showAnswer: boolean;
  showSummaryModal: boolean;
  sessionHistory: SessionHistoryItem[];
  resumeFromIdle: () => void;
  handleNextQuestion: () => void;
  handleRequestFinish: () => void;
  handleFinishSession: () => void;
  handleRestartSession: () => void;
}

interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  planContext?: PlanTrainingContext;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}

export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  autoNext,
  session,
  planContext,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
  const { t } = useTranslation();
  const cardTitle = getCardTitle(card, t);
  const hint = t(`cards.${card.id}.hint`) || '';
  const desc = getCardDesc(card, t);

  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const {
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    showAnswer,
    showSummaryModal,
    sessionHistory,
    resumeFromIdle,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;

  return (
    <div className="w-full h-full min-h-[calc(100dvh-2.5rem)] sm:min-h-[calc(100vh-3.5rem)] max-w-6xl mx-auto flex flex-col justify-between items-center px-2 py-2 sm:px-4 sm:py-3 select-none">
      {/* 1. 顶部 Ghost HUD 悬浮状态栏 */}
      <header className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-card/60 dark:bg-card/40 backdrop-blur-md border border-border/50 shadow-xs transition-opacity duration-200 hover:opacity-100 z-20">
        {/* 左侧：返回、计划阶段徽章与模块标题 */}
        <div className="flex items-center gap-2 min-w-0">
          {showExitButton && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={handleRequestFinish}
              className="h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground flex-shrink-0"
              title={t('shell.exitTraining')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          {planContext && (
            <Badge variant="accent" size="sm" className="font-mono text-xs px-2 py-0.5 rounded-lg flex-shrink-0">
              {planContext.currentStage}/{planContext.totalStages}
            </Badge>
          )}

          <div className="relative flex items-center min-w-0">
            <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
              <span className="truncate">{cardTitle}</span>
              {sessionType === 'benchmark' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 rounded-md flex-shrink-0">
                  {t('shell.benchmark')}
                </span>
              )}
              {(hint || desc) && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-muted-foreground hover:text-primary h-5 w-5 p-0 flex-shrink-0"
                  title={t('shell.instructionTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {/* 玩法要领浮窗 */}
            {showHelpTooltip && (hint || desc) && (
              <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-card text-foreground p-3.5 rounded-2xl shadow-xl border border-border text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-primary mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t('shell.instructionTitle')}
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{hint || desc}</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：紧凑幽灵指标（题量、层阶、计时器、跳过阶段） */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono text-muted-foreground flex-shrink-0">
          {planContext && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={planContext.onSkipStage}
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title={t('plan.skipStage')}
            >
              <FastForward className="w-3.5 h-3.5" />
            </Button>
          )}

          <div className="flex items-center gap-1">
            <span className="font-bold text-foreground">{totalTrials}</span>
            <span className="text-muted-foreground">
              {sessionType === 'benchmark' ? '/20' : planContext ? `/${planContext.targetTrials}` : ` ${t('common.trialsUnit')}`}
            </span>
          </div>

          <span className="text-border/80">|</span>
          <span className="font-bold text-primary">Lvl {currentLevel}</span>

          {showTimer && (
            <>
              <span className="text-border/80">|</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3 text-muted-foreground/70" />
                <span>{formatSecondsToTimer(elapsedSeconds)}</span>
              </span>
            </>
          )}
        </div>
      </header>

      {/* 2. 视觉绝对居中的 Canvas 舞台 */}
      <main className="flex-1 flex flex-col items-center justify-center w-full py-4 min-h-0 relative">
        <div className="relative w-full flex items-center justify-center">
          {children({ disabled: isFinished || isIdle, isIdle })}
          {isIdle && <IdlePauseOverlay onResume={resumeFromIdle} />}
        </div>
      </main>

      {/* 3. 极简底部操作栏与微弱键盘指引 */}
      <footer className="w-full flex flex-col items-center justify-center gap-1.5 min-h-[3rem] pb-1">
        {!autoNext && (
          <div className="animate-in fade-in zoom-in-95 duration-150">
            {isFinished ? (
              <Button
                variant="default"
                onClick={handleRequestFinish}
                className="px-5 py-2 h-auto text-xs font-bold rounded-xl shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {t('shell.viewSummary')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={handleNextQuestion}
                disabled={!showAnswer}
                className="px-4 py-1.5 h-auto text-xs font-bold rounded-xl border border-border/80 shadow-xs gap-1.5 text-foreground hover:text-primary"
              >
                <span>{t('common.nextQuestion')}</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border/60 rounded">
                  Space
                </kbd>
              </Button>
            )}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground/40 font-mono tracking-wider">
          Space 提交/下一题 · Esc 退出
        </div>
      </footer>

      {/* 统一结课总结弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          card={card}
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
    </div>
  );
}