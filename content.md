好的，我们将开始对 `TrainingShell` 及相关训练视图进行重构，重塑为高专注度、低视觉干扰的极简沉浸式训练态（Focus / Zen Mode）。

## [WIP] refactor: 重构 TrainingShell 训练态为极简沉浸式 Focus Mode

### 用户需求
改造 `TrainingShell.tsx` 及训练界面：
1. 去除原先顶部粗重、高对比度的实体白色卡片 Header，将其重塑为低认知干扰、轻量半透明的 Ghost HUD 浮动胶囊。
2. 确保 Canvas 画布在可用视口中处于绝对视觉中心，减少周围边界对色彩空间与空间几何感知的侧抑制与色适应诱导偏差。
3. 整合 `PlanTrainingView` 的阶段状态，消除双 Header 上下堆叠的问题，实现一体化极简单轨训练流。
4. 提供优雅的键盘操作反馈（Space 下一题、Esc 退出）与微弱快捷键引导。

### 评论
在视知觉与色彩辨析训练中，视网膜感受野对周边环境光与对比边界极其敏感。原先带有强烈白色实心背景、投影与实体边框的 Header 会产生显著的侧抑制（Lateral Inhibition）和色彩诱导误差。将其精简为半透明、中性低饱和的 HUD 胶囊并将 Canvas 绝对居中，是大幅提升训练沉浸感与感知准确率的关键改进。

### 目标
1. **重构 `TrainingShell.tsx`**：
   - 采用 `min-h-[calc(100dvh-2rem)]` 纵向弹性居中布局，Canvas 居于核心焦点。
   - 顶部 Header 重构为半透明毛玻璃幽灵胶囊（Ghost HUD），将卡片名、要领提示、做答进度、难度等级、用时计时器紧凑中性化呈现。
   - 底部手动切题按钮轻量化，集成按键徽标（`<kbd>Space</kbd>`）与微弱快捷键辅助提示。
   - 支持接收 `planContext`，实现单卡训练与多阶段计划训练的无缝统一。
2. **扩展 `GenericTrainingView.tsx`**：
   - 支持透传 `planContext` 至 `TrainingShell`。
3. **改造 `PlanTrainingView.tsx`**：
   - 剥离原先外层堆叠的独立卡片 Header，将阶段进度（如 `阶段 1/3`）、阶段目标题量与跳过阶段操作统一注入 `planContext`，彻底消除双顶栏视觉堆叠。

### 基本原理
通过将占据大量视口高度与注意力的管理型卡片 Header 转变为现代游戏/专业视知觉实验室专用的 Heads-Up Display (HUD)，消除强烈的视网膜明暗边缘对比；同时保持 DOM 布局流中 Canvas 的绝对几何中心位置，配合中性色背景与低对比度文字，为人眼提供纯净的观察视野。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/training-shell-focus-mode #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 TrainingShell 沉浸式 HUD 与居中舞台

我们将全面重写 `TrainingShell.tsx`，将其改造为沉浸式视知觉训练舞台与轻量毛玻璃 Ghost HUD。

~~~~~act
write_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~tsx
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
~~~~~

#### Acts 2: 扩展 GenericTrainingView 支持计划上下文透传

更新 `GenericTrainingView.tsx`，导入并传递 `planContext`，保持通用渲染容器的无缝向下兼容。

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
import type { SessionHistoryItem } from '../components/modals/SessionSummaryModal';
import { TrainingShell } from '../components/training/TrainingShell';
import type { CardManifest } from '../core/cardContract';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../storage/index';
import type { BaseModuleSettings, GlobalSettings } from '../storage/settings';
import type { CardDefinition } from '../types/card';

export interface GenericTrainingViewProps<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  card: CardDefinition;
  manifest: CardManifest<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  globalSettings?: GlobalSettings;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  onIdleChange?: (isIdle: boolean) => void;
  onIdleResume?: (idleDurationMs: number) => void;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
}

