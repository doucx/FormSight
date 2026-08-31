好的，我将生成执行计划，实施剩余的 UI 设计系统原语收敛工作：创建通用 `Callout` 诊断与提示容器、重构 `Toast` 反馈组件、以及在各核心视图与分析插件中全量替换原先手写的指标瓷片（MetricCard）与诊断卡片。

## [WIP] refactor: 建立 Callout 原语并全量收敛度量与诊断卡片

### 用户需求
1. 新建 `Callout`（诊断与提示卡片）UI 原语，支持 `info`、`accent`、`success`、`warning`、`danger` 等多态。
2. 重构 `Toast.tsx` 以及各 Pack 的认知诊断卡片（`color`、`star`、`negative_space`、`CardAnalyticsView`），统一使用 `Callout`。
3. 全量替换 `StatsMetricCards`、`SessionSummaryModal`、`PlanSummaryModal` 及 `CardAnalyticsView` 中内联手写的 KPI 数据方块为统一的 `<MetricCard>` 原语。

### 评论
通过将残留的内联样式方块与散落的警告/诊断容器彻底抽象为通用原语，不仅可以使整个应用的圆角、边框、深浅色暗黑模式响应和内边距达到 100% 的视觉统一，还能显著降低组件树的重复样板代码。

### 目标
1. 创建 `src/components/ui/callout.tsx` 并在 `src/components/ui/index.ts` 导出。
2. 重构 `src/components/common/Toast.tsx` 使用 CVA 状态定义。
3. 重构 `src/components/stats/StatsMetricCards.tsx`、`src/components/SessionSummaryModal.tsx`、`src/components/plan/PlanSummaryModal.tsx` 与 `src/views/CardAnalyticsView.tsx` 接入 `<MetricCard>`。
4. 重构 `src/views/CardAnalyticsView.tsx`、`src/packs/color/analytics.tsx`、`src/packs/star/analytics.tsx`、`src/packs/negative_space/analytics.tsx` 接入 `<Callout>`。

### 基本原理
利用 `class-variance-authority` (cva) 集中定义语义化变体，并用 `cn()` 合并外部自定义样式。对于数据瓷片（MetricCard）和诊断提示框（Callout），提供开箱即用的主题配色与尺寸变体，彻底消除分散在各业务视图中的 `bg-amber-50/70`、`border-amber-200/60` 等硬编码字符串。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/cva-design-system #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建 `Callout` 原语并更新 UI 导出

我们将创建通用的 `Callout` 组件，并将其加入 `src/components/ui/index.ts`。

