现在我们将针对 **`FilterEngine.tsx`** 和 **`universalViews.tsx`** 进行模块化物理拆解：

1. **重构 `FilterEngine.tsx`（SLOC 340 ➔ ~110）**：
   * 抽离 **`AdvancedTagMatrix.tsx`**：集中管理五维认知标签矩阵（视觉域、认知路径、心智抗性、交互形态、发布状态）的声明式配置渲染与切换逻辑；
   * 简化 **`FilterEngine.tsx`**：专注顶栏搜索框、快捷清除与 Packs 扩展包横向滚动栏。

2. **重构 `universalViews.tsx`（SLOC 460 ➔ ~70）**：
   * 抽离 **`speedAccuracyView.tsx`**：负责作答耗时-正确率（SAT）分箱算法、Canvas 面积折线图绘制与诊断组件；
   * 抽离 **`difficultyPlateauView.tsx`**：负责层阶难度分布分箱算法、Canvas 平台图绘制与诊断组件；
   * 保留 **`universalViews.tsx`** 作为统一入口与认知概要洞察（`getCognitiveOverviewInsights`）提供者，并完整保持原有导出兼容性。

## [WIP] refactor: 模块化拆解 FilterEngine 与 universalViews 分析模块

### 用户需求
进一步拆解剩余的复杂度偏高文件：`FilterEngine.tsx`（大盘筛选矩阵）与 `universalViews.tsx`（460 行复合图表绘制）。

### 评论
`FilterEngine` 中五维标签矩阵存在模板与 toggle 函数样板代码；`universalViews` 则是将两套完全独立的 Canvas 可视化引擎与分箱算法杂糅在一个文件中。物理拆解后，两者的代码组织将大幅清晰化。

### 目标
1. 新建 `src/components/discovery/AdvancedTagMatrix.tsx` 承载五维高级标签矩阵。
2. 重写 `src/components/discovery/FilterEngine.tsx` 为轻量搜索过滤头。
3. 新建 `src/core/analytics/speedAccuracyView.tsx` 封装 SAT 耗时分析图。
4. 新建 `src/core/analytics/difficultyPlateauView.tsx` 封装难度层阶分析图。
5. 重构 `src/core/analytics/universalViews.tsx` 聚合统一视图并提供全量兼容导出。

### 基本原理
配置驱动视图渲染（Config-Driven UI）与单一图表职责分离，消除重复的维度切换代码与超大 Canvas 绘图算法文件。

### 标签
#intent/refine #flow/ready #priority/high #comp/discovery #comp/core #concept/ui #concept/parser #scope/core #scope/dx #ai/delegate #task/domain/refactoring #task/object/god-files #task/action/modularization #task/state/continue

---

### Script

#### Acts 1: 创建 `AdvancedTagMatrix.tsx` 高级五维标签矩阵组件

新建五维标签矩阵折叠区组件，通过统一的数据配置驱动渲染视觉域、认知路径、心智抗性、交互形态与发布状态。

~~~~~act
write_file
src/components/discovery/AdvancedTagMatrix.tsx
~~~~~
~~~~~typescript
import { Brain, Compass, Eye, FlaskConical, MousePointer } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import {
  CHALLENGE_TAGS,
  DOMAIN_TAGS,
  INTERACTION_TAGS,
  PATH_TAGS,
  STATUS_TAGS,
} from '../../config/tags';
import { useTranslation } from '../../core/i18n';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';
import { TagPill } from '../common/TagPill';

