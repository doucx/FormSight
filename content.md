我们已经定位到了问题所在。原因是 `TrainingView.tsx` 中的计时器 `setInterval` 在回调执行时未对 `showSummaryModal`（结算弹窗是否打开）和 `isFinished`（是否已完成）状态进行检查，导致弹窗出现后定时器依然在后台运行并累加秒数。

以下是具体的修复计划：

## [WIP] fix: 修复会话结算弹窗弹出后训练时长继续递增的问题

### 错误分析
在会话结束或结算弹窗弹出的状态下，`TrainingView.tsx` 的 `setInterval` 定时器仍然持续触发，并且未拦截 `showSummaryModal` 或 `isFinished` 为 `true` 的情形。这导致即使用户已经停止答题并阅读总结，训练耗时 `elapsedSeconds` 依然在后台不断增加，造成时长统计失真。

### 用户需求
在结算弹窗（会话总结）弹出后，停止右上角训练时长的增加。

### 评论
计时器应当仅计算用户的有效答题与看题时长，会话结算弹窗展示期间属于训练完成阶段，耗时应被立刻冻结。

### 目标
在 `TrainingView.tsx` 的计时器循环中加入弹窗与完成状态判定。当 `showSummaryModal` 为 `true` 或 `isFinished` 为 `true` 时，直接跳过耗时累加。

### 基本原理
1. 在计时器的 `useEffect` 依赖项中添加 `showSummaryModal` 和 `isFinished`。
2. 在 `setInterval` 的回调函数顶部增加拦截条件 `if (showSummaryModal || isFinished) return;`，从而在弹窗出现后冻结 `accumulatedMsRef` 和 `elapsedSeconds` 的更新。

### 标签
#intent/fix #flow/ready #priority/medium #comp/ui #concept/executor #scope/ux #ai/instruct #task/domain/ui #task/object/training-timer #task/action/fix-timer-increment-on-modal #task/state/begin

---

### Script

#### Acts 1: 修改 `TrainingView.tsx` 中的计时器条件，在结算弹窗弹出时冻结计时

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
  // === 计时器 ===
  useEffect(() => {
    lastTickTimeRef.current = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;

      const idleLimitMs = (settings.idleTimeout ?? 60) * 1000;
      const isIdle = idleLimitMs > 0 && now - lastActivityTimeRef.current > idleLimitMs;

      if (!isIdle) {
        accumulatedMsRef.current += delta;
        setElapsedSeconds(Math.floor(accumulatedMsRef.current / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [settings.idleTimeout]);
~~~~~
~~~~~typescript.new
  // === 计时器 ===
  useEffect(() => {
    lastTickTimeRef.current = Date.now();
    const timer = setInterval(() => {
      // 弹窗弹出或会话完成时，冻结计时
      if (showSummaryModal || isFinished) return;

      const now = Date.now();
      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;

      const idleLimitMs = (settings.idleTimeout ?? 60) * 1000;
      const isIdle = idleLimitMs > 0 && now - lastActivityTimeRef.current > idleLimitMs;

      if (!isIdle) {
        accumulatedMsRef.current += delta;
        setElapsedSeconds(Math.floor(accumulatedMsRef.current / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [settings.idleTimeout, showSummaryModal, isFinished]);
~~~~~

### 下一步建议
- 重新测试练习流程，观察弹出结算弹窗后右上角的耗时数值是否固定不动。
- 点击“再练一轮”按钮，验证耗时是否成功重置并恢复正常递增。
