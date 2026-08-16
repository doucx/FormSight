为了彻底根除 `handleNextQuestion` 在某些打包/热重载场景下因 JavaScript 变量初始化临时死区（TDZ）导致的 `ReferenceError` 报错，我们将使用 **标准 `function` 声明** 替代 `const` 匿名箭头函数。

在 JavaScript 标准中，通过 `function` 关键字声明的函数具备 **Function Hoisting（函数声明提升）** 特性，在当前函数作用域初始化时即自动就位，不受声明位置顺序限制，可完全避免 TDZ 异常。

## [WIP] fix: 使用函数声明提升彻底根除 useTrainingSession 初始化 TDZ 报错

### 错误分析

报错信息：
`Uncaught (in promise) ReferenceError: Cannot access 'handleNextQuestion' before initialization`
`at useTrainingSession (useTrainingSession.ts:114:5)`

虽然先前调整了行顺序，但在打包或 HMR 热更新环境中，用 `const` 声明的箭头函数在闭包、`useEffect` 依赖数组或定时器回调内部被捕获时，若存在变量求值与初始化时机重叠的情况，仍会进入 JavaScript 的 Temporal Dead Zone（临时死区），抛出 `ReferenceError`。

### 用户需求

彻底消除 `useTrainingSession` 初始化过程中的 `ReferenceError` 报错，确保各训练页面稳定挂载与运行。

### 评论

通过使用 JavaScript 原生的 `function` 语句声明 Hook 内的事件处理函数，可以借由 Function Hoisting（函数提升）在编译/执行阶段一次性将函数名注册至作用域顶端，是消除 TDZ 报错最稳健的做法。

### 目标

将 `useTrainingSession.ts` 中的事件处理函数：
- `saveCurrentSession`
- `handleNextQuestion`
- `handleAnswer`
- `handleRequestFinish`
- `handleFinishSession`
- `handleRestartSession`

全量重构为 `function` 声明形式，提升其作用域声明。

### 基本原理

JavaScript 引擎在创建执行上下文（Execution Context）时，会优先将 `function` 声明保存在环境记录中并赋予其函数对象引用。因此在作用域内的任何位置，访问 `function` 声明的标识符均安全可靠。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/training-session-tdz-fix #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 重构 useTrainingSession.ts 函数声明提升

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

  // === 使用 function 语句提升声明，彻底根除 TDZ 问题 ===

  async function saveCurrentSession(trials = totalTrials, hits = hitTrials, ended = false) {
    await saveSession({
      sessionId: sessionIdRef.current,
      totalTrials: trials,
      hitTrials: hits,
      ended,
      startTimestamp: startTimeRef.current,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    });
  }

  function handleNextQuestion() {
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
  }

  async function handleAnswer(userVal: TAnswerVal) {
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
  }

  async function handleRequestFinish() {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  }

  async function handleFinishSession() {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  }

  function handleRestartSession() {
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
  }

  // === 计时器 ===
  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished]);

  // === 快捷键响应 (Space / Escape) ===
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

- 刷新页面并重新进入练习模块（寻星练习、绝对色感或相对色感），验证界面是否能够顺利加载。
- 答题并按 `Esc` 键测试，确认能够正确调出结算总结对话框。
