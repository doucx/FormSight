我将为你实现闲置与窗口失焦时的休眠/暂停保护（`idleTimeout` 及 `visibilitychange` / `window.blur` 自动暂停），并在画布区域叠加带有 Backdrop Blur 的视觉蒙版，支持点击或按键快速恢复心流与计时。

## [WIP] feat: 支持闲置与窗口失焦休眠保护及画布蒙版提示

### 用户需求
1. **休眠/暂停保护视觉提示 (`idleTimeout`)**：当用户在规定时间内未进行任何交互时，画布区域自动叠加模糊蒙版（Backdrop Blur）并显示“训练已暂停 / 点击任意处继续训练”的明确视觉提示。
2. **窗口失焦/切后台自动暂停**：除闲置超时外，当页面不可见（`visibilitychange` 变为 `hidden`）或窗口失焦（`blur`）时，也能立即触发暂停保护，防止误计训练时长与答题反应时间。
3. **心流恢复与时间补偿**：恢复训练时无缝校准秒表与单题响应耗时，避免统计污染；在全局设置中支持配置闲置超时时间。

### 评论
在认知与感知训练系统中，用户可能因突发打扰、切换窗口查询资料或离开工位而中断训练。若无暂停保护机制，长时间闲置会导致“训练时长”虚高以及当前题目的“反应时间 (`responseTimeMs`)”异常激增，严重污染自适应算子与统计数据的客观性。通过结合事件监听、页面可见性 API 与高斯模糊蒙版，可以有效维护数据纯度并提升心流体验。

### 目标
1. 在 `src/hooks/useTrainingSession.ts` 中引入完整的休眠与暂停检测机制（闲置超时、`visibilitychange`、`blur`），提供 `isIdle` 状态与 `resumeFromIdle` 恢复函数，并在恢复时校准 `startTimeRef` 与 `questionStartTime`。
2. 在 `src/views/TrainingView.tsx`、`src/views/ColorTrainingView.tsx` 以及 `src/views/RelativeColorTrainingView.tsx` 中为画布区域增加 relative 容器与 `Backdrop Blur` 暂停蒙版。
3. 在 `src/components/GlobalSettingsModal.tsx` 中增加“闲置自动暂停”时长选项配置（关闭/30秒/60秒/120秒/300秒）。

