已经完成了对 FormSight 项目代码库重构拆分方案的准备。我将生成一份详细的 Quipu 计划 (`Plan.md`)，逐步实施这一系列重构与代码拆分。

## [WIP] refactor(architecture): 拆分大型模块与抽象通用训练 Hook

### 用户需求
针对 FormSight 项目中体积较大、职责过载以及存在显著代码重复的文件进行重构与拆分：
1. 抽象训练视图逻辑，消除 `TrainingView.tsx`、`ColorTrainingView.tsx` 和 `RelativeColorTrainingView.tsx` 间约 75% 的重复代码。
2. 将 `SettingsModal.tsx` 按领域拆分为独立的设置表单组件。
3. 将 `geometry.ts` 与 `db.ts` 拆解为职责明确的子模块，并通过统一入口向下兼容。
4. 将散落在各分析弹窗中的 Canvas 2D 绘图逻辑剥离至独立的渲染工具函数中。

### 评论
这是一次高收益的代码架构提炼，将极大提升代码的可读性、可测试性与可维护性，同时降低未来新增训练领域或可视化图表时的开发成本。

### 目标
1. **抽离通用训练 Hook**：创建 `src/hooks/useTrainingSession.ts`，统一管理计时、快捷键、自动切题 Timer、Session History 记录、DB 存盘及结算控制。
2. **重构训练视图**：简化 3 个训练 View 组件，大幅降低代码行数。
3. **拆分设置弹窗**：在 `src/components/settings/` 下创建 `StarSettingsForm.tsx`、`ColorSettingsForm.tsx` 和 `RelativeColorSettingsForm.tsx`。
4. **模块化 Geometry 与 DB**：在 `src/utils/geometry/` 与 `src/utils/db/` 拆分逻辑并保留向下兼容导出。
5. **抽象 Canvas 绘制纯函数**：在 `src/utils/canvas/` 中抽离各图表绘制算法并重构 Modal 组件。
6. **自动化验证**：通过 `vitest` 与 `biome` 校验确保功能与格式完全正确。