export function FilterSectionHeader({
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

interface AdvancedTagMatrixProps {
  query: CardQueryOptions;
  tagSize: 'sm' | 'md';
  isCompact?: boolean;
  onToggleDomain: (d: VisualDomainTag) => void;
  onTogglePath: (p: CognitivePathTag) => void;
  onToggleChallenge: (c: MentalChallengeTag) => void;
  onToggleInteraction: (i: InteractionTag) => void;
  onToggleStatus: (st: CardStatusTag) => void;
}

export function AdvancedTagMatrix({
  query,
  tagSize,
  isCompact = false,
  onToggleDomain,
  onTogglePath,
  onToggleChallenge,
  onToggleInteraction,
  onToggleStatus,
}: AdvancedTagMatrixProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`space-y-2.5 border-t border-slate-200/60 ${
        isCompact ? 'pt-2 max-h-52 overflow-y-auto pr-1' : 'pt-3.5 space-y-3.5'
      } animate-in fade-in duration-150`}
    >
      {/* 1. 视觉域维度 */}
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
              onClick={() => onToggleDomain(d)}
            />
          ))}
        </div>
      </div>

      {/* 2. 认知路径维度 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={Compass}
          title={t('home.pathSection')}
          iconColorClass="text-emerald-500"
        />
        <div className="flex flex-wrap gap-1">
          {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((p) => (
            <TagPill
              key={p}
              size={tagSize}
              label={t(PATH_TAGS[p].i18nKey)}
              themeColor={PATH_TAGS[p].themeColor || 'emerald'}
              selected={query.paths?.includes(p) ?? false}
              onClick={() => onTogglePath(p)}
            />
          ))}
        </div>
      </div>

      {/* 3. 心智抗性维度 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={Brain}
          title={t('home.challengeSection')}
          iconColorClass="text-rose-500"
        />
        <div className="flex flex-wrap gap-1">
          {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((c) => (
            <TagPill
              key={c}
              size={tagSize}
              label={t(CHALLENGE_TAGS[c].i18nKey)}
              themeColor={CHALLENGE_TAGS[c].themeColor || 'rose'}
              selected={query.challenges?.includes(c) ?? false}
              onClick={() => onToggleChallenge(c)}
            />
          ))}
        </div>
      </div>

      {/* 4. 交互形态维度 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={MousePointer}
          title={t('home.interactionSection')}
          iconColorClass="text-amber-500"
        />
        <div className="flex flex-wrap gap-1">
          {(Object.keys(INTERACTION_TAGS) as InteractionTag[]).map((i) => (
            <TagPill
              key={i}
              size={tagSize}
              label={t(INTERACTION_TAGS[i].i18nKey)}
              themeColor={INTERACTION_TAGS[i].themeColor || 'amber'}
              selected={query.interactions?.includes(i) ?? false}
              onClick={() => onToggleInteraction(i)}
            />
          ))}
        </div>
      </div>

      {/* 5. 特性与发布状态 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={FlaskConical}
          title={t('home.statusSection')}
          iconColorClass="text-purple-500"
        />
        <div className="flex flex-wrap gap-1">
          {(['stable', 'experimental'] as CardStatusTag[]).map((st) => (
            <TagPill
              key={st}
              size={tagSize}
              label={t(STATUS_TAGS[st].i18nKey)}
              themeColor={STATUS_TAGS[st].themeColor || (st === 'stable' ? 'indigo' : 'purple')}
              selected={query.statuses?.includes(st) ?? false}
              onClick={() => onToggleStatus(st)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 2: 重构 `FilterEngine.tsx` 为精简搜索过滤栏

使用 `AdvancedTagMatrix` 简化 `FilterEngine.tsx`。

~~~~~act
write_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript
import { Boxes, Filter, RotateCcw, Search, Sparkles, X } from 'lucide-preact';
import { getPackTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';
import { TagPill } from '../common/TagPill';
import { AdvancedTagMatrix, FilterSectionHeader } from './AdvancedTagMatrix';

interface FilterEngineProps {
  query: CardQueryOptions;
  totalMatches: number;
  variant?: 'default' | 'compact';
  className?: string;
  onChange: (newQuery: CardQueryOptions) => void;
}

export function FilterEngine({
  query,
  totalMatches,
  variant = 'default',
  className = '',
  onChange,
}: FilterEngineProps) {
  const { t } = useTranslation();
  const isCompact = variant === 'compact';
  const isAdvancedOpen = Boolean(query.showAdvanced);
  const packs = registry.getAllPacks();

  const toggleDimension = <T extends string>(key: keyof CardQueryOptions, value: T) => {
    const current = (query[key] as T[] | undefined) || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...query, [key]: next.length > 0 ? next : undefined });
  };

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      query.packId ||
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );

  const containerClasses = isCompact
    ? `w-full bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-2.5 flex-shrink-0 ${className}`
    : `w-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${className}`;

  const tagSize = isCompact ? 'sm' : 'md';

  return (
    <div className={containerClasses}>
      {/* 顶栏：搜索框与操作控制 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search
            className={`${
              isCompact ? 'w-3.5 h-3.5 left-3' : 'w-4 h-4 left-3.5'
            } text-slate-400 absolute top-1/2 -translate-y-1/2 pointer-events-none`}
          />
          <input
            type="text"
            value={query.searchKeyword || ''}
            onInput={(e) =>
              onChange({ ...query, searchKeyword: (e.target as HTMLInputElement).value || undefined })
            }
            placeholder={t('home.searchPlaceholder')}
            className={`w-full ${
              isCompact
                ? 'pl-8 pr-8 py-1.5 text-xs rounded-xl'
                : 'pl-10 pr-10 py-2.5 text-xs rounded-2xl'
            } bg-white hover:bg-slate-100/60 focus:bg-white font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400 placeholder:font-normal`}
          />
          {query.searchKeyword && (
            <button
              type="button"
              onClick={() => onChange({ ...query, searchKeyword: undefined })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0">
          {!isCompact && (
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t('home.matchedModules', { count: totalMatches })}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onChange({ ...query, showAdvanced: !isAdvancedOpen })}
            className={`${
              isCompact ? 'px-2.5 py-1.5 text-[11px] rounded-lg' : 'px-3 py-2 text-xs rounded-xl'
            } font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isAdvancedOpen
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3 h-3 text-indigo-600" />
            <span>
              {isAdvancedOpen ? t('home.collapseAdvancedFilter') : t('home.advancedFilter')}
            </span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onChange(isAdvancedOpen ? { showAdvanced: true } : {})}
              className={`${
                isCompact ? 'px-2 py-1.5 text-[11px] rounded-lg' : 'px-2.5 py-2 text-xs rounded-xl'
              } font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 transition-all flex items-center gap-1 cursor-pointer`}
              title={t('common.clear')}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('common.clear')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className={`space-y-1 border-t border-slate-200/60 ${isCompact ? 'pt-1.5' : 'pt-3'}`}>
          <FilterSectionHeader icon={Boxes} title={t('home.allPacks')} />
          <div
            className={`flex gap-1 items-center ${
              isCompact ? 'flex-nowrap overflow-x-auto pb-1.5 scrollbar-none' : 'flex-wrap'
            }`}
          >
            <TagPill
              size={tagSize}
              label={t('home.allPacks')}
              selected={!query.packId}
              onClick={() => onChange({ ...query, packId: undefined })}
            />
            {packs.map((p) => (
              <TagPill
                key={p.packId}
                size={tagSize}
                label={getPackTitle(p, t)}
                count={p.cards.length}
                selected={query.packId === p.packId}
                onClick={() =>
                  onChange({ ...query, packId: query.packId === p.packId ? undefined : p.packId })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* 高级五维标签矩阵折叠区 */}
      {isAdvancedOpen && (
        <AdvancedTagMatrix
          query={query}
          tagSize={tagSize}
          isCompact={isCompact}
          onToggleDomain={(d) => toggleDimension('domains', d)}
          onTogglePath={(p) => toggleDimension('paths', p)}
          onToggleChallenge={(c) => toggleDimension('challenges', c)}
          onToggleInteraction={(i) => toggleDimension('interactions', i)}
          onToggleStatus={(st) => toggleDimension('statuses', st)}
        />
      )}
    </div>
  );
}
~~~~~