### 基本原理
1. **全方位事件感知**：在 Hook 内部监听 `mousemove`、`pointerdown`、`keydown` 事件重置闲置计时器；同时监听 `document.visibilitychange` 与 `window.blur`，一旦切出窗口即刻进入 `isIdle` 状态。
2. **精确的时间补偿 (Time Compensation)**：在进入休眠时记录 `idleStartTimestamp`，在唤醒恢复时计算休眠时长 `idleDuration`，直接向前顺延 `startTimeRef` 与 `questionStartTime`，保证 `elapsedSeconds` 和答题耗时分秒不差。
3. **沉浸式 Backdrop Blur 蒙版**：在做答画布正上方叠加带有 `backdrop-blur-md bg-slate-900/40` 的蒙版层与脉冲图标，拦截画布的误点击，点击蒙版或按下键盘即可立刻恢复训练。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #concept/state #scope/ux #ai/instruct #task/domain/ui #task/object/idle-pause-protection #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在 `useTrainingSession.ts` 中实现闲置与失焦自动暂停及时间补偿

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import type { AdaptiveMode, StepGranularity } from '../utils/settings';
import { playHitSound, playMissSound } from '../utils/sound';

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
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { type AdaptiveMode, type StepGranularity, loadSettings } from '../utils/settings';
import { playHitSound, playMissSound } from '../utils/sound';

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
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const streakRef = useRef<number>(0);
~~~~~
~~~~~typescript
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const streakRef = useRef<number>(0);
  const idleStartRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  const effectiveIdleTimeout =
    typeof optionsIdleTimeout === 'number'
      ? optionsIdleTimeout
      : (loadSettings().global.idleTimeout ?? 60);
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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
  generateQuestion,
  evaluateAnswer,
  isHit,
  getQuestionLevel,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
  const pauseToIdle = useCallback(() => {
    if (isFinished || showSummaryModal || isIdle) return;
    idleStartRef.current = Date.now();
    setIsIdle(true);
  }, [isFinished, showSummaryModal, isIdle]);

  const resumeFromIdle = useCallback(() => {
    if (!isIdle) return;
    if (idleStartRef.current !== null) {
      const idleDuration = Date.now() - idleStartRef.current;
      startTimeRef.current += idleDuration;
      setQuestionStartTime((prev) => prev + idleDuration);
      idleStartRef.current = null;
    }
    setIsIdle(false);
  }, [isIdle]);

  const handleRestartSession = useCallback(() => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setIsIdle(false);
    idleStartRef.current = null;
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    streakRef.current = 0;
    sessionIdRef.current = `${domain}_${mode}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, generateQuestion]);

  // === 闲置与失焦监听 ===
  useEffect(() => {
    if (isFinished || showSummaryModal) return;

    const resetIdleTimer = () => {
      if (isIdle) return;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (effectiveIdleTimeout > 0) {
        idleTimerRef.current = window.setTimeout(() => {
          pauseToIdle();
        }, effectiveIdleTimeout * 1000);
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
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      for (const evt of userActivityEvents) {
        window.removeEventListener(evt, resetIdleTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isFinished, showSummaryModal, isIdle, effectiveIdleTimeout, pauseToIdle]);

  // === 计时器 ===
  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished || isIdle) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished, isIdle]);
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
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
~~~~~typescript
  // === 快捷键响应 (Space / Escape) ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isIdle) {
        e.preventDefault();
        resumeFromIdle();
        return;
      }
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
  }, [isIdle, resumeFromIdle, showAnswer, isFinished, handleNextQuestion, handleRequestFinish]);

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

#### Acts 2: 在 `TrainingView.tsx` 中增加休眠模糊蒙版

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import { useCallback, useRef } from 'preact/hooks';
import { SessionSummaryModal } from '../components/SessionSummaryModal';
import { StarCanvas } from '../components/StarCanvas';
import { useTrainingSession } from '../hooks/useTrainingSession';
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Crosshair, Pause } from 'lucide-preact';
import { useCallback, useRef } from 'preact/hooks';
import { SessionSummaryModal } from '../components/SessionSummaryModal';
import { StarCanvas } from '../components/StarCanvas';
import { useTrainingSession } from '../hooks/useTrainingSession';
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
  const {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    elapsedSeconds,
    isFinished,
    sessionHistory,
    showSummaryModal,
    handleAnswer,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = useTrainingSession<QuestionData, HitResult, { clickPoint: Point; hitResult: HitResult }>({
~~~~~
~~~~~typescript
  const {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    sessionHistory,
    showSummaryModal,
    resumeFromIdle,
    handleAnswer,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = useTrainingSession<QuestionData, HitResult, { clickPoint: Point; hitResult: HitResult }>({
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
      <StarCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={canvasUserAnswer}
        onAnswer={(clickPoint) => {
          const hitRes = checkHit(clickPoint, question.targetB, question.distractorPoints);
          if (hitRes.isWithinRange) {
            handleAnswer({ clickPoint, hitResult: hitRes });
          }
        }}
        disabled={isFinished}
      />
~~~~~
~~~~~typescript
      <div className="relative w-full flex justify-center">
        <StarCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={canvasUserAnswer}
          onAnswer={(clickPoint) => {
            const hitRes = checkHit(clickPoint, question.targetB, question.distractorPoints);
            if (hitRes.isWithinRange) {
              handleAnswer({ clickPoint, hitResult: hitRes });
            }
          }}
          disabled={isFinished || isIdle}
        />

        {isIdle && (
          <div
            role="presentation"
            onClick={resumeFromIdle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') resumeFromIdle();
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
          >
            <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Pause className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                检测到闲置或窗口切换，已保护您的心流与统计数据
              </p>
              <button
                type="button"
                onClick={resumeFromIdle}
                className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                点击继续训练 (或按任意键)
              </button>
            </div>
          </div>
        )}
      </div>
~~~~~

#### Acts 3: 在 `ColorTrainingView.tsx` 中增加休眠模糊蒙版

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import { useCallback, useRef } from 'preact/hooks';
import { ColorCanvas } from '../components/ColorCanvas';
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Crosshair, Pause } from 'lucide-preact';
import { useCallback, useRef } from 'preact/hooks';
import { ColorCanvas } from '../components/ColorCanvas';
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
  const {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    elapsedSeconds,
    isFinished,
    sessionHistory,
    showSummaryModal,
    handleAnswer,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = useTrainingSession<ColorQuestionData, ColorHitResult, number | [number, number, number]>({
~~~~~
~~~~~typescript
  const {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    sessionHistory,
    showSummaryModal,
    resumeFromIdle,
    handleAnswer,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = useTrainingSession<ColorQuestionData, ColorHitResult, number | [number, number, number]>({
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
      <ColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
        hitMargin={settings.sliderHitMargin ?? 12}
        showToleranceBand={settings.showToleranceBand ?? true}
        enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
      />
~~~~~
~~~~~typescript
      <div className="relative w-full flex justify-center">
        <ColorCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={handleAnswer}
          disabled={isFinished || isIdle}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
          enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
        />

        {isIdle && (
          <div
            role="presentation"
            onClick={resumeFromIdle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') resumeFromIdle();
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
          >
            <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Pause className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                检测到闲置或窗口切换，已保护您的心流与统计数据
              </p>
              <button
                type="button"
                onClick={resumeFromIdle}
                className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                点击继续训练 (或按任意键)
              </button>
            </div>
          </div>
        )}
      </div>
~~~~~

#### Acts 4: 在 `RelativeColorTrainingView.tsx` 中增加休眠模糊蒙版

~~~~~act
patch_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock } from 'lucide-preact';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Pause } from 'lucide-preact';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
~~~~~

~~~~~act
patch_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
  const {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    elapsedSeconds,
    isFinished,
    sessionHistory,
    showSummaryModal,
    handleAnswer,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = useTrainingSession<
~~~~~
~~~~~typescript
  const {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    sessionHistory,
    showSummaryModal,
    resumeFromIdle,
    handleAnswer,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = useTrainingSession<
~~~~~

~~~~~act
patch_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
      <RelativeColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
        hitMargin={settings.sliderHitMargin ?? 12}
        showToleranceBand={settings.showToleranceBand ?? true}
        enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
      />
~~~~~
~~~~~typescript
      <div className="relative w-full flex justify-center">
        <RelativeColorCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={handleAnswer}
          disabled={isFinished || isIdle}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
          enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
        />

        {isIdle && (
          <div
            role="presentation"
            onClick={resumeFromIdle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') resumeFromIdle();
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
          >
            <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Pause className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                检测到闲置或窗口切换，已保护您的心流与统计数据
              </p>
              <button
                type="button"
                onClick={resumeFromIdle}
                className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                点击继续训练 (或按任意键)
              </button>
            </div>
          </div>
        )}
      </div>
~~~~~

#### Acts 5: 在 `GlobalSettingsModal.tsx` 中添加闲置暂停时长配置

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
import { Download, Sliders, ToggleLeft, ToggleRight, Trash2, Upload, Volume2, X } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';

interface GlobalSettingsModalProps {
  onClose: () => void;
  onDataChanged: () => void;
}

export function GlobalSettingsModal({ onClose, onDataChanged }: GlobalSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(loadSettings);

  const handleToggleSound = () => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        soundEnabled: !settings.global.soundEnabled,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };
~~~~~
~~~~~typescript
import {
  Clock,
  Download,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';

interface GlobalSettingsModalProps {
  onClose: () => void;
  onDataChanged: () => void;
}

export function GlobalSettingsModal({ onClose, onDataChanged }: GlobalSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(loadSettings);

  const handleToggleSound = () => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        soundEnabled: !settings.global.soundEnabled,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleIdleTimeoutChange = (sec: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        idleTimeout: sec,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
        {/* 常规偏好 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            系统偏好
          </div>
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">训练音效反馈</div>
                <div className="text-[11px] text-slate-400">答对清脆升调提示，答错低沉提示</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {settings.global.soundEnabled ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>
        </div>
~~~~~
~~~~~typescript
        {/* 常规偏好 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            系统偏好
          </div>
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">训练音效反馈</div>
                <div className="text-[11px] text-slate-400">答对清脆升调提示，答错低沉提示</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {settings.global.soundEnabled ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">闲置休眠保护</div>
                <div className="text-[11px] text-slate-400">无操作或切出窗口时暂停计时与模糊遮罩</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '关闭', value: 0 },
                { label: '30 秒', value: 30 },
                { label: '60 秒', value: 60 },
                { label: '120 秒', value: 120 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleIdleTimeoutChange(opt.value)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    settings.global.idleTimeout === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
~~~~~

### 下一步建议
1. **测试与体验**: 可以在寻星、绝对色感、相对色感训练中尝试切出页面或放置 60 秒（或自选时长），验证 Backdrop Blur 模糊蒙版的渐入与点击恢复体验。
2. **提交准备**: 若体验符合预期，可提示我生成 `[COMMIT]` 计划以完成变更提交。
