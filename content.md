我将为你制定实施计划，在 FormSight 中引入完整的 **Sandbox（沙盒调试）模式**。

该计划包含：
1. **路由升级**：支持 `#/train/<cardId>?type=sandbox`，并将所有的 `test` 语义归一为 `sandbox`。
2. **入库隔离**：在沙盒模式下彻底阻断 IndexedDB 写入（不存 records、不更新 session、不影响能力档案与热力图）。
3. **设置页专属入口**：在卡片设置弹窗（`SettingsModal`）中增设“沙盒调试模式”引导与启动入口。
4. **卡片 ID 显式呈现**：沙盒模式的 HUD 顶栏直接展示并支持用户一键选定/复制真实 `card.id`。
5. **手动 Level 步进调节与无限重刷**：提供 `[ - ] Lvl X [ + ]` 步进器和无限重刷题目的能力。
6. **一键直接揭晓 (Reveal Answer)**：无需答题即可直接查看基准真理。
7. **参数检查器 (Question Inspector)**：内置可折叠的 JSON 数据抽屉，方便直观校验题目结构。

## [WIP] feat(core): 实现卡片沙盒调试模式与题目检查器

### 用户需求
1. 实现专有的 `sandbox` 模式（移除任何 `test` 命名），通过 `#/train/<cardId>?type=sandbox` 进入。
2. 入口设在卡片设置弹窗（SettingsModal）中。
3. 沙盒模式下，HUD 区域同时展示卡片真实 ID，且 ID 文本允许选择和复制。
4. 支持随时手动调整当前的 difficulty level（1~35）。
5. 支持随时无限次点击“重新生成题目”。
6. 提供“一键直接揭晓答案 (Reveal)”功能。
7. 内置折叠小面板（Question Inspector），实时透视当前题目的数据。
8. 沙盒模式下的任何做答行为均不写入 IndexedDB。

### 评论
沙盒模式为卡片作者和核心玩家提供了纯净、可预测、无心理负担的算法与难度验证环境。通过统一在宿主层（Router -> View -> Hook -> Shell）拦截与注入，系统的所有卡片能够以零侵入、零修改卡片源码的方式全量享受沙盒能力，高度符合架构的开闭原则（OCP）。

### 目标
1. 扩展 `useHashRoute.ts`，支持 `type=sandbox` 解析并映射到 `sessionType: 'sandbox'`。
2. 升级 `useTrainingSession.ts`，支持 `setCurrentLevel`、`regenerateQuestion`、`revealAnswer`，并在沙盒模式下禁用自适应自动升降级。
3. 改造 `GenericTrainingView.tsx`，在沙盒模式下将保存函数全部置为 no-op。
4. 增强 `TrainingShell.tsx`，加入沙盒专属 Badge、复制型 Card ID、Level 调节器、重刷按钮、一键揭晓按钮和折叠 Inspector 面板。
5. 扩展 `SettingsModal.tsx`，在设置页底部添加“进入沙盒模式”入口。
6. 完善中英文多语言词典。

### 基本原理
1. **数据切断**：`GenericTrainingView` 作为宿主容器，接收 `sessionType`。当为 `sandbox` 时，注入给 `useTrainingSession` 的 `saveTrialRecord` 与 `saveSession` 均为空实现（no-op），从根源杜绝数据污染。
2. **状态解耦**：在 `useTrainingSession` 中暴露 `setCurrentLevel` 和 `regenerateQuestion` 命令，沙盒模式下用户的作答不再驱动 `AdaptiveEngine` 的自动变级，完全将控制权交还给用户。
3. **Inspector 零侵入**：`useTrainingSession` 持有当前题目状态 `question`，通过回调暴露给 `TrainingShell`，`TrainingShell` 内置 Preact 状态控制面板展开并使用 `<pre>` 序列化，无需卡片单独实现。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/cli #concept/executor #scope/core #scope/ux #ai/instruct #task/domain/runtime #task/object/sandbox-mode #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新多语言词典（中英文支持沙盒模式与调试面板）

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "benchmark": "基准测试",
    "training": "自适应训练",
    "targeting": "靶向强化训练",
    "experimental": "实验性模块",
    "trialsCount": "已练题数",