export function GenericTrainingView<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
>({
  card,
  manifest,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  targetLimitTrials,
  onTargetLimitReached,
  onIdleChange,
  onIdleResume,
  showExitButton = true,
  showTimer = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
~~~~~
~~~~~typescript.new
import type { SessionHistoryItem } from '../components/modals/SessionSummaryModal';
import { type PlanTrainingContext, TrainingShell } from '../components/training/TrainingShell';
import type { CardManifest } from '../core/cardContract';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../storage/index';
import type { BaseModuleSettings, GlobalSettings } from '../storage/settings';
import type { CardDefinition } from '../types/card';

export interface GenericTrainingViewProps<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  card: CardDefinition;
  manifest: CardManifest<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  globalSettings?: GlobalSettings;
  planContext?: PlanTrainingContext;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  onIdleChange?: (isIdle: boolean) => void;
  onIdleResume?: (idleDurationMs: number) => void;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
}

export function GenericTrainingView<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
>({
  card,
  manifest,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  planContext,
  targetLimitTrials,
  onTargetLimitReached,
  onIdleChange,
  onIdleResume,
  showExitButton = true,
  showTimer = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={currentLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      showExitButton={showExitButton}
      showTimer={showTimer}
      onExit={onExit}
    >
~~~~~
~~~~~typescript.new
  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={currentLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      planContext={planContext}
      showExitButton={showExitButton}
      showTimer={showTimer}
      onExit={onExit}
    >
~~~~~

#### Acts 3: 改造 PlanTrainingView 合并顶栏消除视觉堆叠

重构 `PlanTrainingView.tsx`，将阶段状态（阶段序号、总阶段、目标题量、跳过阶段）组织为 `planContext` 透传，完全移除外部堆叠的实心卡片 Header。

~~~~~act
write_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~tsx
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/modals/SessionSummaryModal';
import { type PlanStageResult, PlanSummaryModal } from '../components/plan/PlanSummaryModal';
import type { PlanTrainingContext } from '../components/training/TrainingShell';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { getProfile } from '../storage/index';
import { type UserSettings, getCardSettings } from '../storage/settings';
import type { TrainingPlan } from '../types/plan';
import { GenericTrainingView } from './GenericTrainingView';

interface PlanTrainingViewProps {
  plan: TrainingPlan;
  settings: UserSettings;
  onExit: () => void;
}

export function PlanTrainingView({ plan, settings, onExit }: PlanTrainingViewProps) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stageResults, setStageResults] = useState<PlanStageResult[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);
  const [planSessionKey, setPlanSessionKey] = useState<number>(0);
  const [isPlanIdle, setIsPlanIdle] = useState<boolean>(false);

  const validItems = (plan.items || []).filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );

  const currentStep = validItems[currentStepIndex];
  const currentCard = currentStep ? registry.getCardById(currentStep.cardId) : null;

  useEffect(() => {
    let isMounted = true;
    const stepIdx = currentStepIndex;
    const sessionKey = planSessionKey;

    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id)
        .then((p) => {
          if (!isMounted) return;
          setStageInitialLevel(p?.currentLevel || 5);
          setIsLevelLoaded(true);
        })
        .catch((err) => {
          console.error(
            `Failed to load profile for card ${currentCard.id} at step ${stepIdx} (session ${sessionKey}):`,
            err,
          );
          if (!isMounted) return;
          setStageInitialLevel(5);
          setIsLevelLoaded(true);
        });
    } else {
      setIsLevelLoaded(true);
    }
    return () => {
      isMounted = false;
    };
  }, [currentCard, currentStepIndex, planSessionKey]);

  const handleIdleChange = useCallback((idle: boolean) => {
    setIsPlanIdle(idle);
  }, []);

  const handleIdleResume = useCallback((idleDurationMs: number) => {
    setSessionStartTime((prev) => prev + idleDurationMs);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal && !isPlanIdle && isLevelLoaded) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal, isPlanIdle, isLevelLoaded]);

  const handleStageReached = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard) return;

      const stageRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStep.targetTrials,
        history,
      };

      const nextResults = [...stageResults, stageRes];
      setStageResults(nextResults);

      if (currentStepIndex + 1 < validItems.length) {
        setIsLevelLoaded(false);
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, stageResults, validItems.length],
  );

  const handleSkipCurrentStage = useCallback(() => {
    if (!currentCard) return;
    const skippedRes: PlanStageResult = {
      card: currentCard,
      targetTrials: currentStep.targetTrials,
      history: [],
    };
    const nextResults = [...stageResults, skippedRes];
    setStageResults(nextResults);

    if (currentStepIndex + 1 < validItems.length) {
      setIsLevelLoaded(false);
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setShowSummaryModal(true);
    }
  }, [currentCard, currentStep, currentStepIndex, stageResults, validItems.length]);

  const handleRequestExit = useCallback(() => {
    if (stageResults.length > 0) {
      setShowSummaryModal(true);
    } else {
      onExit();
    }
  }, [stageResults.length, onExit]);

  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
    setIsPlanIdle(false);
    setShowSummaryModal(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
    setPlanSessionKey((prev) => prev + 1);
  }, []);

  if (!currentCard || validItems.length === 0) {
    onExit();
    return null;
  }

  const manifest = registry.getCardManifest(currentCard.id);
  if (!manifest) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);
  const cardTitle = getCardTitle(currentCard, t);

  const planContext: PlanTrainingContext = {
    planName: plan.name,
    currentStage: currentStepIndex + 1,
    totalStages: validItems.length,
    targetTrials: currentStep.targetTrials,
    onSkipStage: handleSkipCurrentStage,
  };

  return (
    <div className="w-full">
      {!isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-muted-foreground text-xs font-semibold bg-card/60 backdrop-blur-md rounded-3xl border border-border shadow-sm">
          {t('plan.loadingLevel', { title: cardTitle })}
        </div>
      ) : (
        <GenericTrainingView
          key={`plan-stage-${planSessionKey}-${currentStepIndex}-${currentCard.id}`}
          card={currentCard}
          manifest={manifest}
          sessionType="training"
          initialLevel={stageInitialLevel}
          settings={cardConfig}
          globalSettings={settings.global}
          planContext={planContext}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          onIdleChange={handleIdleChange}
          onIdleResume={handleIdleResume}
          showExitButton={true}
          showTimer={true}
          onExit={handleRequestExit}
        />
      )}

      {showSummaryModal && (
        <PlanSummaryModal
          planName={plan.name}
          stageResults={stageResults}
          totalElapsedSeconds={totalElapsedSeconds}
          onClose={onExit}
          onRestart={handleRestartPlan}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议

1. **测试与验证**：
   - 运行开发环境（`npm run dev`）或自动化测试（`npm run test`），验证单卡自适应训练（`#/train/...`）、20题基准测试与日常计划流训练（`#/plan-train`）的渲染与交互。
   - 测试深色（Dark）模式与浅色（Light）模式下，毛玻璃 Ghost HUD 的对比度是否足够清晰且不喧宾夺主。
   - 验证快捷键（`Space` 提交/切题、`Esc` 退出）在不同卡片交互下的流畅性。
2. **提交计划**：
   - 若功能与视觉体验达到预期，可通知我生成 `[COMMIT]` 计划以持久化本次重构提交。
