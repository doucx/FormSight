import { ArrowLeft, ChevronRight, Clock } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { type SessionHistoryItem, SessionSummaryModal } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
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
  const sessionIdRef = useRef<string>(`rcsession_${Date.now()}`);
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

  const [question, setQuestion] = useState<RelativeColorQuestionData>(() =>
    generateRelativeColorQuestion(mode, initialLevel),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<RelativeColorHitResult | null>(null);

  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished]);

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

  const handleAnswer = async (userD: [number, number, number]) => {
    const responseTimeMs = Date.now() - questionStartTime;
    const hitResult = checkRelativeColorHit(mode, userD, question);

    setUserAnswer(hitResult);
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hitResult.isHit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    // 通用 DB API 提交
    await saveTrialRecord({
      id: `rcrec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      domain: 'relative_color',
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      isHit: hitResult.isHit,
      responseTimeMs,
      details: {
        colorA: question.colorA,
        colorB: question.colorB,
        colorC: question.colorC,
        targetD: question.targetD,
        userD,
        deltaEError: hitResult.deltaEError,
      },
    });

    setSessionHistory((prev) => [
      ...prev,
      {
        trialIndex: newTotal,
        level: question.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
      },
    ]);

    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    const delay = settings.autoNextDelay;

    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        setShowSummaryModal(true);
      }, delay);
    } else if (settings.autoNext) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, delay);
    }
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
    setQuestion(generateRelativeColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    await saveSession({
      id: sessionIdRef.current,
      domain: 'relative_color',
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    });
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
    sessionIdRef.current = `rcsession_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateRelativeColorQuestion(mode, nextLevel));
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
      {/* 顶栏 */}
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

        {/* 监控指标 */}
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

      {/* 相对色彩矢量 Canvas */}
      <RelativeColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />

      {/* 底部控制栏 */}
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

      {/* 结算弹窗 */}
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