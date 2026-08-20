好的，我将为你生成一个计划：
1. 移除阶段之间的阻断性弹窗，在达成阶段目标题量后直接静默无缝进入下一阶段。
2. 拦截中途按下 `Esc` 或点击“退出训练”的操作，若已有做答成果则弹出全局训练流总结页面（`PlanSummaryModal`），让用户查看战果后再离开。

## [WIP] feat: 优化计划训练流转：静默无缝切阶段与中途退出结算总结

### 用户需求
1. 当一个阶段完成后，不弹出任何阻断性弹窗，直接静默无缝载入并进入下一阶段，保持训练心流。
2. 在计划训练过程中按下 `Esc` 或点击退出按钮时，不再直接丢弃战果返回主页，而是弹出与计划结束时一致的总结结算页（`PlanSummaryModal`），展示已完成阶段的综合战果与明细。

### 评论
该改动消除了繁琐的按键确认步骤，让多阶段定制训练流如同流水线般顺畅执行；同时在用户主动中断/提前结束时给予即时的正向成就反馈与数据沉淀，体验更加自然闭环。

### 目标
1. 在 `src/views/PlanTrainingView.tsx` 中移除 `PlanStepTransitionOverlay` 阻断过渡，当阶段达成目标后直接静默递增 `currentStepIndex` 切换至下一阶段。
2. 重构退出逻辑：拦截 `onExit`，若用户已累积了阶段成果（`stageResults.length > 0`），则弹出 `PlanSummaryModal` 展示当前全部成果；若为 0 做答状态则直接退出。

### 基本原理
- **静默流转**：当 `handleStageReached` 被触发且尚未到达最后阶段时，直接将本阶段成绩存入 `stageResults`，并立即设置 `currentStepIndex += 1`，依赖现有的 key 变更实现子组件的平滑自加载。
- **提前退出结算**：将子阶段组件的退出回调对接至 `handleRequestExit`。当用户触发退出且已有阶段做答数据时，调出 `setShowSummaryModal(true)`，复用现有的大盘正确率、用时与各阶段对比明细展示。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #scope/ux #ai/instruct #task/domain/plan #task/object/plan-transition-and-exit-summary #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `PlanTrainingView.tsx` 实现静默切阶段与退出结算

修改 `src/views/PlanTrainingView.tsx`，移除阻断弹窗并实现退出结算拦截。

~~~~~act
write_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
import { FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
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
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);
  const [planSessionKey, setPlanSessionKey] = useState<number>(0);

  const validItems = (plan.items || []).filter((item) => Boolean(getCardById(item.cardId)));

  const currentStep = validItems[currentStepIndex];
  const currentCard = currentStep ? getCardById(currentStep.cardId) : null;

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
  }, [currentCard, currentStepIndex, planSessionKey]);

  // 总计时器
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal]);

  // 阶段完成：静默直接进入下一阶段或进入总结
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
        // 静默无缝进入下一个训练阶段
        setIsLevelLoaded(false);
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        // 全部阶段顺利完成，进入总结
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, stageResults, validItems.length],
  );

  // 跳过当前阶段
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

  // 拦截退出操作：若已有做答成果则展示结算总结
  const handleRequestExit = useCallback(() => {
    if (stageResults.length > 0) {
      setShowSummaryModal(true);
    } else {
      onExit();
    }
  }, [stageResults.length, onExit]);

  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
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

  const plugin = CARD_PLUGINS[currentCard.id];
  const cardConfig = getCardSettings(settings, currentCard.id);

  return (
    <div className="w-full">
      {/* 顶部流水线全局进度与操作栏 */}
      <div className="max-w-5xl mx-auto mb-4 bg-white border border-slate-200/80 px-4 sm:px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-xl">
            阶段 {currentStepIndex + 1} / {validItems.length}
          </span>
          <span className="text-xs font-bold text-slate-800 tracking-tight">{plan.name}</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-xs text-slate-400 font-mono font-semibold hidden sm:block">
            本阶段目标: <strong className="text-slate-700">{currentStep.targetTrials}</strong> 题
          </div>
          <button
            type="button"
            onClick={handleSkipCurrentStage}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="跳过当前阶段进入下一阶段"
          >
            <FastForward className="w-3.5 h-3.5 text-indigo-500" />
            跳过此阶段
          </button>
        </div>
      </div>

      {!isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          正在加载【{currentCard.title}】的生涯能力层阶...
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
~~~~~

### 下一步建议
- **实测验证**：
  1. 开启一个包含多个阶段的训练流（如“晨间热身 50 题”），完成第 1 阶段最后一题后，确认是否直接静默无缝切换进入第 2 阶段，无需额外按空格或点击。
  2. 在第 2 阶段中途按下 `Esc` 或点击“退出训练”，验证是否会正常弹出总阶段总结卡片（`PlanSummaryModal`），展示第 1 阶段与当前战果。
