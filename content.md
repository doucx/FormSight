好的，我将为你制定并执行第一批 P0 体验与视觉修复计划：统一图表 Canvas 的明色系风格，并修复全局文本选择与计划列表硬编码截断问题。

## [WIP] style(ui): 统一 Canvas 图表浅色风格并修复全局文字选择与截断

### 用户需求
1. **统一 Canvas 视觉主题**：将 `drawTrendChart`、`drawCompass`、`drawColorRing`、`drawHueBiasChart`、`drawHeatmap` 以及对应弹窗容器从深暗黑底（`#1E293B` / `bg-slate-900`）重构为与整站一致的明亮浅色系，消除视觉断层。
2. **恢复文本选择可用性**：移除 `src/index.css` 中全局 `body { user-select: none; }` 的硬性限制，允许文字选择与划词工具生效。
3. **修复硬编码文本截断**：将 `PlanStageList.tsx` 中硬编码的 `.slice(0, 26)...` 改为标准 CSS 弹性截断。

### 评论
当前分析图表与结算折线图直接使用深黑底色，在浅色卡片与弹窗中视觉断层明显；同时全局 `user-select: none` 阻断了文字选择与翻译，属于典型的负优化。此次重构将直接提升视觉一致性与微观可用性。

### 目标
1. 修改 `src/index.css`，移除 `body` 上的 `user-select: none`。
2. 修改 `src/components/plan/editor/PlanStageList.tsx`，将卡片描述截断改为 CSS `truncate`。
3. 重构 `src/utils/canvas/` 下的图表绘制函数（`drawTrendChart.ts`、`drawCompass.ts`、`drawColorRing.ts`、`drawHueBiasChart.ts`、`drawHeatmap.ts`），将背景填充、刻度线、辅助文字等转换为优雅清晰的浅色图表风格。
4. 同步调整 `SessionSummaryModal.tsx` 和 `WeaknessAnalyticsModal.tsx` 中 Canvas 的外层容器样式，使其与图表浅色背景完美融合。

### 基本原理
- 将 Canvas 的底层填充色统一改为浅灰或透明（如 `#F8FAFC`），网格刻度线使用 `#E2E8F0` / `#CBD5E1`，文本颜色使用 `#64748B` / `#475569`，确保对比度符合 WCAG AA 规范。
- 移除全局选择限制，让页面文本可选中；仅在真正需要防拖拽干扰的交互画布与手势轨道上保留局部 `select-none` / `touch-none`。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/visual-consistency #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 修复全局文本选择与计划列表硬编码截断

~~~~~act
patch_file
src/index.css
~~~~~
~~~~~css.old
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
    "Open Sans", "Helvetica Neue", sans-serif;
  user-select: none;
}
~~~~~
~~~~~css.new
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
    "Open Sans", "Helvetica Neue", sans-serif;
}
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanStageList.tsx
~~~~~
~~~~~tsx.old
                  <div>
                    <div className="text-xs font-bold text-slate-800">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400">{cardDesc.slice(0, 26)}...</div>
                  </div>
~~~~~
~~~~~tsx.new
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[180px] sm:max-w-xs">{cardDesc}</div>
                  </div>
~~~~~

