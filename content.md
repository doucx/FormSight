产生此报错的原因是在 `useTrainingSession.ts` 中，`useEffect` Hook 被写在了处理函数（`handleNextQuestion`、`handleRequestFinish` 等）的定义之前。在 JavaScript 中，通过 `const` 声明的函数存在临时死区 (Temporal Dead Zone, TDZ)，当组件初始化执行到 `useEffect` 并计算其依赖项数组 `[..., handleNextQuestion, handleRequestFinish]` 时，这两个函数变量尚未被声明和赋值，从而抛出了 `ReferenceError: Cannot access 'handleNextQuestion' before initialization` 错误。

我们将调整 `useTrainingSession.ts` 中代码的声明顺序，将所有 Hook 处理函数（`handleNextQuestion`、`handleRequestFinish` 等）提升定义在 `useEffect` 之前，彻底解决该变量未初始化访问的错误。

## [WIP] fix: 修复 useTrainingSession 中 handleNextQuestion 变量暂态死区初始化错误

### 错误分析

报错信息：
`Uncaught (in promise) ReferenceError: Cannot access 'handleNextQuestion' before initialization`
`at useTrainingSession (useTrainingSession.ts:114:5)`

在 `useTrainingSession.ts` 的函数体内，`useEffect` 监听器最先出现并试图在依赖项数组中访问 `handleNextQuestion` 和 `handleRequestFinish` 变量，而这两个变量在更靠后的行中才通过 `const handleNextQuestion = ...` 声明。当 Hook 函数被调用求值时，JavaScript 引擎在进入 TDZ（临时死区）时抛出了 `ReferenceError` 运行时异常。

### 用户需求

修复 Hook 函数组件初始化时的 `ReferenceError` 错误，确保 `useTrainingSession` 在各练习界面能够稳定无错地加载与初始化。

### 评论

这是一个典型的 JavaScript / TypeScript 函数变量提升与 TDZ 作用域定义问题。将副作用 `useEffect` 的定义统一放置在业务 Handler 函数声明之后即可规避。

### 目标

调整 `src/hooks/useTrainingSession.ts` 中函数与 Hook 的编写顺序：
1. 先定义 State 与 Ref 状态；
2. 再定义 `saveCurrentSession`、`handleNextQuestion`、`handleRequestFinish` 等回调处理逻辑；
3. 最后注册 `useEffect` 副作用监听器。

### 基本原理

在函数组件或自定义 Hook 中，先声明所有的内部事件回调函数，再声明引用这些函数的 `useEffect`，可以确保 `useEffect` 求值依赖数组时变量已经被正确赋上了函数实例引用。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/training-session-initialization #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 重构并修复 useTrainingSession.ts 中函数的声明顺序

~~~~~act
write_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import type { AdaptiveMode, StepGranularity } from '../utils/settings';

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
  generateQuestion: (level: number) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  saveTrialRecord: (params: {
    sessionId: string;
    question: TQuestion;
    hitResult: THitResult;
    responseTimeMs: number;
    userVal: TAnswerVal;
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
  generateQuestion,
  evaluateAnswer,
  isHit,
  getQuestionLevel,
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

  // === 业务处理逻辑函数 (定义在 useEffect 之前) ===

  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    await saveSession({
      sessionId: sessionIdRef.current,
      totalTrials: trials,
      hitTrials: hits,
      ended,
      startTimestamp: startTimeRef.current,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    });
  };

  const handleNextQuestion = () => {
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
  };

  const handleAnswer = async (userVal: TAnswerVal) => {
    const responseTimeMs = Date.now() - questionStartTime;
    const hitResult = evaluateAnswer(userVal, question);
    const hit = isHit(hitResult);

    setUserAnswer(hitResult);
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    await saveTrialRecord({
      sessionId: sessionIdRef.current,
      question,
      hitResult,
      responseTimeMs,
      userVal,
    });

    setSessionHistory((prev) => [
      ...prev,
      {
        trialIndex: newTotal,
        level: getQuestionLevel(question),
        isHit: hit,
        responseTimeMs,
      },
    ]);

    adaptiveEngineRef.current.recordResult(hit);

    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        setShowSummaryModal(true);
      }, autoNextDelay);
    } else if (autoNext) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, autoNextDelay);
    }
  };

  const handleRequestFinish = async () => {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  };

  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };

  const handleRestartSession = () => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    sessionIdRef.current = `${domain}_${mode}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  };

  // === 副作用监听器 (定义在 handler 之后) ===

  // 计时器
  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished]);

  // 快捷键响应 (Space / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (showAnswer && !isFinished) {
          e.preventDefault();
          handleNextQuestion();
        }
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        handleRequestFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showAnswer,
    isFinished,
    sessionHistory,
    showSummaryModal,
    totalTrials,
    hitTrials,
    handleNextQuestion,
    handleRequestFinish,
  ]);

  return {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    hitTrials,
    elapsedSeconds,
    isFinished,
    sessionHistory,
    showSummaryModal,
    handleAnswer,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  };
}
~~~~~

### 下一步建议

- 重新进入相对色感、寻星或绝对色感训练界面，检查页面是否能够正常加载与答题。
- 在作答几题后按下 `Esc` 键，确认能正确弹出训练结算对话框。
