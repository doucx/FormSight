import { ArrowLeft, ChevronRight, Clock, Pause } from 'lucide-preact';
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
import { type RelativeColorSettings, loadSettings } from '../utils/settings';

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
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
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
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const showBlurOverlay = loadSettings().global.showIdleBlurOverlay ?? true;

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

      <div className="relative w-full flex justify-center">
        <RelativeColorCanvas
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={(userD) => {
            if (isIdle) resumeFromIdle();
            handleAnswer(userD);
          }}
          disabled={isFinished || (isIdle && showBlurOverlay)}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
          enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
        />

        {isIdle && showBlurOverlay && (
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

      {!settings.autoNext && (
        <div className="flex items-center justify-center">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all active:scale-95"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md active:scale-95'
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
