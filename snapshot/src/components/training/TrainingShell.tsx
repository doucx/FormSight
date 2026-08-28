import { ArrowLeft, ChevronRight, Clock, Crosshair, FlaskConical, HelpCircle } from 'lucide-preact';
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
  isTargeting = false,
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
  const badgeKey = card.tags.domain[0] ? `tags.domains.${card.tags.domain[0]}` : '';
  const badge = badgeKey ? t(badgeKey) : '';

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
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 统一 Header 状态栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showExitButton && (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('shell.exitTraining')}
            </button>
          )}
          <div className="relative flex items-center">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5">
              {cardTitle} {badge ? `· ${badge}` : ''} |{' '}
              {sessionType === 'benchmark' ? t('shell.benchmark') : t('shell.training')}
              {(instruction || desc) && (
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-indigo-400 hover:text-indigo-700 transition-colors p-0.5 rounded-md"
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
                <p className="text-slate-200 text-[11px]">{instruction || desc}</p>
              </div>
            )}
          </div>

          {isTargeting && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              {t('shell.targeting')}
            </span>
          )}

          {card.tags.status === 'experimental' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              {t('shell.experimental')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              {t('shell.trialsCount')}
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              {t('shell.currentLevel')}
            </span>
            <span className="font-black text-indigo-600">Level {currentLevel}</span>
          </div>

          {showTimer && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-bold text-slate-700">
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
        <div className="flex items-center justify-center">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all active:scale-95"
            >
              {t('shell.viewSummary')}
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
