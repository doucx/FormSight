import { ArrowLeft, Clock, FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { type PlanStageResult, PlanSummaryModal } from '../components/plan/PlanSummaryModal';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { TrainingPlan } from '../types/plan';
import { getProfile } from '../utils/db/index';
import { type UserSettings, getCardSettings } from '../utils/settings';
import { formatSecondsToTimer } from '../utils/time';
import { GenericTrainingView } from './GenericTrainingView';

interface PlanTrainingViewProps {
  plan: TrainingPlan;
  settings: UserSettings;
  onExit: () => void;
}

export function PlanTrainingView({ plan, settings, onExit }: PlanTrainingViewProps) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stageResults, setStageResults] = useState<PlanStageResult[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);
  const [planSessionKey, setPlanSessionKey] = useState<number>(0);
  const [isPlanIdle, setIsPlanIdle] = useState<boolean>(false);

  const validItems = (plan.items || []).filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );

  const currentStep = validItems[currentStepIndex];
  const currentCard = currentStep ? registry.getCardById(currentStep.cardId) : null;

  useEffect(() => {
    let isMounted = true;
    const stepIdx = currentStepIndex;
    const sessionKey = planSessionKey;

    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id)
        .then((p) => {
          if (!isMounted) return;
          setStageInitialLevel(p?.currentLevel || 5);
          setIsLevelLoaded(true);
        })
        .catch((err) => {
          console.error(
            `Failed to load profile for card ${currentCard.id} at step ${stepIdx} (session ${sessionKey}):`,
            err,
          );
          if (!isMounted) return;
          setStageInitialLevel(5);
          setIsLevelLoaded(true);
        });
    } else {
      setIsLevelLoaded(true);
    }
    return () => {
      isMounted = false;
    };
  }, [currentCard, currentStepIndex, planSessionKey]);

  const handleIdleChange = useCallback((idle: boolean) => {
    setIsPlanIdle(idle);
  }, []);

  const handleIdleResume = useCallback((idleDurationMs: number) => {
    setSessionStartTime((prev) => prev + idleDurationMs);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal && !isPlanIdle && isLevelLoaded) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal, isPlanIdle, isLevelLoaded]);

  const handleStageReached = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard) return;

      const stageRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStep.targetTrials,
        history,
      };

      const nextResults = [...stageResults, stageRes];
      setStageResults(nextResults);

      if (currentStepIndex + 1 < validItems.length) {
        setIsLevelLoaded(false);
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, stageResults, validItems.length],
  );

  const handleSkipCurrentStage = useCallback(() => {
    if (!currentCard) return;
    const skippedRes: PlanStageResult = {
      card: currentCard,
      targetTrials: currentStep.targetTrials,
      history: [],
    };
    const nextResults = [...stageResults, skippedRes];
    setStageResults(nextResults);

    if (currentStepIndex + 1 < validItems.length) {
      setIsLevelLoaded(false);
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setShowSummaryModal(true);
    }
  }, [currentCard, currentStep, currentStepIndex, stageResults, validItems.length]);

  const handleRequestExit = useCallback(() => {
    if (stageResults.length > 0) {
      setShowSummaryModal(true);
    } else {
      onExit();
    }
  }, [stageResults.length, onExit]);

  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
    setIsPlanIdle(false);
    setShowSummaryModal(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
    setPlanSessionKey((prev) => prev + 1);
  }, []);

  if (!currentCard || validItems.length === 0) {
    onExit();
    return null;
  }

  const plugin = registry.getPluginByCardId(currentCard.id);
  if (!plugin) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);
  const cardTitle = getCardTitle(currentCard, t);

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto mb-4 bg-white border border-slate-200/80 px-4 sm:px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestExit}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            title={t('plan.exitPlan')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('plan.exitPlan')}
          </button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-xl">
              {t('plan.stageProgress', { current: currentStepIndex + 1, total: validItems.length })}
            </span>
            <span className="text-xs font-bold text-slate-800 tracking-tight">{plan.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-xs text-slate-400 font-mono font-semibold hidden sm:block">
            {t('plan.stageGoal', { trials: currentStep.targetTrials })}
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-xs font-bold text-slate-700">
              {formatSecondsToTimer(totalElapsedSeconds)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSkipCurrentStage}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            title={t('plan.skipStage')}
          >
            <FastForward className="w-3.5 h-3.5 text-indigo-500" />
            {t('plan.skipStage')}
          </button>
        </div>
      </div>

      {!isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          {t('plan.loadingLevel', { title: cardTitle })}
        </div>
      ) : (
        <GenericTrainingView
          key={`plan-stage-${planSessionKey}-${currentStepIndex}-${currentCard.id}`}
          card={currentCard}
          plugin={plugin}
          sessionType="training"
          initialLevel={stageInitialLevel}
          settings={cardConfig}
          globalSettings={settings.global}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          onIdleChange={handleIdleChange}
          onIdleResume={handleIdleResume}
          showExitButton={false}
          showTimer={false}
          onExit={handleRequestExit}
        />
      )}

      {showSummaryModal && (
        <PlanSummaryModal
          planName={plan.name}
          stageResults={stageResults}
          totalElapsedSeconds={totalElapsedSeconds}
          onClose={onExit}
          onRestart={handleRestartPlan}
        />
      )}
    </div>
  );
}
