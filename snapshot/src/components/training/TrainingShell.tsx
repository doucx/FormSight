import {
  ArrowLeft,
  Check,
  Clock,
  Code,
  Copy,
  Eye,
  FastForward,
  HelpCircle,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useCallback, useState } from 'preact/hooks';
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
  onSkipStage: (history?: SessionHistoryItem[]) => void;
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
  setCurrentLevel?: (level: number) => void;
  regenerateQuestion?: () => void;
  revealAnswer?: () => void;
  showInspector?: boolean;
  toggleInspector?: () => void;
  setShowInspector?: (val: boolean) => void;
  handleRequestFinish: () => void;
  handleFinishSession: () => void;
  handleRestartSession: () => void;
}

interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark' | 'sandbox';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  currentQuestion?: unknown;
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
  currentQuestion,
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
  const [isCopied, setIsCopied] = useState(false);
  const [isCardIdCopied, setIsCardIdCopied] = useState(false);

  const isSandbox = sessionType === 'sandbox';

  const handleCopyQuestion = useCallback(() => {
    if (!currentQuestion) return;
    const text = JSON.stringify(currentQuestion, null, 2);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy question json:', err);
      });
  }, [currentQuestion]);

  const handleCopyCardId = useCallback(() => {
    navigator.clipboard
      .writeText(card.id)
      .then(() => {
        setIsCardIdCopied(true);
        setTimeout(() => setIsCardIdCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy card id:', err);
      });
  }, [card.id]);

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
    setCurrentLevel,
    regenerateQuestion,
    revealAnswer,
    showInspector = false,
    toggleInspector,
    setShowInspector,
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
            <Badge
              variant="accent"
              size="sm"
              className="font-mono text-xs px-2 py-0.5 rounded-lg flex-shrink-0"
            >
              {planContext.currentStage}/{planContext.totalStages}
            </Badge>
          )}

          <div className="relative flex items-center min-w-0">
            <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
              <span className="truncate">{cardTitle}</span>
              {isSandbox && (
                <button
                  type="button"
                  onClick={handleCopyCardId}
                  className="font-mono text-[11px] bg-muted/80 hover:bg-accent text-foreground px-1.5 py-0.5 rounded border border-border cursor-pointer tracking-tight flex-shrink-0 inline-flex items-center gap-1 transition-colors"
                  title="Click to copy Card ID"
                >
                  {isCardIdCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {t('shell.copied')}
                      </span>
                    </>
                  ) : (
                    <span>{card.id}</span>
                  )}
                </button>
              )}
              {sessionType === 'benchmark' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 rounded-md flex-shrink-0">
                  {t('shell.benchmark')}
                </span>
              )}
              {isSandbox && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 rounded-md flex-shrink-0 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('shell.sandbox')}
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
              onClick={() => planContext.onSkipStage(sessionHistory)}
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title={t('plan.skipStage')}
            >
              <FastForward className="w-3.5 h-3.5" />
            </Button>
          )}

          {!isSandbox ? (
            <div className="flex items-center gap-1">
              <span className="font-bold text-foreground">{totalTrials}</span>
              <span className="text-muted-foreground">
                {sessionType === 'benchmark'
                  ? '/20'
                  : planContext
                    ? `/${planContext.targetTrials}`
                    : ` ${t('common.trialsUnit')}`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-muted-foreground">Trials:</span>
              <span className="font-bold text-foreground">{totalTrials}</span>
            </div>
          )}

          <span className="text-border/80">|</span>

          {isSandbox ? (
            <div className="flex items-center bg-muted/80 rounded-xl border border-border/60 p-0.5">
              <Button
                variant="ghost"
                size="iconSm"
                disabled={currentLevel <= 1}
                onClick={() => setCurrentLevel?.(currentLevel - 1)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Decrease Level"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="font-bold text-primary font-mono text-xs px-1.5 select-none">
                Lvl {currentLevel}
              </span>
              <Button
                variant="ghost"
                size="iconSm"
                disabled={currentLevel >= 35}
                onClick={() => setCurrentLevel?.(currentLevel + 1)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Increase Level"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <span className="font-bold text-primary">Lvl {currentLevel}</span>
          )}

          {isSandbox && (
            <>
              <span className="text-border/80">|</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => regenerateQuestion?.()}
                className="h-7 px-2 text-xs font-bold gap-1 text-muted-foreground hover:text-primary border border-border/40"
                title={t('shell.regenerate')}
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">{t('shell.regenerate')}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                disabled={showAnswer}
                onClick={() => revealAnswer?.()}
                className="h-7 px-2 text-xs font-bold gap-1 text-muted-foreground hover:text-emerald-600 border border-border/40 disabled:opacity-40"
                title={t('shell.revealAnswer')}
              >
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">{t('shell.revealAnswer')}</span>
              </Button>

              <Button
                variant={showInspector ? 'default' : 'ghost'}
                size="iconSm"
                onClick={() => toggleInspector?.()}
                className="h-7 w-7 text-muted-foreground hover:text-foreground border border-border/40"
                title={`${t('shell.inspector')} (I)`}
              >
                <Code className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {showTimer && !isSandbox && (
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

      {/* 沙盒模式折叠题目参数检查器 (Inspector) */}
      {isSandbox && showInspector && (
        <div className="w-full bg-card/95 backdrop-blur-md border border-border rounded-2xl p-3 shadow-xl my-2 max-h-52 overflow-y-auto font-mono text-xs z-20 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/60 text-muted-foreground font-bold">
            <span className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-primary" />
              <span>Inspector</span>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={handleCopyQuestion}
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                title="Copy JSON to clipboard"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setShowInspector?.(false)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <pre className="text-foreground/90 p-2 bg-muted/60 rounded-xl overflow-x-auto text-[11px] leading-relaxed select-text">
            {JSON.stringify(currentQuestion ?? null, null, 2)}
          </pre>
        </div>
      )}

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
          {isSandbox
            ? 'Space 提交/下一题 · R 换题 · [ / ] 调级 · I 检查器 · Esc 退出'
            : 'Space 提交/下一题 · Esc 退出'}
        </div>
      </footer>

      {/* 统一结课总结弹窗 (在训练计划流或沙盒演练模式中禁用单卡片弹窗) */}
      {showSummaryModal && !planContext && !isSandbox && (
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
