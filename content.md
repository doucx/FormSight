我已分析该问题：在 `src/views/PlanTrainingView.tsx` 中，`handleStageReached` 和 `handleEarlyExit` 两个 `useCallback` 的实现体内部均引用了 `stageInitialLevel`，但在其依赖项数组中遗漏了该状态，导致 Biome 静态代码检查工具报错。

我将生成一个计划修复这两个 Hook 的依赖项声明。

## [WIP] fix(lint): 修复 PlanTrainingView 中 useCallback 遗漏 stageInitialLevel 依赖项的问题

### 错误分析
1. **报错原因**：Biome 的 `lint/correctness/useExhaustiveDependencies` 规则检测到：
   - `handleStageReached` 在构建阶段结果 `stageRes` 时读取了 `stageInitialLevel`，但依赖项数组只有 `[currentCard, currentStep, currentStepIndex, stageResults, validItems.length]`。
   - `handleEarlyExit` 在构建 `currentRes` 时读取了 `stageInitialLevel`，但依赖项数组只有 `[currentCard, currentStep, stageResults, onExit]`。
2. **潜在风险**：当卡片层阶异步加载完成并更新 `stageInitialLevel` 时，由于缺少依赖项，旧的回调引用可能闭包捕获到陈旧的初始层阶（默认值 5），导致阶段总结报告中的初始等级数据不准确。

### 用户需求
消除 `src/views/PlanTrainingView.tsx` 中的两处 Biome linter 校验错误，确保代码库完全通过类型和依赖项静态检查。

### 评论
静态代码检查规则是保证 Preact/React Hook 正确捕获闭包状态的重要防线，补齐此依赖不仅能消解报错，还能避免闭包陈旧值引发的潜在逻辑缺陷。

### 目标
在 `handleStageReached` 和 `handleEarlyExit` 的 `useCallback` 依赖数组中完整追加 `stageInitialLevel`。

### 基本原理
将 `stageInitialLevel` 追加到对应的依赖项数组中，使 `handleStageReached` 和 `handleEarlyExit` 能够在卡片能力层阶加载或变更时及时重新生成闭包，符合响应式编程与静态检查标准。

### 标签
#intent/fix #flow/ready #priority/high
#comp/cli #concept/state #scope/core
#ai/refine
#task/domain/plans
#task/object/hook-dependencies
#task/action/bug-fix
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 补齐 `PlanTrainingView` 中两个回调 Hook 的依赖数组

在 `handleStageReached` 与 `handleEarlyExit` 的依赖项列表中补齐 `stageInitialLevel`。

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

      if (currentStepIndex + 1 < validItems.length) {
        setIsLevelLoaded(false);
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setShowSummaryModal(true);
      }
    },
    [
      currentCard,
      currentStep,
      currentStepIndex,
      stageResults,
      validItems.length,
      stageInitialLevel,
    ],
  );
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~old
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
~~~~~
~~~~~new
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
    [currentCard, currentStep, stageResults, stageInitialLevel, onExit],
  );
~~~~~

### 下一步建议
1. **再次运行检查**：在终端重新执行代码检查命令（如 `pnpm lint` 或 `npx @biomejs/biome check src`），验证 `PlanTrainingView.tsx` 是否已完全通过。
2. **创建提交**：确认所有静态检查通过且无任何剩余警告后，可创建 `[COMMIT]` 计划将本轮重构与优化统一提交至 Git。