~~~~~
~~~~~json
    "benchmark": "基准测试",
    "training": "自适应训练",
    "targeting": "靶向强化训练",
    "sandbox": "沙盒演练",
    "regenerate": "换一题",
    "revealAnswer": "直接揭晓",
    "inspector": "题目检查器",
    "experimental": "实验性模块",
    "trialsCount": "已练题数",
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "marginOff": "关闭 (0px)"
  },
~~~~~
~~~~~json
    "marginOff": "关闭 (0px)",
    "sandboxSectionTitle": "沙盒调试模式",
    "sandboxSectionDesc": "在免计分沙盒中自由调节难度、查看题目参数并验证算法",
    "enterSandbox": "进入沙盒模式"
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
    "benchmark": "Benchmark",
    "training": "Adaptive Training",
    "targeting": "Targeted Training",
    "experimental": "Experimental",
    "trialsCount": "Trials Done",
~~~~~
~~~~~json
    "benchmark": "Benchmark",
    "training": "Adaptive Training",
    "targeting": "Targeted Training",
    "sandbox": "Sandbox",
    "regenerate": "New Question",
    "revealAnswer": "Reveal",
    "inspector": "Question Inspector",
    "experimental": "Experimental",
    "trialsCount": "Trials Done",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
    "marginOff": "Off (0px)"
  },
~~~~~
~~~~~json
    "marginOff": "Off (0px)",
    "sandboxSectionTitle": "Sandbox Mode",
    "sandboxSectionDesc": "Freely adjust difficulty level, inspect parameters, and test algorithms without logging trials",
    "enterSandbox": "Enter Sandbox Mode"
  },
~~~~~

#### Acts 2: 升级路由解析器以支持 `type=sandbox`

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
export type RouteLocation =
  | { type: 'home' }
  | { type: 'discovery'; query?: CardQueryOptions }
  | {
      type: 'train';
      cardId: string;
      sessionType: 'training' | 'benchmark';
      returnTo?: ReturnToLocation;
    }
  | { type: 'plan-train'; returnTo?: ReturnToLocation }
~~~~~
~~~~~typescript
export type RouteLocation =
  | { type: 'home' }
  | { type: 'discovery'; query?: CardQueryOptions }
  | {
      type: 'train';
      cardId: string;
      sessionType: 'training' | 'benchmark' | 'sandbox';
      returnTo?: ReturnToLocation;
    }
  | { type: 'plan-train'; returnTo?: ReturnToLocation }
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const sessionType = queryParams.get('type') === 'benchmark' ? 'benchmark' : 'training';
    const fromParam = queryParams.get('from') || queryParams.get('returnTo');
    const returnTo = fromParam as ReturnToLocation | undefined;
    return { type: 'train', cardId, sessionType, returnTo };
  }
~~~~~
~~~~~typescript
  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const rawType = queryParams.get('type');
    const sessionType =
      rawType === 'benchmark' ? 'benchmark' : rawType === 'sandbox' ? 'sandbox' : 'training';
    const fromParam = queryParams.get('from') || queryParams.get('returnTo');
    const returnTo = fromParam as ReturnToLocation | undefined;
    return { type: 'train', cardId, sessionType, returnTo };
  }
~~~~~

#### Acts 3: 更新 App 标题同步器，兼容 sandbox 标题

~~~~~act
patch_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
~~~~~
~~~~~typescript
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('shell.training');
      const prefix = route.sessionType === 'sandbox' ? `[${t('shell.sandbox')}] ` : '';
      document.title = `${prefix}${cardTitle} - ${t('common.appName')}`;
    }
~~~~~

