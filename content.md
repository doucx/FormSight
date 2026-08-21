好的，我们将对 `useTrainingSession` 这一巨石 Hook 进行职责解耦与模块化重构，将**闲置与窗口失焦保护**、**键盘快捷键监听**等副作用抽离为独立可复用的子 Hook，使训练会话主流程聚焦于纯粹的题目状态流转与自适应难度决策。

## [WIP] refactor: 解耦 useTrainingSession 并模块化闲置保护与快捷键监听

### 用户需求
重构 `useTrainingSession`，将窗口失焦与闲置保护、键盘快捷键分发、计时器等副作用抽离为职责单一的独立子模块，实现核心训练状态机与外部浏览器环境事件的高内聚、低耦合。

### 评论
原本 270+ 行的 `useTrainingSession` 混杂了 DOM 事件监听、音频副作用触发、页面可见性变动以及题目状态流转，导致核心逻辑难以独立测试。通过将闲置检测（`useIdleProtection`）与全局快捷键（`useTrainingKeybindings`）解耦，不仅提升了代码可读性与可测性，也为后续接入无头（Headless）测试与多端交互提供了清晰边界。

### 目标
1. 创建 `src/hooks/session/useIdleProtection.ts`，独立封装窗口失焦、标签页切换及空闲超时的防作弊/暂停逻辑。
2. 创建 `src/hooks/session/useTrainingKeybindings.ts`，独立管理 Space、Escape 等交互快捷键。
3. 瘦身并重构 `src/hooks/useTrainingSession.ts`，使其成为专注处理题目流转、自适应层阶评估与数据提交的核心协调器。

### 基本原理
1. **单一职责原则 (SRP)**：DOM 事件监听（失焦、按键）属于外围输入适配器，不应侵入自适应答题算法的主循环。
2. **组合式设计 (Composition Pattern)**：通过微 Hook 组合，保持上层 `TrainingShell` 与 `GenericTrainingView` 的接口完全向后兼容，业务层无感知平滑过渡。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/state #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/hook-decomposition #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 创建独立闲置与失焦保护 Hook

新建 `src/hooks/session/useIdleProtection.ts`，专注监听用户交互活跃度与窗口可见性变化。

~~~~~act
write_file
src/hooks/session/useIdleProtection.ts
~~~~~
~~~~~ts
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

export interface UseIdleProtectionOptions {
  timeoutSec: number;
  disabled?: boolean;
  onPause?: () => void;
  onResume?: (idleDurationMs: number) => void;
}

