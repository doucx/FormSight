当你运行 `npm run check`（即 `biome check --write .`）时，Biome 发现了 4 处需要修复的代码规范/可访问性/依赖警告。

下面为你生成一个用于修复这 4 处 Biome 检查错误的 Quipu 计划：

## [WIP] refactor(stats): 修复 Biome 检查中发现的 4 处代码规范与依赖警告

### 用户需求
修复在 `GlobalStatsModal.tsx` 中被 Biome 检查出的 4 处警告/错误，以满足项目的静态检查要求：
1. 将两处 `forEach` 替换为更推荐的 `for...of` 循环。
2. 为模态框外层的可点击 `div` 补充键盘交互事件（`onKeyDown`）。
3. 修正 `useEffect` 中不必要的依赖项（`dailyData` 和 `filteredRecords`）。

### 评论
这是一个保持代码库健康、通过严格 CI 静态检查的重构小任务。

### 目标
1. 修改 `src/components/GlobalStatsModal.tsx`。
2. 消除 `npm run check` 的所有报错，确保编译与代码风格完美符合 Biome 规范。

### 基本原理
- 将数组的 `.forEach(...)` 改写为标准的 `for (const l of [...])`，可以避免潜在的性能问题。
- 为带有 `onClick` 的非交互角色元素补充 `onKeyDown` 键盘监听，以符合可访问性（a11y）规范。
- 移除 `useEffect` 中多余的依赖项，提高 React/Preact 钩子的渲染纯净度。

### 标签
#intent/refine #flow/ready #priority/medium #comp/tests #concept/config #scope/dx #ai/instruct #task/domain/testing #task/object/biome-lint #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 使用 patch_file 修复 GlobalStatsModal.tsx 中的 Biome 警告

我们将精确修补 `src/components/GlobalStatsModal.tsx` 中的 4 处代码。

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    [minLevel, Math.round(maxLevel / 2), maxLevel].forEach((l) => {
      const y = getY(l);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
    });
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.moveTo(getX(0), getY(levels[0]));
    for (let i = 1; i < levels.length; i++) {
      ctx.lineTo(getX(i), getY(levels[i]));
    }
    ctx.stroke();

    for (let i = 0; i < levels.length; i++) {
      ctx.beginPath();
      ctx.arc(getX(i), getY(levels[i]), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [minLevel, maxLevel].forEach((l) => {
      ctx.fillText(`L${l}`, padding.left - 5, getY(l));
    });
    ctx.textAlign = 'center';
    ctx.fillText('最近活跃日演进趋势 ➔', width / 2, height - 5);
  }, [loading, dailyData, filteredRecords]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
~~~~~
~~~~~typescript.new
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const l of [minLevel, Math.round(maxLevel / 2), maxLevel]) {
      const y = getY(l);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.moveTo(getX(0), getY(levels[0]));
    for (let i = 1; i < levels.length; i++) {
      ctx.lineTo(getX(i), getY(levels[i]));
    }
    ctx.stroke();

    for (let i = 0; i < levels.length; i++) {
      ctx.beginPath();
      ctx.arc(getX(i), getY(levels[i]), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const l of [minLevel, maxLevel]) {
      ctx.fillText(`L${l}`, padding.left - 5, getY(l));
    }
    ctx.textAlign = 'center';
    ctx.fillText('最近活跃日演进趋势 ➔', width / 2, height - 5);
  }, [loading]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
~~~~~

### 下一步建议
运行 `npm run check` 验证所有 Biome 规则是否已全部通过。
