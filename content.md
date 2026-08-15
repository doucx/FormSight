好的！我将修复按 `Space` 键无法自动提交综合拾色（ALL）结果的问题。

刚才失效的根源在于父组件尝试使用不合法的 CSS DOM 选择器 `button[onClick]` 查找提交按钮。我们将重构键盘响应架构：由 `ColorCanvas` 组件内部直接处理 `!showAnswer` 阶段按 `Space` 提交当前 `[userH, userS, userV]` 的逻辑，由 `ColorTrainingView` 负责在 `showAnswer` 揭晓后响应 `Space` 切题，实现两阶段元子化响应。

下面为您生成实施计划：

## [WIP] fix(color): 修复综合拾色模式下按 Space 无法自动提交的问题

### 错误分析
原 `ColorTrainingView.tsx` 中的键盘监听代码使用 `document.querySelector('button[onClick]')` 试图获取提交按钮。由于 Preact/React 的 JSX 事件绑定不会在真实 DOM 节点上生成小写 `onClick` HTML 属性，导致 `querySelector` 永远返回 `null`，点击 `Space` 无法触发任何提交行为。

### 用户需求
在综合拾色（ALL）模式下：
1. 未提交答案前（`!showAnswer`），按 `Space` 键能直接触发提交当前调制的 H/S/V 组合。
2. 提交答案公布结果后（`showAnswer`），按 `Space` 键能顺畅切到下一题。

### 评论
使用状态驱动的监听机制替代脆弱的 DOM 查询，是现代前端组件化开发的标准规范，彻底解决了键盘交互失灵的问题。

### 目标
1. 在 `src/components/ColorCanvas.tsx` 中添加全屏键盘监听：在 `mode === 'ALL'` 且未揭晓答案时，按下 `Space` 直接调用 `onAnswer([userH, userS, userV])`。
2. 在 `src/views/ColorTrainingView.tsx` 中清理 DOM querySelector，仅保留揭晓答案后的切题与退出响应。

### 基本原理
通过将 Space 键的逻辑在两个组件中按生命周期分工（未作答在 `ColorCanvas` 处理，已作答在 `ColorTrainingView` 处理），避免依赖具体的 DOM 选择器，确保在任意 DOM 结构变更下 Space 快捷键 100% 可用。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/all-mode-space-shortcut #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 在 ColorCanvas 中添加 ALL 模式 Space 按键直接提交响应

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

  // 键盘快捷键响应 (ALL 模式下 Space 显式提交)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && mode === 'ALL' && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showAnswer, disabled, userH, userS, userV, onAnswer]);
~~~~~

#### Acts 2: 整理 ColorTrainingView 中的全局键盘响应

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript.old
  // 键盘响应 (Space 双阶段支持)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!showAnswer && mode === 'ALL') {
          // 第一阶段：ALL 模式下触发显式提交按钮事件
          const submitBtn = document.querySelector('button[onClick]') as HTMLButtonElement | null;
          submitBtn?.click();
        } else if (showAnswer && !isFinished) {
          // 第二阶段：切题
          handleNextQuestion();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleFinishSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished, mode]);
~~~~~
~~~~~typescript.new
  // 键盘响应 (Space 揭晓答案后切题 / Esc 退出)
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

### 下一步建议
- **代码校验与打包验证**: 运行 `npm run check` 及 `npm run build` 确保所有修复通过测试。
