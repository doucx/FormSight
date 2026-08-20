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
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);

  // 过滤无效或不存在的卡片，提供安全保障
  const validItems = (plan.items || []).filter((item) => Boolean(getCardById(item.cardId)));

  const currentStep = validItems[currentStepIndex];
  const currentCard = currentStep ? getCardById(currentStep.cardId) : null;
  const nextStep = validItems[currentStepIndex + 1];
  const nextCard = nextStep ? getCardById(nextStep.cardId) : null;

  // 严格加载当前卡片的生涯真实等级后再允许渲染训练器
  useEffect(() => {
    let isMounted = true;
    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id).then((p) => {
        if (!isMounted) return;
        setStageInitialLevel(p?.currentLevel || 5);
        setIsLevelLoaded(true);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [currentCard, currentStepIndex]);

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

      if (currentStepIndex + 1 < validItems.length) {
        setIsTransitioning(true);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, validItems.length],
  );

  const handleProceedNextStage = useCallback(() => {
    setIsLevelLoaded(false);
    setIsTransitioning(false);
    setCurrentStepIndex((prev) => prev + 1);
  }, []);

  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
    setShowSummaryModal(false);
    setIsTransitioning(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
  }, []);

  if (!currentCard || validItems.length === 0) {
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
            阶段 {currentStepIndex + 1} / {validItems.length}
          </span>
          <span className="text-xs font-bold text-indigo-100">{plan.name}</span>
        </div>

        <div className="text-xs text-indigo-200 font-mono font-bold">
          本阶段目标: {currentStep.targetTrials} 题
        </div>
      </div>

      {isTransitioning && nextCard ? (
        <PlanStepTransitionOverlay
          completedCard={currentCard}
          nextCard={nextCard}
          completedStepIndex={currentStepIndex}
          totalSteps={validItems.length}
          onProceed={handleProceedNextStage}
          onExit={onExit}
        />
      ) : !isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          正在加载【{currentCard.title}】的生涯能力层阶...
        </div>
      ) : (
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
