这是一个非常敏锐的发现。

问题的原因在于：在通用训练会话 Hook（`useTrainingSession`）与外壳（`TrainingShell`）的设计中，点击返回按钮或按下 Esc 键时，默认触发的是当前单卡片会话的 `handleRequestFinish`。如果当前卡片已有作答记录（`sessionHistory.length > 0`），系统会先触发该单卡片的 `setShowSummaryModal(true)` 弹出“训练总结与成果”弹窗。用户必须再次点击退出，才能被 `PlanTrainingView` 捕获并打开“今日训练流总结”；若当前卡片只练了一半且是第一阶段，甚至会导致整个阶段结果丢失直接退出。

我们将通过为计划训练模式注入专用的提前退出通道（`onEarlyExit`），彻底绕过单卡片结算弹窗，并将当前卡片已完成的阶段答题成果直接汇总进“今日训练流总结”。

## [WIP] fix: 修复计划训练中点击返回错误弹出单卡片总结的问题

### 错误分析

1. **退出流冲突**: `TrainingShell` 的返回按钮以及键盘 `Esc` 监听绑定的是 `session.handleRequestFinish`。在单卡片训练时，该函数用于在答题中途展示本卡片的 `SessionSummaryModal`（训练总结与成果）。
2. **计划上下文被拦截**: 在计划模式（`PlanTrainingView`）下，由于 `useTrainingSession` 没有感知“计划流提前退出”的直接回调通道，导致它仍优先将内部状态置为 `showSummaryModal: true`，从而在显示“今日训练流总结”之前，多弹出了单卡片结算弹窗。
3. **数据截断风险**: 在弹出单卡片弹窗后如果用户直接点击返回，如果当前卡片处于第一阶段（`stageResults.length === 0`），还会导致当前卡片已作答的试炼无法合入计划总结。

### 用户需求

在训练流模式下点击返回按钮或按下 Esc 退出时，直接呼出“今日训练流总结”（多卡片），彻底绕过单卡片的“训练总结与成果”，并保证当前卡片已作答的数据安全并入最终总结。

### 评论

该修复理顺了单卡片独立训练与多卡片连续计划训练在结课路由和用户心流上的边界，消除了层叠弹窗的困扰，显著提升了计划训练流程的顺畅度。

### 目标

1. 在 `useTrainingSession` 中支持 `onEarlyExit` 回调，在存在该回调时优先将当前试炼保存并传递给外层，跳过本卡片 `SessionSummaryModal`。
2. 在 `GenericTrainingView` 中透传 `onEarlyExit`。
3. 在 `TrainingShell` 中增加对 `planContext` 的互斥判断，确保计划模式下绝对不渲染单卡片 `SessionSummaryModal`。
4. 在 `PlanTrainingView` 中实现 `handleEarlyExit`，汇总当前卡片已练习的题目并直接呈现多阶段的 `PlanSummaryModal`（今日训练流总结）。

### 基本原理

通过依赖倒置将退出决策权交回给上层编排器 `PlanTrainingView`。当处于训练流中时，子卡片不再独自承担结课总结的呈现职责，而是将当次答题记录安全打包回调给计划流管理器，实现单弹窗直达。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/plan-training-modal #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 扩展 `useTrainingSession` 支持直接提前退出计划模式

在 `useTrainingSession` 选项中引入 `onEarlyExit`，在处理退出请求时优先触发该回调。

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  idleTimeoutSec?: number;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  onIdleChange?: (isIdle: boolean) => void;
  onIdleResume?: (idleDurationMs: number) => void;
  generateQuestion: (level: number) => TQuestion;
~~~~~
~~~~~typescript
  idleTimeoutSec?: number;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  onEarlyExit?: (history: SessionHistoryItem[]) => void;
  onIdleChange?: (isIdle: boolean) => void;
  onIdleResume?: (idleDurationMs: number) => void;
  generateQuestion: (level: number) => TQuestion;
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  idleTimeoutSec: optionsIdleTimeout,
  targetLimitTrials,
  onTargetLimitReached,
  onIdleChange,
  onIdleResume,
  generateQuestion,
  evaluateAnswer,
  isHit,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