~~~~~act
write_file
src/components/ui/callout.tsx
~~~~~
~~~~~tsx
import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const calloutVariants = cva(
  'p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs transition-all',
  {
    variants: {
      variant: {
        default: 'bg-muted/60 border-border text-foreground',
        info: 'bg-accent/70 border-border/60 dark:border-border text-foreground',
        accent: 'bg-accent/80 border-border/60 text-primary',
        success:
          'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100',
        warning:
          'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60 text-amber-900 dark:text-amber-100',
        danger:
          'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60 text-rose-900 dark:text-rose-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface CalloutProps
  extends JSX.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {
  icon?: (props: { className?: string }) => ComponentChildren;
  title?: ComponentChildren;
  children?: ComponentChildren;
}

export function Callout({
  className,
  variant,
  icon: Icon,
  title,
  children,
  ...props
}: CalloutProps) {
  return (
    <div className={cn(calloutVariants({ variant }), className)} {...props}>
      {Icon && <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 space-y-1 min-w-0">
        {title && <div className="font-bold">{title}</div>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/ui/index.ts
~~~~~
~~~~~typescript
export * from './metric-card';
~~~~~
~~~~~typescript
export * from './metric-card';
export * from './callout';
~~~~~

#### Acts 2: 使用 CVA 重构 `Toast.tsx`

我们将使用 CVA 模式规范化 Toast 消息项的配色与图标映射。

~~~~~act
write_file
src/components/common/Toast.tsx
~~~~~
~~~~~tsx
import { type VariantProps, cva } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const toastVariants = cva(
  'pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl border shadow-lg backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200',
  {
    variants: {
      type: {
        success:
          'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
        error:
          'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800',
        info: 'bg-accent/90 text-indigo-800 dark:text-indigo-200 border-border dark:border-border',
      },
    },
    defaultVariants: {
      type: 'info',
    },
  },
);

const toastIconMap = {
  success: { icon: CheckCircle, className: 'text-emerald-600' },
  error: { icon: AlertCircle, className: 'text-rose-600' },
  info: { icon: Info, className: 'text-primary' },
};

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
} & VariantProps<typeof toastVariants>) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const { icon: Icon, className: iconStyle } = toastIconMap[toast.type] || toastIconMap.info;

  return (
    <div className={cn(toastVariants({ type: toast.type }))}>
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 flex-shrink-0 ${iconStyle}`} />
        <span className="text-xs font-bold leading-tight">{toast.message}</span>
      </div>
      <Button
        variant="ghost"
        size="iconSm"
        onClick={onDismiss}
        className="text-muted-foreground hover:text-foreground ml-2 h-6 w-6"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
~~~~~

#### Acts 3: 在全局统计与总结弹窗中接入 `MetricCard`

我们将 `StatsMetricCards.tsx`、`SessionSummaryModal.tsx` 以及 `PlanSummaryModal.tsx` 的 KPI 方块替换为标准 `<MetricCard>`。

~~~~~act
write_file
src/components/stats/StatsMetricCards.tsx
~~~~~
~~~~~tsx
import { Activity, Calendar, Target, TrendingUp } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import { MetricCard } from '../ui/metric-card';

interface StatsMetricCardsProps {
  stats: {
    today: { total: number; hits: number };
    week: { total: number; hits: number };
    year: { total: number; hits: number };
    allTime: { total: number; hits: number };
  };
  streakDays: number;
}

export function StatsMetricCards({ stats, streakDays }: StatsMetricCardsProps) {
  const { t } = useTranslation();

  const calcAcc = (hits: number, total: number) =>
    total === 0 ? 0 : Math.round((hits / total) * 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Calendar className="w-4 h-4 text-primary" />
          {t('stats.todayTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.today.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-primary font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.today.hits, stats.today.total)}%
        </div>
      </MetricCard>

      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Target className="w-4 h-4 text-emerald-500" />
          {t('stats.weekTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.week.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.week.hits, stats.week.total)}%
        </div>
      </MetricCard>

      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Activity className="w-4 h-4 text-amber-500" />
          {t('stats.yearTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.year.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.year.hits, stats.year.total)}%
        </div>
      </MetricCard>

      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          {t('stats.allTimeTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.allTime.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-semibold mt-1">
          {t('stats.streakDays', { days: streakDays })}
        </div>
      </MetricCard>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~tsx
import { ModalShell } from './common/ModalShell';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export interface SessionHistoryItem {
~~~~~
~~~~~tsx
import { ModalShell } from './common/ModalShell';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MetricCard } from './ui/metric-card';

export interface SessionHistoryItem {
~~~~~
~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~tsx
        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/60 p-3.5 rounded-2xl border border-border/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-primary" />
              {t('summary.accuracyCount')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">{accuracy}%</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('summary.trialsDone', { hits: hitCount, total: totalTrials })}
              </span>
            </div>
          </div>

          <div className="bg-muted/60 p-3.5 rounded-2xl border border-border/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t('summary.duration')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">
                {formatSecondsToTimer(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('summary.secPerTrial', { sec: avgResponseTimeSec })}
              </span>
            </div>
          </div>
        </div>
~~~~~
~~~~~tsx
        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-primary" />
              {t('summary.accuracyCount')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">{accuracy}%</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('summary.trialsDone', { hits: hitCount, total: totalTrials })}
              </span>
            </div>
          </MetricCard>

          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t('summary.duration')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">
                {formatSecondsToTimer(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('summary.secPerTrial', { sec: avgResponseTimeSec })}
              </span>
            </div>
          </MetricCard>
        </div>
~~~~~

~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~tsx
import { ModalShell } from '../common/ModalShell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export interface PlanStageResult {
~~~~~
~~~~~tsx
import { ModalShell } from '../common/ModalShell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MetricCard } from '../ui/metric-card';

export interface PlanStageResult {
~~~~~
~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~tsx
        {/* 核心综合大盘卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-accent p-3.5 rounded-2xl border border-border/60 dark:border-border/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-primary" />
              {t('common.overallAccuracy')}
            </div>
            <div className="text-2xl font-black text-foreground">{accuracy}%</div>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              {t('common.totalHits')}
            </div>
            <div className="text-2xl font-black text-foreground">
              {hitCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {totalTrials}</span>
            </div>
          </div>

          <div className="bg-muted/60 p-3.5 rounded-2xl border border-border/60 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t('common.totalTimeSpent')}
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {formatSecondsToTimer(totalElapsedSeconds)}
            </div>
          </div>
        </div>
~~~~~
~~~~~tsx
        {/* 核心综合大盘卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard variant="accent" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-primary" />
              {t('common.overallAccuracy')}
            </div>
            <div className="text-2xl font-black text-foreground">{accuracy}%</div>
          </MetricCard>

          <MetricCard variant="success" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              {t('common.totalHits')}
            </div>
            <div className="text-2xl font-black text-foreground">
              {hitCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {totalTrials}</span>
            </div>
          </MetricCard>

          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t('common.totalTimeSpent')}
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {formatSecondsToTimer(totalElapsedSeconds)}
            </div>
          </MetricCard>
        </div>
~~~~~

#### Acts 4: 重构 `CardAnalyticsView.tsx` 接入 `MetricCard` 与 `Callout`

我们将卡片分析详情页的数据总览和大盘认知诊断重构为通用 UI 原语。

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~tsx
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { getCognitiveOverviewInsights } from '../core/analytics/universalViews';
~~~~~
~~~~~tsx
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Callout } from '../components/ui/callout';
import { MetricCard } from '../components/ui/metric-card';
import { getCognitiveOverviewInsights } from '../core/analytics/universalViews';
~~~~~
~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~tsx
          {/* 4 维核心大指标卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <Target className="w-4 h-4 text-primary" />
                {t('common.accuracy')}
              </div>
              <div className="text-3xl font-black text-foreground">{summaryStats.accuracy}%</div>
            </div>

            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {t('common.totalHits')}
              </div>
              <div className="text-3xl font-black text-foreground">
                {summaryStats.hits}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  / {summaryStats.total}
                </span>
              </div>
            </div>

            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <Clock className="w-4 h-4 text-primary" />
                {t('summary.duration')}
              </div>
              <div className="text-3xl font-black text-foreground font-mono">
                {summaryStats.avgResponseTimeSec}
                <span className="text-xs font-normal text-muted-foreground"> s</span>
              </div>
            </div>

            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                {t('stats.dailyMaxLevel')}
              </div>
              <div className="text-3xl font-black text-foreground font-mono">
                Lvl {summaryStats.maxLevel}
              </div>
            </div>
          </div>
~~~~~
~~~~~tsx
          {/* 4 维核心大指标卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <Target className="w-4 h-4 text-primary" />
                {t('common.accuracy')}
              </div>
              <div className="text-3xl font-black text-foreground">{summaryStats.accuracy}%</div>
            </MetricCard>

            <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {t('common.totalHits')}
              </div>
              <div className="text-3xl font-black text-foreground">
                {summaryStats.hits}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  / {summaryStats.total}
                </span>
              </div>
            </MetricCard>

            <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <Clock className="w-4 h-4 text-primary" />
                {t('summary.duration')}
              </div>
              <div className="text-3xl font-black text-foreground font-mono">
                {summaryStats.avgResponseTimeSec}
                <span className="text-xs font-normal text-muted-foreground"> s</span>
              </div>
            </MetricCard>

            <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                {t('stats.dailyMaxLevel')}
              </div>
              <div className="text-3xl font-black text-foreground font-mono">
                Lvl {summaryStats.maxLevel}
              </div>
            </MetricCard>
          </div>
~~~~~
~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~tsx
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {(() => {
                const insights = getCognitiveOverviewInsights(records);
                return (
                  <>
                    <div className="p-4 bg-muted/60 border border-border rounded-2xl text-foreground flex items-start gap-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-foreground leading-relaxed space-y-1">
                        <div className="font-bold text-foreground">
                          {t('analyticsModal.paceSummaryTitle')}
                        </div>
                        <p className="text-muted-foreground">{insights.paceSummaryText}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/60 border border-border rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-accent text-primary rounded-xl flex-shrink-0">
                        <Gauge className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-foreground leading-relaxed space-y-1">
                        <div className="font-bold text-foreground">
                          {t('analyticsModal.levelFocusSummaryTitle')}
                        </div>
                        <p className="text-muted-foreground">{insights.growthZoneText}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
~~~~~
~~~~~tsx
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {(() => {
                const insights = getCognitiveOverviewInsights(records);
                return (
                  <>
                    <Callout
                      variant="warning"
                      icon={Zap}
                      title={t('analyticsModal.paceSummaryTitle')}
                    >
                      <p className="text-muted-foreground text-xs">{insights.paceSummaryText}</p>
                    </Callout>

                    <Callout
                      variant="accent"
                      icon={Gauge}
                      title={t('analyticsModal.levelFocusSummaryTitle')}
                    >
                      <p className="text-muted-foreground text-xs">{insights.growthZoneText}</p>
                    </Callout>
                  </>
                );
              })()}
            </div>
~~~~~

#### Acts 5: 重构各 Pack 诊断面板接入 `Callout`

我们将 `color`、`star`、`negative_space` 扩展包中的诊断卡片全部更新为 `<Callout>`。

~~~~~act
patch_file
src/packs/color/analytics.tsx
~~~~~
~~~~~tsx
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import { hsvToHex } from '../../core/color/colorUtils';
~~~~~
~~~~~tsx
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { hsvToHex } from '../../core/color/colorUtils';
~~~~~
~~~~~act
patch_file
src/packs/color/analytics.tsx
~~~~~
~~~~~tsx
        return (
          <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-800/60 dark:border-amber-800/60 space-y-2 text-xs">
            <div className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              {i18n.t('packs.color.analytics.hueBias.cardTitle')}
            </div>

            <div className="space-y-1 text-[11px] text-foreground">
              <div className="flex justify-between bg-white p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-sm font-mono">
                <span>{i18n.t('packs.color.analytics.hueBias.avgSignedBias')}</span>
                <span
                  className={`font-bold ${
                    avgSignedBias > 0
                      ? 'text-amber-600'
                      : avgSignedBias < 0
                        ? 'text-primary'
                        : 'text-foreground'
                  }`}
                >
                  {signedBiasText}
                </span>
              </div>

              {maxBiasSector ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-muted-foreground">
                    {i18n.t('packs.color.analytics.hueBias.maxBiasSector')}
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      {maxBiasSector.label}
                    </span>
                  </p>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{
                          backgroundColor: hsvToHex(maxBiasSector.sectorIdx * 30 + 15, 100, 100),
                        }}
                      />
                      <span className="font-bold text-foreground">
                        {maxBiasSector.label.split(' ')[0]}
                      </span>
                    </div>
                    <span className="font-black text-amber-700 font-mono text-xs">
                      {i18n.t('packs.color.analytics.hueBias.avgBias')}{' '}
                      {maxBiasSector.avgBias > 0
                        ? `+${maxBiasSector.avgBias}°`
                        : `${maxBiasSector.avgBias}°`}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-[10px] mt-1">
                  {i18n.t('packs.color.analytics.hueBias.needMoreTrials')}
                </p>
              )}
            </div>
          </div>
        );
~~~~~
~~~~~tsx
        return (
          <Callout
            variant="warning"
            icon={AlertCircle}
            title={i18n.t('packs.color.analytics.hueBias.cardTitle')}
          >
            <div className="space-y-2 text-[11px] text-foreground pt-1">
              <div className="flex justify-between bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs font-mono">
                <span className="text-muted-foreground">
                  {i18n.t('packs.color.analytics.hueBias.avgSignedBias')}
                </span>
                <span
                  className={`font-bold ${
                    avgSignedBias > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : avgSignedBias < 0
                        ? 'text-primary'
                        : 'text-foreground'
                  }`}
                >
                  {signedBiasText}
                </span>
              </div>

              {maxBiasSector ? (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground">
                    {i18n.t('packs.color.analytics.hueBias.maxBiasSector')}
                    <span className="font-bold text-amber-700 dark:text-amber-300 ml-1">
                      {maxBiasSector.label}
                    </span>
                  </p>
                  <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{
                          backgroundColor: hsvToHex(maxBiasSector.sectorIdx * 30 + 15, 100, 100),
                        }}
                      />
                      <span className="font-bold text-foreground">
                        {maxBiasSector.label.split(' ')[0]}
                      </span>
                    </div>
                    <span className="font-black text-amber-700 dark:text-amber-300 font-mono text-xs">
                      {i18n.t('packs.color.analytics.hueBias.avgBias')}{' '}
                      {maxBiasSector.avgBias > 0
                        ? `+${maxBiasSector.avgBias}°`
                        : `${maxBiasSector.avgBias}°`}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-[10px]">
                  {i18n.t('packs.color.analytics.hueBias.needMoreTrials')}
                </p>
              )}
            </div>
          </Callout>
        );
~~~~~
~~~~~act
patch_file
src/packs/color/analytics.tsx
~~~~~
~~~~~tsx
        return (
          <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-800/60 dark:border-amber-800/60 space-y-2 text-xs">
            <div className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              {i18n.t('packs.color.analytics.hueRing.cardTitle')}
            </div>
            {weakestSector ? (
              <div className="space-y-2">
                <p className="text-foreground text-[11px]">
                  {i18n.t('packs.color.analytics.hueRing.weakestHint', {
                    sector: weakestSector.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{
                        backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                      }}
                    />
                    <span className="font-bold text-foreground">
                      {weakestSector.label.split(' ')[0]}
                    </span>
                  </div>
                  <span className="font-black text-rose-600 text-sm">
                    {i18n.t('packs.color.analytics.hueRing.accuracyRate', {
                      accuracy: weakestSector.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-[11px]">
                {i18n.t('packs.color.analytics.hueRing.needMoreTrials')}
              </p>
            )}
          </div>
        );
~~~~~
~~~~~tsx
        return (
          <Callout
            variant="warning"
            icon={AlertCircle}
            title={i18n.t('packs.color.analytics.hueRing.cardTitle')}
          >
            {weakestSector ? (
              <div className="space-y-2 pt-1">
                <p className="text-foreground text-[11px]">
                  {i18n.t('packs.color.analytics.hueRing.weakestHint', {
                    sector: weakestSector.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{
                        backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                      }}
                    />
                    <span className="font-bold text-foreground">
                      {weakestSector.label.split(' ')[0]}
                    </span>
                  </div>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                    {i18n.t('packs.color.analytics.hueRing.accuracyRate', {
                      accuracy: weakestSector.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-[11px]">
                {i18n.t('packs.color.analytics.hueRing.needMoreTrials')}
              </p>
            )}
          </Callout>
        );
~~~~~

~~~~~act
patch_file
src/packs/star/analytics.tsx
~~~~~
~~~~~tsx
import { Compass, Target } from 'lucide-preact';
import { type CardAnalyticsPlugin, calculateBasicOverallStats } from '../../core/contracts';
~~~~~
~~~~~tsx
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { type CardAnalyticsPlugin, calculateBasicOverallStats } from '../../core/contracts';
~~~~~
~~~~~act
patch_file
src/packs/star/analytics.tsx
~~~~~
~~~~~tsx
          return (
            <div className="bg-accent/70 p-3.5 rounded-2xl border border-border/60 dark:border-border space-y-2 text-xs">
              <div className="font-bold text-primary font-black flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-primary" />
                {i18n.t('packs.star.analytics.spatialBias.cardTitle')}
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                {i18n.t('packs.star.analytics.spatialBias.desc')}
              </p>
              <div className="pt-1 space-y-1 font-mono text-foreground">
                <div className="flex justify-between">
                  <span>{i18n.t('packs.star.analytics.spatialBias.avgDx')}</span>
                  <span className="font-bold">{dxText}</span>
                </div>
                <div className="flex justify-between">
                  <span>{i18n.t('packs.star.analytics.spatialBias.avgDy')}</span>
                  <span className="font-bold">{dyText}</span>
                </div>
                <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-200/60 pt-1">
                  <span>{i18n.t('packs.star.analytics.spatialBias.avgDist')}</span>
                  <span>{avgDist}px</span>
                </div>
              </div>
            </div>
          );
~~~~~
~~~~~tsx
          return (
            <Callout
              variant="info"
              icon={Target}
              title={i18n.t('packs.star.analytics.spatialBias.cardTitle')}
            >
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                {i18n.t('packs.star.analytics.spatialBias.desc')}
              </p>
              <div className="pt-1.5 space-y-1 font-mono text-foreground">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {i18n.t('packs.star.analytics.spatialBias.avgDx')}
                  </span>
                  <span className="font-bold">{dxText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {i18n.t('packs.star.analytics.spatialBias.avgDy')}
                  </span>
                  <span className="font-bold">{dyText}</span>
                </div>
                <div className="flex justify-between text-primary font-bold border-t border-border/60 pt-1">
                  <span>{i18n.t('packs.star.analytics.spatialBias.avgDist')}</span>
                  <span>{avgDist}px</span>
                </div>
              </div>
            </Callout>
          );
~~~~~
~~~~~act
patch_file
src/packs/star/analytics.tsx
~~~~~
~~~~~tsx
          return (
            <div className="bg-accent/70 p-3.5 rounded-2xl border border-border/60 dark:border-border space-y-2 text-xs">
              <div className="font-bold text-primary font-black flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-primary" />
                {i18n.t('packs.star.analytics.directionalCompass.cardTitle')}
              </div>
              {weakest ? (
                <div className="space-y-1.5 text-[11px] text-foreground">
                  <p>
                    {i18n.t('packs.star.analytics.directionalCompass.weakestHint', {
                      sector: weakest.label,
                    })}
                  </p>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-border/60 font-mono">
                    <span>{weakest.label}</span>
                    <span className="font-bold text-rose-600">
                      {i18n.t('packs.star.analytics.directionalCompass.accuracyRate', {
                        accuracy: weakest.accuracy,
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  {i18n.t('packs.star.analytics.directionalCompass.needMoreTrials')}
                </p>
              )}
            </div>
          );
~~~~~
~~~~~tsx
          return (
            <Callout
              variant="info"
              icon={Compass}
              title={i18n.t('packs.star.analytics.directionalCompass.cardTitle')}
            >
              {weakest ? (
                <div className="space-y-1.5 text-[11px] text-foreground pt-1">
                  <p>
                    {i18n.t('packs.star.analytics.directionalCompass.weakestHint', {
                      sector: weakest.label,
                    })}
                  </p>
                  <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                    <span>{weakest.label}</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {i18n.t('packs.star.analytics.directionalCompass.accuracyRate', {
                        accuracy: weakest.accuracy,
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  {i18n.t('packs.star.analytics.directionalCompass.needMoreTrials')}
                </p>
              )}
            </Callout>
          );
~~~~~

~~~~~act
patch_file
src/packs/negative_space/analytics.tsx
~~~~~
~~~~~tsx
import { Crosshair } from 'lucide-preact';
import { type CardAnalyticsPlugin, calculateBasicOverallStats } from '../../core/contracts';
~~~~~
~~~~~tsx
import { Crosshair } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { type CardAnalyticsPlugin, calculateBasicOverallStats } from '../../core/contracts';
~~~~~
~~~~~act
patch_file
src/packs/negative_space/analytics.tsx
~~~~~
~~~~~tsx
        return (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 space-y-2 text-xs">
            <div className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
              {i18n.t('packs.negative_space.analytics.ratioScatter.cardTitle')}
            </div>
            <div className="space-y-1.5 text-[11px] text-foreground">
              <div className="flex justify-between font-mono bg-white p-2 rounded-xl border border-emerald-100">
                <span className="text-muted-foreground">
                  {i18n.t('packs.negative_space.analytics.ratioScatter.avgError')}
                </span>
                <span className="font-bold text-emerald-700">±{avgRatioErr}%</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {i18n.t('packs.negative_space.analytics.ratioScatter.desc')}
              </p>
            </div>
          </div>
        );
~~~~~
~~~~~tsx
        return (
          <Callout
            variant="success"
            icon={Crosshair}
            title={i18n.t('packs.negative_space.analytics.ratioScatter.cardTitle')}
          >
            <div className="space-y-1.5 text-[11px] text-foreground pt-1">
              <div className="flex justify-between font-mono bg-card p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                <span className="text-muted-foreground">
                  {i18n.t('packs.negative_space.analytics.ratioScatter.avgError')}
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  ±{avgRatioErr}%
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {i18n.t('packs.negative_space.analytics.ratioScatter.desc')}
              </p>
            </div>
          </Callout>
        );
~~~~~

### 下一步建议
1. 运行类型检查（`tsc --noEmit` 或项目构建）验证所有组件的 props 与导入正确性。
2. 体验深色模式与浅色模式下的诊断卡片与度量瓷片表现，确保视觉对比度与层级完全一致。
3. 若确认本次重构无误，可以生成独立的 `[COMMIT]` 计划将此次 UI 原语及卡片收敛成果提交至版本控制。
