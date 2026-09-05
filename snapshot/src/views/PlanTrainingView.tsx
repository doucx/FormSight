import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/modals/SessionSummaryModal';
import { type PlanStageResult, PlanSummaryModal } from '../components/plan/PlanSummaryModal';
import type { PlanTrainingContext } from '../components/training/TrainingShell';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { getProfile } from '../storage/index';
import { type UserSettings, getCardSettings } from '../storage/settings';
import type { TrainingPlan } from '../types/plan';
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
        initialLevel: stageInitialLevel,
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

  const handleSkipCurrentStage = useCallback(
    (history: SessionHistoryItem[] = []) => {
      if (!currentCard) return;
      const skippedRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStep.targetTrials,
        history,
        initialLevel: stageInitialLevel,
      };
      const nextResults = [...stageResults, skippedRes];
      setStageResults(nextResults);

      if (currentStepIndex + 1 < validItems.length) {
        setIsLevelLoaded(false);
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, stageResults, validItems.length, stageInitialLevel],
  );

  const handleEarlyExit = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard) {
        onExit();
        return;
      }

      let updatedResults = stageResults;
      if (history.length > 0) {
        const currentRes: PlanStageResult = {
          card: currentCard,
          targetTrials: currentStep.targetTrials,
          history,
          initialLevel: stageInitialLevel,
        };
        updatedResults = [...stageResults, currentRes];
        setStageResults(updatedResults);
      }

      if (updatedResults.length > 0) {
        setShowSummaryModal(true);
      } else {
        onExit();
      }
    },
    [currentCard, currentStep, stageResults, onExit],
  );

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

  const manifest = registry.getCardManifest(currentCard.id);
  if (!manifest) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);
  const cardTitle = getCardTitle(currentCard, t);

  const planContext: PlanTrainingContext = {
    planName: plan.name,
    currentStage: currentStepIndex + 1,
    totalStages: validItems.length,
    targetTrials: currentStep.targetTrials,
    onSkipStage: handleSkipCurrentStage,
  };

  return (
    <div className="w-full">
      {!isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-muted-foreground text-xs font-semibold bg-card/60 backdrop-blur-md rounded-3xl border border-border shadow-sm">
          {t('plan.loadingLevel', { title: cardTitle })}
        </div>
      ) : (
        <GenericTrainingView
          key={`plan-stage-${planSessionKey}-${currentStepIndex}-${currentCard.id}`}
          card={currentCard}
          manifest={manifest}
          sessionType="training"
          initialLevel={stageInitialLevel}
          settings={cardConfig}
          globalSettings={settings.global}
          planContext={planContext}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          onEarlyExit={handleEarlyExit}
          onIdleChange={handleIdleChange}
          onIdleResume={handleIdleResume}
          showExitButton={true}
          showTimer={true}
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
