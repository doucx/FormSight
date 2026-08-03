## [WIP] feat(training): 实现点击作答后 300ms 自动切题体验

### 错误分析

无。本阶段为新功能实现。

### 用户需求

用户希望在用户点击右图答题、产生结算反馈后，系统能够 **自动在 300ms 后切换到下一张图**，从而提升连续训练的流畅度。

### 评论

原有的逻辑是点击后暂停，等待用户点击“下一题 (Space)”或按空格键切换。自动延时 300ms 切题可以大幅度减少高频练习时的机械等待动作，提高训练沉浸感和效率。需要注意的是，在自动切题的同时，仍需保留用户观察结果（300ms 延迟足以看清击中与否），并且如果正在进行基准测试且已满 20 题，则应顺利完成测试。

### 目标

1. 在 `TrainingView.tsx` 中修改 `handleAnswer` 的逻辑：当用户点击作答完毕后，若未达基准测试上限，通过 `setTimeout` 延迟 300ms 自动触发 `handleNextQuestion`。
2. 保持对空格键及倒计时/总题数逻辑的正确兼容。

### 基本原理

利用 JavaScript 的 `setTimeout` 配合 React/Preact 的 `useState` 状态。在答题结算触发 `setShowAnswer(true)` 且完成数据库记录后，设置一个 300ms 的定时器自动调用切题函数。

### 标签

#intent/build #flow/ready #priority/medium #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/auto-advance-timer #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在 `TrainingView.tsx` 中实现点击后 300ms 自动切题

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~tsx
    // 3. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
    }
  };

  // === 切题 ===
  const handleNextQuestion = () => {
    if (isFinished) return;

    const nextStep = adaptiveEngineRef.current.getCurrentStep();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextStep));
    setQuestionStartTime(Date.now());
  };
~~~~~
~~~~~tsx
    // 3. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
    } else {
      // 300ms 后自动进入下一张图
      setTimeout(() => {
        const nextStep = adaptiveEngineRef.current.getCurrentStep();
        setShowAnswer(false);
        setUserAnswer(null);
        setQuestion(generateQuestion(mode, nextStep));
        setQuestionStartTime(Date.now());
      }, 300);
    }
  };

  // === 切题 ===
  const handleNextQuestion = () => {
    if (isFinished) return;

    const nextStep = adaptiveEngineRef.current.getCurrentStep();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextStep));
    setQuestionStartTime(Date.now());
  };
~~~~~

### 下一步建议

- 建议在本地开发环境中运行 `npm run dev` 验证点击答题后是否在 0.3 秒内平滑切入下一道寻星题。
