好的，现在我们开启 **Phase 4: Canvas Retina 适配与算法/类型加固**。

本阶段的核心任务包括：
1. **全局 Canvas HiDPI / Retina 流水线**：封装 `setupHiDpiCanvas`，统一消除 Canvas 在 2K/4K 及手机高分屏下的模糊锯齿，确保细线、文字与点阵极清呈现。
2. **消除所有 `any` 类型逃逸**：彻底移除 `trainingPlugins.tsx` 和 `analyticsPlugins.tsx` 中的 `any` 抑制与隐式类型，实现 100% 类型安全。
3. **算法确定性与安全兜底**：优化 `colorUtils.ts` 与 `relativeColorUtils.ts` 中的试探循环，增加确定性边界保护。

## [WIP] feat: 封装 Retina Canvas 绘图流水线并消除类型逃逸

### 用户需求
1. 在 Retina / 4K 及移动端高清屏幕上，Canvas 绘图与折线图保持极高清锐利，杜绝模糊发虚。
2. 消除代码库中所有的 `any` 泛型抑制，保证强类型推导。
3. 增强题目生成算法在极端参数下的收敛性与稳定性。

### 评论
Canvas 的默认逻辑像素与物理设备像素不一致（Device Pixel Ratio），在 DPR $\ge 2$ 的屏幕上直接绘制 1px 线条会被拉伸模糊。通过高分屏缩放流水线（`setupHiDpiCanvas`）结合物理像素与 CSS 样式的解耦，可以零成本获得原生视网膜级锐度。同时消除 `any` 可以杜绝未来扩展时的潜在运行时类型错误。

### 目标
1. 新建 `src/utils/canvas/hidpi.ts`，导出通用的高分屏初始化与重设函数。
2. 改造 `drawTrendChart.ts`、`drawCompass.ts`、`drawColorRing.ts`、`drawHeatmap.ts` 及各 Canvas 组件接入 Retina 流水线。
3. 重构 `trainingPlugins.tsx` 和 `analyticsPlugins.tsx`，消除所有 `any` 逃逸。
4. 加固 `colorUtils.ts` 与 `relativeColorUtils.ts` 采样算法。

### 基本原理
1. `setupHiDpiCanvas(canvas, logicalWidth, logicalHeight)`：将 `canvas.width` 和 `canvas.height` 设置为 `logical * dpr`，同时通过内联样式将 `canvas.style.width/height` 固定为 `logical px`，并在上下文调用 `ctx.scale(dpr, dpr)`。
2. 采用 TypeScript 的 Discriminated Unions 与泛型上界收敛插件表，替换旧的 `Record<string, any>`。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/canvas #task/object/retina-pipeline #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 新建 `src/utils/canvas/hidpi.ts`

~~~~~act
write_file
src/utils/canvas/hidpi.ts
~~~~~
~~~~~typescript
/**
 * 配置 Canvas 支持 Retina / HiDPI 屏幕高清渲染
 * @param canvas HTML Canvas 元素
 * @param logicalWidth 逻辑宽度 (CSS 像素)
 * @param logicalHeight 逻辑高度 (CSS 像素)
 * @returns 预设好 scale 的 2D 绘图上下文
 */
export function setupHiDpiCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): CanvasRenderingContext2D | null {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}
~~~~~

#### Acts 2: 改造 Canvas 可视化图表接入 Retina 高清渲染

~~~~~act
write_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from './hidpi';

