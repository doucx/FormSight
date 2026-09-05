好的，我已经定位到了该问题。在 `PlanTrainingView` 中跳过当前阶段时，生成的阶段记录中的 `history` 为空数组，而 `PlanSummaryModal` 在计算层阶时因缺少该阶段真实的初始能力层阶，直接硬编码回退为了 `Lvl 5`。

我将生成一个修复计划，为 `PlanStageResult` 补充 `initialLevel` 字段，并在跳过阶段时带上真实的阶段层阶以及当前可能已作答的试炼记录。

## [WIP] fix: 修复训练计划模式下跳过阶段导致总结页层阶显示为 Lvl 5 的问题

### 错误分析

在计划训练模式 (`PlanTrainingView`) 中，当用户点击跳过按钮 (`FastForward`) 跳过某一训练阶段时：
1. `handleSkipCurrentStage` 构造的 `PlanStageResult` 仅传入了空的历史数组 `history: []`，未记录当前阶段加载到的真实用户能力层阶 `stageInitialLevel`。
2. `TrainingShell` 在触发 `planContext.onSkipStage` 时未将当前阶段可能已产生的 `sessionHistory` 回传。
3. `PlanSummaryModal` 在统计各阶段首尾层阶及最高峰值层阶时，遇到 `stage.history.length === 0` 时硬编码兜底为 `5` (`if (s.history.length === 0) return 5;` 与 `const startLvl = ... : 5;`)，导致跳过阶段在总结页的阶段明细中始终显示为 `L5 -> L5`，而非用户的真实能力层阶。

### 用户需求

在训练计划模式中跳过当前阶段后，在最终的“今日训练流总结”弹窗中，该阶段明细应正确显示当前卡片的真实能力层阶，而不是默认显示为 Lvl 5。

### 评论

这是一个影响用户认知反馈准确性的关键细节缺陷。修复后，无论用户是直接跳过阶段还是做了一半试炼后跳过，总结弹窗都能准确反映该训练卡片的真实能力阶梯，保持生涯层阶展示的一致性。

### 目标

1. 在 `PlanStageResult` 接口中增加 `initialLevel?: number` 字段。
2. 在 `PlanSummaryModal` 中，当阶段 `history` 为空时，优先读取 `stage.initialLevel` 作为起始与结束层阶，彻底消除硬编码的默认值 5。
3. 在 `TrainingShell` 中允许 `onSkipStage` 回传当前已答的 `sessionHistory`，避免部分已作答数据在跳过时丢失。
4. 在 `PlanTrainingView` 中，于阶段结算、跳过阶段以及提前退出时均传入 `stageInitialLevel`。

### 基本原理

通过在数据契约层 `PlanStageResult` 显式承载该卡片阶段开始时的实际能力层阶 `initialLevel`，即使 `history` 数组为空（阶段被跳过未答题），展示层也能获取到真实的卡片层阶；同时让跳过动作支持保留阶段内已作答的数据，进一步保证了统计数据的完整性。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/history #scope/ux #ai/instruct #task/domain/ui #task/object/plan-summary #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 更新 `PlanSummaryModal` 的阶段结果接口与层阶解析逻辑

在 `PlanStageResult` 中增加 `initialLevel` 字段，并在计算峰值层阶与渲染卡片层阶时优先回退至 `initialLevel`。

~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~typescript
export interface PlanStageResult {
  card: CardDefinition;
  targetTrials: number;
  history: SessionHistoryItem[];
}
~~~~~
~~~~~typescript
export interface PlanStageResult {
  card: CardDefinition;
  targetTrials: number;
  history: SessionHistoryItem[];
  initialLevel?: number;
}
~~~~~

~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~typescript
  // 统计各阶段的最终层阶与峰值
  const endLevels = stageResults.map((s) => {
    if (s.history.length === 0) return 5;
    return s.history[s.history.length - 1].levelAfter;
  });
  const peakLevelAchieved = endLevels.length > 0 ? Math.max(...endLevels) : 5;
~~~~~
~~~~~typescript
  // 统计各阶段的最终层阶与峰值
  const endLevels = stageResults.map((s) => {
    if (s.history.length === 0) return s.initialLevel ?? 5;
    return s.history[s.history.length - 1].levelAfter;
  });
  const peakLevelAchieved = endLevels.length > 0 ? Math.max(...endLevels) : 5;
~~~~~

~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~typescript
            {stageResults.map((stage, idx) => {
              const startLvl = stage.history.length > 0 ? stage.history[0].levelBefore : 5;
              const endLvl =
                stage.history.length > 0
                  ? stage.history[stage.history.length - 1].levelAfter
                  : startLvl;
              const Icon = stage.card.icon;
~~~~~
~~~~~typescript
            {stageResults.map((stage, idx) => {
              const fallbackLvl = stage.initialLevel ?? 5;
              const startLvl = stage.history.length > 0 ? stage.history[0].levelBefore : fallbackLvl;
              const endLvl =
                stage.history.length > 0
                  ? stage.history[stage.history.length - 1].levelAfter
                  : fallbackLvl;
              const Icon = stage.card.icon;
~~~~~

#### Acts 2: 更新 `TrainingShell` 中的跳过回调类型与传参

使 `planContext.onSkipStage` 支持回传阶段内可能已经产生的 `sessionHistory`。

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
export interface PlanTrainingContext {
  planName: string;
  currentStage: number;
  totalStages: number;
  targetTrials: number;
  onSkipStage: () => void;
}
~~~~~
~~~~~typescript
export interface PlanTrainingContext {
  planName: string;
  currentStage: number;
  totalStages: number;
  targetTrials: number;
  onSkipStage: (history?: SessionHistoryItem[]) => void;
}
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
          {planContext && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={planContext.onSkipStage}
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title={t('plan.skipStage')}
            >
              <FastForward className="w-3.5 h-3.5" />
            </Button>
          )}
~~~~~
~~~~~typescript
          {planContext && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => planContext.onSkipStage(sessionHistory)}
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title={t('plan.skipStage')}
            >
              <FastForward className="w-3.5 h-3.5" />
            </Button>
          )}
~~~~~

#### Acts 3: 更新 `PlanTrainingView` 中的阶段状态记录

在 `handleStageReached`、`handleSkipCurrentStage` 以及 `handleEarlyExit` 中填充 `initialLevel: stageInitialLevel`。

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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
~~~~~

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
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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
~~~~~

### 下一步建议

1. 执行计划并验证：进入任一带有较高难度层阶卡片的训练流（例如某一卡片已达到 L15），点击右上角跳过，核验最终阶段总结弹窗中的层阶是否正确显示为 `L15 -> L15`。
2. 验证做答部分题目后跳过：在某阶段答对 2 题后点击跳过，确认弹窗中正确保留 2 题记录及晋级后的层阶变化。
3. 验证无误后，由用户决定是否生成 `[COMMIT]` 提交。