#### Acts 4: 增强 `useTrainingSession` Hook（支持调级、即时换题与直接揭晓）

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  cardId: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  autoNext: boolean;
~~~~~
~~~~~typescript
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  cardId: string;
  sessionType: 'training' | 'benchmark' | 'sandbox';
  initialLevel: number;
  autoNext: boolean;
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  const handleNextQuestion = useCallback(() => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [isFinished, generateQuestion]);
~~~~~
~~~~~typescript
  const handleNextQuestion = useCallback(() => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [isFinished, generateQuestion]);

  const setCurrentLevel = useCallback(
    (newLevel: number) => {
      const clamped = Math.max(1, Math.min(35, newLevel));
      adaptiveEngineRef.current.setLevel(clamped);
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
      setShowAnswer(false);
      setUserAnswer(null);
      setQuestion(generateQuestion(clamped));
      setQuestionStartTime(Date.now());
    },
    [generateQuestion],
  );

  const regenerateQuestion = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    const currentLvl = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(currentLvl));
    setQuestionStartTime(Date.now());
  }, [generateQuestion]);

  const revealAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
      const levelBefore = adaptiveEngineRef.current.getCurrentLevel();
      adaptiveEngineRef.current.recordResult(hit);
      const levelAfter = adaptiveEngineRef.current.getCurrentLevel();

      await saveTrialRecord({
        sessionId: sessionIdRef.current,
        question,
        hitResult,
        responseTimeMs,
        userVal,
        currentProfileLevel: levelAfter,
      });
~~~~~
~~~~~typescript
      const levelBefore = adaptiveEngineRef.current.getCurrentLevel();
      if (sessionType !== 'sandbox') {
        adaptiveEngineRef.current.recordResult(hit);
      }
      const levelAfter = adaptiveEngineRef.current.getCurrentLevel();

      await saveTrialRecord({
        sessionId: sessionIdRef.current,
        question,
        hitResult,
        responseTimeMs,
        userVal,
        currentProfileLevel: levelAfter,
      });
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
    resumeFromIdle,
    pauseToIdle,
    handleAnswer,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  };
}
~~~~~
~~~~~typescript
    resumeFromIdle,
    pauseToIdle,
    handleAnswer,
    handleNextQuestion,
    setCurrentLevel,
    regenerateQuestion,
    revealAnswer,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  };
}
~~~~~