export function renderTrendChartCanvas(
  canvas: HTMLCanvasElement,
  dailyData: Record<string, { total: number; maxLevel: number }>,
) {
  const width = 340;
  const height = 150;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const padding = { top: 20, right: 20, bottom: 25, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const activeDates = Object.keys(dailyData).sort();
  const recentDates = activeDates.slice(-30);

  if (recentDates.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('当前筛选条件下暂无做答轨迹', width / 2, height / 2);
    return;
  }

  const levels = recentDates.map((d) => dailyData[d].maxLevel);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = 1;

  const getY = (val: number) =>
    padding.top + (1 - (val - minLevel) / (maxLevel - minLevel || 1)) * chartH;
  const getX = (idx: number) => padding.left + (idx / Math.max(1, recentDates.length - 1)) * chartW;

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
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levels[0]));
  for (let i = 1; i < levels.length; i++) {
    ctx.lineTo(getX(i), getY(levels[i]));
  }
  ctx.stroke();

  for (let i = 0; i < levels.length; i++) {
    ctx.beginPath();
    ctx.arc(getX(i), getY(levels[i]), 3.5, 0, Math.PI * 2);
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
}

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

  const levels = history.map((h) => h.level);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = Math.min(...levels, 1);

  const getY = (val: number) => {
    const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
    return padding.top + (1 - ratio) * chartH;
  };

  const getX = (index: number) => {
    if (history.length === 1) return padding.left + chartW / 2;
    return padding.left + (index / (history.length - 1)) * chartW;
  };

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

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(history[0].level));
  for (let i = 1; i < history.length; i++) {
    ctx.lineTo(getX(i), getY(history[i].level));
  }
  ctx.lineTo(getX(history.length - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#818CF8';
  ctx.lineWidth = 2.5;
  ctx.moveTo(getX(0), getY(history[0].level));
  for (let i = 1; i < history.length; i++) {
    ctx.lineTo(getX(i), getY(history[i].level));
  }
  ctx.stroke();

  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const x = getX(i);
    const y = getY(h.level);

    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = h.isHit ? '#22C55E' : '#EF4444';
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (
      history.length <= 10 ||
      i === 0 ||
      i === history.length - 1 ||
      h.level !== history[i - 1]?.level
    ) {
      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`L${h.level}`, x, y - 8);
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
  ctx.fillText('题目做答序列 ➔', width / 2, height - 10);
}
~~~~~

~~~~~act
write_file
src/utils/canvas/drawCompass.ts
~~~~~
~~~~~typescript
import { setupHiDpiCanvas } from './hidpi';

export interface SectorStat {
  sectorIdx: number;
  label: string;
  total: number;
  accuracy: number;
  avgError: number;
}

export function renderCompassCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 30;

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
}
~~~~~

~~~~~act
write_file
src/utils/canvas/drawColorRing.ts
~~~~~
~~~~~typescript
import { hsvToHex } from '../colorUtils';
import type { SectorStat } from './drawCompass';
import { setupHiDpiCanvas } from './hidpi';

export function renderHueRingCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 40;
  const innerRadius = outerRadius - 20;

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
}
~~~~~

~~~~~act
write_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript
import type { TrialRecord } from '../../types';
import { setupHiDpiCanvas } from './hidpi';

