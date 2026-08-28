我已分析需求，现在将“作答耗时与正确率分布 (SAT)”与“难度层阶与正确率分布 (Plateau)”两个分析图表由直方图（柱状图）平滑重构为折线图（Line Chart），包含半透明渐变面积背景、动态高亮节点与对齐的坐标标签。

## [WIP] refactor(analytics): 将通用分析中的直方图重构为折线图

### 用户需求
将 `src/core/analytics/universalViews.tsx` 中的“作答耗时与正确率分布 (SAT)”（`renderSpeedAccuracyVisualizer`）以及“难度层阶与正确率分布”（`renderDifficultyPlateauVisualizer`）从原有的直方图渲染模式改为折线图渲染模式，并保持坐标轴、网格参考线以及提示文字的清晰对齐。

### 评论
将直方图改为折线图能够更直观地呈现出随着作答耗时增加或难度层阶攀升时，正确率与认知负荷的变化走势（Trend）。配合渐变面积背景与带胜率色彩状态的圆点节点，不仅视觉体验更为现代统一，也便于用户快速捕捉自身技能瓶颈与作答节奏拐点。

### 目标
1. 重构 `renderSpeedAccuracyVisualizer`，计算各个分箱（Bins）在 X 轴的中心点坐标，基于正确率绘制平滑面积与折线，并在节点上方标注命中百分比。
2. 重构 `renderDifficultyPlateauVisualizer`，对各个层阶（Level）绘制连续折线与渐变填充，对齐 X 轴层阶和做答题数。
3. 保证坐标轴刻度、虚线网格与图表边距完全兼容现有布局。

### 基本原理
在 HTML Canvas 2D 上，将离散的直方柱矩形绘制替换为：
1. 投影采样：计算每个分箱或层阶对应的数据中心坐标 `(x, y)`。
2. 面积填充：使用主色调 `#4F46E5` 的半透明渐变（`rgba(79, 70, 229, 0.16) -> rgba(79, 70, 229, 0.01)`）进行闭合路径填充。
3. 折线渲染：绘制线宽为 `2.5px` 的平滑连接折线。
4. 节点与标签：根据正确率（>=80% 绿、>=60% 黄、<60% 红）绘制白底彩色描边的圆点节点，并在其上方标注 `${accuracy}%`，底部对齐 X 轴区间及做答题量标签。

### 标签
#intent/refine #flow/ready #priority/medium #comp/engine #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/analytics-charts #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构通用分析图表为折线图

我们将修改 `src/core/analytics/universalViews.tsx`，将 `renderSpeedAccuracyVisualizer` 和 `renderDifficultyPlateauVisualizer` 的渲染逻辑转换为折线图模式。

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
export function renderSpeedAccuracyVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const bins = calculateSpeedBins(records);
  const padding = { top: 35, right: 20, bottom: 45, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 参考线
  const yTicks = [100, 75, 50, 25, 0];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? '#CBD5E1' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 4, y);
  }
  ctx.setLineDash([]);

  const barWidth = chartW / bins.length;

  bins.forEach((bin, idx) => {
    const x = padding.left + idx * barWidth;
    const barH = (bin.accuracy / 100) * chartH;
    const y = padding.top + chartH - barH;

    // 柱状图本体
    if (bin.total > 0) {
      ctx.fillStyle =
        bin.accuracy >= 80
          ? 'rgba(16, 185, 129, 0.85)'
          : bin.accuracy >= 60
            ? 'rgba(245, 158, 11, 0.85)'
            : 'rgba(244, 63, 94, 0.85)';

      ctx.beginPath();
      ctx.roundRect(x + 6, y, barWidth - 12, Math.max(3, barH), 6);
      ctx.fill();

      // 准确率标签
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${bin.accuracy}%`, x + barWidth / 2, y - 4);
    } else {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.beginPath();
      ctx.roundRect(x + 6, padding.top + chartH - 4, barWidth - 12, 4, 2);
      ctx.fill();
    }

    // X 轴时间与题数标签
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(bin.rangeLabel, x + barWidth / 2, height - padding.bottom + 6);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(
      `${bin.total}${i18n.t('common.trialsUnit')}`,
      x + barWidth / 2,
      height - padding.bottom + 18,
    );
  });
}
~~~~~
~~~~~typescript.new
export function renderSpeedAccuracyVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const bins = calculateSpeedBins(records);
  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 参考线
  const yTicks = [100, 75, 50, 25, 0];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? '#CBD5E1' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  const slotW = chartW / bins.length;
  const points = bins.map((bin, idx) => {
    const x = padding.left + (idx + 0.5) * slotW;
    const y = padding.top + (1 - bin.accuracy / 100) * chartH;
    return { x, y, bin };
  });

  const validPoints = points.filter((p) => p.bin.total > 0);

  // 绘制折线与渐变面积
  if (validPoints.length > 0) {
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.16)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

    ctx.beginPath();
    ctx.moveTo(validPoints[0].x, validPoints[0].y);
    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }
    ctx.lineTo(validPoints[validPoints.length - 1].x, height - padding.bottom);
    ctx.lineTo(validPoints[0].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.moveTo(validPoints[0].x, validPoints[0].y);
    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }
    ctx.stroke();
  }

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

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
export function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  const levelStats = calculateLevelStats(records);
  if (levelStats.length === 0) return;

  // Y 轴参考线 (0%, 25%, 50%, 75%, 100%)
  const yTicks = [100, 75, 50, 25, 0];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? '#CBD5E1' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  // 直方柱自适应宽度与排版
  const barCount = levelStats.length;
  const barWidth = chartW / barCount;
  const barPad = Math.max(3, Math.min(8, barWidth * 0.15));

  levelStats.forEach((stat, idx) => {
    const x = padding.left + idx * barWidth;
    const barH = (stat.accuracy / 100) * chartH;
    const y = padding.top + chartH - barH;

    // 柱状图
    ctx.fillStyle =
      stat.accuracy >= 80
        ? 'rgba(16, 185, 129, 0.85)'
        : stat.accuracy >= 60
          ? 'rgba(245, 158, 11, 0.85)'
          : 'rgba(244, 63, 94, 0.85)';

    ctx.beginPath();
    ctx.roundRect(x + barPad, y, barWidth - barPad * 2, Math.max(3, barH), 5);
    ctx.fill();

    // 顶部胜率文字
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${stat.accuracy}%`, x + barWidth / 2, y - 4);

    // 底部 X 轴标签（Level）
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`L${stat.level}`, x + barWidth / 2, height - padding.bottom + 6);

    // 底部题量标签
    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(
      `${stat.total}${i18n.t('common.trialsUnit')}`,
      x + barWidth / 2,
      height - padding.bottom + 18,
    );
  });
}
~~~~~
~~~~~typescript.new
export function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  const levelStats = calculateLevelStats(records);
  if (levelStats.length === 0) return;

  // Y 轴参考线 (0%, 25%, 50%, 75%, 100%)
  const yTicks = [100, 75, 50, 25, 0];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? '#CBD5E1' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  const slotW = chartW / levelStats.length;
  const points = levelStats.map((stat, idx) => {
    const x = padding.left + (idx + 0.5) * slotW;
    const y = padding.top + (1 - stat.accuracy / 100) * chartH;
    return { x, y, stat };
  });

  // 渐变面积背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.16)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.lineTo(points[0].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

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

### 下一步建议
1. **类型检查与测试验证**: 执行 `npm run check` 确保 TS 类型检查与代码格式规范无误。
2. **多设备视口走查**: 可以在不同屏幕分辨率与高 DPR 屏幕下查看 SAT 与难度层阶折线图的视觉清晰度与交互反馈。
