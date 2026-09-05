import { ArrowLeft, ChevronRight, Clock, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';
import type { SessionHistoryItem } from '../modals/SessionSummaryModal';
import { SessionSummaryModal } from '../modals/SessionSummaryModal';
import { Button } from '../ui/button';

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
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 sm:gap-6">
      {/* 统一 Header 状态栏：极简沉浸式紧凑单行排版 */}
      <header className="w-full bg-card border border-border rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs flex items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          {showExitButton && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRequestFinish}
              className="gap-1.5 flex-shrink-0"
              title={t('shell.exitTraining')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('shell.exitTraining')}</span>
            </Button>
          )}

          <div className="relative flex items-center min-w-0">
            <div className="text-xs font-black text-foreground truncate flex items-center gap-1.5">
              <span className="truncate">{cardTitle}</span>
              {sessionType === 'benchmark' && (
                <span className="text-xs font-extrabold px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 dark:border-amber-800/60 rounded-md flex-shrink-0">
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
                  className="text-muted-foreground hover:text-primary p-0.5 h-6 w-6 flex-shrink-0"
                  title={t('shell.instructionTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {showHelpTooltip && (hint || desc) && (
              <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-card dark:bg-muted text-white p-3 rounded-2xl shadow-xl border border-border dark:border-border text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t('shell.instructionTitle')}
                </div>
                <p className="text-muted-foreground text-xs">{hint || desc}</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：紧凑型指标胶囊 */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-xs">
          <div className="flex items-center gap-1.5 bg-muted border border-border/60 px-2.5 py-1 rounded-xl">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">
              {t('shell.trialsCount')}
            </span>
            <span className="font-mono font-black text-foreground">
              {totalTrials}
              {sessionType === 'benchmark' ? ' / 20' : ` ${t('common.trialsUnit')}`}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-accent border border-border/60 dark:border-border px-2.5 py-1 rounded-xl">
            <span className="text-xs font-extrabold text-primary dark:text-primary uppercase tracking-wider hidden sm:inline">
              Lvl
            </span>
            <span className="font-mono font-black text-primary">{currentLevel}</span>
          </div>

          {showTimer && (
            <div className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-xl border border-border/60 text-muted-foreground">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="font-mono font-bold text-xs">
                {formatSecondsToTimer(elapsedSeconds)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 统一 Canvas 居中容器与休眠遮罩 */}
      <div className="relative w-full flex justify-center">
        {children({ disabled: isFinished || isIdle, isIdle })}
        {isIdle && <IdlePauseOverlay onResume={resumeFromIdle} />}
      </div>

      {/* 统一手动下一题控制栏 */}
      {!autoNext && (
        <div className="flex items-center justify-center">
          {isFinished ? (
            <Button
              variant="default"
              onClick={handleRequestFinish}
              className="px-5 py-2.5 h-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {t('shell.viewSummary')}
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className="px-5 py-2.5 h-auto gap-1"
            >
              {t('common.nextQuestion')}
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

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
