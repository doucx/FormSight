import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { ArrowLeft, Clock, Target, CheckCircle2, XCircle, ChevronRight } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion } from '../utils/geometry';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, SessionData } from '../utils/db';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialGridStep: number;
  onExit: () => void;
}

export function TrainingView({
  mode,
  sessionType,
  initialGridStep,
  onExit,
}: TrainingViewProps) {
  // === 会话状态 ===
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(new AdaptiveEngine(initialGridStep));

  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion(mode, initialGridStep)
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<{
    clickPoint: Point;
    hitResult: HitResult;
  } | null>(null);

  // 统计指标
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // === 计时器 ===
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    const record: TrialRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      mode,
      timestamp: Date.now(),
      gridStep: question.gridStep,
      anchorA: [question.anchorA.x, question.anchorA.y],
      anchorC: question.anchorC ? [question.anchorC.x, question.anchorC.y] : undefined,
      targetB: [question.targetB.x, question.targetB.y],
      userClick: [clickPoint.x, clickPoint.y],
      angleDegree: question.angleDegree,
      distanceRatio: question.distanceRatio,
      isHit: hitResult.isHit,
      errorPixelDistance: hitResult.errorDistance,
      responseTimeMs,
    };
    await saveTrialRecord(record);

    // 2. 调优阶梯难度步长
    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    // 3. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
    } else {
      // 500ms 后自动进入下一张图
      setTimeout(() => {
        const nextStep = adaptiveEngineRef.current.getCurrentStep();
        setShowAnswer(false);
        setUserAnswer(null);
        setQuestion(generateQuestion(mode, nextStep));
        setQuestionStartTime(Date.now());
      }, 500);
    }
  };

  // === 切题 ===
  const handleNextQuestion = () => {
    if (isFinished) return;

    const nextStep = adaptiveEngineRef.current.getCurrentStep();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextStep));
    setQuestionStartTime(Date.now());
  };

  // === 保存会话数据 ===
  const saveCurrentSession = async (
    trials = totalTrials,
    hits = hitTrials,
    ended = false
  ) => {
    const sessionData: SessionData = {
      id: sessionIdRef.current,
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startGridStep: initialGridStep,
      endGridStep: adaptiveEngineRef.current.getCurrentStep(),
    };
    await saveSession(sessionData);
  };

  // === 退出结算 ===
  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentAccuracy =
    totalTrials > 0 ? Math.round((hitTrials / totalTrials) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏控制面板 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleFinishSession}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
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
              本次正确率
            </span>
            <span className="font-black text-gray-800">
              {currentAccuracy}%
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前网格步长
            </span>
            <span className="font-black text-indigo-600">
              {question.gridStep} px
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">
              {formatTime(elapsedSeconds)}
            </span>
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

      {/* 底部提示与操作栏 */}
      <div className="w-full max-w-2xl bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          {!showAnswer ? (
            <p className="text-xs font-medium text-gray-500 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500 animate-pulse" />
              观察左图相对几何关系，在右图点击推演出的目标位置
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
                  userAnswer?.hitResult.isHit
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {userAnswer?.hitResult.isHit ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> 准确击中!
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" /> 未击中
                  </>
                )}
              </span>
              <span className="text-xs font-medium text-gray-500">
                像素偏差: <strong className="text-gray-800">{userAnswer?.hitResult.errorDistance} px</strong>
              </span>
            </div>
          )}
        </div>

        {isFinished ? (
          <button
            onClick={handleFinishSession}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-200 transition-all"
          >
            完成测试并退出
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            disabled={!showAnswer}
            className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1 ${
              showAnswer
                ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-200 active:scale-95'
                : 'bg-gray-300 shadow-none cursor-not-allowed opacity-60'
            }`}
          >
            下一题 (Space)
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