#### Acts 3: 创建 `speedAccuracyView.tsx` SAT 耗时分析图表模块

新建作答耗时与正确率（Speed-Accuracy Tradeoff）分析图表、分箱计算与诊断组件。

~~~~~act
write_file
src/core/analytics/speedAccuracyView.tsx
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../../utils/db/schema';
import { getAccuracyBadgeClass, getAccuracyColor } from '../../utils/theme';
import { initSquareHiDpiCanvas } from '../canvas/hidpi';
import { i18n } from '../i18n';

export interface SatBinStat {
  rangeLabel: string;
  minMs: number;
  maxMs: number;
  total: number;
  hits: number;
  accuracy: number;
}

export function calculateSpeedBins(records: UnifiedTrialRecord[]): SatBinStat[] {
  if (!records || records.length === 0) {
    return [
      { rangeLabel: '< 1.0s', minMs: 0, maxMs: 1000, total: 0, hits: 0, accuracy: 0 },
      { rangeLabel: '1.0~2.0s', minMs: 1000, maxMs: 2000, total: 0, hits: 0, accuracy: 0 },
      { rangeLabel: '2.0~3.5s', minMs: 2000, maxMs: 3500, total: 0, hits: 0, accuracy: 0 },
      { rangeLabel: '3.5~6.0s', minMs: 3500, maxMs: 6000, total: 0, hits: 0, accuracy: 0 },
      {
        rangeLabel: '> 6.0s',
        minMs: 6000,
        maxMs: Number.MAX_SAFE_INTEGER,
        total: 0,
        hits: 0,
        accuracy: 0,
      },
    ];
  }

  const times = records.map((r) => Number(r.responseTimeMs) || 0).sort((a, b) => a - b);
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  const maxBound = Math.max(2000, Math.ceil(p95 / 1000) * 1000);
  const step = maxBound / 5;

  const thresholds = [
    Math.round(step),
    Math.round(step * 2),
    Math.round(step * 3),
    Math.round(step * 4),
  ];

  const formatSec = (ms: number) => {
    const s = ms / 1000;
    return s >= 10 ? `${Math.round(s)}s` : `${s.toFixed(1)}s`;
  };

  const rawBins: { minMs: number; maxMs: number; rangeLabel: string }[] = [
    { minMs: 0, maxMs: thresholds[0], rangeLabel: `< ${formatSec(thresholds[0])}` },
    {
      minMs: thresholds[0],
      maxMs: thresholds[1],
      rangeLabel: `${formatSec(thresholds[0])}~${formatSec(thresholds[1])}`,
    },
    {
      minMs: thresholds[1],
      maxMs: thresholds[2],
      rangeLabel: `${formatSec(thresholds[1])}~${formatSec(thresholds[2])}`,
    },
    {
      minMs: thresholds[2],
      maxMs: thresholds[3],
      rangeLabel: `${formatSec(thresholds[2])}~${formatSec(thresholds[3])}`,
    },
    {
      minMs: thresholds[3],
      maxMs: Number.MAX_SAFE_INTEGER,
      rangeLabel: `> ${formatSec(thresholds[3])}`,
    },
  ];

  return rawBins.map((bin) => {
    const matched = records.filter(
      (r) => r.responseTimeMs >= bin.minMs && r.responseTimeMs < bin.maxMs,
    );
    const total = matched.length;
    const hits = matched.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { ...bin, total, hits, accuracy };
  });
}

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
  for (const p of points) {
    const { x, y, bin } = p;

    if (bin.total > 0) {
      const dotColor = getAccuracyColor(bin.accuracy);

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
    ctx.fillText(`${bin.total}${i18n.t('common.trialsUnit')}`, x, height - padding.bottom + 18);
  }
}