### 基本原理
1. **单一职责原则 (SRP)**：组件仅关注 UI 布局与视图交互，绘图算法、状态管理和数据处理彻底分离。
2. **无损向下兼容**：`utils/geometry.ts` 和 `utils/db.ts` 维持入口 re-export，不破坏现有的任何测试用例和外部 import 路径。
3. **高阶抽象 Custom Hook**：利用泛型 Hook `useTrainingSession` 将通用的训练会话生命周期标准化。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/architecture #task/object/code-splitting #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建通用训练会话 Custom Hook (`src/hooks/useTrainingSession.ts`)

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
  const sessionIdRef = useRef<string>(`${domain}_session_${Date.now()}`);
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
      if (e.code === 'Space') {
        if (showAnswer && !isFinished) {
          e.preventDefault();
          handleNextQuestion();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleFinishSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished]);

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
    sessionIdRef.current = `${domain}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  };

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

#### Acts 2: 使用 Hook 重构 3 个训练视图组件

~~~~~act
write_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import { useCallback, useRef } from 'preact/hooks';
import { SessionSummaryModal } from '../components/SessionSummaryModal';
import { StarCanvas } from '../components/StarCanvas';
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../utils/db';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../utils/geometry';
import type { StarSettings } from '../utils/settings';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: StarSettings;
  onExit: () => void;
}

export function TrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: TrainingViewProps) {
  const targetSectorsRef = useRef<number[]>(settings.manualTargetSectors || []);

  const getGenerateOptions = useCallback((): QuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
      gridSize: settings.gridSize,
    };
  }, [settings]);

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
    domain: 'star',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateQuestion(mode, level, getGenerateOptions()),
    evaluateAnswer: (userVal) => userVal.hitResult,
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs }) => {
      await saveTrialRecord({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'star',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          anchorA: [q.anchorA.x, q.anchorA.y],
          anchorC: q.anchorC ? [q.anchorC.x, q.anchorC.y] : undefined,
          targetB: [q.targetB.x, q.targetB.y],
          userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
          angleDegree: q.angleDegree,
          distanceRatio: q.distanceRatio,
          errorPixelDistance: hitResult.errorDistance,
        },
      });
    },
    saveSession: async ({ sessionId, totalTrials: t, hitTrials: h, ended, startTimestamp, endLevel }) => {
      await saveSession({
        id: sessionId,
        domain: 'star',
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const canvasUserAnswer = userAnswer
    ? { clickPoint: userAnswer.nearestGridPoint, hitResult: userAnswer }
    : null;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.targetingMode === 'manual' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

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

      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一题
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {showSummaryModal && (
        <SessionSummaryModal
          mode={mode}
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

~~~~~act
write_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import { useCallback, useRef } from 'preact/hooks';
import { ColorCanvas } from '../components/ColorCanvas';
import { SessionSummaryModal } from '../components/SessionSummaryModal';
import { useTrainingSession } from '../hooks/useTrainingSession';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  type ColorQuestionGenerateOptions,
  checkColorHit,
  generateColorQuestion,
} from '../utils/colorUtils';
import { saveColorSession, saveColorTrialRecord } from '../utils/db';
import type { ColorSenseSettings } from '../utils/settings';

interface ColorTrainingViewProps {
  mode: ColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: ColorSenseSettings;
  onExit: () => void;
}

export function ColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: ColorTrainingViewProps) {
  const targetSectorsRef = useRef<number[]>(settings.manualTargetSectors || []);

  const getColorGenerateOptions = useCallback((): ColorQuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
    };
  }, [settings]);

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
    domain: 'color',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateColorQuestion(mode, level, getColorGenerateOptions()),
    evaluateAnswer: (userVal, q) => checkColorHit(mode, userVal, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      const computedUserHSV: [number, number, number] =
        mode === 'ALL' && Array.isArray(userVal)
          ? userVal
          : [
              mode === 'H' ? (userVal as number) : q.targetH,
              mode === 'S' ? (userVal as number) : q.targetS,
              mode === 'V' ? (userVal as number) : q.targetV,
            ];

      await saveColorTrialRecord({
        id: `crec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'color',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          targetHSV: [q.targetH, q.targetS, q.targetV],
          userHSV: computedUserHSV,
          errorValue: hitResult.errorValue,
        },
      });
    },
    saveSession: async ({ sessionId, totalTrials: t, hitTrials: h, ended, startTimestamp, endLevel }) => {
      await saveColorSession({
        id: sessionId,
        domain: 'color',
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode === 'H' ? '色相' : mode === 'V' ? '明度' : mode === 'S' ? '饱和度' : '综合拾色'} |{' '}
            {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.targetingMode === 'manual' && mode === 'H' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

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

      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一题
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {showSummaryModal && (
        <SessionSummaryModal
          mode="single"
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

~~~~~act
write_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock } from 'lucide-preact';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { SessionSummaryModal } from '../components/SessionSummaryModal';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../utils/db';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../utils/relativeColorUtils';
import type { RelativeColorSettings } from '../utils/settings';

interface RelativeColorTrainingViewProps {
  mode: RelativeColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: RelativeColorSettings;
  onExit: () => void;
}

export function RelativeColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: RelativeColorTrainingViewProps) {
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
    RelativeColorQuestionData,
    RelativeColorHitResult,
    [number, number, number]
  >({
    domain: 'relative_color',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateRelativeColorQuestion(mode, level),
    evaluateAnswer: (userD, q) => checkRelativeColorHit(mode, userD, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `rcrec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'relative_color',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          colorA: q.colorA,
          colorB: q.colorB,
          colorC: q.colorC,
          targetD: q.targetD,
          userD: userVal,
          deltaEError: hitResult.deltaEError,
        },
      });
    },
    saveSession: async ({ sessionId, totalTrials: t, hitTrials: h, ended, startTimestamp, endLevel }) => {
      await saveSession({
        id: sessionId,
        domain: 'relative_color',
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            色彩矢量迁移 | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

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

      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一题
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {showSummaryModal && (
        <SessionSummaryModal
          mode="single"
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

#### Acts 3: 拆分设置表单并重构 `SettingsModal.tsx`

~~~~~act
write_file
src/components/settings/StarSettingsForm.tsx
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { StarSettings, TargetingMode } from '../../utils/settings';

const SECTOR_NAMES = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

interface StarSettingsFormProps {
  settings: StarSettings;
  onChange: (patch: Partial<StarSettings>) => void;
}

export function StarSettingsForm({ settings, onChange }: StarSettingsFormProps) {
  const handleSectorToggle = (sectorIdx: number) => {
    const currentSectors = settings.manualTargetSectors || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    onChange({ manualTargetSectors: updated });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-700">干扰点网格大小</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[2, 3, 4, 5].map((size) => (
            <button
              type="button"
              key={size}
              onClick={() => onChange({ gridSize: size })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.gridSize === size
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Crosshair className="w-4 h-4 text-indigo-600" />
          弱点专项靶向强化
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'off', label: '关闭 (全随机)' },
            { id: 'manual', label: '手动指定' },
          ].map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => onChange({ targetingMode: m.id as TargetingMode })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.targetingMode === m.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {settings.targetingMode === 'manual' && (
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
            <div className="text-[11px] font-semibold text-slate-500">
              选择需要靶向强化的角度扇区：
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {SECTOR_NAMES.map((name, idx) => {
                const selected = (settings.manualTargetSectors || []).includes(idx);
                return (
                  <button
                    type="button"
                    key={name}
                    onClick={() => handleSectorToggle(idx)}
                    className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                      selected
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/settings/ColorSettingsForm.tsx
~~~~~
~~~~~typescript
import { Crosshair, ToggleLeft, ToggleRight } from 'lucide-preact';
import type { ColorSenseSettings, TargetingMode } from '../../utils/settings';

const COLOR_SECTOR_NAMES = [
  '红 (0°-30°)',
  '橙 (30°-60°)',
  '黄 (60°-90°)',
  '黄绿 (90°-120°)',
  '绿 (120°-150°)',
  '青绿 (150°-180°)',
  '青 (180°-210°)',
  '蓝 (210°-240°)',
  '蓝紫 (240°-270°)',
  '紫 (270°-300°)',
  '品红 (300°-330°)',
  '紫红 (330°-360°)',
];

interface ColorSettingsFormProps {
  settings: ColorSenseSettings;
  onChange: (patch: Partial<ColorSenseSettings>) => void;
}

export function ColorSettingsForm({ settings, onChange }: ColorSettingsFormProps) {
  const handleSectorToggle = (sectorIdx: number) => {
    const currentSectors = settings.manualTargetSectors || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    onChange({ manualTargetSectors: updated });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-700">色感滑块极值吸附外延感应区</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '关闭 (0px)', value: 0 },
            { label: '8px', value: 8 },
            { label: '12px', value: 12 },
            { label: '20px', value: 20 },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => onChange({ sliderHitMargin: opt.value })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.sliderHitMargin === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">显示滑块容错感应区</div>
          <div className="text-xs text-slate-400">在悬停光标两侧实时显示 ΔE 动态容错区间</div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ showToleranceBand: !settings.showToleranceBand })}
          className="text-indigo-600 hover:opacity-80 transition-opacity"
        >
          {settings.showToleranceBand ? (
            <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-slate-300" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">综合拾色悬停颜色实时联动</div>
          <div className="text-xs text-slate-400">鼠标悬停滑块时右侧色块实时跟随试探预览</div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ enableHoverColorPreview: !settings.enableHoverColorPreview })}
          className="text-indigo-600 hover:opacity-80 transition-opacity"
        >
          {settings.enableHoverColorPreview ? (
            <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-slate-300" />
          )}
        </button>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Crosshair className="w-4 h-4 text-indigo-600" />
          色相弱点专项靶向强化
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'off', label: '关闭 (全随机)' },
            { id: 'manual', label: '手动指定' },
          ].map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => onChange({ targetingMode: m.id as TargetingMode })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.targetingMode === m.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {settings.targetingMode === 'manual' && (
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
            <div className="text-[11px] font-semibold text-slate-500">
              选择需要靶向强化的色相扇区：
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {COLOR_SECTOR_NAMES.map((name, idx) => {
                const selected = (settings.manualTargetSectors || []).includes(idx);
                return (
                  <button
                    type="button"
                    key={name}
                    onClick={() => handleSectorToggle(idx)}
                    className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                      selected
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/settings/RelativeColorSettingsForm.tsx
~~~~~
~~~~~typescript
import { ToggleLeft, ToggleRight } from 'lucide-preact';
import type { RelativeColorSettings } from '../../utils/settings';

interface RelativeColorSettingsFormProps {
  settings: RelativeColorSettings;
  onChange: (patch: Partial<RelativeColorSettings>) => void;
}

export function RelativeColorSettingsForm({
  settings,
  onChange,
}: RelativeColorSettingsFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-700">色感滑块极值吸附外延感应区</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '关闭 (0px)', value: 0 },
            { label: '8px', value: 8 },
            { label: '12px', value: 12 },
            { label: '20px', value: 20 },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => onChange({ sliderHitMargin: opt.value })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.sliderHitMargin === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">显示滑块容错感应区</div>
          <div className="text-xs text-slate-400">在悬停光标两侧实时显示 ΔE 动态容错区间</div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ showToleranceBand: !settings.showToleranceBand })}
          className="text-indigo-600 hover:opacity-80 transition-opacity"
        >
          {settings.showToleranceBand ? (
            <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-slate-300" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">悬停推移色彩联动预览</div>
          <div className="text-xs text-slate-400">鼠标悬停滑块时右侧色块实时跟随试探预览</div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ enableHoverColorPreview: !settings.enableHoverColorPreview })}
          className="text-indigo-600 hover:opacity-80 transition-opacity"
        >
          {settings.enableHoverColorPreview ? (
            <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-slate-300" />
          )}
        </button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
import { Flame, Sliders, Target, ToggleLeft, ToggleRight, X } from 'lucide-preact';
import { useState } from 'preact/hooks';
import type { TrainingDomain } from '../utils/db';
import {
  type ColorSenseSettings,
  type RelativeColorSettings,
  type StarSettings,
  type UserSettings,
  saveSettings,
} from '../utils/settings';
import { ColorSettingsForm } from './settings/ColorSettingsForm';
import { RelativeColorSettingsForm } from './settings/RelativeColorSettingsForm';
import { StarSettingsForm } from './settings/StarSettingsForm';

const DOMAIN_TITLE: Record<TrainingDomain, string> = {
  star: '寻星训练偏好设置',
  color: '绝对色感偏好设置',
  relative_color: '相对色感偏好设置',
};

interface SettingsModalProps {
  domain: TrainingDomain;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ domain, settings, onClose, onSave }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });

  const updateDomainSettings = (
    patch:
      | Partial<StarSettings | ColorSenseSettings | RelativeColorSettings>
      | ((
          prev: StarSettings | ColorSenseSettings | RelativeColorSettings,
        ) => Partial<StarSettings | ColorSenseSettings | RelativeColorSettings>),
  ) => {
    setCurrent((prev) => {
      const prevDomainSettings = prev[domain];
      const updatedPatch = typeof patch === 'function' ? patch(prevDomainSettings) : patch;
      const nextDomainSettings = { ...prevDomainSettings, ...updatedPatch };
      const nextSettings = {
        ...prev,
        [domain]: nextDomainSettings,
      };
      saveSettings(nextSettings);
      onSave(nextSettings);
      return nextSettings;
    });
  };

  const domainSettings = current[domain];

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">{DOMAIN_TITLE[domain]}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* 通用配置：自动翻页开关 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">自动切换下一题</div>
              <div className="text-xs text-slate-400">点击答题后无需手动按空格切题</div>
            </div>
            <button
              type="button"
              onClick={() => updateDomainSettings({ autoNext: !domainSettings.autoNext })}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {domainSettings.autoNext ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          {/* 通用配置：自动翻页延迟 */}
          {domainSettings.autoNext && (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span>切换延迟时间</span>
                <span className="font-mono text-indigo-600 font-bold">
                  {domainSettings.autoNextDelay} ms
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={domainSettings.autoNextDelay}
                onInput={(e) => {
                  const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                  updateDomainSettings({ autoNextDelay: val });
                }}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          )}

          {/* 通用配置：自适应算子模式 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">自适应算子模式</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateDomainSettings({ adaptiveMode: 'block' })}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  domainSettings.adaptiveMode === 'block'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                轮次胜率评估 (推荐)
              </button>
              <button
                type="button"
                onClick={() => updateDomainSettings({ adaptiveMode: 'staircase' })}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  domainSettings.adaptiveMode === 'staircase'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                经典 3U1D 阶梯
              </button>
            </div>
          </div>

          {/* 轮次评估配置 */}
          {domainSettings.adaptiveMode === 'block' && (
            <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span>目标通关正确率</span>
                  <span className="font-bold text-indigo-600 font-mono">
                    {Math.round(domainSettings.targetAccuracy * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                    <button
                      type="button"
                      key={acc}
                      onClick={() => updateDomainSettings({ targetAccuracy: acc })}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        domainSettings.targetAccuracy === acc
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {Math.round(acc * 100)}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span>每轮评估题量</span>
                  <span className="font-bold text-indigo-600 font-mono">
                    {domainSettings.blockSize} 题/轮
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[10, 15, 20].map((size) => (
                    <button
                      type="button"
                      key={size}
                      onClick={() => updateDomainSettings({ blockSize: size })}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        domainSettings.blockSize === size
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {size} 题
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 难度阶梯精细度 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">难度阶梯精细度</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateDomainSettings({ stepGranularity: 'standard' })}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  domainSettings.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (大步幅)
              </button>
              <button
                type="button"
                onClick={() => updateDomainSettings({ stepGranularity: 'fine' })}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  domainSettings.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (小步幅)
              </button>
            </div>
          </div>

          {/* 渲染特定领域的表单 */}
          {domain === 'star' && (
            <StarSettingsForm
              settings={domainSettings as StarSettings}
              onChange={(patch) => updateDomainSettings(patch)}
            />
          )}

          {domain === 'color' && (
            <ColorSettingsForm
              settings={domainSettings as ColorSenseSettings}
              onChange={(patch) => updateDomainSettings(patch)}
            />
          )}

          {domain === 'relative_color' && (
            <RelativeColorSettingsForm
              settings={domainSettings as RelativeColorSettings}
              onChange={(patch) => updateDomainSettings(patch)}
            />
          )}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 模块化 Geometry 工具库 (`src/utils/geometry/`)

~~~~~act
write_file
src/utils/geometry/pointMath.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2; // 250
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 3; // 默认 3x3 网格

/**
 * 将点绕指定中心旋转指定角度 (角度制)
 */
export function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;

  return {
    x: Math.round((center.x + dx * cos - dy * sin) * 100) / 100,
    y: Math.round((center.y + dx * sin + dy * cos) * 100) / 100,
  };
}

/**
 * 计算两点间的欧氏距离
 */
export function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}
~~~~~

~~~~~act
write_file
src/utils/geometry/gridGenerators.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import { DEFAULT_GRID_DIM, calcDistance } from './pointMath';

/**
 * 极坐标扇形网格生成器 (单锚点模式)
 */
export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  const S_MAX = 25;
  const S_MIN = 3.5;

  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34;
  const S = S_MAX - t * (S_MAX - S_MIN);

  const maxAngleStepRad = (15 * Math.PI) / 180;
  const angleStepRad = Math.min(S / R, maxAngleStepRad);

  const rStep = S;

  const points: Point[] = [];
  for (let rIdx = 0; rIdx < gridDim; rIdx++) {
    for (let aIdx = 0; aIdx < gridDim; aIdx++) {
      const curR = R + (rIdx - targetRow) * rStep;
      const curTheta = theta + (aIdx - targetCol) * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}

/**
 * 双极透视网格生成器 (双锚点模式)
 */
export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  const Ra = calcDistance(anchorA, targetB);
  const Rc = calcDistance(anchorC, targetB);

  const S_MAX = 20;
  const S_MIN = 3.5;

  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34;
  const S = S_MAX - t * (S_MAX - S_MIN);

  const maxAngleStepRad = (15 * Math.PI) / 180;
  const alphaStepRad = Math.min(S / Ra, maxAngleStepRad);
  const betaStepRad = Math.min(S / Rc, maxAngleStepRad);

  const points: Point[] = [];

  for (let aIdx = 0; aIdx < gridDim; aIdx++) {
    for (let cIdx = 0; cIdx < gridDim; cIdx++) {
      const alphaI = alpha + (aIdx - targetRow) * alphaStepRad;
      const betaJ = beta + (cIdx - targetCol) * betaStepRad;

      const v1x = Math.cos(alphaI);
      const v1y = Math.sin(alphaI);
      const v2x = Math.cos(betaJ);
      const v2y = Math.sin(betaJ);

      const dx = anchorC.x - anchorA.x;
      const dy = anchorC.y - anchorA.y;
      const det = v1x * v2y - v1y * v2x;

      if (Math.abs(det) < 1e-5) {
        points.push({
          x: Math.round((targetB.x + (aIdx - targetRow) * S) * 100) / 100,
          y: Math.round((targetB.y + (cIdx - targetCol) * S) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100;
        const y = Math.round((anchorA.y + t1 * v1y) * 100) / 100;
        points.push({ x, y });
      }
    }
  }
  return points;
}
~~~~~

~~~~~act
write_file
src/utils/geometry/hitDetection.ts
~~~~~
~~~~~typescript
import type { HitResult, Point } from '../../types';
import { calcDistance } from './pointMath';

/**
 * 寻找最近的网格点及感应范围判定
 */
export function findNearestGridPoint(
  clickPoint: Point,
  gridPoints: Point[],
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  if (!gridPoints || gridPoints.length === 0) {
    return { nearestPoint: clickPoint, minDistance: 0, isWithinRange: false };
  }

  let nearestPoint = gridPoints[0];
  let minDistance = calcDistance(clickPoint, nearestPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = gridPoints[i];
    }
  }

  let minNeighborDist = Number.MAX_VALUE;
  for (let i = 0; i < Math.min(5, gridPoints.length - 1); i++) {
    const d = calcDistance(gridPoints[i], gridPoints[i + 1]);
    if (d > 0 && d < minNeighborDist) minNeighborDist = d;
  }
  const maxRadius = Math.max(20, minNeighborDist * 0.75);

  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

/**
 * 点击作答 Hit Detection
 */
export function checkHit(clickPoint: Point, targetB: Point, gridPoints: Point[]): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(clickPoint, gridPoints);
  const errorDistance = calcDistance(nearestPoint, targetB);
  const isHit = errorDistance < 0.5;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
    isWithinRange,
  };
}

/**
 * 根据点阵间距动态计算渲染圆点的半径
 */
export function getDynamicDotRadius(gridPoints: Point[]): number {
  if (!gridPoints || gridPoints.length < 2) return 3.5;
  let minDist = Number.MAX_VALUE;
  for (let i = 0; i < gridPoints.length; i++) {
    for (let j = i + 1; j < gridPoints.length; j++) {
      const d = calcDistance(gridPoints[i], gridPoints[j]);
      if (d > 0 && d < minDist) {
        minDist = d;
      }
    }
  }
  if (minDist === Number.MAX_VALUE) return 3.5;
  return Math.max(1.2, Math.min(3.5, minDist * 0.25));
}
~~~~~

~~~~~act
write_file
src/utils/geometry/questionGenerator.ts
~~~~~
~~~~~typescript
import type { Point, QuestionData, TrainingMode } from '../../types';
import { generateBipolarGridPoints, generatePolarGridPoints } from './gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM, rotatePoint } from './pointMath';

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[]; // [0~7]
  gridSize?: number;
}

function selectAngleWithTargeting(options?: QuestionGenerateOptions): number {
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40;
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

export function generateQuestion(
  mode: TrainingMode,
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = options?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  if (mode === 'single') {
    const anchorA: Point = { x: CX, y: CY };
    const angle = selectAngleWithTargeting(options);
    const distChoices = [60, 90, 120, 150, 180];
    const dist = distChoices[Math.floor(Math.random() * distChoices.length)];

    const rad = (angle * Math.PI) / 180;
    const targetB: Point = {
      x: Math.round((CX + dist * Math.cos(rad)) * 100) / 100,
      y: Math.round((CY + dist * Math.sin(rad)) * 100) / 100,
    };

    const distractorPoints = generatePolarGridPoints(
      anchorA,
      targetB,
      difficultyLevel,
      gridDim,
      randomRow,
      randomCol,
    );

    return {
      id,
      mode,
      anchorA,
      anchorC: null,
      targetB,
      gridStart: distractorPoints[0],
      difficultyLevel,
      gridDim,
      distractorPoints,
      angleDegree: angle,
      distanceRatio: dist,
    };
  }

  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];

  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];

  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;

      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        const minDiff = Math.min(diff, 360 - diff);
        return minDiff <= 22.5;
      });

      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;

  const rotAngle =
    mode === 'double_h'
      ? 0
      : [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];

  const center: Point = { x: 0, y: 0 };
  const rotatedA = rotatePoint({ x: baseAx, y: baseAy }, center, rotAngle);
  const rotatedC = rotatePoint({ x: baseCx, y: baseCy }, center, rotAngle);
  const rotatedB = rotatePoint({ x: px, y: py }, center, rotAngle);

  const anchorA: Point = {
    x: Math.round((rotatedA.x + CX) * 100) / 100,
    y: Math.round((rotatedA.y + CY) * 100) / 100,
  };
  const anchorC: Point = {
    x: Math.round((rotatedC.x + CX) * 100) / 100,
    y: Math.round((rotatedC.y + CY) * 100) / 100,
  };
  const targetB: Point = {
    x: Math.round((rotatedB.x + CX) * 100) / 100,
    y: Math.round((rotatedB.y + CY) * 100) / 100,
  };

  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    difficultyLevel,
    gridDim,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    mode,
    anchorA,
    anchorC,
    targetB,
    gridStart: distractorPoints[0],
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
}
~~~~~

~~~~~act
write_file
src/utils/geometry/index.ts
~~~~~
~~~~~typescript
export * from './pointMath';
export * from './gridGenerators';
export * from './hitDetection';
export * from './questionGenerator';
~~~~~

~~~~~act
write_file
src/utils/geometry.ts
~~~~~
~~~~~typescript
export * from './geometry/index';
~~~~~

#### Acts 5: 模块化 DB 工具库 (`src/utils/db/`)

~~~~~act
write_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export type TrainingDomain = 'star' | 'color' | 'relative_color';

export interface UnifiedSessionData {
  id: string;
  domain?: TrainingDomain;
  mode: string;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface UnifiedTrialRecord {
  id: string;
  sessionId: string;
  domain?: TrainingDomain;
  mode: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UnifiedProfileData {
  key: string;
  domain: TrainingDomain;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

export interface FormSightDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: UnifiedSessionData;
    indexes: {
      'by-domain': TrainingDomain;
      'by-domain-mode': [TrainingDomain, string];
    };
  };
  records: {
    key: string;
    value: UnifiedTrialRecord;
    indexes: {
      'by-session': string;
      'by-domain': TrainingDomain;
      'by-domain-mode': [TrainingDomain, string];
      'by-mode': string;
    };
  };
  user_profiles: {
    key: string;
    value: UnifiedProfileData;
    indexes: {
      'by-domain': TrainingDomain;
    };
  };
}

export const DB_NAME = 'StarHoppingDB';
export const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        const sessionsStore = db.objectStoreNames.contains('sessions')
          ? transaction.objectStore('sessions')
          : db.createObjectStore('sessions', { keyPath: 'id' });

        if (!sessionsStore.indexNames.contains('by-domain')) {
          sessionsStore.createIndex('by-domain', 'domain');
        }
        if (!sessionsStore.indexNames.contains('by-domain-mode')) {
          sessionsStore.createIndex('by-domain-mode', ['domain', 'mode']);
        }

        const recordsStore = db.objectStoreNames.contains('records')
          ? transaction.objectStore('records')
          : db.createObjectStore('records', { keyPath: 'id' });

        if (!recordsStore.indexNames.contains('by-session')) {
          recordsStore.createIndex('by-session', 'sessionId');
        }
        if (!recordsStore.indexNames.contains('by-domain')) {
          recordsStore.createIndex('by-domain', 'domain');
        }
        if (!recordsStore.indexNames.contains('by-domain-mode')) {
          recordsStore.createIndex('by-domain-mode', ['domain', 'mode']);
        }
        if (!recordsStore.indexNames.contains('by-mode')) {
          recordsStore.createIndex('by-mode', 'mode');
        }

        const profilesStore = db.objectStoreNames.contains('user_profiles')
          ? transaction.objectStore('user_profiles')
          : db.createObjectStore('user_profiles', { keyPath: 'key' });

        if (!profilesStore.indexNames.contains('by-domain')) {
          profilesStore.createIndex('by-domain', 'domain');
        }

        if (oldVersion < 4) {
          const oldStores = Array.from(db.objectStoreNames);
          if (oldStores.includes('color_sessions' as never)) {
            const colorSessionsStore = transaction.objectStore('color_sessions' as never);
            colorSessionsStore.getAll().then((oldCSessions: UnifiedSessionData[]) => {
              for (const cs of oldCSessions) {
                sessionsStore.put({
                  id: cs.id,
                  domain: 'color',
                  mode: cs.mode,
                  type: cs.type,
                  startTimestamp: cs.startTimestamp,
                  endTimestamp: cs.endTimestamp,
                  totalTrials: cs.totalTrials,
                  hitTrials: cs.hitTrials,
                  startLevel: cs.startLevel,
                  endLevel: cs.endLevel,
                });
              }
            });
            db.deleteObjectStore('color_sessions' as never);
          }

          if (oldStores.includes('color_records' as never)) {
            const colorRecordsStore = transaction.objectStore('color_records' as never);
            colorRecordsStore.getAll().then((oldCRecords: Record<string, unknown>[]) => {
              for (const cr of oldCRecords) {
                recordsStore.put({
                  id: cr.id as string,
                  sessionId: cr.sessionId as string,
                  domain: 'color',
                  mode: cr.mode as string,
                  timestamp: cr.timestamp as number,
                  difficultyLevel: cr.difficultyLevel as number,
                  isHit: cr.isHit as boolean,
                  responseTimeMs: cr.responseTimeMs as number,
                  details: {
                    targetHSV: cr.targetHSV,
                    userHSV: cr.userHSV,
                    errorValue: cr.errorValue,
                  },
                });
              }
            });
            db.deleteObjectStore('color_records' as never);
          }

          if (oldStores.includes('color_profiles' as never)) {
            const colorProfilesStore = transaction.objectStore('color_profiles' as never);
            colorProfilesStore.getAll().then((oldCProfiles: Record<string, unknown>[]) => {
              for (const cp of oldCProfiles) {
                profilesStore.put({
                  key: `color:${cp.mode}`,
                  domain: 'color',
                  mode: cp.mode as string,
                  currentLevel: cp.currentLevel as number,
                  bestLevel: cp.bestLevel as number,
                  totalTrainedCards: cp.totalTrainedCards as number,
                  totalHits: cp.totalHits as number,
                  updatedAt: cp.updatedAt as number,
                });
              }
            });
            db.deleteObjectStore('color_profiles' as never);
          }
        }
      },
    });
  }
  return dbPromise;
}
~~~~~

~~~~~act
write_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
import type { TrainingMode } from '../../types';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';

export async function saveTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const normalizedRecord: UnifiedTrialRecord = { ...record, domain };
  await db.put('records', normalizedRecord);
  await updateProfile(domain, record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  await db.put('sessions', { ...session, domain });
}

export async function getProfile(
  domain: TrainingDomain,
  mode: string,
): Promise<UnifiedProfileData | null> {
  const db = await getDB();
  const profile = await db.get('user_profiles', `${domain}:${mode}`);
  return profile || null;
}

export async function getProfilesByDomain(domain: TrainingDomain): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  return await db.getAllFromIndex('user_profiles', 'by-domain', domain);
}

export async function getTrialRecords(
  domain?: TrainingDomain,
  mode?: string,
): Promise<UnifiedTrialRecord[]> {
  const db = await getDB();
  let rawRecords: UnifiedTrialRecord[] = [];
  if (domain && mode) {
    rawRecords = await db.getAllFromIndex('records', 'by-domain-mode', [domain, mode]);
  } else if (domain) {
    rawRecords = await db.getAllFromIndex('records', 'by-domain', domain);
  } else {
    rawRecords = await db.getAll('records');
  }

  return rawRecords.map((r) => ({
    ...r,
    ...(r.details || {}),
  }));
}

async function updateProfile(
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const key = `${domain}:${mode}`;
  const existing = await db.get('user_profiles', key);

  if (!existing) {
    const newProfile: UnifiedProfileData = {
      key,
      domain,
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await db.put('user_profiles', newProfile);
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) {
      existing.bestLevel = currentLevel;
    }
    existing.updatedAt = Date.now();
    await db.put('user_profiles', existing);
  }
}

export async function getTrainingTimeMs(domain?: TrainingDomain): Promise<number> {
  const db = await getDB();
  const sessions = domain
    ? await db.getAllFromIndex('sessions', 'by-domain', domain)
    : await db.getAll('sessions');

  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}

export function formatTotalTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}

// 兼容别名导出
export async function getUserProfile(mode: TrainingMode): Promise<UnifiedProfileData | null> {
  return await getProfile('star', mode);
}

export async function getAllUserProfiles(): Promise<
  Record<TrainingMode, UnifiedProfileData | null>
> {
  const profiles = await getProfilesByDomain('star');
  const result: Record<TrainingMode, UnifiedProfileData | null> = {
    single: null,
    double_h: null,
    double_r: null,
  };
  for (const p of profiles) {
    if (p.mode in result) {
      result[p.mode as TrainingMode] = p;
    }
  }
  return result;
}

export async function getAllTrialRecords(mode?: TrainingMode): Promise<UnifiedTrialRecord[]> {
  return await getTrialRecords('star', mode);
}

export async function saveColorTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  return await saveTrialRecord({
    ...record,
    domain: 'color',
  });
}

export async function saveColorSession(session: UnifiedSessionData): Promise<void> {
  return await saveSession({
    ...session,
    domain: 'color',
  });
}

export async function getAllColorProfiles(): Promise<
  Record<'H' | 'S' | 'V' | 'ALL', UnifiedProfileData | null>
> {
  const profiles = await getProfilesByDomain('color');
  const result: Record<'H' | 'S' | 'V' | 'ALL', UnifiedProfileData | null> = {
    H: null,
    S: null,
    V: null,
    ALL: null,
  };
  for (const p of profiles) {
    if (p.mode in result) {
      result[p.mode as 'H' | 'S' | 'V' | 'ALL'] = p;
    }
  }
  return result;
}

export async function getAllColorTrialRecords(
  mode?: 'H' | 'S' | 'V' | 'ALL',
): Promise<UnifiedTrialRecord[]> {
  return await getTrialRecords('color', mode);
}

export async function getStarHoppingTrainingTimeMs(): Promise<number> {
  return await getTrainingTimeMs('star');
}

export async function getColorTrainingTimeMs(): Promise<number> {
  return await getTrainingTimeMs('color');
}

export async function getTotalTrainingTimeMs(): Promise<number> {
  return await getTrainingTimeMs();
}
~~~~~

~~~~~act
write_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, getDB } from './schema';

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();

  const exportObject = {
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    settings,
  };

  return JSON.stringify(exportObject, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

    if (data.sessions) {
      for (const s of data.sessions) {
        const domain = s.domain || 'star';
        await tx.objectStore('sessions').put({ ...s, domain });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        const domain = r.domain || 'star';
        await tx.objectStore('records').put({ ...r, domain });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const domain = p.domain || 'star';
        const key = p.key || `${domain}:${p.mode}`;
        await tx.objectStore('user_profiles').put({ ...p, key, domain });
      }
    }

    if (data.color_sessions) {
      for (const cs of data.color_sessions) {
        await tx.objectStore('sessions').put({ ...cs, domain: 'color' });
      }
    }
    if (data.color_records) {
      for (const cr of data.color_records) {
        await tx.objectStore('records').put({
          id: cr.id,
          sessionId: cr.sessionId,
          domain: 'color',
          mode: cr.mode,
          timestamp: cr.timestamp,
          difficultyLevel: cr.difficultyLevel,
          isHit: cr.isHit,
          responseTimeMs: cr.responseTimeMs,
          details: {
            targetHSV: cr.targetHSV,
            userHSV: cr.userHSV,
            errorValue: cr.errorValue,
          },
        });
      }
    }
    if (data.color_profiles) {
      for (const cp of data.color_profiles) {
        await tx.objectStore('user_profiles').put({
          key: `color:${cp.mode}`,
          domain: 'color',
          mode: cp.mode,
          currentLevel: cp.currentLevel,
          bestLevel: cp.bestLevel,
          totalTrainedCards: cp.totalTrainedCards,
          totalHits: cp.totalHits,
          updatedAt: cp.updatedAt,
        });
      }
    }

    await tx.done;

    if (data.settings) {
      saveSettings(data.settings);
    }

    return true;
  } catch (err) {
    console.error('导入数据失败:', err);
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.done;
}
~~~~~

~~~~~act
write_file
src/utils/db/index.ts
~~~~~
~~~~~typescript
export * from './schema';
export * from './queries';
export * from './importExport';

// 类型兼容导出
import type { UnifiedProfileData, UnifiedSessionData, UnifiedTrialRecord } from './schema';
export type SessionData = UnifiedSessionData;
export type UserProfileData = UnifiedProfileData;
export type ColorSessionData = UnifiedSessionData;
export type ColorTrialRecord = UnifiedTrialRecord;
export type ColorProfileData = UnifiedProfileData;
~~~~~

~~~~~act
write_file
src/utils/db.ts
~~~~~
~~~~~typescript
export * from './db/index';
~~~~~

#### Acts 6: 抽象 Canvas 2D 绘图算法并重构分析 Modals

~~~~~act
write_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript
import type { TrialRecord } from '../../types';

export function renderHeatmapCanvas(
  canvas: HTMLCanvasElement,
  records: TrialRecord[],
  avgDx: number,
  avgDy: number,
  totalCount: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const scale = 5;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  const rings = [5, 10, 20, 30];
  ctx.lineWidth = 1;
  for (const r of rings) {
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '10px monospace';
    ctx.fillText(`${r}`, cx + r * scale + 2, cy - 4);
  }

  ctx.strokeStyle = '#475569';
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, height);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const r of records) {
    const dx = r.userClick[0] - r.targetB[0];
    const dy = r.userClick[1] - r.targetB[1];

    const px = cx + dx * scale;
    const py = cy + dy * scale;

    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    if (r.isHit) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    }
    ctx.fill();
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (totalCount > 0) {
    const avgPx = cx + avgDx * scale;
    const avgPy = cy + avgDy * scale;

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(avgPx, avgPy);
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(avgPx, avgPy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
~~~~~

~~~~~act
write_file
src/utils/canvas/drawCompass.ts
~~~~~
~~~~~typescript
export interface SectorStat {
  sectorIdx: number;
  label: string;
  total: number;
  accuracy: number;
  avgError: number;
}

export function renderCompassCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 30;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  const sectorAngle = (Math.PI * 2) / 8;
  const startOffset = -Math.PI / 8;

  for (let i = 0; i < sectorStats.length; i++) {
    const stat = sectorStats[i];
    const startA = startOffset + i * sectorAngle;
    const endA = startA + sectorAngle;

    const radiusRatio = stat.total > 0 ? 0.35 + (stat.accuracy / 100) * 0.65 : 0.25;
    const r = outerRadius * radiusRatio;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startA, endA);
    ctx.closePath();

    if (stat.total === 0) {
      ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
    } else if (stat.accuracy >= 80) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
    } else if (stat.accuracy >= 60) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.65)';
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
    }
    ctx.fill();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 18;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total > 0 ? '#EF4444' : '#94A3B8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.label.split(' ')[0], lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#0F172A';
  ctx.fill();
  ctx.strokeStyle = '#64748B';
  ctx.stroke();
}
~~~~~

~~~~~act
write_file
src/utils/canvas/drawColorRing.ts
~~~~~
~~~~~typescript
import { hsvToHex } from '../colorUtils';
import type { SectorStat } from './drawCompass';

export function renderHueRingCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 40;
  const innerRadius = outerRadius - 20;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  const sectorAngle = (Math.PI * 2) / 12;
  const startOffset = -Math.PI / 2;

  for (let i = 0; i < 12; i++) {
    const stat = sectorStats[i];
    const startA = startOffset + i * sectorAngle;
    const endA = startA + sectorAngle;

    const hueAngle = i * 30 + 15;
    const hexColor = hsvToHex(hueAngle, 100, 100);

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 12, startA, endA);
    ctx.arc(cx, cy, outerRadius + 2, endA, startA, true);
    ctx.fillStyle = hexColor;
    ctx.fill();

    const accRatio = stat.total > 0 ? Math.max(0.1, stat.accuracy / 100) : 0;
    const r = innerRadius + (outerRadius - innerRadius) * accRatio;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startA, endA);
    ctx.closePath();

    if (stat.total === 0) {
      ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
    } else if (stat.accuracy >= 80) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
    } else if (stat.accuracy >= 60) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.65)';
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
    }
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 25;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total >= 3 ? '#EF4444' : '#94A3B8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const shortName = stat.label.split(' ')[0];
    ctx.fillText(shortName, lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#0F172A';
  ctx.fill();
  ctx.strokeStyle = '#64748B';
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hue', cx, cy - 6);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.fillText('Accuracy', cx, cy + 8);
}
~~~~~

~~~~~act
write_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';

export function renderTrendChartCanvas(
  canvas: HTMLCanvasElement,
  dailyData: Record<string, { total: number; maxLevel: number }>,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 20, right: 20, bottom: 25, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const activeDates = Object.keys(dailyData).sort();
  const recentDates = activeDates.slice(-30);

  if (recentDates.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('当前筛选条件下暂无做答轨迹', width / 2, height / 2);
    return;
  }

  const levels = recentDates.map((d) => dailyData[d].maxLevel);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = 1;

  const getY = (val: number) =>
    padding.top + (1 - (val - minLevel) / (maxLevel - minLevel || 1)) * chartH;
  const getX = (idx: number) =>
    padding.left + (idx / Math.max(1, recentDates.length - 1)) * chartW;

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const l of [minLevel, Math.round(maxLevel / 2), maxLevel]) {
    const y = getY(l);
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = '#6366F1';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levels[0]));
  for (let i = 1; i < levels.length; i++) {
    ctx.lineTo(getX(i), getY(levels[i]));
  }
  ctx.stroke();

  for (let i = 0; i < levels.length; i++) {
    ctx.beginPath();
    ctx.arc(getX(i), getY(levels[i]), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const l of [minLevel, maxLevel]) {
    ctx.fillText(`L${l}`, padding.left - 5, getY(l));
  }
  ctx.textAlign = 'center';
  ctx.fillText('最近活跃日演进趋势 ➔', width / 2, height - 5);
}

export function renderSessionTrendChartCanvas(
  canvas: HTMLCanvasElement,
  history: SessionHistoryItem[],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || history.length === 0) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 30, right: 30, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  const levels = history.map((h) => h.level);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = Math.min(...levels, 1);

  const getY = (val: number) => {
    const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
    return padding.top + (1 - ratio) * chartH;
  };

  const getX = (index: number) => {
    if (history.length === 1) return padding.left + chartW / 2;
    return padding.left + (index / (history.length - 1)) * chartW;
  };

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#334155';
  ctx.fillStyle = '#64748B';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
  const uniqueYTicks = Array.from(new Set(yTicks));

  for (const tickVal of uniqueYTicks) {
    const y = getY(tickVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
  }

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(history[0].level));
  for (let i = 1; i < history.length; i++) {
    ctx.lineTo(getX(i), getY(history[i].level));
  }
  ctx.lineTo(getX(history.length - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#818CF8';
  ctx.lineWidth = 2.5;
  ctx.moveTo(getX(0), getY(history[0].level));
  for (let i = 1; i < history.length; i++) {
    ctx.lineTo(getX(i), getY(history[i].level));
  }
  ctx.stroke();

  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const x = getX(i);
    const y = getY(h.level);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = h.isHit ? '#22C55E' : '#EF4444';
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (
      history.length <= 10 ||
      i === 0 ||
      i === history.length - 1 ||
      h.level !== history[i - 1]?.level
    ) {
      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`L${h.level}`, x, y - 8);
    }
  }

  ctx.strokeStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('题目做答序列 ➔', width / 2, height - 10);
}
~~~~~

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~typescript.old
  // === 1. 渲染：方案一 中心相对偏差热力图 ===
  useEffect(() => {
    if (activeTab !== 'heatmap' || loading) return;
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const scale = 5; // 1px 屏幕误差放大 5 倍渲染便于可视化

    // 清屏
    ctx.fillStyle = '#1E293B'; // 科技深蓝背景
    ctx.fillRect(0, 0, width, height);

    // 绘制辅助同心圆 (5, 10, 20, 30)
    const rings = [5, 10, 20, 30];
    ctx.lineWidth = 1;
    for (const r of rings) {
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '10px monospace';
      ctx.fillText(`${r}`, cx + r * scale + 2, cy - 4);
    }

    // 绘制十字坐标轴
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 绘制每个做答记录的相对偏移散点
    for (const r of records) {
      const dx = r.userClick[0] - r.targetB[0];
      const dy = r.userClick[1] - r.targetB[1];

      const px = cx + dx * scale;
      const py = cy + dy * scale;

      // 根据是否击中渲染绿色/红黄色散点光晕
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      if (r.isHit) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      }
      ctx.fill();
    }

    // 绘制中心目标点 B (真理原点)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制平均偏移向量线
    if (totalCount > 0) {
      const avgPx = cx + avgDx * scale;
      const avgPy = cy + avgDy * scale;

      ctx.strokeStyle = '#F59E0B'; // 橙色平均方向指示线
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(avgPx, avgPy);
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(avgPx, avgPy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [activeTab, loading, records, avgDx, avgDy, totalCount]);

  // === 2. 渲染：方案三 8 方向弱点罗盘扇形图 ===
  useEffect(() => {
    if (activeTab !== 'compass' || loading) return;
    const canvas = compassCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 30;

    // 清屏
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);

    // 绘制 8 个扇形
    const sectorAngle = (Math.PI * 2) / 8;
    // 起始偏移量 -22.5° 使正东 0° 位于正中央
    const startOffset = -Math.PI / 8;

    for (let i = 0; i < sectorStats.length; i++) {
      const stat = sectorStats[i];
      const startA = startOffset + i * sectorAngle;
      const endA = startA + sectorAngle;

      // 根据正确率决定半径大小与填充颜色
      const radiusRatio = stat.total > 0 ? 0.35 + (stat.accuracy / 100) * 0.65 : 0.25;
      const r = outerRadius * radiusRatio;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startA, endA);
      ctx.closePath();

      if (stat.total === 0) {
        ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
      } else if (stat.accuracy >= 80) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.55)'; // 绿
      } else if (stat.accuracy >= 60) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.65)'; // 黄
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.75)'; // 红
      }
      ctx.fill();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 绘制方向文字标注
      const midA = startA + sectorAngle / 2;
      const labelR = outerRadius + 18;
      const lx = cx + Math.cos(midA) * labelR;
      const ly = cy + Math.sin(midA) * labelR;

      ctx.fillStyle = stat.accuracy < 60 && stat.total > 0 ? '#EF4444' : '#94A3B8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stat.label.split(' ')[0], lx, ly);
    }

    // 中心装饰基准圆
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.stroke();
  }, [activeTab, loading, sectorStats]);
~~~~~
~~~~~typescript.new
  // === 1. 渲染：方案一 中心相对偏差热力图 ===
  useEffect(() => {
    if (activeTab !== 'heatmap' || loading) return;
    const canvas = heatmapCanvasRef.current;
    if (canvas) {
      renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
    }
  }, [activeTab, loading, records, avgDx, avgDy, totalCount]);

  // === 2. 渲染：方案三 8 方向弱点罗盘扇形图 ===
  useEffect(() => {
    if (activeTab !== 'compass' || loading) return;
    const canvas = compassCanvasRef.current;
    if (canvas) {
      renderCompassCanvas(canvas, sectorStats);
    }
  }, [activeTab, loading, sectorStats]);
~~~~~

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~typescript.old
import { AlertCircle, BarChart2, Compass, Info, Target, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TrainingMode, TrialRecord } from '../types';
import { getAllTrialRecords } from '../utils/db';
~~~~~
~~~~~typescript.new
import { AlertCircle, BarChart2, Compass, Info, Target, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TrainingMode, TrialRecord } from '../types';
import { renderCompassCanvas } from '../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../utils/canvas/drawHeatmap';
import { getAllTrialRecords } from '../utils/db';
~~~~~

~~~~~act
patch_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~typescript.old
import { AlertCircle, BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import { type ColorTrialRecord, getAllColorTrialRecords } from '../utils/db';
~~~~~
~~~~~typescript.new
import { AlertCircle, BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { renderHueRingCanvas } from '../utils/canvas/drawColorRing';
import { hsvToHex } from '../utils/colorUtils';
import { type ColorTrialRecord, getAllColorTrialRecords } from '../utils/db';
~~~~~

~~~~~act
patch_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~typescript.old
  // === 渲染 12 色相正确率环状图 ===
  useEffect(() => {
    if (loading) return;
    const canvas = ringCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 40;
    const innerRadius = outerRadius - 20;

    // 清屏
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);

    // 绘制 12 个扇形
    const sectorAngle = (Math.PI * 2) / 12;
    const startOffset = -Math.PI / 2; // 从 12 点钟方向开始

    for (let i = 0; i < 12; i++) {
      const stat = sectorStats[i];
      const startA = startOffset + i * sectorAngle;
      const endA = startA + sectorAngle;

      // 1. 绘制最外圈彩色光谱指示带
      const hueAngle = i * 30 + 15; // 扇区中心色相
      const hexColor = hsvToHex(hueAngle, 100, 100);

      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius + 12, startA, endA);
      ctx.arc(cx, cy, outerRadius + 2, endA, startA, true);
      ctx.fillStyle = hexColor;
      ctx.fill();

      // 2. 绘制正确率柱状扇形
      // 最小半径展示 10%，最大展示 100%
      const accRatio = stat.total > 0 ? Math.max(0.1, stat.accuracy / 100) : 0;
      const r = innerRadius + (outerRadius - innerRadius) * accRatio;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startA, endA);
      ctx.closePath();

      if (stat.total === 0) {
        ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
      } else if (stat.accuracy >= 80) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.55)'; // 绿
      } else if (stat.accuracy >= 60) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.65)'; // 黄
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.75)'; // 红
      }
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. 绘制文字标注
      const midA = startA + sectorAngle / 2;
      const labelR = outerRadius + 25;
      const lx = cx + Math.cos(midA) * labelR;
      const ly = cy + Math.sin(midA) * labelR;

      ctx.fillStyle = stat.accuracy < 60 && stat.total >= 3 ? '#EF4444' : '#94A3B8';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 取名字的前两个字（如 "红", "黄绿"）
      const shortName = stat.label.split(' ')[0];
      ctx.fillText(shortName, lx, ly);
    }

    // 中心装饰基准圆
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.stroke();

    // 中心文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Hue', cx, cy - 6);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Accuracy', cx, cy + 8);
  }, [loading, sectorStats]);
~~~~~
~~~~~typescript.new
  // === 渲染 12 色相正确率环状图 ===
  useEffect(() => {
    if (loading) return;
    const canvas = ringCanvasRef.current;
    if (canvas) {
      renderHueRingCanvas(canvas, sectorStats);
    }
  }, [loading, sectorStats]);
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
import {
  Activity,
  BarChart2,
  Calendar,
  ChevronDown,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { getAllColorTrialRecords, getAllTrialRecords } from '../utils/db';
~~~~~
~~~~~typescript.new
import {
  Activity,
  BarChart2,
  Calendar,
  ChevronDown,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { getAllColorTrialRecords, getAllTrialRecords } from '../utils/db';
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
  // === 5. 折线图渲染 ===
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 20, bottom: 25, left: 30 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const activeDates = Object.keys(dailyData).sort();
    const recentDates = activeDates.slice(-30);

    if (recentDates.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('当前筛选条件下暂无做答轨迹', width / 2, height / 2);
      return;
    }

    const levels = recentDates.map((d) => dailyData[d].maxLevel);
    const maxLevel = Math.max(...levels, 35);
    const minLevel = 1;

    const getY = (val: number) =>
      padding.top + (1 - (val - minLevel) / (maxLevel - minLevel || 1)) * chartH;
    const getX = (idx: number) =>
      padding.left + (idx / Math.max(1, recentDates.length - 1)) * chartW;

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const l of [minLevel, Math.round(maxLevel / 2), maxLevel]) {
      const y = getY(l);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.moveTo(getX(0), getY(levels[0]));
    for (let i = 1; i < levels.length; i++) {
      ctx.lineTo(getX(i), getY(levels[i]));
    }
    ctx.stroke();

    for (let i = 0; i < levels.length; i++) {
      ctx.beginPath();
      ctx.arc(getX(i), getY(levels[i]), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const l of [minLevel, maxLevel]) {
      ctx.fillText(`L${l}`, padding.left - 5, getY(l));
    }
    ctx.textAlign = 'center';
    ctx.fillText('最近活跃日演进趋势 ➔', width / 2, height - 5);
  }, [loading]);
~~~~~
~~~~~typescript.new
  // === 5. 折线图渲染 ===
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);
~~~~~

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~typescript.old
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import type { TrainingMode } from '../types';
~~~~~
~~~~~typescript.new
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import type { TrainingMode } from '../types';
import { renderSessionTrendChartCanvas } from '../utils/canvas/drawTrendChart';
~~~~~

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~typescript.old
  // 绘制 Level 演进折线图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 30, bottom: 35, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // 清屏
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);

    const levels = history.map((h) => h.level);
    const maxLevel = Math.max(...levels, 35);
    const minLevel = Math.min(...levels, 1);

    // Y 轴转换函数 (Level 越大代表难度越高，向上增加)
    const getY = (val: number) => {
      const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
      return padding.top + (1 - ratio) * chartH;
    };

    // X 轴转换函数
    const getX = (index: number) => {
      if (history.length === 1) return padding.left + chartW / 2;
      return padding.left + (index / (history.length - 1)) * chartW;
    };

    // 1. 绘制网格线与 Y 轴刻度
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#334155';
    ctx.fillStyle = '#64748B';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
    const uniqueYTicks = Array.from(new Set(yTicks));

    for (const tickVal of uniqueYTicks) {
      const y = getY(tickVal);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
    }

    // 2. 绘制渐变填充区域
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(history[0].level));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].level));
    }
    ctx.lineTo(getX(history.length - 1), height - padding.bottom);
    ctx.lineTo(getX(0), height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 3. 绘制折线
    ctx.beginPath();
    ctx.strokeStyle = '#818CF8';
    ctx.lineWidth = 2.5;
    ctx.moveTo(getX(0), getY(history[0].level));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].level));
    }
    ctx.stroke();

    // 4. 绘制数据点与作答标记
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      const x = getX(i);
      const y = getY(h.level);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = h.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 在主要节点标 Level 数字
      if (
        history.length <= 10 ||
        i === 0 ||
        i === history.length - 1 ||
        h.level !== history[i - 1]?.level
      ) {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`L${h.level}`, x, y - 8);
      }
    }

    // X 轴底线
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('题目做答序列 ➔', width / 2, height - 10);
  }, [history]);
~~~~~
~~~~~typescript.new
  // 绘制 Level 演进折线图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && history.length > 0) {
      renderSessionTrendChartCanvas(canvas, history);
    }
  }, [history]);
~~~~~

### 下一步建议
1. **测试用例扩展**：建议针对新增的 `useTrainingSession` Hook 以及 Canvas Drawers 纯函数补充专门的单元测试用例。
2. **状态持久化与状态管理**：随着系统模块增加，未来可考虑将设置状态或全局数据看板通过 Context 或轻量状态库（如 Signals）做进一步理顺。
