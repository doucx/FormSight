import { ArrowLeft, ChevronRight, Clock, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';

export interface TrainingSessionHandle {
  totalTrials: number;
  elapsedSeconds: number;
  isFinished: boolean;
  isIdle: boolean;
  showAnswer: boolean;
  showSummaryModal: boolean;
  sessionHistory: SessionHistoryItem[];
  resumeFromIdle: () => void;
  handleNextQuestion: () => void;
  handleRequestFinish: () => void;
  handleFinishSession: () => void;
  handleRestartSession: () => void;
}

interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}

export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  autoNext,
  session,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
  const { t } = useTranslation();
  const cardTitle = getCardTitle(card, t);
  const instruction =
    t(`packs.${card.packId}.cards.${card.id}.instruction`) || card.instruction || '';
  const desc = getCardDesc(card, t);

  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const {
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    showAnswer,
    showSummaryModal,
    sessionHistory,
    resumeFromIdle,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-3 sm:gap-5">
      {/* 极简高屏效 Header 状态栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-xs flex items-center justify-between gap-2.5">
        {/* 左侧：返回按钮 + 模块标题 + 玩法提示 */}
        <div className="flex items-center gap-2 min-w-0">
          {showExitButton && (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer active:scale-95"
              title={t('shell.exitTraining')}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.exit')}</span>
            </button>
          )}

          <div className="relative flex items-center min-w-0">
            <span className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-xl flex items-center gap-1.5 truncate">
              <span className="truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">{cardTitle}</span>
              {sessionType === 'benchmark' && (
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                  BM
                </span>
              )}
              {(instruction || desc) && (
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded-md flex-shrink-0"
                  title={t('shell.instructionTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </span>

            {showHelpTooltip && (instruction || desc) && (
              <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t('shell.instructionTitle')}
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">{instruction || desc}</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：核心指标组 (进度 / Level / 计时) */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold flex-shrink-0">
          <div className="flex items-baseline gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">T</span>
            <span className="font-mono text-slate-800 font-black">
              {totalTrials}
              {sessionType === 'benchmark' ? '/20' : ''}
            </span>
          </div>

          <div className="flex items-baseline gap-1 bg-indigo-50/70 px-2.5 py-1 rounded-xl border border-indigo-100">
            <span className="text-[10px] text-indigo-400 font-extrabold uppercase">L</span>
            <span className="font-mono text-indigo-700 font-black">{currentLevel}</span>
          </div>

          {showTimer && (
            <div className="hidden xs:flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="font-mono text-[11px] font-semibold">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 统一 Canvas 居中容器与休眠遮罩 */}
      <div className="relative w-full flex justify-center">
        {children({ disabled: isFinished || isIdle, isIdle })}
        {isIdle && <IdlePauseOverlay onResume={resumeFromIdle} />}
      </div>

      {/* 统一手动下一题控制栏 */}
      {!autoNext && (
        <div className="flex items-center justify-center pt-1">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              {t('shell.viewSummary')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {t('common.nextQuestion')}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 统一结课总结弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          card={card}
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