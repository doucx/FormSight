修复 `StandardNafcView.tsx` 中 `handleExplicitSubmit` 未使用 `useCallback` 包裹导致的 Biome Linter 依赖告警。

## [WIP] fix: 使用 useCallback 修复 StandardNafcView 的 Linter 依赖告警

### 用户需求
修复 Biome 检查报出的 `useExhaustiveDependencies` 错误：将 `StandardNafcView.tsx` 中的 `handleExplicitSubmit` 函数用 `useCallback` 包裹。

### 评论
Biome 静态检查严格要求 Hook 依赖项的纯洁性。为 `handleExplicitSubmit` 添加 `useCallback` 能够确保在 `useEffect` 中安全引用，满足代码规范。

### 目标
1. 修改 `src/components/common/StandardNafcView.tsx`，为 `handleExplicitSubmit` 补充 `useCallback`。
2. 重新运行校验。

### 基本原理
`useCallback` 可以缓存函数引用，避免每次渲染都生成新的函数实例，从而使 `useEffect` 的依赖数组稳定且符合 Biome 规则。

### 标签
#intent/fix #flow/ready #priority/high
#comp/components #scope/dx #scope/core
#ai/instruct
#task/domain/bug-fix
#task/object/linter-warning
#task/action/code-refinement
#task/state/end #task/status/completed

---

### Script

#### Acts 1: 修复 `StandardNafcView.tsx` 中的依赖告警

~~~~~act
patch_file
src/components/common/StandardNafcView.tsx
~~~~~
~~~~~typescript.old
  const handleSelectOption = (index: number, option: ChoiceNafcOption<T>) => {
    if (disabled || showAnswer) return;
    setInternalSelectedIdx(index);
    onSelectIndex?.(index, option);

    if (submitMode === 'immediate') {
      onAnswer(index, option);
    }
  };

  const handleExplicitSubmit = () => {
    if (disabled || showAnswer || !options.length) return;
    const targetIdx = activeIndex ?? 0;
    const targetOpt = options[targetIdx] ?? options[0];
    onAnswer(targetIdx, targetOpt);
  };

  // 支持键盘 Space 提交（在 button 模式下）
  useEffect(() => {
    if (submitMode !== 'button' || !enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (disabled || showAnswer) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleExplicitSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitMode, enableKeyboardShortcuts, disabled, showAnswer, handleExplicitSubmit]);
~~~~~
~~~~~typescript.new
  const handleSelectOption = useCallback((index: number, option: ChoiceNafcOption<T>) => {
    if (disabled || showAnswer) return;
    setInternalSelectedIdx(index);
    onSelectIndex?.(index, option);

    if (submitMode === 'immediate') {
      onAnswer(index, option);
    }
  }, [disabled, showAnswer, onSelectIndex, submitMode, onAnswer]);

  const handleExplicitSubmit = useCallback(() => {
    if (disabled || showAnswer || !options.length) return;
    const targetIdx = activeIndex ?? 0;
    const targetOpt = options[targetIdx] ?? options[0];
    onAnswer(targetIdx, targetOpt);
  }, [disabled, showAnswer, options, activeIndex, onAnswer]);

  // 支持键盘 Space 提交（在 button 模式下）
  useEffect(() => {
    if (submitMode !== 'button' || !enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (disabled || showAnswer) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleExplicitSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitMode, enableKeyboardShortcuts, disabled, showAnswer, handleExplicitSubmit]);
~~~~~

### 下一步建议
1. 运行 `npm run check` 确认 Linter 告警与 TypeScript 类型检查全部通过。