export function useIdleProtection({
  timeoutSec,
  disabled = false,
  onPause,
  onResume,
}: UseIdleProtectionOptions) {
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const idleStartRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const pauseToIdle = useCallback(() => {
    if (disabled || isIdle) return;
    idleStartRef.current = Date.now();
    setIsIdle(true);
    onPause?.();
  }, [disabled, isIdle, onPause]);

  const resumeFromIdle = useCallback(() => {
    if (!isIdle) return;
    const duration = idleStartRef.current !== null ? Date.now() - idleStartRef.current : 0;
    idleStartRef.current = null;
    setIsIdle(false);
    onResume?.(duration);
  }, [isIdle, onResume]);

  useEffect(() => {
    if (disabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const resetIdleTimer = () => {
      if (isIdle) return;
      if (timerRef.current) clearTimeout(timerRef.current);

      if (timeoutSec > 0) {
        timerRef.current = window.setTimeout(() => {
          pauseToIdle();
        }, timeoutSec * 1000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseToIdle();
      }
    };

    const handleWindowBlur = () => {
      pauseToIdle();
    };

    const userActivityEvents = ['pointerdown', 'pointermove', 'keydown', 'touchstart'];
    for (const evt of userActivityEvents) {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    resetIdleTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const evt of userActivityEvents) {
        window.removeEventListener(evt, resetIdleTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [disabled, isIdle, timeoutSec, pauseToIdle]);

  return {
    isIdle,
    pauseToIdle,
    resumeFromIdle,
  };
}
~~~~~

#### Acts 2: 创建训练会话快捷键管理 Hook

新建 `src/hooks/session/useTrainingKeybindings.ts`，独立处理 Space、Escape 等键盘交互。

~~~~~act
write_file
src/hooks/session/useTrainingKeybindings.ts
~~~~~
~~~~~ts
import { useEffect } from 'preact/hooks';

export interface UseTrainingKeybindingsOptions {
  isIdle: boolean;
  showAnswer: boolean;
  isFinished: boolean;
  disabled?: boolean;
  onResumeFromIdle: () => void;
  onNextQuestion: () => void;
  onRequestFinish: () => void;
}

export function useTrainingKeybindings({
  isIdle,
  showAnswer,
  isFinished,
  disabled = false,
  onResumeFromIdle,
  onNextQuestion,
  onRequestFinish,
}: UseTrainingKeybindingsOptions) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (isIdle) {
        e.preventDefault();
        onResumeFromIdle();
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        if (showAnswer) {
          e.preventDefault();
          if (!isFinished) {
            onNextQuestion();
          } else {
            onRequestFinish();
          }
        }
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        onRequestFinish();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isIdle, showAnswer, isFinished, onResumeFromIdle, onNextQuestion, onRequestFinish]);
}
~~~~~

#### Acts 3: 重构 `useTrainingSession` 主状态机

重构 `src/hooks/useTrainingSession.ts`，组合子 Hook 并保持对外 API 100% 稳定兼容。

~~~~~act
write_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~ts
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../core/engine/adaptiveEngine';
import { type AdaptiveMode, type StepGranularity, loadSettings } from '../utils/settings';
import { playHitSound, playMissSound } from '../utils/sound';
import { useIdleProtection } from './session/useIdleProtection';
import { useTrainingKeybindings } from './session/useTrainingKeybindings';

export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity?: StepGranularity;
  adaptiveMode?: AdaptiveMode;
  targetAccuracy?: number;
  blockSize?: number;
  idleTimeoutSec?: number;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  generateQuestion: (level: number) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  saveTrialRecord: (params: {
    sessionId: string;
    question: TQuestion;
    hitResult: THitResult;
    responseTimeMs: number;
    userVal: TAnswerVal;
    currentProfileLevel: number;
  }) => Promise<void>;
  saveSession: (params: {
    sessionId: string;
    totalTrials: number;
    hitTrials: number;
    ended: boolean;
    startTimestamp: number;
    endLevel: number;
  }) => Promise<void>;
  onExit: () => void;
}

export function useTrainingSession<TQuestion, THitResult, TAnswerVal>({
  domain,
  mode,
  sessionType,
  initialLevel,
  autoNext,
  autoNextDelay,
  stepGranularity = 'standard',
  adaptiveMode = 'block',
  targetAccuracy = 0.8,
  blockSize = 10,
  idleTimeoutSec: optionsIdleTimeout,
  targetLimitTrials,
  onTargetLimitReached,
  generateQuestion,
  evaluateAnswer,
  isHit,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
  const sessionIdRef = useRef<string>(`${domain}_${mode}_session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : adaptiveMode,
      targetAccuracy,
      blockSize,
    ),
  );
  const autoNextTimerRef = useRef<number | null>(null);

  const [question, setQuestion] = useState<TQuestion>(() => generateQuestion(initialLevel));
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<THitResult | null>(null);

  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const streakRef = useRef<number>(0);

  const effectiveIdleTimeout =
    typeof optionsIdleTimeout === 'number'
      ? optionsIdleTimeout
      : (loadSettings().global.idleTimeout ?? 60);

  // === 1. 闲置与失焦保护微 Hook ===
  const { isIdle, pauseToIdle, resumeFromIdle } = useIdleProtection({
    timeoutSec: effectiveIdleTimeout,
    disabled: isFinished || showSummaryModal,
    onResume: (idleDurationMs) => {
      startTimeRef.current += idleDurationMs;
      setQuestionStartTime((prev) => prev + idleDurationMs);
    },
  });

  const saveCurrentSession = useCallback(
    async (trials = totalTrials, hits = hitTrials, ended = false) => {
      await saveSession({
        sessionId: sessionIdRef.current,
        totalTrials: trials,
        hitTrials: hits,
        ended,
        startTimestamp: startTimeRef.current,
        endLevel: adaptiveEngineRef.current.getCurrentLevel(),
      });
    },
    [saveSession, totalTrials, hitTrials],
  );

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

  const handleAnswer = useCallback(
    async (userVal: TAnswerVal) => {
      const responseTimeMs = Date.now() - questionStartTime;
      const hitResult = evaluateAnswer(userVal, question);
      const hit = isHit(hitResult);

      if (hit) {
        streakRef.current += 1;
        playHitSound(streakRef.current);
      } else {
        streakRef.current = 0;
        playMissSound();
      }

      setUserAnswer(hitResult);
      setShowAnswer(true);

      const newTotal = totalTrials + 1;
      const newHits = hitTrials + (hit ? 1 : 0);
      setTotalTrials(newTotal);
      setHitTrials(newHits);

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

      const nextHistoryItem: SessionHistoryItem = {
        trialIndex: newTotal,
        levelBefore,
        levelAfter,
        isHit: hit,
        responseTimeMs,
      };

      const updatedHistory = [...sessionHistory, nextHistoryItem];
      setSessionHistory(updatedHistory);

      if (targetLimitTrials && newTotal >= targetLimitTrials) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        if (autoNext) {
          autoNextTimerRef.current = window.setTimeout(() => {
            if (onTargetLimitReached) {
              onTargetLimitReached(updatedHistory);
            } else {
              setShowSummaryModal(true);
            }
          }, autoNextDelay);
        }
      } else if (sessionType === 'benchmark' && newTotal >= 20) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        if (autoNext) {
          autoNextTimerRef.current = window.setTimeout(() => {
            setShowSummaryModal(true);
          }, autoNextDelay);
        }
      } else if (autoNext) {
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          handleNextQuestion();
        }, autoNextDelay);
      }
    },
    [
      questionStartTime,
      evaluateAnswer,
      question,
      isHit,
      totalTrials,
      hitTrials,
      saveTrialRecord,
      sessionHistory,
      targetLimitTrials,
      onTargetLimitReached,
      sessionType,
      saveCurrentSession,
      autoNextDelay,
      autoNext,
      handleNextQuestion,
    ],
  );

  const handleRequestFinish = useCallback(async () => {
    if (targetLimitTrials && totalTrials >= targetLimitTrials && onTargetLimitReached) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onTargetLimitReached(sessionHistory);
      return;
    }
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  }, [
    targetLimitTrials,
    totalTrials,
    hitTrials,
    onTargetLimitReached,
    sessionHistory,
    showSummaryModal,
    saveCurrentSession,
    onExit,
  ]);

  const handleFinishSession = useCallback(async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  }, [saveCurrentSession, totalTrials, hitTrials, onExit]);

  const handleRestartSession = useCallback(() => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    streakRef.current = 0;
    sessionIdRef.current = `${domain}_${mode}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    adaptiveEngineRef.current.setLevel(initialLevel);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, initialLevel, generateQuestion]);

  // === 2. 键盘快捷键微 Hook ===
  useTrainingKeybindings({
    isIdle,
    showAnswer,
    isFinished,
    disabled: showSummaryModal,
    onResumeFromIdle: resumeFromIdle,
    onNextQuestion: handleNextQuestion,
    onRequestFinish: handleRequestFinish,
  });

  // === 3. 活跃计时器 ===
  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished || isIdle) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished, isIdle]);

  return {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    hitTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    sessionHistory,
    showSummaryModal,
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

---

### 下一步建议
1. **端到端类型安全收口**：为 `TrainingPlugin` 与视图适配器定义完备的判别联合类型（Discriminated Union Types），消除组件中残留的 `as unknown as ...` 断言。
2. **运行测试验证**：执行单元测试与打包检查，确保所有解耦模块运转正常。