#### Acts 2: 重构会话趋势图与历史折线图配色

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~ts.old
export function renderSessionTrendChartCanvas(
  canvas: HTMLCanvasElement,
  history: SessionHistoryItem[],
) {
  const width = 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;

  const padding = { top: 30, right: 30, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  // 构造序列
  const rawPoints = [
    { x: 0, y: history[0].levelBefore, isHit: true },
    ...history.map((h, i) => ({
      x: i + 1,
      y: h.levelAfter,
      isHit: h.isHit,
    })),
  ];

  // 当会话题量 > 120 题时执行 LTTB 降采样至 80 点
  const sampledPoints = rawPoints.length > 120 ? lttbDownsample(rawPoints, 80) : rawPoints;

  const totalPoints = sampledPoints.length;
  const levelSequence = sampledPoints.map((p) => p.y);
  const maxLevel = Math.max(...levelSequence, 35);
  const minLevel = Math.min(...levelSequence, 1);

  const getY = (val: number) => {
    const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
    return padding.top + (1 - ratio) * chartH;
  };

  const getX = (index: number) => {
    if (totalPoints === 1) return padding.left + chartW / 2;
    return padding.left + (index / (totalPoints - 1)) * chartW;
  };

  // 背景刻度线
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#334155';
  ctx.fillStyle = '#64748B';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
  const uniqueYTicks = Array.from(new Set(yTicks));

  for (const tickVal of uniqueYTicks) {
    const y = getY(tickVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
  }

  // 面积渐变背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.lineTo(getX(totalPoints - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = '#818CF8';
  ctx.lineWidth = totalPoints > 60 ? 1.8 : 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.stroke();

  // 绘制各个试炼对应的判定结果圆点
  const isCrowded = totalPoints > 35;
  const isSuperCrowded = totalPoints > 80;

  if (!isSuperCrowded) {
    const dotRadius = isCrowded ? 2 : 3.5;
    for (let i = 0; i < sampledPoints.length; i++) {
      const p = sampledPoints[i];
      const x = getX(i);
      const y = getY(p.y);

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = p.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('stats.sessionSeqNotice'), width / 2, height - 10);
}
~~~~~
~~~~~ts.new
export function renderSessionTrendChartCanvas(
  canvas: HTMLCanvasElement,
  history: SessionHistoryItem[],
) {
  const width = 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;

  const padding = { top: 25, right: 25, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 构造序列
  const rawPoints = [
    { x: 0, y: history[0].levelBefore, isHit: true },
    ...history.map((h, i) => ({
      x: i + 1,
      y: h.levelAfter,
      isHit: h.isHit,
    })),
  ];

  // 当会话题量 > 120 题时执行 LTTB 降采样至 80 点
  const sampledPoints = rawPoints.length > 120 ? lttbDownsample(rawPoints, 80) : rawPoints;

  const totalPoints = sampledPoints.length;
  const levelSequence = sampledPoints.map((p) => p.y);
  const maxLevel = Math.max(...levelSequence, 35);
  const minLevel = Math.min(...levelSequence, 1);

  const getY = (val: number) => {
    const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
    return padding.top + (1 - ratio) * chartH;
  };

  const getX = (index: number) => {
    if (totalPoints === 1) return padding.left + chartW / 2;
    return padding.left + (index / (totalPoints - 1)) * chartW;
  };

  // 背景刻度线
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  ctx.fillStyle = '#64748B';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
  const uniqueYTicks = Array.from(new Set(yTicks));

  for (const tickVal of uniqueYTicks) {
    const y = getY(tickVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
  }

  // 面积渐变背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.18)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.lineTo(getX(totalPoints - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = totalPoints > 60 ? 1.8 : 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.stroke();

  // 绘制各个试炼对应的判定结果圆点
  const isCrowded = totalPoints > 35;
  const isSuperCrowded = totalPoints > 80;

  if (!isSuperCrowded) {
    const dotRadius = isCrowded ? 2.5 : 3.5;
    for (let i = 0; i < sampledPoints.length; i++) {
      const p = sampledPoints[i];
      const x = getX(i);
      const y = getY(p.y);

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = p.isHit ? '#10B981' : '#F43F5E';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.strokeStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('stats.sessionSeqNotice'), width / 2, height - 8);
}
~~~~~

#### Acts 3: 重构弱点分析图表（指南针、色相环、色相偏差图、热力图）配色

~~~~~act
patch_file
src/utils/canvas/drawCompass.ts
~~~~~
~~~~~ts.old
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  const sectorAngle = (Math.PI * 2) / 8;
  const startOffset = -Math.PI / 8;

  for (let i = 0; i < sectorStats.length; i++) {
    const stat = sectorStats[i];
    const startA = startOffset + i * sectorAngle;
    const endA = startA + sectorAngle;

    const radiusRatio = stat.total > 0 ? 0.35 + (stat.accuracy / 100) * 0.65 : 0.25;
    const r = outerRadius * radiusRatio;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startA, endA);
    ctx.closePath();

    if (stat.total === 0) {
      ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
    } else if (stat.accuracy >= 80) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
    } else if (stat.accuracy >= 60) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.65)';
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
    }
    ctx.fill();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 18;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total > 0 ? '#EF4444' : '#94A3B8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.label.split(' ')[0], lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#0F172A';
  ctx.fill();
  ctx.strokeStyle = '#64748B';
  ctx.stroke();
~~~~~
~~~~~ts.new
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  const sectorAngle = (Math.PI * 2) / 8;
  const startOffset = -Math.PI / 8;

  for (let i = 0; i < sectorStats.length; i++) {
    const stat = sectorStats[i];
    const startA = startOffset + i * sectorAngle;
    const endA = startA + sectorAngle;

    const radiusRatio = stat.total > 0 ? 0.35 + (stat.accuracy / 100) * 0.65 : 0.25;
    const r = outerRadius * radiusRatio;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startA, endA);
    ctx.closePath();

    if (stat.total === 0) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
    } else if (stat.accuracy >= 80) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    } else if (stat.accuracy >= 60) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    } else {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
    }
    ctx.fill();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 18;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total > 0 ? '#E11D48' : '#64748B';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.label.split(' ')[0], lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#4F46E5';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawColorRing.ts