~~~~~
~~~~~typescript
  idleTimeoutSec: optionsIdleTimeout,
  targetLimitTrials,
  onTargetLimitReached,
  onEarlyExit,
  onIdleChange,
  onIdleResume,
  generateQuestion,
  evaluateAnswer,
  isHit,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  const handleRequestFinish = useCallback(async () => {
    if (targetLimitTrials && totalTrials >= targetLimitTrials && onTargetLimitReached) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onTargetLimitReached(sessionHistory);
      return;
    }
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  }, [
    targetLimitTrials,
    totalTrials,
    hitTrials,
    onTargetLimitReached,
    sessionHistory,
    showSummaryModal,
    saveCurrentSession,
    onExit,
  ]);
~~~~~
~~~~~typescript
  const handleRequestFinish = useCallback(async () => {
    if (targetLimitTrials && totalTrials >= targetLimitTrials && onTargetLimitReached) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onTargetLimitReached(sessionHistory);
      return;
    }
    if (onEarlyExit) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onEarlyExit(sessionHistory);
      return;
    }
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  }, [
    targetLimitTrials,
    totalTrials,
    hitTrials,
    onTargetLimitReached,
    onEarlyExit,
    sessionHistory,
    showSummaryModal,
    saveCurrentSession,
    onExit,
  ]);
~~~~~

#### Acts 2: 在 `GenericTrainingView` 中透传 `onEarlyExit`

允许 `PlanTrainingView` 将计划级退出回调传入底层会话。

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
  planContext?: PlanTrainingContext;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  onIdleChange?: (isIdle: boolean) => void;
  onIdleResume?: (idleDurationMs: number) => void;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
}
~~~~~
~~~~~typescript
  planContext?: PlanTrainingContext;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  onEarlyExit?: (history: SessionHistoryItem[]) => void;
  onIdleChange?: (isIdle: boolean) => void;
  onIdleResume?: (idleDurationMs: number) => void;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
  planContext,
  targetLimitTrials,
  onTargetLimitReached,
  onIdleChange,
  onIdleResume,
  showExitButton = true,
  showTimer = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
~~~~~
~~~~~typescript
  planContext,
  targetLimitTrials,
  onTargetLimitReached,
  onEarlyExit,
  onIdleChange,
  onIdleResume,
  showExitButton = true,
  showTimer = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    onIdleChange,
    onIdleResume,
    generateQuestion: (level) => engine.generateQuestion(level, settings),
~~~~~
~~~~~typescript
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    onEarlyExit,
    onIdleChange,
    onIdleResume,
    generateQuestion: (level) => engine.generateQuestion(level, settings),
~~~~~

#### Acts 3: 在 `TrainingShell` 中增加对 `planContext` 的互斥保护

防止在训练流上下文中意外渲染单卡片专属的 `SessionSummaryModal`。

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
      {/* 统一结课总结弹窗 (在训练计划流中禁用单卡片弹窗，由外层 PlanSummaryModal 统一承接) */}
      {showSummaryModal && !planContext && (
        <SessionSummaryModal
          card={card}
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
~~~~~

#### Acts 4: 在 `PlanTrainingView` 中实现 `handleEarlyExit` 并直达“今日训练流总结”

处理中途退出，若当前卡片已有作答记录，则一并沉淀入阶段明细并立即打开 `PlanSummaryModal`。

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
          planContext={planContext}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          onIdleChange={handleIdleChange}
          onIdleResume={handleIdleResume}
          showExitButton={true}
          showTimer={true}
          onExit={handleRequestExit}
        />
      )}
~~~~~
~~~~~typescript
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
~~~~~

### 下一步建议

1. **验证测试**:
   - 运行测试套件，确保修改没有引发类型错误或回归。
   - 在应用中进入“开始今日训练流”；
   - 在第一阶段练习 1~2 题后，点击左上角返回按钮或按键盘 `Esc` 键；
   - 验证是否直接呈现“今日训练流总结”（多卡片阶段汇总），且刚刚答过的 1~2 题已正确计入汇总成果；
   - 验证在单卡片独立训练（非计划模式）中，点击返回仍正常呼出单卡片的“训练总结与成果”。
2. **提交代码**: 验证无误后可进行 Git 提交保存。
