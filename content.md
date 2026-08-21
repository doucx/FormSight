我们的分析非常透彻。下面是完整的修复计划和执行脚本，将彻底解决状态缓存滞后问题，并将历史记录模型升级为严谨的“状态迁移边”模型。

我们将通过两步解决该问题：1. 在所有训练视图退出钩子中强制触发 `refreshProfiles()`，消除 UI 缓存滞后；2. 将 `SessionHistoryItem` 模型升级为记录 `levelBefore` 和 `levelAfter` 的迁移对（边），并在结算弹窗与演进曲线中完美渲染动态难度跳转。

## [WIP] fix(session): 修复训练退出时内存缓存滞后，并重构会话历史为状态迁移边模型

### 错误分析
1. **状态缓存失步**：训练结束或中途退出写入 IndexedDB 后，未调用 `refreshProfiles()` 同步顶层 `App` 的 `currentDomainProfiles` 内存缓存，导致再次进入或重玩时读取到陈旧的 `initialLevel`。
2. **单点思维与边思维的混淆**：此前寻星和自适应训练仅记录题目生成时的单点 `level`，末题触发的难度升降无法在总结弹窗及趋势图中体现。将其升级为记录做答前状态 ($L_{before}$) 与做答后状态 ($L_{after}$) 的边（状态迁移），可完美捕捉每一次做答带来的层阶跃迁。

### 用户需求
- 训练退出后无需刷新页面，全局看板及再次开局的初始难度即可正确反映最新层阶。
- 训练总结与成果弹窗中的首尾难度差和演进轨迹需精准反映每一次做答前后的状态迁移。

### 评论
该修复从架构层同步了内存状态与持久层，并通过图论中的“边（Transition）”视角精准建模了自适应引擎的动态演进。

### 目标
1. 在 `App.tsx` 的退出路由中异步调用 `refreshProfiles()`。
2. 升级 `SessionHistoryItem` 记录 `levelBefore` 与 `levelAfter`。
3. 在 `useTrainingSession` 中捕获并记录每次答题前后的层阶。
4. 重构 `SessionSummaryModal`、`PlanSummaryModal` 及趋势图 Canvas 渲染。

### 基本原理
通过在每次答题评测后截获自适应算子变更前后的 Level，将其封装为状态迁移元组 (`levelBefore`, `levelAfter`)。同时确保路由退出钩子正确执行状态刷新，彻底消除 UI 缓存滞后。

---

### Script

#### Acts 1: 升级 SessionHistoryItem 与 SessionSummaryModal 模型
~~~~~act
write_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import type { CardDefinition } from '../types/card';
import { renderSessionTrendChartCanvas } from '../utils/canvas/drawTrendChart';

export interface SessionHistoryItem {
  trialIndex: number;
  levelBefore: number;
  levelAfter: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  onClose: () => void;
  onRestart: () => void;
}

