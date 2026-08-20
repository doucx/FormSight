根据对代码逻辑与组件生命周期的诊断，训练流在阶段切换时卡死在「正在加载生涯能力层阶...」的原因已明确：

1. **依赖项过窄导致的死锁**：`PlanTrainingView` 中拉取卡片生涯能力层阶的 `useEffect` 仅依赖了 `[currentCard]`。由于 `currentCard` 是单例对象引用，当训练流中包含相同训练模块或同一卡片时，切换阶段后 `currentCard` 引用未发生改变，导致 `useEffect` 完全不会重新触发，而 `handleStageReached` 提前调用的 `setIsLevelLoaded(false)` 将使界面永久卡死在 loading 占位骨架中。
2. **异步缺少异常容错兜底**：`getProfile` Promise 调用链缺少 `.catch` 兜底，若在极端网络或 IndexedDB 繁忙异常时发生 Reject，`setIsLevelLoaded(true)` 无法执行。

我将生成一个修复计划，优化依赖项并在异步失败时安全降级至默认难度，彻底杜绝死锁。

## [WIP] fix: 修复训练流阶段切换时能力层阶加载死锁问题

### 错误分析

在 `PlanTrainingView.tsx` 中，能力层阶拉取逻辑存在以下缺陷：
1. `useEffect` 依赖项仅为 `[currentCard]`，当阶段切换（`currentStepIndex` 自增）但相邻阶段为同一卡片（或 `currentCard` 引用不变）时，`useEffect` 不会重新执行。
2. 在 `handleStageReached` 和 `handleSkipCurrentStage` 中显式执行了 `setIsLevelLoaded(false)`，导致在上述情况下 `isLevelLoaded` 状态被置为 `false` 后永远无法被置回 `true`，界面陷入永久阻塞状态。
3. `getProfile` 异步调用缺少 `catch` 容错，未捕获的 Promise 异常也会导致 `isLevelLoaded` 状态悬挂。

### 用户需求

解决在多阶段训练流中，完成当前阶段后无缝切换至下一阶段时可能卡死在「正在加载生涯能力层阶」的问题，确保训练流在任何阶段切换与卡片编排下均能可靠推进。

### 评论

多阶段自适应训练流是系统的核心链路。确保阶段切换的生命周期健壮性与异步状态确定性，对于维持用户心流体验至关重要。

### 目标

1. 将 `PlanTrainingView.tsx` 中层阶加载 `useEffect` 依赖项扩展为 `[currentStepIndex, currentCard?.id, planSessionKey]`。
2. 在 `getProfile` 调用链中增加 `.catch` 与兜底容错，确保不论成功还是失败都能安全进入 `isLevelLoaded = true`。
3. 优化 `handleStageReached` 和 `handleSkipCurrentStage` 中的状态流转，避免冗余的状态竞争。

### 基本原理

通过将 `currentStepIndex`、`currentCard?.id` 以及会话重置标识 `planSessionKey` 共同作为 `useEffect` 依赖项，确保只要阶段发生位移，Preact 就必定触发新阶段的生涯层阶拉取。配合 Promise 的异常降级保护，保证 `isLevelLoaded` 在任何情况下都能在数十毫秒内顺利置为 `true`，激活下一阶段训练视图。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/core #scope/ux #ai/instruct #task/domain/training #task/object/plan-transition #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `PlanTrainingView.tsx` 的层阶加载生命周期与依赖项

我们将完善 `PlanTrainingView.tsx` 的 `useEffect` 依赖项与 Promise 错误兜底处理。

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
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
  }, [currentCard]);
~~~~~
~~~~~typescript.new
  useEffect(() => {
    let isMounted = true;
    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id)
        .then((p) => {
          if (!isMounted) return;
          setStageInitialLevel(p?.currentLevel || 5);
          setIsLevelLoaded(true);
        })
        .catch((err) => {
          console.error('Failed to load profile for card in plan:', err);
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
  }, [currentStepIndex, currentCard?.id, planSessionKey]);
~~~~~

### 下一步建议

- **功能验证**: 启动训练流并完成任意阶段，或点击「跳过此阶段」，验证是否能瞬时无缝切换到下一训练阶段。
- **阶段重复测试**: 在「定制日常训练流」中编排包含连续两个相同模块（例如连续两个「色相」）的测试训练流，确认能够正常切换并不再卡死。
