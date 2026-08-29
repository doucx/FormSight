我们现在执行针对这 5 个核心真阳性重构点的优化方案：
1. **时间格式化收敛**：创建 `src/utils/time.ts`，并在 `TrainingShell`、`PlanTrainingView`、`SessionSummaryModal`、`PlanSummaryModal` 中替换。
2. **Canvas HiDPI 与初始化收敛**：在 `src/core/canvas/hidpi.ts` 中封装 `initSquareHiDpiCanvas`，替换各图表样板代码。
3. **正确率配色逻辑收敛**：创建 `src/utils/theme.ts`，替换 `universalViews.tsx` 中的硬编码。
4. **统一 Modal 架构**：重构 `SessionSummaryModal` 与 `PlanSummaryModal`，复用 `ModalShell` 基础组件。
5. **样式模式提取**：在 `FilterEngine.tsx` 中提取 `FilterSectionHeader` 子组件。

## [WIP] refactor: 收敛时间格式化、Canvas初始化、正确率配色与弹窗结构

### 用户需求
针对 DRY 检测报告中的 5 大核心真阳性问题实施重构，消除冗余代码与硬编码，提升系统的可维护性与设计一致性。

### 评论
这些重构涉及最常用的核心基础设施与通用 UI 模式：
- 将多处手写的时间 `mm:ss` 转换统一收敛到工具函数，杜绝边界漏洞。
- 封装 `initSquareHiDpiCanvas` 能使所有分析 Canvas 的初始化代码从 6 行缩减为 2 行。
- 让结算 Modal 全面接入 `ModalShell`，统一无障碍（A11y）、遮罩毛玻璃、圆角和 ESC 快捷键行为。
- 提炼 `FilterSectionHeader` 消除重复的长 Tailwind 样式类名。

### 目标
1. 新建 `src/utils/time.ts` 并导出 `formatSecondsToTimer`。
2. 新建 `src/utils/theme.ts` 并导出 `getAccuracyColor` 与 `getAccuracyBadgeClass`。
3. 在 `src/core/canvas/hidpi.ts` 中增加 `initSquareHiDpiCanvas`，并在相关图表渲染器中应用。
4. 重构 `SessionSummaryModal.tsx` 与 `PlanSummaryModal.tsx` 复用 `ModalShell`。
5. 重构 `FilterEngine.tsx` 提取 `FilterSectionHeader`。

### 基本原理
遵循关注点分离与单一事实来源（SSOT）原则，将通用算法、设计规范与基础 UI 容器抽离为共享基质，业务视图仅需组装声明式逻辑。

### 标签
#intent/refine #flow/ready #priority/high
#comp/runtime #comp/ui #concept/ui #scope/core #scope/dx
#ai/instruct
#task/domain/refactor #task/object/dry-consolidation #task/action/code-cleanup #task/state/begin

---

### Script

#### Acts 1: 创建共享时间与主题工具函数

我们将创建 `src/utils/time.ts` 与 `src/utils/theme.ts`。

~~~~~act
write_file
src/utils/time.ts
~~~~~
~~~~~typescript
/**
 * 将秒数格式化为时钟文本 mm:ss (如 125 -> "02:05")
 */
export function formatSecondsToTimer(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
~~~~~

~~~~~act
write_file
src/utils/theme.ts
~~~~~
~~~~~typescript
export const ACCURACY_COLORS = {
  high: '#10B981', // >= 80% (Emerald)
  medium: '#F59E0B', // >= 60% (Amber)
  low: '#F43F5E', // < 60% (Rose)
} as const;

/**
 * 获取正确率对应的 Canvas 十六进制主题色
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return ACCURACY_COLORS.high;
  if (accuracy >= 60) return ACCURACY_COLORS.medium;
  return ACCURACY_COLORS.low;
}

/**
 * 获取正确率对应的 Tailwind 徽章样式类名
 */
export function getAccuracyBadgeClass(accuracy: number, total = 1): string {
  if (total === 0) return 'bg-slate-100 text-slate-400';
  if (accuracy >= 80) return 'bg-emerald-50 text-emerald-700';
  if (accuracy >= 60) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}
~~~~~

#### Acts 2: 扩展 `hidpi.ts` 并增加 `initSquareHiDpiCanvas` 辅助函数

~~~~~act
patch_file
src/core/canvas/hidpi.ts
~~~~~
~~~~~typescript.old
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}
~~~~~
~~~~~typescript.new
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}

