问题的根源在于 `useTrainingSession` hook 中的键盘事件监听逻辑。当在训练过程中按下 `Escape` 键时，原先直接调用了 `handleFinishSession()`（直接保存 session 并退出回到主视图），从而绕过了结算弹窗的判断逻辑。而顶部导航栏的“退出训练 (Esc)”按钮绑定的则是 `handleRequestFinish()`，它会在存在答题记录（`sessionHistory.length > 0`）且结算弹窗未展示时优先弹出 `SessionSummaryModal` 总结弹窗。

我将更新 `useTrainingSession.ts` 中 `Escape` 按键事件的处理函数，使其与“退出训练”按钮调用相同的 `handleRequestFinish()` 逻辑，并补充相关依赖。

## [WIP] fix: 修复按 Esc 键退出训练时不弹出结算窗口的问题

### 错误分析

在 `src/hooks/useTrainingSession.ts` 中，快捷键监听函数 `handleKeyDown` 在捕获到 `e.code === 'Escape'` 时，直接触发了 `handleFinishSession()`，跳过了结算弹窗的显示判定，直接执行 `onExit()` 退出到 Dashboard 看板。
而页面顶部的 UI 按钮“退出训练 (Esc)”调用的则是 `handleRequestFinish()`。该函数会检查：
1. 若已有答题记录且弹窗尚未显示（`sessionHistory.length > 0 && !showSummaryModal`），先保存进度并展示 `SessionSummaryModal` 结算弹窗；
2. 若无答题记录或结算弹窗已显示，则直接退出回到 Dashboard。

因此，键盘按 Esc 与点击“退出训练”按钮的行为不一致，造成快捷键退出时无法看到本次训练成果的总结弹窗。

### 用户需求

按下 Esc 键退出的行为应与点击 UI 界面上的“退出训练 (Esc)”按钮完全一致：
- 在有答题记录时按下 Esc 键，弹出训练结算与成果总结窗口；
- 再次按下 Esc 键或在无答题记录时按下，退出训练回到 Dashboard。

### 评论

这是一个涉及训练流畅度与 UI/快捷键交互一致性的重要细节修复。统一键盘快捷键与 UI 按钮的交互逻辑符合用户直觉。

### 目标

1. 修改 `useTrainingSession.ts` 中的 `handleKeyDown`，将 `Escape` 键的处理改为调用 `handleRequestFinish()`。
2. 补充 `useEffect` 的依赖数组，确保闭包中引用的 `sessionHistory` 和 `showSummaryModal` 状态始终保持最新。

### 基本原理

通过将按键事件和按钮点击事件绑定至同一个 `handleRequestFinish` 处理器，消除键盘快捷键与点击按钮之间的行为分歧。

### 标签

#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/training-session-esc-handler #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修改 useTrainingSession Hook 中的 Esc 键响应逻辑

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  // 快捷键响应 (Space / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (showAnswer && !isFinished) {
          e.preventDefault();
          handleNextQuestion();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleFinishSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished]);
~~~~~
~~~~~typescript
  // 快捷键响应 (Space / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (showAnswer && !isFinished) {
          e.preventDefault();
          handleNextQuestion();
        }
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        handleRequestFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showAnswer,
    isFinished,
    sessionHistory,
    showSummaryModal,
    totalTrials,
    hitTrials,
    handleNextQuestion,
    handleRequestFinish,
  ]);
~~~~~

### 下一步建议

- 可以在三个练习模块（寻星练习、绝对色感、相对色感）中进入训练，作答几道题后按下键盘上的 `Esc` 键，验证是否能正常触发结算总结弹窗。
- 在结算弹窗出现后再次按 `Esc` 键，验证是否能顺利返回主界面/看板。