export function SessionSummaryModal({
  card,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].levelBefore : 5;
  const endLevel = history.length > 0 ? history[history.length - 1].levelAfter : startLevel;
  const levelDiff = endLevel - startLevel;

  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && history.length > 0) {
      renderSessionTrendChartCanvas(canvas, history);
    }
  }, [history]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">训练总结与成果</h2>
              <p className="text-xs text-slate-400">
                {card.title} • {sessionType === 'benchmark' ? '20 题基准测试' : '自适应训练'}
              </p>
            </div>
          </div>
        </div>

        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              正确率 / 题数
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{accuracy}%</span>
              <span className="text-xs font-semibold text-slate-400">
                ({hitCount}/{totalTrials} 题)
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              训练时长
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ({avgResponseTimeSec}秒/题)
              </span>
            </div>
          </div>
        </div>

        {/* 层阶提升高亮卡片 */}
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900">能力层阶演进</div>
              <div className="text-[11px] text-indigo-600">
                {levelDiff > 0
                  ? `难度层阶提升了 ${levelDiff} 级！`
                  : levelDiff < 0
                    ? `难度层阶回调了 ${Math.abs(levelDiff)} 级`
                    : '稳健维持当前难度层阶'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-slate-800 text-base">
            <span className="bg-white px-2.5 py-1 rounded-xl border border-indigo-100 shadow-sm">
              Lvl {startLevel}
            </span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
            <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-xl shadow-sm">
              Lvl {endLevel}
            </span>
          </div>
        </div>

        {/* 折线图 Canvas 区 */}
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-400">难度层阶变化曲线</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 击中
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 未击中
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full aspect-[11/4] rounded-xl"
          />
        </div>

        {/* 底部操作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Home className="w-4 h-4" />
            返回主页
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            再练一轮
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 2: 升级 useTrainingSession 记录状态迁移边缘
~~~~~act
write_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~tsx
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
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
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
  getQuestionLevel: _getQuestionLevel,
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
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const streakRef = useRef<number>(0);
  const idleStartRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  const effectiveIdleTimeout =
    typeof optionsIdleTimeout === 'number'
      ? optionsIdleTimeout
      : (loadSettings().global.idleTimeout ?? 60);

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

      // 记录答题前的层阶（起点），做答后自适应更新层阶（终点）
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
    adaptiveEngineRef.current.setLevel(initialLevel);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, initialLevel, generateQuestion]);

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

  // === 快捷键响应 (Space / Escape) ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isIdle) {
        e.preventDefault();
        resumeFromIdle();
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        if (showAnswer) {
          e.preventDefault();
          if (!isFinished) {
            handleNextQuestion();
          } else {
            handleRequestFinish();
          }
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

#### Acts 3: 重构 renderSessionTrendChartCanvas 绘制连贯状态演进轨迹
~~~~~act
write_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~ts
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from './hidpi';

export function renderTrendChartCanvas(
  canvas: HTMLCanvasElement,
  dailyData: Record<string, { total: number; maxLevel: number }>,
) {
  const width = 340;
  const height = 150;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

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
  const getX = (idx: number) => padding.left + (idx / Math.max(1, recentDates.length - 1)) * chartW;

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
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levels[0]));
  for (let i = 1; i < levels.length; i++) {
    ctx.lineTo(getX(i), getY(levels[i]));
  }
  ctx.stroke();

  const pointRadius = recentDates.length > 20 ? 2.5 : 3.5;
  for (let i = 0; i < levels.length; i++) {
    ctx.beginPath();
    ctx.arc(getX(i), getY(levels[i]), pointRadius, 0, Math.PI * 2);
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
  const width = 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;

  const padding = { top: 30, right: 30, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  // 构造完整的难度演进轨迹状态序列：[levelBefore_0, levelAfter_0, levelAfter_1, ..., levelAfter_N-1]
  const levelSequence = [history[0].levelBefore, ...history.map((h) => h.levelAfter)];
  const totalPoints = levelSequence.length;
  const maxLevel = Math.max(...levelSequence, 35);
  const minLevel = Math.min(...levelSequence, 1);

  const getY = (val: number) => {
    const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
    return padding.top + (1 - ratio) * chartH;
  };

  const getX = (index: number) => {
    if (totalPoints === 1) return padding.left + chartW / 2;
    return padding.left + (index / (totalPoints - 1)) * chartW;
  };

  // 背景刻度线
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

  // 面积渐变背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.lineTo(getX(totalPoints - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = '#818CF8';
  ctx.lineWidth = totalPoints > 100 ? 1.8 : 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.stroke();

  // 绘制各个试炼对应的判定结果圆点
  const isCrowded = totalPoints > 35;
  const isSuperCrowded = totalPoints > 80;

  if (!isSuperCrowded) {
    const dotRadius = isCrowded ? 2 : 3.5;
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      const x = getX(i + 1);
      const y = getY(h.levelAfter);

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = h.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
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

#### Acts 4: 更新 PlanSummaryModal 兼容 levelBefore / levelAfter
~~~~~act
write_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target } from 'lucide-preact';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';

export interface PlanStageResult {
  card: CardDefinition;
  targetTrials: number;
  history: SessionHistoryItem[];
}

interface PlanSummaryModalProps {
  planName: string;
  stageResults: PlanStageResult[];
  totalElapsedSeconds: number;
  onClose: () => void;
  onRestart: () => void;
}

export function PlanSummaryModal({
  planName,
  stageResults,
  totalElapsedSeconds,
  onClose,
  onRestart,
}: PlanSummaryModalProps) {
  const allHistory = stageResults.flatMap((s) => s.history);
  const totalTrials = allHistory.length;
  const hitCount = allHistory.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
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
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">今日训练流总结</h2>
              <p className="text-xs text-slate-400">
                {planName} • 完成共 {stageResults.length} 个训练阶段
              </p>
            </div>
          </div>
        </div>

        {/* 核心综合大盘卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              综合正确率
            </div>
            <div className="text-2xl font-black text-slate-800">{accuracy}%</div>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              总击中题数
            </div>
            <div className="text-2xl font-black text-slate-800">
              {hitCount} <span className="text-xs font-normal text-slate-400">/ {totalTrials}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              总用时
            </div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {formatTime(totalElapsedSeconds)}
            </div>
          </div>
        </div>

        {/* 分阶段明细成果 */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            阶段明细成绩
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stageResults.map((stage, idx) => {
              const stageHits = stage.history.filter((h) => h.isHit).length;
              const stageAcc =
                stage.history.length > 0 ? Math.round((stageHits / stage.history.length) * 100) : 0;
              const startLvl = stage.history.length > 0 ? stage.history[0].levelBefore : 5;
              const endLvl =
                stage.history.length > 0 ? stage.history[stage.history.length - 1].levelAfter : startLvl;
              const Icon = stage.card.icon;

              return (
                <div
                  key={`${stage.card.id}-${idx}`}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-slate-800 text-white font-mono text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-white text-indigo-600 border border-slate-200/60 shadow-sm">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{stage.card.title}</div>
                      <div className="text-[10px] text-slate-400">
                        {stageHits}/{stage.history.length} 题正确
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-xl border border-slate-200/60">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-indigo-600">L{endLvl}</span>
                    </div>

                    <span
                      className={`text-xs font-black font-mono px-2 py-1 rounded-xl ${
                        stageAcc >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : stageAcc >= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {stageAcc}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部动作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Home className="w-4 h-4" />
            完成并返回主页
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            再练一遍此计划
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 在 App.tsx 中退出训练时异步刷新 profiles 缓存
~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~tsx
import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { getCardById } from './config/cards';
import { DOMAINS_CONFIG } from './config/domains';
import { CARD_PLUGINS } from './config/trainingPlugins';
import { useHashRoute } from './hooks/useHashRoute';
import type { TrainingPlan } from './types/plan';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  saveTrainingPlan,
  setActivePlan,
} from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanTrainingView } from './views/PlanTrainingView';

const ALL_DOMAINS: TrainingDomain[] = [
  'abstraction',
  'concretization',
  'star',
  'color',
  'relative_color',
  'negative_space',
];

export function App() {
  const { route, navigate } = useHashRoute();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(loadTrainingPlan);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(() => loadPlanStorageState().plans);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    abstraction: 0,
    concretization: 0,
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(ALL_DOMAINS.map((d) => getProfilesByDomain(d)));
    const pMap: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        pMap[p.cardId] = p;
      }
    }

    setDomainTimes(timesMap);
    setCurrentDomainProfiles(pMap);
    setSettings(loadSettings());
    const planState = loadPlanStorageState();
    setTrainingPlan(loadTrainingPlan());
    setAllPlans(planState.plans);
    setProfilesLoaded(true);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (route.type === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || '今日训练流'} - FormSight`;
    } else if (route.type === 'dashboard') {
      const meta = DOMAINS_CONFIG[route.domain];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    } else if (route.type === 'train') {
      const card = getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route, trainingPlan.name]);

  const handleSelectPlanOnHome = useCallback(
    (planId: string) => {
      const target = setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(`已切换至【${target.name}】`, 'info');
      }
    },
    [showToast],
  );

  const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

  const activeSettingsCard = activeSettingsCardId ? getCardById(activeSettingsCardId) : null;
  const activeAnalyticsCard = activeAnalyticsCardId ? getCardById(activeAnalyticsCardId) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          domainTimes={domainTimes}
          trainingPlan={trainingPlan}
          allPlans={allPlans}
          onNavigateDomain={(domain) => navigate({ type: 'dashboard', domain })}
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => setIsPlanEditorOpen(true)}
          onSelectPlan={handleSelectPlanOnHome}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'plan-train' && (
        <PlanTrainingView
          plan={trainingPlan}
          settings={settings}
          onExit={async () => {
            await refreshProfiles();
            navigate({ type: 'home' });
          }}
        />
      )}

      {route.type === 'dashboard' && (
        <GenericDashboard
          meta={DOMAINS_CONFIG[route.domain]}
          onStart={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
          onBackToHome={() => navigate({ type: 'home' })}
          onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
          onOpenCardAnalytics={(cardId) => setActiveAnalyticsCardId(cardId)}
        />
      )}

      {route.type === 'train' &&
        (() => {
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                正在同步能力层阶与训练数据...
              </div>
            );
          }
          const activeCard = getCardById(route.cardId);
          if (!activeCard) {
            navigate({ type: 'home' });
            return null;
          }
          const plugin = CARD_PLUGINS[activeCard.id];
          const activeLevel = currentDomainProfiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={getCardSettings(settings, activeCard.id)}
              globalSettings={settings.global}
              onExit={async () => {
                await refreshProfiles();
                navigate({ type: 'dashboard', domain: activeCard.domain });
              }}
            />
          );
        })()}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={settings}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {activeAnalyticsCard && (
        <WeaknessAnalyticsModal
          card={activeAnalyticsCard}
          onClose={() => setActiveAnalyticsCardId(null)}
        />
      )}

      {isPlanEditorOpen && (
        <PlanEditorModal
          initialPlan={trainingPlan}
          onClose={() => setIsPlanEditorOpen(false)}
          onPlanListChanged={refreshProfiles}
          onSave={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            showToast('训练计划已成功更新', 'success');
          }}
        />
      )}
    </div>
  );
}
~~~~~

---

### 下一步建议

- **全面测试**: 建议在浏览器中实际运行训练并中途退出、完成训练，观察看板及再次开局的 `initialLevel` 是否无需刷新即可完美实时更新。
- **单元测试补充**: 可以为 `useTrainingSession` 增加针对 `levelBefore` / `levelAfter` 状态迁移边界的单元测试用例。