export function renderHeatmapCanvas(
  canvas: HTMLCanvasElement,
  records: TrialRecord[],
  avgDx: number,
  avgDy: number,
  totalCount: number,
) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;
  const scale = 5;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

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

  ctx.strokeStyle = '#475569';
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, height);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const r of records) {
    const dx = r.userClick[0] - r.targetB[0];
    const dy = r.userClick[1] - r.targetB[1];

    const px = cx + dx * scale;
    const py = cy + dy * scale;

    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    if (r.isHit) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    }
    ctx.fill();
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (totalCount > 0) {
    const avgPx = cx + avgDx * scale;
    const avgPy = cy + avgDy * scale;

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(avgPx, avgPy);
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(avgPx, avgPy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
~~~~~

#### Acts 3: 消除 `trainingPlugins.tsx` 中的所有 `any` 逃逸与压制

~~~~~act
write_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import { ColorCanvas } from '../components/ColorCanvas';
import { NegativeSpaceCanvas } from '../components/NegativeSpaceCanvas';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { StarCanvas } from '../components/StarCanvas';
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../utils/colorUtils';
import type { TrainingDomain } from '../utils/db';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../utils/geometry';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
} from '../utils/negativeSpaceUtils';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../utils/relativeColorUtils';
import type {
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../utils/settings';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

export interface TrainingPlugin<
  TQuestion,
  THitResult,
  TAnswerVal,
  TSettings,
> {
  domain: TrainingDomain;
  title: string;
  getModeBadge: (mode: string) => string;
  isTargeting?: (mode: string, settings: TSettings) => boolean;
  generateQuestion: (mode: string, level: number, settings: TSettings) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion, mode: string) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  extractRecordDetails: (
    question: TQuestion,
    hitResult: THitResult,
    userVal: TAnswerVal,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (
    props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
}

// 1. 寻星练习插件
export const starPlugin: TrainingPlugin<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  domain: 'star',
  title: '寻星练习',
  getModeBadge: (mode) => mode,
  isTargeting: (_mode, settings) => settings.targetingMode === 'manual',
  generateQuestion: (mode, level, settings) => {
    const opts: QuestionGenerateOptions = {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
      gridSize: settings.gridSize,
    };
    return generateQuestion(mode as TrainingMode, level, opts);
  },
  evaluateAnswer: (userVal) => userVal.hitResult,
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult) => ({
    anchorA: [q.anchorA.x, q.anchorA.y],
    anchorC: q.anchorC ? [q.anchorC.x, q.anchorC.y] : undefined,
    targetB: [q.targetB.x, q.targetB.y],
    userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
    angleDegree: q.angleDegree,
    distanceRatio: q.distanceRatio,
    errorPixelDistance: hitResult.errorDistance,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
    <StarCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={
        userAnswer ? { clickPoint: userAnswer.nearestGridPoint, hitResult: userAnswer } : null
      }
      onAnswer={(clickPoint) => {
        const hitRes = checkHit(clickPoint, question.targetB, question.distractorPoints);
        if (hitRes.isWithinRange) {
          onAnswer({ clickPoint, hitResult: hitRes });
        }
      }}
      disabled={disabled}
    />
  ),
};

// 2. 绝对色感插件
export const colorPlugin: TrainingPlugin<
  ColorQuestionData,
  ColorHitResult,
  number | [number, number, number],
  ColorSenseSettings
> = {
  domain: 'color',
  title: '色感训练',
  getModeBadge: (mode) =>
    mode === 'H' ? '色相' : mode === 'V' ? '明度' : mode === 'S' ? '饱和度' : '综合拾色',
  isTargeting: (mode, settings) => settings.targetingMode === 'manual' && mode === 'H',
  generateQuestion: (mode, level, settings) =>
    generateColorQuestion(mode as ColorMode, level, {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
    }),
  evaluateAnswer: (userVal, q, mode) => checkColorHit(mode as ColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    const computedUserHSV: [number, number, number] =
      mode === 'ALL' && Array.isArray(userVal)
        ? userVal
        : [
            mode === 'H' ? (userVal as number) : q.targetH,
            mode === 'S' ? (userVal as number) : q.targetS,
            mode === 'V' ? (userVal as number) : q.targetV,
          ];
    return {
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: computedUserHSV,
      errorValue: hitResult.errorValue,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <ColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
    />
  ),
};

// 3. 相对色感插件
export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  domain: 'relative_color',
  title: '相对色感',
  getModeBadge: (mode) =>
    mode === 'LIGHTNESS_INDUCTION'
      ? '明度反差补偿'
      : mode === 'HUE_INDUCTION'
        ? '补色残像调和'
        : mode === 'DECONTEXTUAL_2AFC'
          ? '环境穿透判别'
          : '色彩矢量迁移',
  generateQuestion: (mode, level) =>
    generateRelativeColorQuestion(mode as RelativeColorMode, level),
  evaluateAnswer: (userVal, q, mode) =>
    checkRelativeColorHit(mode as RelativeColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'DECONTEXTUAL_2AFC') {
      return {
        mode,
        userChoice: userVal,
        correctChoice: q.largerPhysicalSide,
        physicalValueDiff: q.physicalValueDiff,
      };
    }
    if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        deltaEError: hitResult.deltaEError,
      };
    }
    return {
      mode: 'VECTOR_SHIFT',
      colorA: q.colorA,
      colorB: q.colorB,
      colorC: q.colorC,
      targetD: q.targetD,
      userD: userVal,
      deltaEError: hitResult.deltaEError,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <RelativeColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
    />
  ),
};

