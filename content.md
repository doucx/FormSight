在综合拾色（ALL 模式）下，提交答案后导致网页卡死的根本原因是 **`useTrackPointer` 与 `ColorCanvas` 之间形成了无限级联重新渲染死循环（Infinite Re-render Loop）**。

我已为你精确定位了原因并准备了修复计划。

## [WIP] fix: 修复综合拾色提交答案后无限重渲染导致的页面卡死问题

### 错误分析

1. **死循环诱发链路**：
   - 当用户在综合拾色（ALL 模式）提交答案时，`showAnswer` 状态从 `false` 变为 `true`。
   - `HsvTrackSlider` 接收到 `showAnswer=true` 后，将 `disabled = disabled || showAnswer`（即 `true`）传入 `useTrackPointer` Hook。
   - `useTrackPointer` 内的 `useEffect` 监听了 `[disabled, isDragging, onDraggingStateChange, onHoverStateChange]`。当 `disabled === true` 时，该 Hook **无条件执行**了 `onHoverStateChange?.(null)`。
2. **状态级联与引用失效**：
   - 在 `ColorCanvas.tsx` 中，`onHoverStateChange` 是直接在 JSX 中以内联箭头函数 `(hVal) => setAllHoverVals(...)` 的形式传入的。
   - `onHoverStateChange(null)` 触发了 `ColorCanvas` 的 `setAllHoverVals`，导致父组件 `ColorCanvas` 重新渲染。
   - `ColorCanvas` 重新渲染生成了**全新的匿名函数引用**并下发给 `useTrackPointer`。
3. **死锁发生**：
   - `useTrackPointer` 的 `useEffect` 检测到依赖项 `onHoverStateChange` 引用变化，且 `disabled` 依然为 `true`，再次无条件调用 `onHoverStateChange(null)`。
   - 这导致了同步的无限重渲染死循环，在瞬间耗尽微任务队列并彻底冻结 JavaScript 主线程。

### 用户需求

修复综合拾色模式提交答案时网页卡死的问题，确保答案揭晓、反馈展示与自动/手动切题流程平滑执行。

### 评论

这是一个典型的 React/Preact Hooks 闭包与内联回调联动导致的级联重渲染 Bug。解决该问题需要进行双重防御：一是修正 `useTrackPointer` 的重置条件（仅在 `hoverVal !== null` 或 `isDragging` 时清理），二是稳定 `ColorCanvas` 传递的回调函数引用并在状态无变化时跳过更新。

### 目标

1. 修复 `useTrackPointer.ts`：在 `disabled === true` 时仅在状态确实非空时清理 `hoverVal` 并通知回调，防止空状态下重复触发回调。
2. 优化 `ColorCanvas.tsx`：使用 `useCallback` 稳定各轨道的悬停与拖拽回调函数引用，并在值未变更时避免创建新状态对象。

### 基本原理

通过为 `useTrackPointer` 的 `disabled` 重置逻辑增加守护条件（Guard Clauses），截断状态已为 `null` 时的多余通知；同时通过 `useCallback` 与浅比较避免回调函数在父组件渲染时的引用突变，从根本上杜绝死循环链路。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #scope/core #ai/instruct #task/domain/ui #task/object/color-canvas #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `useTrackPointer.ts` 中的守护条件

在 `disabled` 为 `true` 时，只有当 `hoverVal` 不为 `null` 或 `isDragging` 为 `true` 时才执行清理与通知，避免无意义的重复通知。

~~~~~act
patch_file
src/hooks/useTrackPointer.ts
~~~~~
~~~~~typescript.old
  // 当 disabled 切换时重置拖拽状态与悬停指示
  useEffect(() => {
    if (disabled) {
      if (isDragging) {
        setIsDragging(false);
        onDraggingStateChange?.(false);
      }
      setHoverVal(null);
      onHoverStateChange?.(null);
    }
  }, [disabled, isDragging, onDraggingStateChange, onHoverStateChange]);
~~~~~
~~~~~typescript.new
  // 当 disabled 切换时重置拖拽状态与悬停指示 (增加守护条件防止空状态无限循环触发)
  useEffect(() => {
    if (disabled) {
      if (isDragging) {
        setIsDragging(false);
        onDraggingStateChange?.(false);
      }
      if (hoverVal !== null) {
        setHoverVal(null);
        onHoverStateChange?.(null);
      }
    }
  }, [disabled, isDragging, hoverVal, onDraggingStateChange, onHoverStateChange]);
~~~~~

#### Acts 2: 优化 `ColorCanvas.tsx` 中的回调函数引用与状态更新

