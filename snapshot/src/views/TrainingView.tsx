import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { type SessionHistoryItem, SessionSummaryModal } from '../components/SessionSummaryModal';
import { StarCanvas } from '../components/StarCanvas';
import type { HitResult, Point, QuestionData, TrainingMode, TrialRecord } from '../types';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { type SessionData, saveSession, saveTrialRecord } from '../utils/db';
import { type QuestionGenerateOptions, generateQuestion } from '../utils/geometry';
import type { UserSettings } from '../utils/settings';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: UserSettings;
  onExit: () => void;
}

export function TrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: TrainingViewProps) {
  // === 会话状态 ===
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      settings.stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize,
    ),
  );
  const autoNextTimerRef = useRef<number | null>(null);
  const targetSectorsRef = useRef<number[]>(settings.manualTargetSectors || []);

  // 辅助：获取发题配置选项
  const getGenerateOptions = (): QuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
      gridSize: settings.gridSize,
    };
  };

  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion(mode, initialLevel, {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
      gridSize: settings.gridSize,
    }),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<{
    clickPoint: Point;
    hitResult: HitResult;
  } | null>(null);

  // 统计指标与结算弹窗
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  const lastActivityTimeRef = useRef<number>(Date.now());
  const accumulatedMsRef = useRef<number>(0);
  const lastTickTimeRef = useRef<number>(Date.now());

  // 用户活动监听，静默重置闲置计时器
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, []);

  // === 计时器 ===
  useEffect(() => {
    lastTickTimeRef.current = Date.now();
    const timer = setInterval(() => {
      // 弹窗弹出或会话完成时，冻结计时
      if (showSummaryModal || isFinished) return;

      const now = Date.now();
      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;

      const idleLimitMs = (settings.idleTimeout ?? 60) * 1000;
      const isIdle = idleLimitMs > 0 && now - lastActivityTimeRef.current > idleLimitMs;

      if (!isIdle) {
        accumulatedMsRef.current += delta;
        setElapsedSeconds(Math.floor(accumulatedMsRef.current / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [settings.idleTimeout, showSummaryModal, isFinished]);

  // === 键盘监听 (Space / Esc) ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (showAnswer && !isFinished) {
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

  // === 作答处理 ===
  const handleAnswer = async (clickPoint: Point, hitResult: HitResult) => {
    const responseTimeMs = Date.now() - questionStartTime;
    setUserAnswer({ clickPoint, hitResult });
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hitResult.isHit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    // 1. 存数据库原子记录
    await saveTrialRecord({
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      domain: 'star',
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      isHit: hitResult.isHit,
      responseTimeMs,
      details: {
        anchorA: [question.anchorA.x, question.anchorA.y],
        anchorC: question.anchorC ? [question.anchorC.x, question.anchorC.y] : undefined,
        targetB: [question.targetB.x, question.targetB.y],
        userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
        angleDegree: question.angleDegree,
        distanceRatio: question.distanceRatio,
        errorPixelDistance: hitResult.errorDistance,
      },
    });

    // 2. 记录做答 Level 历史
    setSessionHistory((prev) => [
      ...prev,
      {
        trialIndex: newTotal,
        level: question.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
      },
    ]);

    // 3. 调优阶梯难度 Level
    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    const delay = settings.starAutoNextDelay ?? settings.autoNextDelay;

    // 4. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        setShowSummaryModal(true);
      }, delay);
    } else if (settings.autoNext) {
      // 自动翻页延时
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, delay);
    }
  };

  // === 切题 ===
  const handleNextQuestion = () => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };

  // === 保存会话数据 ===
  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    const sessionData: SessionData = {
      id: sessionIdRef.current,
      domain: 'star',
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    };
    await saveSession(sessionData);
  };

  // === 触发退出/完成请求 ===
  const handleRequestFinish = async () => {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  };

  // === 彻底退出 ===
  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };

  // === 再练一轮 ===
  const handleRestartSession = () => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    sessionIdRef.current = `session_${Date.now()}`;
    startTimeRef.current = Date.now();
    lastActivityTimeRef.current = Date.now();
    accumulatedMsRef.current = 0;
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(mode, nextLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏控制面板 */}
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

        {/* 核心监控指标 */}
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

      {/* 核心双 Canvas 交互区 */}
      <StarCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />

      {/* 底部操作面板（仅在未开启自动翻页时显示） */}
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

      {/* 练习结算弹窗 */}
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