~~~~~
~~~~~ts.old
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  const sectorAngle = (Math.PI * 2) / 12;
  const startOffset = -Math.PI / 2;

  for (let i = 0; i < 12; i++) {
    const stat = sectorStats[i];
    const startA = startOffset + i * sectorAngle;
    const endA = startA + sectorAngle;

    const hueAngle = i * 30 + 15;
    const hexColor = hsvToHex(hueAngle, 100, 100);

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 12, startA, endA);
    ctx.arc(cx, cy, outerRadius + 2, endA, startA, true);
    ctx.fillStyle = hexColor;
    ctx.fill();

    const accRatio = stat.total > 0 ? Math.max(0.1, stat.accuracy / 100) : 0;
    const r = innerRadius + (outerRadius - innerRadius) * accRatio;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startA, endA);
    ctx.closePath();

    if (stat.total === 0) {
      ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
    } else if (stat.accuracy >= 80) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
    } else if (stat.accuracy >= 60) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.65)';
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
    }
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 25;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total >= 3 ? '#EF4444' : '#94A3B8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const shortName = stat.label.split(' ')[0];
    ctx.fillText(shortName, lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#0F172A';
  ctx.fill();
  ctx.strokeStyle = '#64748B';
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hue', cx, cy - 6);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.fillText('Accuracy', cx, cy + 8);
~~~~~
~~~~~ts.new
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  const sectorAngle = (Math.PI * 2) / 12;
  const startOffset = -Math.PI / 2;

  for (let i = 0; i < 12; i++) {
    const stat = sectorStats[i];
    const startA = startOffset + i * sectorAngle;
    const endA = startA + sectorAngle;

    const hueAngle = i * 30 + 15;
    const hexColor = hsvToHex(hueAngle, 100, 100);

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 12, startA, endA);
    ctx.arc(cx, cy, outerRadius + 2, endA, startA, true);
    ctx.fillStyle = hexColor;
    ctx.fill();

    const accRatio = stat.total > 0 ? Math.max(0.1, stat.accuracy / 100) : 0;
    const r = innerRadius + (outerRadius - innerRadius) * accRatio;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startA, endA);
    ctx.closePath();

    if (stat.total === 0) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
    } else if (stat.accuracy >= 80) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    } else if (stat.accuracy >= 60) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    } else {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
    }
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 25;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total >= 3 ? '#E11D48' : '#64748B';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const shortName = stat.label.split(' ')[0];
    ctx.fillText(shortName, lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hue', cx, cy - 5);
  ctx.fillStyle = '#64748B';
  ctx.font = '9px sans-serif';
  ctx.fillText('Accuracy', cx, cy + 8);
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~ts.old
  // 背景填充
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);
~~~~~
~~~~~ts.new
  // 背景填充
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~ts.old
  for (const tick of yTicks) {
    const y = getY(tick);
    ctx.strokeStyle = tick === 0 ? 'rgba(148, 163, 184, 0.4)' : 'rgba(51, 65, 85, 0.6)';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = tick === 0 ? '#CBD5E1' : '#64748B';
    const label = tick > 0 ? `+${tick}°` : `${tick}°`;
    ctx.fillText(label, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  // 2. 绘制 X 轴色相刻度竖线 (0°, 90°, 180°, 270°, 360°)
  const xTicks = [0, 90, 180, 270, 360];
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
  ctx.setLineDash([2, 2]);
  for (const h of xTicks) {
    const x = getX(h);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);
~~~~~
~~~~~ts.new
  for (const tick of yTicks) {
    const y = getY(tick);
    ctx.strokeStyle = tick === 0 ? '#94A3B8' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = tick === 0 ? '#334155' : '#64748B';
    const label = tick > 0 ? `+${tick}°` : `${tick}°`;
    ctx.fillText(label, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  // 2. 绘制 X 轴色相刻度竖线 (0°, 90°, 180°, 270°, 360°)
  const xTicks = [0, 90, 180, 270, 360];
  ctx.strokeStyle = '#E2E8F0';
  ctx.setLineDash([2, 2]);
  for (const h of xTicks) {
    const x = getX(h);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~ts.old
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  // 1. 背景同心圆标尺
  const rings = [5, 10, 20, 30];
  ctx.lineWidth = 1;
  for (const r of rings) {
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '10px monospace';
    ctx.fillText(`${r}`, cx + r * scale + 2, cy - 4);
  }

  // 十字辅助基准线
  ctx.strokeStyle = '#475569';
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, height);
  ctx.stroke();
  ctx.setLineDash([]);
~~~~~
~~~~~ts.new
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 1. 背景同心圆标尺
  const rings = [5, 10, 20, 30];
  ctx.lineWidth = 1;
  for (const r of rings) {
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px monospace';
    ctx.fillText(`${r}`, cx + r * scale + 2, cy - 4);
  }

  // 十字辅助基准线
  ctx.strokeStyle = '#CBD5E1';
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, height);
  ctx.stroke();
  ctx.setLineDash([]);
~~~~~

#### Acts 4: 适配结算与分析弹窗外层容器样式

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~tsx.old
        {/* 折线图 Canvas 区 */}
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 w-full overflow-hidden">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-400">{t('summary.curveTitle')}</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{' '}
                {t('summary.hitLegend')}
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{' '}
                {t('summary.missLegend')}
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full max-w-full aspect-[11/4] rounded-xl block"
          />
        </div>
~~~~~
~~~~~tsx.new
        {/* 折线图 Canvas 区 */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 w-full overflow-hidden">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-600">{t('summary.curveTitle')}</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{' '}
                {t('summary.hitLegend')}
              </span>
              <span className="flex items-center gap-1 text-rose-500 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{' '}
                {t('summary.missLegend')}
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full max-w-full aspect-[11/4] rounded-xl block border border-slate-100 shadow-inner"
          />
        </div>
~~~~~

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~tsx.old
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
              <canvas
                key={`${card.id}-${currentView.id}`}
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl"
              />
            </div>
~~~~~
~~~~~tsx.new
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-inner relative">
              <canvas
                key={`${card.id}-${currentView.id}`}
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100"
              />
            </div>
~~~~~

### 下一步建议
1. **运行构建与类型检查**：执行 `npm run check` 确保 TypeScript 类型与 Biome 格式完全无误。
2. **推进 P1 级重构**：
   - 简化首页 `FilterEngine.tsx`，将学术化的五维多选折叠，默认提供直观场景 Tab。
   - 改造 `PlanEditorModal` 嵌套弹窗逻辑，消解 Modalception。