使用 `useCallback` 稳定 H/S/V 轨道的悬停与拖拽回调函数，避免父组件重新渲染时传递不稳定的内联函数。

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
import { useEffect, useState } from 'preact/hooks';
import { type ColorHitResult, type ColorQuestionData, hsvToHex } from '../utils/colorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useState } from 'preact/hooks';
import { type ColorHitResult, type ColorQuestionData, hsvToHex } from '../utils/colorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
  // ALL 模式下悬停与拖拽状态 (控制右侧色块预览)
  const [allHoverVals, setAllHoverVals] = useState<Record<'H' | 'S' | 'V', number | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [draggingLabel, setDraggingLabel] = useState<'H' | 'S' | 'V' | null>(null);

  // 题目切换时重置 ALL 模式状态
  useEffect(() => {
    if (mode === 'ALL') {
      setUserH(180);
      setUserS(50);
      setUserV(50);
      setAllHoverVals({ H: null, S: null, V: null });
      setDraggingLabel(null);
    }
  }, [mode]);

  const handleSubmitAll = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };
~~~~~
~~~~~typescript.new
  // ALL 模式下悬停与拖拽状态 (控制右侧色块预览)
  const [allHoverVals, setAllHoverVals] = useState<Record<'H' | 'S' | 'V', number | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [draggingLabel, setDraggingLabel] = useState<'H' | 'S' | 'V' | null>(null);

  const handleHoverH = useCallback(
    (hVal: number | null) =>
      setAllHoverVals((prev) => (prev.H === hVal ? prev : { ...prev, H: hVal })),
    [],
  );
  const handleHoverS = useCallback(
    (sVal: number | null) =>
      setAllHoverVals((prev) => (prev.S === sVal ? prev : { ...prev, S: sVal })),
    [],
  );
  const handleHoverV = useCallback(
    (vVal: number | null) =>
      setAllHoverVals((prev) => (prev.V === vVal ? prev : { ...prev, V: vVal })),
    [],
  );

  const handleDragH = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'H' : null), []);
  const handleDragS = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'S' : null), []);
  const handleDragV = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'V' : null), []);

  // 题目切换时重置 ALL 模式状态
  useEffect(() => {
    if (mode === 'ALL') {
      setUserH(180);
      setUserS(50);
      setUserV(50);
      setAllHoverVals({ H: null, S: null, V: null });
      setDraggingLabel(null);
    }
  }, [mode]);

  const handleSubmitAll = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={userAnswer?.userHSV?.[0] ?? userH}
              isHit={userAnswer?.isHit}
              onValChange={setUserH}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, H: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'H' : null)}
            />
            <HsvTrackSlider
              label="S"
              gradient={satGradient}
              val={userS}
              max={100}
              unit="%"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetS}
              userVal={userAnswer?.userHSV?.[1] ?? userS}
              isHit={userAnswer?.isHit}
              onValChange={setUserS}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, S: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'S' : null)}
            />
            <HsvTrackSlider
              label="V"
              gradient={valGradient}
              val={userV}
              max={100}
              unit="%"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetV}
              userVal={userAnswer?.userHSV?.[2] ?? userV}
              isHit={userAnswer?.isHit}
              onValChange={setUserV}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, V: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'V' : null)}
            />
~~~~~
~~~~~typescript.new
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={userAnswer?.userHSV?.[0] ?? userH}
              isHit={userAnswer?.isHit}
              onValChange={setUserH}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={handleHoverH}
              onDraggingStateChange={handleDragH}
            />
            <HsvTrackSlider
              label="S"
              gradient={satGradient}
              val={userS}
              max={100}
              unit="%"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetS}
              userVal={userAnswer?.userHSV?.[1] ?? userS}
              isHit={userAnswer?.isHit}
              onValChange={setUserS}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={handleHoverS}
              onDraggingStateChange={handleDragS}
            />
            <HsvTrackSlider
              label="V"
              gradient={valGradient}
              val={userV}
              max={100}
              unit="%"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetV}
              userVal={userAnswer?.userHSV?.[2] ?? userV}
              isHit={userAnswer?.isHit}
              onValChange={setUserV}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={handleHoverV}
              onDraggingStateChange={handleDragV}
            />
~~~~~

### 下一步建议

1. **综合拾色切题状态重置**：建议检查切题时（`question.id` 发生变动）是否需要重置 `userH, userS, userV` 到默认中心值或上一题位置，避免保留已作答状态。
2. **测试验证**：在综合拾色模式下分别进行手动按空格切题和开启 `autoNext` 自动切题的连续 5 题测试，确认提交与揭晓逻辑完全顺畅无卡顿。
