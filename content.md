好的，我将生成修复该问题的执行计划，为 `PlanTrainingView` 增加 `planSessionKey` 轮次状态，彻底解决在单阶段或索引未变化时重新训练引起的加载状态死锁。

## [WIP] fix(plan): 修复再练一遍训练计划时卡在加载生涯等级的问题

### 错误分析

在 `PlanTrainingView` 中，用户完成训练流并在总结弹窗点击“再练一遍此计划”时，会调用 `handleRestartPlan`：
1. `handleRestartPlan` 将 `isLevelLoaded` 置为 `false`，并将 `currentStepIndex` 重置为 `0`。
2. 当训练计划只有一个阶段（或重置前索引即为 0）时，`currentStepIndex` 和 `currentCard` 并没有发生值或引用的变化。
3. 导致以 `[currentCard, currentStepIndex]` 为依赖项的 `useEffect` 不会被触发，`getProfile` 无法执行，`isLevelLoaded` 永远停留在 `false`，从而导致界面永久阻塞在“正在加载【...】的生涯能力层阶...”提示。

### 用户需求

修复在训练计划完成并点击“再练一遍此计划”时出现的无限加载状态死锁，确保能平滑无缝重新开始训练流。

### 评论

这是一个典型的 React/Preact 依赖状态未变更引起的异步加载死锁问题。通过显式引入轮次版本号（`planSessionKey`），可以优雅且确定性地解耦“阶段索引”与“全新开始”的生命周期触发。

### 目标

1. 在 `PlanTrainingView` 中引入 `planSessionKey` 轮次计数器。
2. 将 `planSessionKey` 纳入等级拉取 `useEffect` 的依赖数组。
3. 在 `handleRestartPlan` 中递增 `planSessionKey`，确保每次重新开始均能重新拉取等级并置 `isLevelLoaded` 为 `true`。
4. 将 `planSessionKey` 同步注入至 `GenericTrainingView` 的 `key` 中，确保实例状态干净重置。

### 基本原理

通过为训练流每一次的重新开始赋予唯一的版本序列号，打破对 `currentStepIndex` 变化的单一依赖，确保无论当前阶段索引为何值，重新开始都可以确定性触发 `useEffect` 生命周期。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/ui #task/object/plan-training-view #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 更新 `PlanTrainingView.tsx`

修改 `src/views/PlanTrainingView.tsx`，引入 `planSessionKey` 并修复生命周期依赖。

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);
  const [planSessionKey, setPlanSessionKey] = useState<number>(0);

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
  }, [currentCard, currentStepIndex, planSessionKey]);
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
    setShowSummaryModal(false);
    setIsTransitioning(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
  }, []);
~~~~~
~~~~~typescript.new
  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
    setShowSummaryModal(false);
    setIsTransitioning(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
    setPlanSessionKey((prev) => prev + 1);
  }, []);
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
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
          onExit={onExit}
        />
      )}
~~~~~

### 下一步建议

1. 执行 `npm run test` 或 `npm run dev` 验证训练流重新开始的功能是否工作正常。
2. 验证完成单阶段计划与多阶段计划后，点击“再练一遍此计划”均能瞬时进入第一阶段题目。