export function diagnoseSpeedAccuracy(records: UnifiedTrialRecord[]): ComponentChildren {
  const bins = calculateSpeedBins(records);
  const totalTrials = records.length;

  if (totalTrials === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
        {i18n.t('analyticsModal.satDistributionTitle')}
      </div>
      <div className="space-y-1.5">
        {bins.map((bin) => {
          const ratio = totalTrials > 0 ? Math.round((bin.total / totalTrials) * 100) : 0;
          return (
            <div
              key={bin.rangeLabel}
              className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold text-slate-700 min-w-[70px]">
                  {bin.rangeLabel}
                </span>
                <span className="text-[11px] text-slate-400">
                  {bin.total} {i18n.t('common.trialsUnit')} ({ratio}%)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${getAccuracyBadgeClass(
                    bin.accuracy,
                    bin.total,
                  )}`}
                >
                  {bin.total > 0 ? `${bin.accuracy}%` : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 创建 `difficultyPlateauView.tsx` 难度层阶分析图表模块

新建难度层阶与命中率（Difficulty Plateau）分析图表、分箱计算与诊断组件。

~~~~~act
write_file
src/core/analytics/difficultyPlateauView.tsx
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../../utils/db/schema';
import { getAccuracyBadgeClass, getAccuracyColor } from '../../utils/theme';
import { initSquareHiDpiCanvas } from '../canvas/hidpi';
import { i18n } from '../i18n';

export interface LevelBinStat {
  level: number;
  total: number;
  hits: number;
  accuracy: number;
}

export function calculateLevelStats(records: UnifiedTrialRecord[]): LevelBinStat[] {
  const levelMap = new Map<number, { total: number; hits: number }>();
  for (const r of records) {
    const lvl = Number(r.difficultyLevel) || 1;
    const curr = levelMap.get(lvl) || { total: 0, hits: 0 };
    curr.total += 1;
    if (r.isHit) curr.hits += 1;
    levelMap.set(lvl, curr);
  }

  const levels = Array.from(levelMap.keys()).sort((a, b) => a - b);
  return levels
    .map((l) => {
      const data = levelMap.get(l);
      if (!data) return null;
      return {
        level: l,
        total: data.total,
        hits: data.hits,
        accuracy: Math.round((data.hits / data.total) * 100),
      };
    })
    .filter((item): item is LevelBinStat => item !== null);
}

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

  const levelStats = calculateLevelStats(records);
  if (levelStats.length === 0) return;

  // Y 轴参考线
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
  for (const { x, y, stat } of points) {
    const dotColor = getAccuracyColor(stat.accuracy);

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
    ctx.fillText(`${stat.total}${i18n.t('common.trialsUnit')}`, x, height - padding.bottom + 18);
  }
}

export function diagnoseDifficultyPlateau(records: UnifiedTrialRecord[]): ComponentChildren {
  const levelStats = calculateLevelStats(records);
  const totalTrials = records.length;

  if (totalTrials === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  const mainLevel = [...levelStats].sort((a, b) => b.total - a.total)[0];
  const maxLevel = Math.max(...levelStats.map((s) => s.level));

  return (
    <div className="space-y-2">
      {mainLevel && (
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.levelFocusSummaryTitle')}: </span>
          {i18n.t('analyticsModal.levelFocusSummaryDesc', {
            max: maxLevel,
            focus: mainLevel.level,
            count: mainLevel.total,
            acc: mainLevel.accuracy,
          })}
        </div>
      )}

      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 pt-1">
        {i18n.t('analyticsModal.levelDistributionTitle')}
      </div>

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {levelStats.map((stat) => {
          const ratio = Math.round((stat.total / totalTrials) * 100);
          return (
            <div
              key={stat.level}
              className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-black text-slate-800 min-w-[45px]">
                  Lvl {stat.level}
                </span>
                <span className="text-[11px] text-slate-400">
                  {stat.total} {i18n.t('common.trialsUnit')} ({ratio}%)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${getAccuracyBadgeClass(
                    stat.accuracy,
                    stat.total,
                  )}`}
                >
                  {stat.total > 0 ? `${stat.accuracy}%` : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 重写 `universalViews.tsx` 整合统一入口

将 `universalViews.tsx` 重写为轻量聚合模块，保留认知概览洞察并完整向后兼容导出。

~~~~~act
write_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript
import { Gauge, Zap } from 'lucide-preact';
import type { UnifiedTrialRecord } from '../../utils/db/schema';
import type { CardAnalyticsView } from '../contracts';
import { i18n } from '../i18n';
import {
  calculateLevelStats,
  diagnoseDifficultyPlateau,
  renderDifficultyPlateauVisualizer,
} from './difficultyPlateauView';
import {
  calculateSpeedBins,
  diagnoseSpeedAccuracy,
  renderSpeedAccuracyVisualizer,
} from './speedAccuracyView';

export * from './speedAccuracyView';
export * from './difficultyPlateauView';

export function getCognitiveOverviewInsights(records: UnifiedTrialRecord[]): {
  paceSummaryText: string;
  growthZoneText: string;
} {
  if (!records || records.length === 0) {
    return {
      paceSummaryText: i18n.t('analyticsModal.needMoreSamples'),
      growthZoneText: i18n.t('analyticsModal.needMoreSamples'),
    };
  }

  // 1. 客观作答节奏分布概括
  const bins = calculateSpeedBins(records);
  const avgSec = (
    records.reduce((acc, r) => acc + (Number(r.responseTimeMs) || 0), 0) /
    records.length /
    1000
  ).toFixed(1);

  const populatedBins = [...bins].filter((b) => b.total > 0);
  const mainBin = populatedBins.sort((a, b) => b.total - a.total)[0];

  let paceSummaryText = '';
  if (mainBin) {
    paceSummaryText = i18n.t('analyticsModal.paceSummaryDesc', {
      avg: avgSec,
      range: mainBin.rangeLabel,
      acc: mainBin.accuracy,
    });
  } else {
    paceSummaryText = `${avgSec} s`;
  }

  // 2. 客观核心难度层阶概括
  const levelStats = calculateLevelStats(records);
  const maxLevel = Math.max(...records.map((r) => Number(r.difficultyLevel) || 1));
  const mainLevel = [...levelStats].sort((a, b) => b.total - a.total)[0];

  let growthZoneText = '';
  if (mainLevel) {
    growthZoneText = i18n.t('analyticsModal.levelFocusSummaryDesc', {
      max: maxLevel,
      focus: mainLevel.level,
      count: mainLevel.total,
      acc: mainLevel.accuracy,
    });
  } else {
    growthZoneText = `Lvl ${maxLevel}`;
  }

  return {
    paceSummaryText,
    growthZoneText,
  };
}

export const UNIVERSAL_ANALYTICS_VIEWS: CardAnalyticsView[] = [
  {
    id: 'universal_sat',
    tabLabel: 'analyticsModal.satTabLabel',
    title: 'analyticsModal.satTitle',
    subTitle: 'analyticsModal.satSubtitle',
    icon: Zap,
    renderVisualizer: renderSpeedAccuracyVisualizer,
    renderDiagnostics: diagnoseSpeedAccuracy,
  },
  {
    id: 'universal_plateau',
    tabLabel: 'analyticsModal.plateauTabLabel',
    title: 'analyticsModal.plateauTitle',
    subTitle: 'analyticsModal.plateauSubtitle',
    icon: Gauge,
    renderVisualizer: renderDifficultyPlateauVisualizer,
    renderDiagnostics: diagnoseDifficultyPlateau,
  },
];
~~~~~

### 下一步建议
1. 运行 `npm run check` 校验格式与类型。
2. 运行 `python3 scripts/check_god_files.py` 重新检测全工程的复杂度指数。