export interface InitSquareCanvasResult {
  ctx: CanvasRenderingContext2D;
  size: number;
}

/**
 * 快速初始化正方形高清 Canvas，自动适配容器宽度、HiDPI 缩放并填充背景色
 */
export function initSquareHiDpiCanvas(
  canvas: HTMLCanvasElement,
  fallbackSize = 340,
  bgColor = '#F8FAFC',
): InitSquareCanvasResult | null {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || fallbackSize;
  const ctx = setupHiDpiCanvas(canvas, size, size);
  if (!ctx) return null;

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  return { ctx, size };
}
~~~~~

#### Acts 3: 在图表绘制工具中应用 `initSquareHiDpiCanvas` 与 `getAccuracyColor`

我们将重构 `universalViews.tsx`、`drawCompass.ts`、`drawColorRing.ts`、`drawHeatmap.ts`、`drawHueBiasChart.ts`。

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
import { setupHiDpiCanvas } from '../canvas/hidpi';
import type { CardAnalyticsView } from '../contracts';
import { i18n } from '../i18n';
~~~~~
~~~~~typescript.new
import { initSquareHiDpiCanvas } from '../canvas/hidpi';
import type { CardAnalyticsView } from '../contracts';
import { i18n } from '../i18n';
import { getAccuracyBadgeClass, getAccuracyColor } from '../../utils/theme';
~~~~~

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
  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);
~~~~~
~~~~~typescript.new
export function renderSpeedAccuracyVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  const bins = calculateSpeedBins(records);
  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
~~~~~

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
    if (bin.total > 0) {
      const dotColor = bin.accuracy >= 80 ? '#10B981' : bin.accuracy >= 60 ? '#F59E0B' : '#F43F5E';

      ctx.beginPath();
~~~~~
~~~~~typescript.new
    if (bin.total > 0) {
      const dotColor = getAccuracyColor(bin.accuracy);

      ctx.beginPath();
~~~~~

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
                <span
                  className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${
                    bin.total === 0
                      ? 'bg-slate-100 text-slate-400'
                      : bin.accuracy >= 80
                        ? 'bg-emerald-50 text-emerald-700'
                        : bin.accuracy >= 60
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {bin.total > 0 ? `${bin.accuracy}%` : '--'}
                </span>
~~~~~
~~~~~typescript.new
                <span
                  className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${getAccuracyBadgeClass(
                    bin.accuracy,
                    bin.total,
                  )}`}
                >
                  {bin.total > 0 ? `${bin.accuracy}%` : '--'}
                </span>
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
~~~~~
~~~~~typescript.new
export function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
~~~~~

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
  for (const { x, y, stat } of points) {
    const dotColor = stat.accuracy >= 80 ? '#10B981' : stat.accuracy >= 60 ? '#F59E0B' : '#F43F5E';

    ctx.beginPath();
~~~~~
~~~~~typescript.new
  for (const { x, y, stat } of points) {
    const dotColor = getAccuracyColor(stat.accuracy);

    ctx.beginPath();
~~~~~

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
                <span
                  className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${
                    stat.total === 0
                      ? 'bg-slate-100 text-slate-400'
                      : stat.accuracy >= 80
                        ? 'bg-emerald-50 text-emerald-700'
                        : stat.accuracy >= 60
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {stat.total > 0 ? `${stat.accuracy}%` : '--'}
                </span>
~~~~~
~~~~~typescript.new
                <span
                  className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${getAccuracyBadgeClass(
                    stat.accuracy,
                    stat.total,
                  )}`}
                >
                  {stat.total > 0 ? `${stat.accuracy}%` : '--'}
                </span>
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawCompass.ts
~~~~~
~~~~~typescript.old
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';

export interface SectorStat {
  sectorIdx: number;
  label: string;
  total: number;
  accuracy: number;
  avgError: number;
}

export function renderCompassCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 30;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);
~~~~~
~~~~~typescript.new
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';

export interface SectorStat {
  sectorIdx: number;
  label: string;
  total: number;
  accuracy: number;
  avgError: number;
}

export function renderCompassCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 30;
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawColorRing.ts
~~~~~
~~~~~typescript.old
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { hsvToHex } from '../../core/color/colorUtils';
import type { SectorStat } from './drawCompass';

export function renderHueRingCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 40;
  const innerRadius = outerRadius - 20;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);
