我已检查并修复了 Biome Linter 报出的 `noForEach` 错误。现将 `points.forEach` 替换为更加推荐且高性能的 `for...of` 循环。

## [WIP] refactor(analytics): 将通用分析视图中的 forEach 替换为 for...of 循环

### 用户需求
修复 Biome 检查时发出的错误提示：`Prefer for...of instead of forEach`。

### 评论
使用标准的 `for...of` 循环遍历 `points` 数组不仅符合 Biome 的推荐代码规范，同时也避免了 `forEach` 的性能隐患。

### 目标
1. 将 `renderSpeedAccuracyVisualizer` 中的 `points.forEach` 替换为 `for (const p of points)`。
2. 将 `renderDifficultyPlateauVisualizer` 中的 `points.forEach` 替换为 `for (const { x, y, stat } of points)`。

### 基本原理
直接改写迭代语法，逻辑保持完全一致。

### 标签
#intent/refine #flow/ready #priority/low #comp/engine #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/analytics-charts #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 将数组遍历由 forEach 改为 for...of

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
  // 绘制数据节点与标签
  points.forEach((p) => {
    const { x, y, bin } = p;

    if (bin.total > 0) {
      const dotColor =
        bin.accuracy >= 80 ? '#10B981' : bin.accuracy >= 60 ? '#F59E0B' : '#F43F5E';

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 准确率标签
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${bin.accuracy}%`, x, y - 6);
    } else {
      ctx.beginPath();
      ctx.arc(x, padding.top + chartH, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#CBD5E1';
      ctx.fill();
    }

    // X 轴时间与题数标签
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(bin.rangeLabel, x, height - padding.bottom + 6);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(
      `${bin.total}${i18n.t('common.trialsUnit')}`,
      x,
      height - padding.bottom + 18,
    );
  });
}
~~~~~
~~~~~typescript.new
  // 绘制数据节点与标签
  for (const p of points) {
    const { x, y, bin } = p;

    if (bin.total > 0) {
      const dotColor =
        bin.accuracy >= 80 ? '#10B981' : bin.accuracy >= 60 ? '#F59E0B' : '#F43F5E';

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 准确率标签
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${bin.accuracy}%`, x, y - 6);
    } else {
      ctx.beginPath();
      ctx.arc(x, padding.top + chartH, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#CBD5E1';
      ctx.fill();
    }

    // X 轴时间与题数标签
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(bin.rangeLabel, x, height - padding.bottom + 6);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(
      `${bin.total}${i18n.t('common.trialsUnit')}`,
      x,
      height - padding.bottom + 18,
    );
  }
}
~~~~~

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
  // 绘制数据节点与标签
  points.forEach(({ x, y, stat }) => {
    const dotColor =
      stat.accuracy >= 80 ? '#10B981' : stat.accuracy >= 60 ? '#F59E0B' : '#F43F5E';

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = dotColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 顶部胜率文字
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${stat.accuracy}%`, x, y - 6);

    // 底部 X 轴标签（Level）
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`L${stat.level}`, x, height - padding.bottom + 6);

    // 底部题量标签
    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(
      `${stat.total}${i18n.t('common.trialsUnit')}`,
      x,
      height - padding.bottom + 18,
    );
  });
}
~~~~~
~~~~~typescript.new
  // 绘制数据节点与标签
  for (const { x, y, stat } of points) {
    const dotColor =
      stat.accuracy >= 80 ? '#10B981' : stat.accuracy >= 60 ? '#F59E0B' : '#F43F5E';

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = dotColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 顶部胜率文字
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${stat.accuracy}%`, x, y - 6);

    // 底部 X 轴标签（Level）
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`L${stat.level}`, x, height - padding.bottom + 6);

    // 底部题量标签
    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(
      `${stat.total}${i18n.t('common.trialsUnit')}`,
      x,
      height - padding.bottom + 18,
    );
  }
}
~~~~~

### 下一步建议
1. 运行 `npm run check` 重新校验，确认所有规则检查全部通过。
