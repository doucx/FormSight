import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/modals/SessionSummaryModal';
import { type PlanStageResult, PlanSummaryModal } from '../components/plan/PlanSummaryModal';
import { StageMessageView } from '../components/plan/stages/StageMessageView';
import { StageRestView } from '../components/plan/stages/StageRestView';
import type { PlanTrainingContext } from '../components/training/TrainingShell';
import { getCardTitle, useTranslation } from '../core/i18n';
import { isCardStage, isMessageStage, isRestStage, normalizePlanItems } from '../core/plan/stages';
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

  const stages = useMemo(() => normalizePlanItems(plan.items).items, [plan.items]);

  const currentStage = stages[currentStepIndex];
  const cardStage = currentStage && isCardStage(currentStage) ? currentStage : null;
  const currentCard = cardStage ? registry.getCardById(cardStage.cardId) : null;

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
      // 提示页与休息段不需要加载卡片层阶
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

  const advanceToNextStage = useCallback(() => {
    if (currentStepIndex + 1 < stages.length) {
      setIsLevelLoaded(false);
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setShowSummaryModal(true);
    }
  }, [currentStepIndex, stages.length]);

  const handleStageReached = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard || !currentStage || !isCardStage(currentStage)) return;

      const stageRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStage.targetTrials,
        history,
        initialLevel: stageInitialLevel,
      };

      setStageResults((prev) => [...prev, stageRes]);
      advanceToNextStage();
    },
    [currentCard, currentStage, stageInitialLevel, advanceToNextStage],
  );

  const handleSkipCurrentStage = useCallback(
    (history: SessionHistoryItem[] = []) => {
      if (!currentCard || !currentStage || !isCardStage(currentStage)) return;

      const skippedRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStage.targetTrials,
        history,
        initialLevel: stageInitialLevel,
      };

      setStageResults((prev) => [...prev, skippedRes]);
      advanceToNextStage();
    },
    [currentCard, currentStage, stageInitialLevel, advanceToNextStage],
  );

  const handleEarlyExit = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard || !currentStage || !isCardStage(currentStage)) {
        onExit();
        return;
      }

      if (history.length > 0) {
        const currentRes: PlanStageResult = {
          card: currentCard,
          targetTrials: currentStage.targetTrials,
          history,
          initialLevel: stageInitialLevel,
        };
        const updatedResults = [...stageResults, currentRes];
        setStageResults(updatedResults);
        setShowSummaryModal(true);
        return;
      }

      if (stageResults.length > 0) {
        setShowSummaryModal(true);
      } else {
        onExit();
      }
    },
    [currentCard, currentStage, stageResults, stageInitialLevel, onExit],
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

  if (!currentStage || stages.length === 0) {
    onExit();
    return null;
  }

  const manifest = currentCard ? registry.getCardManifest(currentCard.id) : null;

  if (cardStage && (!currentCard || !manifest)) {
    onExit();
    return null;
  }

  const cardConfig = currentCard ? getCardSettings(settings, currentCard.id) : null;
  const cardTitle = currentCard ? getCardTitle(currentCard, t) : '';

  const planContext: PlanTrainingContext = {
    planName: plan.name,
    currentStage: currentStepIndex + 1,
    totalStages: stages.length,
    targetTrials: cardStage ? cardStage.targetTrials : 0,
    totalElapsedSeconds,
    onSkipStage: handleSkipCurrentStage,
  };

  const stageKey = `plan-stage-${planSessionKey}-${currentStepIndex}-${currentStage.id}`;

  return (
    <div className="w-full">
      {cardStage ? (
        !isLevelLoaded ? (
          <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-muted-foreground text-xs font-semibold bg-card/60 backdrop-blur-md rounded-3xl border border-border shadow-sm">
            {t('plan.loadingLevel', { title: cardTitle })}
          </div>
        ) : (
          currentCard &&
          manifest &&
          cardConfig && (
            <GenericTrainingView
              key={stageKey}
              card={currentCard}
              manifest={manifest}
              sessionType="training"
              initialLevel={stageInitialLevel}
              settings={cardConfig}
              globalSettings={settings.global}
              planContext={planContext}
              targetLimitTrials={cardStage.targetTrials}
              onTargetLimitReached={handleStageReached}
              onEarlyExit={handleEarlyExit}
              onIdleChange={handleIdleChange}
              onIdleResume={handleIdleResume}
              showExitButton={true}
              showTimer={true}
              onExit={handleRequestExit}
            />
          )
        )
      ) : isMessageStage(currentStage) ? (
        <StageMessageView
          key={stageKey}
          stage={currentStage}
          currentStage={currentStepIndex + 1}
          totalStages={stages.length}
          onAdvance={advanceToNextStage}
          onExit={handleRequestExit}
        />
      ) : isRestStage(currentStage) ? (
        <StageRestView
          key={stageKey}
          stage={currentStage}
          currentStage={currentStepIndex + 1}
          totalStages={stages.length}
          onAdvance={advanceToNextStage}
          onExit={handleRequestExit}
        />
      ) : null}

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