~~~~~
~~~~~typescript.new
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import { hsvToHex } from '../../core/color/colorUtils';
import type { SectorStat } from './drawCompass';

export function renderHueRingCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 40;
  const innerRadius = outerRadius - 20;
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript.old
export function renderHeatmapCanvas(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  avgDx: number,
  avgDy: number,
  totalCount: number,
) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;
  const scale = 5;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);
~~~~~
~~~~~typescript.new
export function renderHeatmapCanvas(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  avgDx: number,
  avgDy: number,
  totalCount: number,
) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  const cx = width / 2;
  const cy = height / 2;
  const scale = 5;
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript.old
export function renderHueBiasChartCanvas(canvas: HTMLCanvasElement, records: UnifiedTrialRecord[]) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  // 画布边距
  const padding = { top: 25, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // 背景填充
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);
~~~~~
~~~~~typescript.new
export function renderHueBiasChartCanvas(canvas: HTMLCanvasElement, records: UnifiedTrialRecord[]) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  // 画布边距
  const padding = { top: 25, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
~~~~~

#### Acts 4: 统一 `TrainingShell` 与 `PlanTrainingView` 的时间格式化

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';
~~~~~
~~~~~typescript.new
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';
import { formatSecondsToTimer } from '../../utils/time';
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 sm:gap-6">
~~~~~
~~~~~typescript.new
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 sm:gap-6">
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
          {showTimer && (
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 text-slate-600">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="font-mono font-bold text-[11px]">{formatTime(elapsedSeconds)}</span>
            </div>
          )}
~~~~~
~~~~~typescript.new
          {showTimer && (
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 text-slate-600">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="font-mono font-bold text-[11px]">{formatSecondsToTimer(elapsedSeconds)}</span>
            </div>
          )}
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
import type { TrainingPlan } from '../types/plan';
import { getProfile } from '../utils/db/index';
import { type UserSettings, getCardSettings } from '../utils/settings';
import { GenericTrainingView } from './GenericTrainingView';
~~~~~
~~~~~typescript.new
import type { TrainingPlan } from '../types/plan';
import { getProfile } from '../utils/db/index';
import { type UserSettings, getCardSettings } from '../utils/settings';
import { formatSecondsToTimer } from '../utils/time';
import { GenericTrainingView } from './GenericTrainingView';
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
  const cardConfig = getCardSettings(settings, currentCard.id);
  const cardTitle = getCardTitle(currentCard, t);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full">
~~~~~
~~~~~typescript.new
  const cardConfig = getCardSettings(settings, currentCard.id);
  const cardTitle = getCardTitle(currentCard, t);

  return (
    <div className="w-full">
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-xs font-bold text-slate-700">
              {formatTime(totalElapsedSeconds)}
            </span>
          </div>
~~~~~
~~~~~typescript.new
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-xs font-bold text-slate-700">
              {formatSecondsToTimer(totalElapsedSeconds)}
            </span>
          </div>
~~~~~

#### Acts 5: 使用 `ModalShell` 重构 `SessionSummaryModal` 与 `PlanSummaryModal`

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~typescript.old
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import { renderSessionTrendChartCanvas } from '../utils/canvas/drawTrendChart';

export interface SessionHistoryItem {
  trialIndex: number;
  levelBefore: number;
  levelAfter: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  onClose: () => void;
  onRestart: () => void;
}

export function SessionSummaryModal({
  card,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].levelBefore : 5;
  const endLevel = history.length > 0 ? history[history.length - 1].levelAfter : startLevel;
  const levelDiff = endLevel - startLevel;

  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && history.length > 0) {
      renderSessionTrendChartCanvas(canvas, history);
    }
  }, [history]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{t('summary.title')}</h2>
              <p className="text-xs text-slate-400">
                {cardTitle} •{' '}
                {sessionType === 'benchmark'
                  ? t('summary.benchmarkSubtitle')
                  : t('summary.trainingSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('summary.accuracyCount')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{accuracy}%</span>
              <span className="text-xs font-semibold text-slate-400">
                {t('summary.trialsDone', { hits: hitCount, total: totalTrials })}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {t('summary.duration')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {t('summary.secPerTrial', { sec: avgResponseTimeSec })}
              </span>
            </div>
          </div>
        </div>

        {/* 层阶提升高亮卡片 */}
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900">{t('summary.levelEvolution')}</div>
              <div className="text-[11px] text-indigo-600">
                {levelDiff > 0
                  ? t('summary.levelUp', { diff: levelDiff })
                  : levelDiff < 0
                    ? t('summary.levelDown', { diff: Math.abs(levelDiff) })
                    : t('summary.levelMaintain')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-slate-800 text-base">
            <span className="bg-white px-2.5 py-1 rounded-xl border border-indigo-100 shadow-sm">
              Lvl {startLevel}
            </span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
            <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-xl shadow-sm">
              Lvl {endLevel}
            </span>
          </div>
        </div>

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

        {/* 底部操作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {t('summary.backHome')}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('summary.trainAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript.new
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import { renderSessionTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { formatSecondsToTimer } from '../utils/time';
import { ModalShell } from './common/ModalShell';

export interface SessionHistoryItem {
  trialIndex: number;
  levelBefore: number;
  levelAfter: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  onClose: () => void;
  onRestart: () => void;
}

export function SessionSummaryModal({
  card,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].levelBefore : 5;
  const endLevel = history.length > 0 ? history[history.length - 1].levelAfter : startLevel;
  const levelDiff = endLevel - startLevel;

  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && history.length > 0) {
      renderSessionTrendChartCanvas(canvas, history);
    }
  }, [history]);

  const subTitle = `${cardTitle} • ${
    sessionType === 'benchmark' ? t('summary.benchmarkSubtitle') : t('summary.trainingSubtitle')
  }`;

  return (
    <ModalShell
      title={t('summary.title')}
      subTitle={subTitle}
      icon={Award}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('summary.accuracyCount')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{accuracy}%</span>
              <span className="text-xs font-semibold text-slate-400">
                {t('summary.trialsDone', { hits: hitCount, total: totalTrials })}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {t('summary.duration')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">
                {formatSecondsToTimer(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {t('summary.secPerTrial', { sec: avgResponseTimeSec })}
              </span>
            </div>
          </div>
        </div>

        {/* 层阶提升高亮卡片 */}
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900">{t('summary.levelEvolution')}</div>
              <div className="text-[11px] text-indigo-600">
                {levelDiff > 0
                  ? t('summary.levelUp', { diff: levelDiff })
                  : levelDiff < 0
                    ? t('summary.levelDown', { diff: Math.abs(levelDiff) })
                    : t('summary.levelMaintain')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-slate-800 text-base">
            <span className="bg-white px-2.5 py-1 rounded-xl border border-indigo-100 shadow-sm">
              Lvl {startLevel}
            </span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
            <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-xl shadow-sm">
              Lvl {endLevel}
            </span>
          </div>
        </div>

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

        {/* 底部操作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {t('summary.backHome')}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('summary.trainAgain')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~typescript.old
import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target } from 'lucide-preact';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';

export interface PlanStageResult {
  card: CardDefinition;
  targetTrials: number;
  history: SessionHistoryItem[];
}

interface PlanSummaryModalProps {
  planName: string;
  stageResults: PlanStageResult[];
  totalElapsedSeconds: number;
  onClose: () => void;
  onRestart: () => void;
}

export function PlanSummaryModal({
  planName,
  stageResults,
  totalElapsedSeconds,
  onClose,
  onRestart,
}: PlanSummaryModalProps) {
  const { t } = useTranslation();
  const allHistory = stageResults.flatMap((s) => s.history);
  const totalTrials = allHistory.length;
  const hitCount = allHistory.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {t('common.planSummaryTitle')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('common.planSummaryCompleted', { name: planName, count: stageResults.length })}
              </p>
            </div>
          </div>
        </div>

        {/* 核心综合大盘卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.overallAccuracy')}
            </div>
            <div className="text-2xl font-black text-slate-800">{accuracy}%</div>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              {t('common.totalHits')}
            </div>
            <div className="text-2xl font-black text-slate-800">
              {hitCount} <span className="text-xs font-normal text-slate-400">/ {totalTrials}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.totalTimeSpent')}
            </div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {formatTime(totalElapsedSeconds)}
            </div>
          </div>
        </div>

        {/* 分阶段明细成果 */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('common.stageBreakdown')}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stageResults.map((stage, idx) => {
              const stageHits = stage.history.filter((h) => h.isHit).length;
              const stageAcc =
                stage.history.length > 0 ? Math.round((stageHits / stage.history.length) * 100) : 0;
              const startLvl = stage.history.length > 0 ? stage.history[0].levelBefore : 5;
              const endLvl =
                stage.history.length > 0
                  ? stage.history[stage.history.length - 1].levelAfter
                  : startLvl;
              const Icon = stage.card.icon;
              const cardTitle = getCardTitle(stage.card, t);

              return (
                <div
                  key={`${stage.card.id}-${idx}`}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-slate-800 text-white font-mono text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-white text-indigo-600 border border-slate-200/60 shadow-sm">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{cardTitle}</div>
                      <div className="text-[10px] text-slate-400">
                        {t('common.trialsCorrect', {
                          hits: stageHits,
                          total: stage.history.length,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-xl border border-slate-200/60">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-indigo-600">L{endLvl}</span>
                    </div>

                    <span
                      className={`text-xs font-black font-mono px-2 py-1 rounded-xl ${
                        stageAcc >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : stageAcc >= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {stageAcc}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部动作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {t('common.completeAndReturnHome')}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('common.restartPlan')}
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript.new
import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target } from 'lucide-preact';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { ModalShell } from '../common/ModalShell';

export interface PlanStageResult {
  card: CardDefinition;
  targetTrials: number;
  history: SessionHistoryItem[];
}

interface PlanSummaryModalProps {
  planName: string;
  stageResults: PlanStageResult[];
  totalElapsedSeconds: number;
  onClose: () => void;
  onRestart: () => void;
}

export function PlanSummaryModal({
  planName,
  stageResults,
  totalElapsedSeconds,
  onClose,
  onRestart,
}: PlanSummaryModalProps) {
  const { t } = useTranslation();
  const allHistory = stageResults.flatMap((s) => s.history);
  const totalTrials = allHistory.length;
  const hitCount = allHistory.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const subTitle = t('common.planSummaryCompleted', {
    name: planName,
    count: stageResults.length,
  });

  return (
    <ModalShell
      title={t('common.planSummaryTitle')}
      subTitle={subTitle}
      icon={Award}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <div className="flex flex-col gap-5">
        {/* 核心综合大盘卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.overallAccuracy')}
            </div>
            <div className="text-2xl font-black text-slate-800">{accuracy}%</div>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              {t('common.totalHits')}
            </div>
            <div className="text-2xl font-black text-slate-800">
              {hitCount} <span className="text-xs font-normal text-slate-400">/ {totalTrials}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.totalTimeSpent')}
            </div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {formatSecondsToTimer(totalElapsedSeconds)}
            </div>
          </div>
        </div>

        {/* 分阶段明细成果 */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('common.stageBreakdown')}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stageResults.map((stage, idx) => {
              const stageHits = stage.history.filter((h) => h.isHit).length;
              const stageAcc =
                stage.history.length > 0 ? Math.round((stageHits / stage.history.length) * 100) : 0;
              const startLvl = stage.history.length > 0 ? stage.history[0].levelBefore : 5;
              const endLvl =
                stage.history.length > 0
                  ? stage.history[stage.history.length - 1].levelAfter
                  : startLvl;
              const Icon = stage.card.icon;
              const cardTitle = getCardTitle(stage.card, t);

              return (
                <div
                  key={`${stage.card.id}-${idx}`}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-slate-800 text-white font-mono text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-white text-indigo-600 border border-slate-200/60 shadow-sm">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{cardTitle}</div>
                      <div className="text-[10px] text-slate-400">
                        {t('common.trialsCorrect', {
                          hits: stageHits,
                          total: stage.history.length,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-xl border border-slate-200/60">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-indigo-600">L{endLvl}</span>
                    </div>

                    <span
                      className={`text-xs font-black font-mono px-2 py-1 rounded-xl ${
                        stageAcc >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : stageAcc >= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {stageAcc}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部动作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {t('common.completeAndReturnHome')}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('common.restartPlan')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 6: 在 `FilterEngine.tsx` 中提取 `FilterSectionHeader` 子组件

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript.old
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';
import { TagPill } from '../common/TagPill';

interface FilterEngineProps {
~~~~~
~~~~~typescript.new
import type { ComponentChildren } from 'preact';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';
import { TagPill } from '../common/TagPill';

function FilterSectionHeader({
  icon: Icon,
  title,
  iconColorClass = 'text-indigo-500',
}: {
  icon: (props: { className?: string }) => ComponentChildren;
  title: string;
  iconColorClass?: string;
}) {
  return (
    <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
      <Icon className={`w-3 h-3 ${iconColorClass}`} />
      {title}
    </div>
  );
}

interface FilterEngineProps {
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript.old
      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className={`space-y-1 border-t border-slate-200/60 ${isCompact ? 'pt-1.5' : 'pt-3'}`}>
          <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            {t('home.allPacks')}
          </div>
          <div
            className={`flex gap-1 items-center ${
              isCompact ? 'flex-nowrap overflow-x-auto pb-1.5 scrollbar-none' : 'flex-wrap'
            }`}
          >
~~~~~
~~~~~typescript.new
      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className={`space-y-1 border-t border-slate-200/60 ${isCompact ? 'pt-1.5' : 'pt-3'}`}>
          <FilterSectionHeader icon={Boxes} title={t('home.allPacks')} />
          <div
            className={`flex gap-1 items-center ${
              isCompact ? 'flex-nowrap overflow-x-auto pb-1.5 scrollbar-none' : 'flex-wrap'
            }`}
          >
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript.old
          {/* 1. 视觉域维度 (Visual Domain) */}
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3 text-indigo-500" />
              {t('home.domainSection')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((d) => (
                <TagPill
                  key={d}
                  size={tagSize}
                  label={t(DOMAIN_TAGS[d].i18nKey)}
                  themeColor={DOMAIN_TAGS[d].themeColor || 'indigo'}
                  selected={query.domains?.includes(d) ?? false}
                  onClick={() => toggleDomain(d)}
                />
              ))}
            </div>
          </div>

          {/* 2. 认知路径维度 (Cognitive Path) */}
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-500" />
              {t('home.pathSection')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((p) => (
                <TagPill
                  key={p}
                  size={tagSize}
                  label={t(PATH_TAGS[p].i18nKey)}
                  themeColor={PATH_TAGS[p].themeColor || 'emerald'}
                  selected={query.paths?.includes(p) ?? false}
                  onClick={() => togglePath(p)}
                />
              ))}
            </div>
          </div>

          {/* 3. 心智抗性维度 (Mental Challenge) */}
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3 text-rose-500" />
              {t('home.challengeSection')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((c) => (
                <TagPill
                  key={c}
                  size={tagSize}
                  label={t(CHALLENGE_TAGS[c].i18nKey)}
                  themeColor={CHALLENGE_TAGS[c].themeColor || 'rose'}
                  selected={query.challenges?.includes(c) ?? false}
                  onClick={() => toggleChallenge(c)}
                />
              ))}
            </div>
          </div>

          {/* 4. 交互形态维度 (Interaction Mode) */}
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-amber-500" />
              {t('home.interactionSection')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(INTERACTION_TAGS) as InteractionTag[]).map((i) => (
                <TagPill
                  key={i}
                  size={tagSize}
                  label={t(INTERACTION_TAGS[i].i18nKey)}
                  themeColor={INTERACTION_TAGS[i].themeColor || 'amber'}
                  selected={query.interactions?.includes(i) ?? false}
                  onClick={() => toggleInteraction(i)}
                />
              ))}
            </div>
          </div>

          {/* 5. 特性与发布状态 (Status Tag) */}
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-purple-500" />
              {t('home.statusSection')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(['stable', 'experimental'] as CardStatusTag[]).map((st) => (
                <TagPill
                  key={st}
                  size={tagSize}
                  label={t(STATUS_TAGS[st].i18nKey)}
                  themeColor={STATUS_TAGS[st].themeColor || (st === 'stable' ? 'indigo' : 'purple')}
                  selected={query.statuses?.includes(st) ?? false}
                  onClick={() => toggleStatus(st)}
                />
              ))}
            </div>
          </div>
~~~~~
~~~~~typescript.new
          {/* 1. 视觉域维度 (Visual Domain) */}
          <div className="space-y-1">
            <FilterSectionHeader icon={Eye} title={t('home.domainSection')} />
            <div className="flex flex-wrap gap-1">
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((d) => (
                <TagPill
                  key={d}
                  size={tagSize}
                  label={t(DOMAIN_TAGS[d].i18nKey)}
                  themeColor={DOMAIN_TAGS[d].themeColor || 'indigo'}
                  selected={query.domains?.includes(d) ?? false}
                  onClick={() => toggleDomain(d)}
                />
              ))}
            </div>
          </div>

          {/* 2. 认知路径维度 (Cognitive Path) */}
          <div className="space-y-1">
            <FilterSectionHeader icon={Compass} title={t('home.pathSection')} iconColorClass="text-emerald-500" />
            <div className="flex flex-wrap gap-1">
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((p) => (
                <TagPill
                  key={p}
                  size={tagSize}
                  label={t(PATH_TAGS[p].i18nKey)}
                  themeColor={PATH_TAGS[p].themeColor || 'emerald'}
                  selected={query.paths?.includes(p) ?? false}
                  onClick={() => togglePath(p)}
                />
              ))}
            </div>
          </div>

          {/* 3. 心智抗性维度 (Mental Challenge) */}
          <div className="space-y-1">
            <FilterSectionHeader icon={Brain} title={t('home.challengeSection')} iconColorClass="text-rose-500" />
            <div className="flex flex-wrap gap-1">
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((c) => (
                <TagPill
                  key={c}
                  size={tagSize}
                  label={t(CHALLENGE_TAGS[c].i18nKey)}
                  themeColor={CHALLENGE_TAGS[c].themeColor || 'rose'}
                  selected={query.challenges?.includes(c) ?? false}
                  onClick={() => toggleChallenge(c)}
                />
              ))}
            </div>
          </div>

          {/* 4. 交互形态维度 (Interaction Mode) */}
          <div className="space-y-1">
            <FilterSectionHeader icon={MousePointer} title={t('home.interactionSection')} iconColorClass="text-amber-500" />
            <div className="flex flex-wrap gap-1">
              {(Object.keys(INTERACTION_TAGS) as InteractionTag[]).map((i) => (
                <TagPill
                  key={i}
                  size={tagSize}
                  label={t(INTERACTION_TAGS[i].i18nKey)}
                  themeColor={INTERACTION_TAGS[i].themeColor || 'amber'}
                  selected={query.interactions?.includes(i) ?? false}
                  onClick={() => toggleInteraction(i)}
                />
              ))}
            </div>
          </div>

          {/* 5. 特性与发布状态 (Status Tag) */}
          <div className="space-y-1">
            <FilterSectionHeader icon={FlaskConical} title={t('home.statusSection')} iconColorClass="text-purple-500" />
            <div className="flex flex-wrap gap-1">
              {(['stable', 'experimental'] as CardStatusTag[]).map((st) => (
                <TagPill
                  key={st}
                  size={tagSize}
                  label={t(STATUS_TAGS[st].i18nKey)}
                  themeColor={STATUS_TAGS[st].themeColor || (st === 'stable' ? 'indigo' : 'purple')}
                  selected={query.statuses?.includes(st) ?? false}
                  onClick={() => toggleStatus(st)}
                />
              ))}
            </div>
          </div>
~~~~~

### 下一步建议

1. **类型检查与测试验证**：运行 `npm run check`（或 `biome check . && tsc --noEmit`），确保所有重构文件的类型与导出完全匹配。
2. **复验 DRY 报告**：再次执行 `python scripts/check_dry.py`，观察核心真阳性代码克隆与样式模式的减少效果。