#### Acts 5: 更新 `TrainingShell.tsx`（实现卡片 ID 复制、Inspector 抽屉、直接揭晓与换题控制）

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, Clock, FastForward, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import {
  ArrowLeft,
  Clock,
  Code,
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
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  const isSandbox = sessionType === 'sandbox';

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
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
          <div className="relative flex items-center min-w-0">
            <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
              <span className="truncate">{cardTitle}</span>
              {isSandbox && (
                <code
                  className="font-mono text-[11px] bg-muted/80 hover:bg-accent text-foreground px-1.5 py-0.5 rounded border border-border select-all cursor-text tracking-tight flex-shrink-0"
                  title="Card ID (Selectable)"
                >
                  {card.id}
                </code>
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
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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
                onClick={() => setShowInspector(!showInspector)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground border border-border/40"
                title={t('shell.inspector')}
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
              {t('shell.inspector')} ({card.id})
            </span>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setShowInspector(false)}
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <pre className="text-foreground/90 p-2 bg-muted/60 rounded-xl overflow-x-auto text-[11px] leading-relaxed select-text">
            {JSON.stringify(session ? (session as unknown as { question?: unknown }).question : null, null, 2)}
          </pre>
        </div>
      )}
~~~~~

#### Acts 6: 在 `GenericTrainingView.tsx` 中阻断沙盒数据落库

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
export interface GenericTrainingViewProps<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  card: CardDefinition;
  manifest: CardManifest<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark' | 'sandbox';
  initialLevel: number;
  settings: TSettings;
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      const qLevel =
        engine.getQuestionLevel?.(q) ??
        (q as { difficultyLevel?: number })?.difficultyLevel ??
        initialLevel;

      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          timestamp: Date.now(),
          difficultyLevel: qLevel,
          isHit: engine.isHit(hitResult),
          responseTimeMs,
          details: engine.extractRecordDetails?.(q, hitResult, userVal) ?? {},
        },
        currentProfileLevel,
      );
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
~~~~~
~~~~~typescript
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      if (sessionType === 'sandbox') return;
      const qLevel =
        engine.getQuestionLevel?.(q) ??
        (q as { difficultyLevel?: number })?.difficultyLevel ??
        initialLevel;

      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          timestamp: Date.now(),
          difficultyLevel: qLevel,
          isHit: engine.isHit(hitResult),
          responseTimeMs,
          details: engine.extractRecordDetails?.(q, hitResult, userVal) ?? {},
        },
        currentProfileLevel,
      );
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      if (sessionType === 'sandbox') return;
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
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
~~~~~typescript
  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={currentLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      currentQuestion={session.question}
      planContext={planContext}
      showExitButton={showExitButton}
      showTimer={showTimer}
      onExit={onExit}
    >
~~~~~

#### Acts 7: 在 `SettingsModal.tsx` 中添加“进入沙盒模式”入口

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript
import { Flame, RotateCcw, Sliders, Target } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { FlaskConical, Flame, RotateCcw, Sliders, Target } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript
interface SettingsModalProps {
  card: CardDefinition;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ card, settings, onClose, onSave }: SettingsModalProps) {
~~~~~
~~~~~typescript
interface SettingsModalProps {
  card: CardDefinition;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
  onEnterSandbox?: () => void;
}

export function SettingsModal({
  card,
  settings,
  onClose,
  onSave,
  onEnterSandbox,
}: SettingsModalProps) {
~~~~~

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript
        {/* 渲染卡片专属设置组件 */}
        {(() => {
          const manifest = registry.getCardManifest(card.id);
          const renderSettings = manifest?.ui?.renderSettings;
          if (renderSettings) {
            return (
              <div className="pt-2 border-t border-border/60">
                {renderSettings({
                  settings: cardConfig,
                  updateSettings: updateCardConfig,
                })}
              </div>
            );
          }
          return null;
        })()}
      </div>
    </ModalShell>
  );
}
~~~~~
~~~~~typescript
        {/* 渲染卡片专属设置组件 */}
        {(() => {
          const manifest = registry.getCardManifest(card.id);
          const renderSettings = manifest?.ui?.renderSettings;
          if (renderSettings) {
            return (
              <div className="pt-2 border-t border-border/60">
                {renderSettings({
                  settings: cardConfig,
                  updateSettings: updateCardConfig,
                })}
              </div>
            );
          }
          return null;
        })()}

        {/* 进入沙盒调试模式入口 */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3 bg-purple-50/60 dark:bg-purple-950/30 p-3.5 rounded-2xl border border-purple-200/60 dark:border-purple-800/40">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span>{t('settingsModal.sandboxSectionTitle')}</span>
            </div>
            <div className="text-xs text-purple-700/80 dark:text-purple-300/70 mt-0.5 leading-relaxed">
              {t('settingsModal.sandboxSectionDesc')}
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={onEnterSandbox}
            className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white shadow-none h-auto py-2 px-3 text-xs font-bold"
          >
            {t('settingsModal.enterSandbox')}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 8: 在 `app.tsx` 中将进入沙盒导航注入 `SettingsModal`

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={$settings.value}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={() => refreshAppData()}
        />
      )}
~~~~~
~~~~~typescript
      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={$settings.value}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={() => refreshAppData()}
          onEnterSandbox={() => {
            setActiveSettingsCardId(null);
            navigate({ type: 'train', cardId: activeSettingsCard.id, sessionType: 'sandbox' });
          }}
        />
      )}
~~~~~

---

### 下一步建议
1. **沙盒快捷键扩展**：可在 `useTrainingKeybindings.ts` 中针对 `sandbox` 模式提供键盘快捷键支持，例如按下 `R` 键快速重新生成、`[` / `]` 键增减 Level、`I` 键切换检查器抽屉，进一步提升调试体验。
2. **复制参数按钮**：在 Question Inspector 抽屉头部增加“复制 JSON (Copy JSON)”按钮，便于开发者将特定难度下的异常或极端题目参数粘贴至测试用例中。
