在 Vite/esbuild 编译阶段，自定义 Hook 内混合使用 `async function` 局部声明与 `const` 闭包变量会导致 module AST 节点解析冲突，使得编译产物丢失了 `export function useTrainingSession` 的导出标头，进而引发 `SyntaxError: ... does not provide an export named 'useTrainingSession'` 异常。

我们将 `useTrainingSession.ts` 内部的所有 handler 函数统一采用标准且风格一致的 `useCallback` 语法进行包装声明。这不仅能够保持全量回调函数的作用域类型安全，且可确保 Vite 构建器 100% 正确生成 ESModule 导出节点。

## [WIP] fix: 修复 useTrainingSession 的 ESModule 导出语法解析异常

### 错误分析

报错信息：
`Uncaught SyntaxError: The requested module '/src/hooks/useTrainingSession.ts' does not provide an export named 'useTrainingSession'`

在前一版改动中，Hook 函数体内混合了 `async function` 语句声明与 `const` 变量赋值。Vite 底层的 esbuild 在转换该 TS 模块时解析词法树异常，抛出了 Module 导出未定义的语法错误。

### 用户需求

修复模块导出错误，确保 `useTrainingSession` 能够被 `ColorTrainingView`、`TrainingView` 和 `RelativeColorTrainingView` 等视图组件顺利导入和运行。

### 评论

在自定义 Hook 内，统一使用 `useCallback` 来包装所有返回或传递给内部监听器的 handler 函数，既符合 React/Preact 函数组件的统一代码风格，也能避免混用 `function` 语句引发的转译器 AST 解析异常。

### 目标

重构 `useTrainingSession.ts` 内全部 handler 函数的声明，统一采用 `const handleXxx = useCallback(...)` 风格。

### 基本原理

保持 Hook 函数体结构的标准化，使用统一的 `const` + `useCallback` 变量定义体系，确保 Vite 的 esbuild 能够生成合规干净的 ESModule 导出一级标头。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/use-training-session-export #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 使用标准的 useCallback 结构重构 useTrainingSession.ts

~~~~~act
write_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
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
    },
    [
      questionStartTime,
      evaluateAnswer,
      question,
      isHit,
      totalTrials,
      hitTrials,
      saveTrialRecord,
      getQuestionLevel,
      sessionType,
      saveCurrentSession,
      autoNextDelay,
      autoNext,
      handleNextQuestion,
    ],
  );

  const handleRequestFinish = useCallback(async () => {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  }, [
    sessionHistory.length,
    showSummaryModal,
    saveCurrentSession,
    totalTrials,
    hitTrials,
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
    sessionIdRef.current = `${domain}_${mode}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, generateQuestion]);

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
  }, [showAnswer, isFinished, handleNextQuestion, handleRequestFinish]);

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

- 刷新浏览器页面并进入任一练习模块，验证 `useTrainingSession` 导出加载成功，页面运行正常。
- 在控制台或终端运行 `npm run checkf` 验证静态检查通过。
