import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { PlanStepTransitionOverlay } from '../components/plan/PlanStepTransitionOverlay';
import { type PlanStageResult, PlanSummaryModal } from '../components/plan/PlanSummaryModal';
import { getCardById } from '../config/cards';
import { CARD_PLUGINS } from '../config/trainingPlugins';
import type { TrainingPlan } from '../types/plan';
import { getProfile } from '../utils/db';
import { type UserSettings, getCardSettings } from '../utils/settings';
import { GenericTrainingView } from './GenericTrainingView';

interface PlanTrainingViewProps {
  plan: TrainingPlan;
  settings: UserSettings;
  onExit: () => void;
}

export function PlanTrainingView({ plan, settings, onExit }: PlanTrainingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stageResults, setStageResults] = useState<PlanStageResult[]>([]);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [sessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);

  const currentStep = plan.items[currentStepIndex];
  const currentCard = currentStep ? getCardById(currentStep.cardId) : null;
  const nextStep = plan.items[currentStepIndex + 1];
  const nextCard = nextStep ? getCardById(nextStep.cardId) : null;

  // 加载当前卡片生涯等级
  useEffect(() => {
    if (currentCard) {
      getProfile(currentCard.id).then((p) => {
        setStageInitialLevel(p?.currentLevel || 5);
      });
    }
  }, [currentCard]);

  // 总计时器
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal]);

  const handleStageReached = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard) return;

      const stageRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStep.targetTrials,
        history,
      };

      setStageResults((prev) => [...prev, stageRes]);

      if (currentStepIndex + 1 < plan.items.length) {
        setIsTransitioning(true);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, plan.items.length],
  );

  const handleProceedNextStage = useCallback(() => {
    setIsTransitioning(false);
    setCurrentStepIndex((prev) => prev + 1);
  }, []);

  const handleRestartPlan = useCallback(() => {
    setShowSummaryModal(false);
    setIsTransitioning(false);
    setCurrentStepIndex(0);
    setStageResults([]);
  }, []);

  if (!currentCard || !plan.items || plan.items.length === 0) {
    onExit();
    return null;
  }

  const plugin = CARD_PLUGINS[currentCard.id];
  const cardConfig = getCardSettings(settings, currentCard.id);

  return (
    <div className="w-full">
      {/* 顶部流水线全局进度 */}
      <div className="max-w-5xl mx-auto mb-4 bg-indigo-900 text-white px-5 py-3 rounded-2xl shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black bg-indigo-600 px-2.5 py-1 rounded-xl">
            阶段 {currentStepIndex + 1} / {plan.items.length}
          </span>
          <span className="text-xs font-bold text-indigo-100">{plan.name}</span>
        </div>

        <div className="text-xs text-indigo-200 font-mono font-bold">
          本阶段目标: {currentStep.targetTrials} 题
        </div>
      </div>

      <GenericTrainingView
        key={`plan-stage-${currentStepIndex}-${currentCard.id}`}
        card={currentCard}
        plugin={plugin}
        sessionType="training"
        initialLevel={stageInitialLevel}
        settings={cardConfig}
        globalSettings={settings.global}
        targetLimitTrials={currentStep.targetTrials}
        onTargetLimitReached={handleStageReached}
        onExit={onExit}
      />

      {isTransitioning && nextCard && (
        <PlanStepTransitionOverlay
          completedCard={currentCard}
          nextCard={nextCard}
          completedStepIndex={currentStepIndex}
          totalSteps={plan.items.length}
          onProceed={handleProceedNextStage}
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