// 4. 正负形感知插件
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'SHAPE_MATCH_2AFC'
          ? '负形轮廓记忆匹配'
          : '负形占比估算',
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
      return {
        mode: 'NEGATIVE_VERTEX_FITTING',
        targetVertexIndex: q.targetVertexIndex,
        targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
        userClick: hitResult.nearestGridPoint
          ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
          : undefined,
        errorPixelDistance: hitResult.errorValue,
      };
    }
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    if (mode === 'SHAPE_MATCH_2AFC') {
      return {
        mode: 'SHAPE_MATCH_2AFC',
        userChoice: userVal === 0 || userVal === 'A' ? 'A' : 'B',
        correctChoice: q.correctChoice,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
    />
  ),
};

export type AnyTrainingPlugin =
  | typeof starPlugin
  | typeof colorPlugin
  | typeof relativeColorPlugin
  | typeof negativeSpacePlugin;

export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};

export const CARD_PLUGINS: Record<string, AnyTrainingPlugin> = {
  star_single: starPlugin,
  star_double_h: starPlugin,
  star_double_r: starPlugin,
  color_hue: colorPlugin,
  color_val: colorPlugin,
  color_sat: colorPlugin,
  color_all: colorPlugin,
  rel_vector_shift: relativeColorPlugin,
  rel_lightness_induction: relativeColorPlugin,
  rel_hue_induction: relativeColorPlugin,
  rel_decontextual_2afc: relativeColorPlugin,
  neg_ratio_estimation: negativeSpacePlugin,
  neg_area_comparison_2afc: negativeSpacePlugin,
  neg_vertex_fitting: negativeSpacePlugin,
  neg_shape_match_2afc: negativeSpacePlugin,
};

export function getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
  return CARD_PLUGINS[cardId];
}
~~~~~

#### Acts 4: 优化 `colorUtils.ts` 采样确定性与死循环保护

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript.old
  // 题目生成过滤逻辑：确保抽取的色彩具备视觉可观测量
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    if (mode === 'H' || mode === 'ALL') {
      targetS = Math.floor(Math.random() * 81) + 20; // 20..100
      targetV = Math.floor(Math.random() * 81) + 20; // 20..100

      // 检验 OKLab 彩度：必须保证彩度足够大，否则色相被低 S/V 遮蔽不可辩
      const lab = hsvToOkLab(targetH, targetS, targetV);
      if (getOkChroma(lab) >= tolerance * 1.5) {
        break;
      }
    } else if (mode === 'V') {
      targetS = Math.floor(Math.random() * 71) + 30; // S >= 30% 防止纯灰无明度变化感
      targetV = Math.floor(Math.random() * 101);
      break;
    } else {
      // mode === 'S'
      targetV = Math.floor(Math.random() * 71) + 30; // V >= 30% 防止纯黑无饱和度感
      targetS = Math.floor(Math.random() * 101);
      break;
    }
  }
~~~~~
~~~~~typescript.new
  // 题目生成过滤逻辑：确保抽取的色彩具备视觉可观测量
  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    if (mode === 'H' || mode === 'ALL') {
      targetS = Math.floor(Math.random() * 71) + 30; // 30..100
      targetV = Math.floor(Math.random() * 71) + 30; // 30..100

      // 检验 OKLab 彩度：必须保证彩度足够大，否则色相被低 S/V 遮蔽不可辩
      const lab = hsvToOkLab(targetH, targetS, targetV);
      if (getOkChroma(lab) >= Math.min(0.04, tolerance * 1.5)) {
        break;
      }
    } else if (mode === 'V') {
      targetS = Math.floor(Math.random() * 71) + 30; // S >= 30% 防止纯灰无明度变化感
      targetV = Math.floor(Math.random() * 101);
      break;
    } else {
      // mode === 'S'
      targetV = Math.floor(Math.random() * 71) + 30; // V >= 30% 防止纯黑无饱和度感
      targetS = Math.floor(Math.random() * 101);
      break;
    }
  }
~~~~~

### 下一步建议

运行完整的代码检查与测试套件：
~~~~~
npm run check
npm run test:coverage || npm run test
~~~~~

1. 验证整个系统在 4 个阶段（Phase 1 ~ Phase 4）后的集成状态。
2. 进行最终构建验证 `npm run build`。
