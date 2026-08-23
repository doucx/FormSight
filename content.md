这是一个很关键的状态同步问题。

`PlanTrainingView` 之前只使用了简单的 `setInterval` 结合 `Date.now() - sessionStartTime` 独立计算总用时，未能接收到子视图会话因失焦或长时间无操作进入的 `isIdle` 状态与 `idleDurationMs`，导致闲置期间总计时器依然持续累加。

我将通过在训练会话中引入闲置状态与恢复时长回调，把闲置推移同步至计划总计时器。

## [WIP] fix: 修复训练流闲置暂停时计划总用时继续计时的问题

### 错误分析
1. **状态孤岛**: 闲置与失焦保护机制（`useIdleProtection`）封装在各训练子会话（`useTrainingSession`）内部，当触发闲置时，子会话仅对自身的 `startTimeRef` 进行推移补偿，未向外层宿主（`GenericTrainingView` -> `PlanTrainingView`）派发事件。
2. **盲目计时**: `PlanTrainingView` 顶层的 `useEffect` 定时器仅判断了 `!showSummaryModal`，在用户离开页面或闲置休眠期间，依然使用 `Date.now() - sessionStartTime` 计算差值，将休眠等待时间计入了有效训练总用时。

### 用户需求
当训练流因为失焦、切后台或长时间无操作进入闲置暂停（`IdlePauseOverlay` 遮罩显示）时，顶栏的训练总用时应停止计时；在用户点击恢复或按键激活继续后，总计时器应从暂停点继续，且不计入闲置期间的时间。

### 评论
精准的活跃用时度量对训练感知能力的准确评估至关重要。训练计划通常跨越较长时间（数分钟至数十分钟），中途临时离开是非常自然的场景，修正闲置时间补偿能够保证生涯档案统计数据的纯粹性与真实性。

### 目标
1. 在 `useTrainingSession` 和 `GenericTrainingView` 中增加 `onIdleChange` 与 `onIdleResume` 回调接口。
2. 当 `useIdleProtection` 触发暂停与恢复时，向外派发闲置状态变更和闲置持续时间（毫秒）。
3. 在 `PlanTrainingView` 中监听闲置回调，在闲置期间冻结总用时递增，并在恢复时顺延 `sessionStartTime` 偏移量。

### 基本原理
当进入闲置状态时，`isPlanIdle` 标记置为 `true`，主计时器定时器停止更新；当用户重新唤醒时，`onResume(idleDurationMs)` 会传回在闲置期间流逝的精确毫秒数，通过 `setSessionStartTime((prev) => prev + idleDurationMs)` 将基准起始时间向后顺延等量时长，从而在绝对时间戳差值计算中完全剔除闲置休眠区间。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/core #scope/ux #ai/instruct #task/domain/timer #task/object/idle-protection-sync #task/action/fix #task/state/continue

---

### Script

#### Acts 1: 在 `useTrainingSession` 中支持闲置状态与恢复时长回调

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  generateQuestion: (level: number) => TQuestion;
~~~~~
~~~~~typescript
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
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
  generateQuestion,
~~~~~
~~~~~typescript
  idleTimeoutSec: optionsIdleTimeout,
  targetLimitTrials,
  onTargetLimitReached,
  onIdleChange,
  onIdleResume,
  generateQuestion,
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  // === 1. 闲置与失焦保护微 Hook ===
  const { isIdle, pauseToIdle, resumeFromIdle } = useIdleProtection({
    timeoutSec: effectiveIdleTimeout,
    disabled: isFinished || showSummaryModal,
    onResume: (idleDurationMs) => {
      startTimeRef.current += idleDurationMs;
      setQuestionStartTime((prev) => prev + idleDurationMs);
    },
  });
~~~~~
~~~~~typescript
  // === 1. 闲置与失焦保护微 Hook ===
  const { isIdle, pauseToIdle, resumeFromIdle } = useIdleProtection({
    timeoutSec: effectiveIdleTimeout,
    disabled: isFinished || showSummaryModal,
    onPause: () => {
      onIdleChange?.(true);
    },
    onResume: (idleDurationMs) => {
      startTimeRef.current += idleDurationMs;
      setQuestionStartTime((prev) => prev + idleDurationMs);
      onIdleChange?.(false);
      onIdleResume?.(idleDurationMs);
    },
  });
~~~~~

#### Acts 2: 在 `GenericTrainingView` 中透传闲置回调

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
}
~~~~~
~~~~~typescript
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
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
  globalSettings,
  targetLimitTrials,
  onTargetLimitReached,
  showExitButton = true,
  showTimer = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
~~~~~
~~~~~typescript
  globalSettings,
  targetLimitTrials,
  onTargetLimitReached,
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
    generateQuestion: (level) => plugin.generateQuestion(mode, level, settings),
~~~~~
~~~~~typescript
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    onIdleChange,
    onIdleResume,
    generateQuestion: (level) => plugin.generateQuestion(mode, level, settings),
~~~~~

#### Acts 3: 在 `PlanTrainingView` 中联动闲置状态与用时补偿

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);
  const [planSessionKey, setPlanSessionKey] = useState<number>(0);
~~~~~
~~~~~typescript
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);
  const [planSessionKey, setPlanSessionKey] = useState<number>(0);
  const [isPlanIdle, setIsPlanIdle] = useState<boolean>(false);
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal]);
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
    setShowSummaryModal(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
    setPlanSessionKey((prev) => prev + 1);
  }, []);
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
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
          showExitButton={false}
          showTimer={false}
          onExit={handleRequestExit}
        />
~~~~~
~~~~~typescript
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
          onIdleChange={handleIdleChange}
          onIdleResume={handleIdleResume}
          showExitButton={false}
          showTimer={false}
          onExit={handleRequestExit}
        />
~~~~~

### 下一步建议
1. 进入「今日训练流」中切到其他标签页或静置等待触发闲置保护（遮罩出现），观察顶栏计时器是否立即停止递增。
2. 点击「点击继续」恢复训练，验证总用时是否在暂停时的秒数基础上平滑继续递增，并未累加闲置等待的秒数。
