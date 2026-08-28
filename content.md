好的，我们将为 FormSight 建立**通用卡片统计与认知分析系统**。

架构设计与实现策略

1. **复合统计管道 (Composite Analytics Pipeline)**：
   - 在 `src/core/analytics/universalViews.tsx` 中实现跨卡片通用的分析引擎：
     - **速度-准确率权衡分析 (SAT / Speed-Accuracy Tradeoff)**：通过时间分箱统计不同反应时区间的正确率与分布，诊断直觉甜点区与犹豫衰退；
     - **难度阶梯与抗压分析 (Difficulty Plateau & Fragility)**：统计各 Level 下的实战表现与通关率，探查认知舒适区与突破瓶颈。
2. **零侵入无缝接入**：
   - 在 `src/core/registry.ts` 的 `getAnalyticsPluginByCardId` 中自动为**所有卡片**合成通用分析视图（领域专属视图优先，通用统计视图紧随其后）。
3. **统计面板能力扩充**：
   - 升级 `WeaknessAnalyticsModal`：将卡片综合大盘数据（总刷题量、正确率、平均反应时、最高层阶等）作为常驻顶栏指标，与多维图表 Canvas + 诊断说明协同呈现。
4. **UI 与国际化对齐**：
   - 将卡片工具栏按钮由“弱点分析”更名为更具通用性的“统计 (Statistics)”，更新 `zh-CN.json` 和 `en-US.json` 词条。

以下是完整的执行计划。

## [WIP] feat: 实现通用卡片统计与反应时-正确率认知分析

### 用户需求
1. 为所有训练卡片自动支持通用的“统计与分析”能力，无需各卡片单独显式注册；
2. 在统计中包含反应时-正确率权衡 (SAT)、难度阶梯分布等通用认知分析，并呈现如总做答数、正确率、平均用时等卡片级统计数据；
3. 将“弱点分析”更名为“统计”，使语义更普适完整。

### 评论
将原本分散且可选的“弱点分析”升级为所有卡片均开箱即用的“卡片认知统计系统”，大幅降低了新训练卡片的接入成本，同时也让用户能够横向对比不同视知觉训练项目在反应速度、认知负荷与瓶颈层阶上的表现。

### 目标
1. 创建 `src/core/analytics/universalViews.tsx`，实现反应速度-正确率 (SAT) 与难度阶梯分布两大通用可视化及诊断组件；
2. 在 `src/core/registry.ts` 中整合通用视图，使 `getAnalyticsPluginByCardId` 对任意卡片均可用；
3. 升级 `src/components/WeaknessAnalyticsModal.tsx`，常驻展示总题数、命中率、平均用时等核心统计指标；
4. 更新 `ModeCard.tsx`、`Home.tsx` 和多语言字典 (`zh-CN.json` / `en-US.json`)，全面升级为“统计”交互。

### 基本原理
1. 所有试炼记录均持久化了 `responseTimeMs`、`isHit`、`difficultyLevel` 和 `timestamp`；
2. 基于这些底层正交指标，可以在主线程/Worker 中进行分箱聚合（Binning），渲染出直观的柱状图与趋势图，无需特定题型的私有数据结构。

### 标签
#intent/build #flow/ready #priority/high #comp/engine #comp/ui #scope/ux #scope/api #ai/instruct #task/domain/analytics #task/object/universal-card-stats #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建通用统计与分析视图模块

实现反应速度-正确率权衡 (SAT) 与难度阶梯分布通用可视化渲染与诊断组件。

~~~~~act
write_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~tsx
import { Award, Clock, Flame, Zap } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { CardAnalyticsView } from '../contracts';
import { setupHiDpiCanvas } from '../canvas/hidpi';
import { i18n } from '../i18n';
import type { UnifiedTrialRecord } from '../../utils/db/schema';

// === 1. 速度-准确率权衡 (Speed-Accuracy Tradeoff, SAT) ===

interface SpeedBinStat {
  rangeLabel: string;
  minMs: number;
  maxMs: number;
  total: number;
  hits: number;
  accuracy: number;
}

function calculateSpeedBins(records: UnifiedTrialRecord[]): SpeedBinStat[] {
  const binsConfig: { rangeLabel: string; minMs: number; maxMs: number }[] = [
    { rangeLabel: '< 1.0s', minMs: 0, maxMs: 1000 },
    { rangeLabel: '1.0~1.8s', minMs: 1000, maxMs: 1800 },
    { rangeLabel: '1.8~2.8s', minMs: 1800, maxMs: 2800 },
    { rangeLabel: '2.8~4.5s', minMs: 2800, maxMs: 4500 },
    { rangeLabel: '> 4.5s', minMs: 4500, maxMs: Number.MAX_SAFE_INTEGER },
  ];

  return binsConfig.map((bin) => {
    const matched = records.filter(
      (r) => r.responseTimeMs >= bin.minMs && r.responseTimeMs < bin.maxMs,
    );
    const total = matched.length;
    const hits = matched.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { ...bin, total, hits, accuracy };
  });
}

function renderSpeedAccuracyVisualizer(canvas: HTMLCanvasElement, records: UnifiedTrialRecord[]) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const bins = calculateSpeedBins(records);
  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 绘制 0%, 50%, 100% 水平参考线
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (const percent of [100, 50, 0]) {
    const y = padding.top + chartH * (1 - percent / 100);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${percent}%`, padding.left - 5, y);
  }

  const barWidth = chartW / bins.length;

  bins.forEach((bin, idx) => {
    const x = padding.left + idx * barWidth;
    const barH = (bin.accuracy / 100) * chartH;
    const y = padding.top + chartH - barH;

    if (bin.total > 0) {
      // 柱体填充
      ctx.fillStyle =
        bin.accuracy >= 80
          ? 'rgba(16, 185, 129, 0.8)'
          : bin.accuracy >= 60
            ? 'rgba(245, 158, 11, 0.8)'
            : 'rgba(244, 63, 94, 0.8)';

      ctx.beginPath();
      ctx.roundRect(x + 5, y, barWidth - 10, barH, [4, 4, 0, 0]);
      ctx.fill();

      // 顶部数值
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${bin.accuracy}%`, x + barWidth / 2, Math.max(padding.top - 8, y - 6));
    } else {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
      ctx.beginPath();
      ctx.roundRect(x + 5, padding.top + chartH - 4, barWidth - 10, 4, 2);
      ctx.fill();
    }

    // X 轴时间标签与做答数
    ctx.fillStyle = '#64748B';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(bin.rangeLabel, x + barWidth / 2, height - padding.bottom + 14);

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(
      bin.total > 0 ? `${bin.total}${i18n.t('common.trialsUnit')}` : '--',
      x + barWidth / 2,
      height - padding.bottom + 26,
    );
  });
}

function diagnoseSpeedAccuracy(records: UnifiedTrialRecord[]): ComponentChildren {
  const bins = calculateSpeedBins(records);
  const populatedBins = bins.filter((b) => b.total >= 3);

  let bestBin = populatedBins.length > 0 ? populatedBins[0] : null;
  for (const b of populatedBins) {
    if (!bestBin || b.accuracy > bestBin.accuracy) {
      bestBin = b;
    }
  }

  const fastBin = bins[0]; // < 1.0s
  const slowBin = bins[bins.length - 1]; // > 4.5s
  const isRushing = fastBin.total >= 5 && fastBin.accuracy < 60;
  const isOverthinking = slowBin.total >= 5 && slowBin.accuracy < 60;

  return (
    <div className="space-y-2.5">
      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-indigo-600" />
        <span>{i18n.t('stats.satPacingInsightTitle')}</span>
      </div>

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-2 text-slate-600 leading-relaxed">
        {bestBin ? (
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-800">{i18n.t('stats.satSweetSpot')}: </span>
              {i18n.t('stats.satSweetSpotDesc', {
                range: bestBin.rangeLabel,
                accuracy: bestBin.accuracy,
              })}
            </div>
          </div>
        ) : (
          <div className="text-slate-400">{i18n.t('stats.satNeedMoreSamples')}</div>
        )}

        {isRushing && (
          <div className="flex items-start gap-2 text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-100">
            <Flame className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{i18n.t('stats.satRushingWarning')}</span>
          </div>
        )}

        {isOverthinking && (
          <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-100">
            <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{i18n.t('stats.satOverthinkingWarning')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// === 2. 难度阶梯与能力分布 (Difficulty Plateau & Fragility) ===

interface LevelBandStat {
  bandLabel: string;
  minLevel: number;
  maxLevel: number;
  total: number;
  hits: number;
  accuracy: number;
}

function calculateLevelBands(records: UnifiedTrialRecord[]): LevelBandStat[] {
  const bandsConfig: { bandLabel: string; minLevel: number; maxLevel: number }[] = [
    { bandLabel: 'L1~7', minLevel: 1, maxLevel: 7 },
    { bandLabel: 'L8~14', minLevel: 8, maxLevel: 14 },
    { bandLabel: 'L15~21', minLevel: 15, maxLevel: 21 },
    { bandLabel: 'L22~28', minLevel: 22, maxLevel: 28 },
    { bandLabel: 'L29~35', minLevel: 29, maxLevel: 35 },
  ];

  return bandsConfig.map((b) => {
    const matched = records.filter(
      (r) => r.difficultyLevel >= b.minLevel && r.difficultyLevel <= b.maxLevel,
    );
    const total = matched.length;
    const hits = matched.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { ...b, total, hits, accuracy };
  });
}

function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const bands = calculateLevelBands(records);
  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (const percent of [100, 50, 0]) {
    const y = padding.top + chartH * (1 - percent / 100);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${percent}%`, padding.left - 5, y);
  }

  const barWidth = chartW / bands.length;

  bands.forEach((b, idx) => {
    const x = padding.left + idx * barWidth;
    const barH = (b.accuracy / 100) * chartH;
    const y = padding.top + chartH - barH;

    if (b.total > 0) {
      ctx.fillStyle =
        b.accuracy >= 80
          ? 'rgba(79, 70, 229, 0.85)'
          : b.accuracy >= 60
            ? 'rgba(99, 102, 241, 0.7)'
            : 'rgba(244, 63, 94, 0.8)';

      ctx.beginPath();
      ctx.roundRect(x + 5, y, barWidth - 10, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${b.accuracy}%`, x + barWidth / 2, Math.max(padding.top - 8, y - 6));
    } else {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
      ctx.beginPath();
      ctx.roundRect(x + 5, padding.top + chartH - 4, barWidth - 10, 4, 2);
      ctx.fill();
    }

    ctx.fillStyle = '#64748B';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.bandLabel, x + barWidth / 2, height - padding.bottom + 14);

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(
      b.total > 0 ? `${b.total}${i18n.t('common.trialsUnit')}` : '--',
      x + barWidth / 2,
      height - padding.bottom + 26,
    );
  });
}

function diagnoseDifficultyPlateau(records: UnifiedTrialRecord[]): ComponentChildren {
  const bands = calculateLevelBands(records);
  const comfortBand = bands.find((b) => b.total >= 5 && b.accuracy >= 80);
  const challengeBand = bands.find((b) => b.total >= 5 && b.accuracy >= 50 && b.accuracy < 80);
  const plateauBand = bands.find((b) => b.total >= 5 && b.accuracy < 50);

  return (
    <div className="space-y-2.5">
      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <Award className="w-3.5 h-3.5 text-indigo-600" />
        <span>{i18n.t('stats.plateauInsightTitle')}</span>
      </div>

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-2 text-slate-600 leading-relaxed">
        {comfortBand && (
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-800">{i18n.t('stats.comfortZone')}: </span>
              {comfortBand.bandLabel} ({comfortBand.accuracy}%)
            </div>
          </div>
        )}

        {challengeBand && (
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-800">{i18n.t('stats.growthZone')}: </span>
              {challengeBand.bandLabel} ({challengeBand.accuracy}%)
            </div>
          </div>
        )}

        {plateauBand && (
          <div className="flex items-start gap-2 text-rose-600">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
            <div>
              <span className="font-bold">{i18n.t('stats.bottleneckZone')}: </span>
              {plateauBand.bandLabel} ({plateauBand.accuracy}%)
            </div>
          </div>
        )}

        {!comfortBand && !challengeBand && !plateauBand && (
          <div className="text-slate-400">{i18n.t('stats.satNeedMoreSamples')}</div>
        )}
      </div>
    </div>
  );
}

// === 3. 导出所有通用视图 ===

export const UNIVERSAL_ANALYTICS_VIEWS: CardAnalyticsView[] = [
  {
    id: 'universal_speed_accuracy',
    tabLabel: 'stats.satTabLabel',
    title: 'stats.satViewTitle',
    subTitle: 'stats.satViewSubtitle',
    icon: Clock,
    renderVisualizer: renderSpeedAccuracyVisualizer,
    renderDiagnostics: diagnoseSpeedAccuracy,
  },
  {
    id: 'universal_difficulty_plateau',
    tabLabel: 'stats.plateauTabLabel',
    title: 'stats.plateauViewTitle',
    subTitle: 'stats.plateauViewSubtitle',
    icon: Award,
    renderVisualizer: renderDifficultyPlateauVisualizer,
    renderDiagnostics: diagnoseDifficultyPlateau,
  },
];
~~~~~

---

#### Acts 2: 在 Registry 中将通用统计视图自动注入到所有卡片

确保任何卡片调用 `getAnalyticsPluginByCardId` 时都能获得专属视图 + 通用统计视图。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';
~~~~~
~~~~~typescript
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';
import { getTrialRecordsByCard } from '../utils/db/queries';
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
  public getAnalyticsPluginByCardId(cardId: string): CardAnalyticsPlugin | undefined {
    return this.cardAnalyticsMap.get(cardId);
  }
~~~~~
~~~~~typescript
  public getAnalyticsPluginByCardId(cardId: string): CardAnalyticsPlugin | undefined {
    const card = this.cardMap.get(cardId);
    if (!card) return undefined;

    const specificPlugin = this.cardAnalyticsMap.get(cardId);
    const specificViews = specificPlugin?.views ?? [];

    return {
      cardId,
      fetchRecords: specificPlugin?.fetchRecords ?? ((id) => getTrialRecordsByCard(id)),
      views: [...specificViews, ...UNIVERSAL_ANALYTICS_VIEWS],
    };
  }
~~~~~

---

#### Acts 3: 升级 WeaknessAnalyticsModal，集成综合统计大盘与多维 Tab

增强卡片统计弹窗，加入顶层做答量、正确率、平均反应时等指标，并提供清晰的多 Tab 导航。

~~~~~act
write_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~tsx
import { BarChart2, CheckCircle, Clock, Info, Target, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView } from '../core/contracts';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db/index';

interface WeaknessAnalyticsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const { t } = useTranslation();
  const plugin = registry.getAnalyticsPluginByCardId(card.id);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);
  const views = plugin?.views ?? [];
  const currentView = views[activeViewIndex] || views[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data: UnifiedTrialRecord[]) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [plugin, card.id]);

  useEffect(() => {
    if (loading || !currentView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    currentView.renderVisualizer(canvas, records);
  }, [currentView, loading, records]);

  if (!plugin || views.length === 0) return null;

  const totalTrials = records.length;
  const hitCount = records.filter((r) => r.isHit).length;
  const overallAccuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;
  const avgResponseTimeSec =
    totalTrials > 0
      ? (records.reduce((acc, curr) => acc + (curr.responseTimeMs || 0), 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
  };

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
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-xs">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">{cardTitle}</h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                  {t('stats.cardStatsBadge')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentView ? resolveText(currentView.title) : t('stats.subTitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 综合统计概览卡片 (总题数、命中率、平均反应时) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.todayTrials')}
            </div>
            <div className="text-xl font-black text-slate-800">
              {totalTrials}{' '}
              <span className="text-[11px] font-normal text-slate-400 font-sans">
                {t('common.trialsUnit')}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              {t('common.accuracy')}
            </div>
            <div className="text-xl font-black text-slate-800 flex items-baseline gap-1.5">
              <span
                className={
                  totalTrials === 0
                    ? 'text-slate-400'
                    : overallAccuracy >= 80
                      ? 'text-emerald-600'
                      : 'text-slate-800'
                }
              >
                {totalTrials === 0 ? '--' : `${overallAccuracy}%`}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {t('summary.duration')}
            </div>
            <div className="text-xl font-black text-slate-800 font-mono">
              {avgResponseTimeSec}
              <span className="text-[11px] font-normal text-slate-400 font-sans"> s</span>
            </div>
          </div>
        </div>

        {/* 多 Tab 切换栏 */}
        {views.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto scrollbar-none">
            {views.map((v: CardAnalyticsView, idx: number) => {
              const Icon = v.icon;
              const isActive = idx === activeViewIndex;
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setActiveViewIndex(idx)}
                  className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span className="truncate">{resolveText(v.tabLabel)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 可视化图表与诊断说明区 */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            {t('analyticsModal.analyzing')}
          </div>
        ) : records.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            {t('analyticsModal.noRecords', { title: cardTitle })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* 左侧 Canvas 视图 */}
            <div className="md:col-span-7 flex justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-inner relative">
              <canvas
                key={`${card.id}-${currentView?.id}`}
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[280px] aspect-square rounded-xl border border-slate-100"
              />
            </div>

            {/* 右侧诊断与建议 */}
            <div className="md:col-span-5 flex flex-col gap-3 min-w-0">
              <div className="text-[11px] text-slate-400 leading-relaxed font-medium">
                {currentView?.subTitle && resolveText(currentView.subTitle)}
              </div>
              {currentView?.renderDiagnostics(records)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

---

#### Acts 4: 更新 Home 与 ModeCard 统计入口

让发现大盘卡片统一开启统计按钮，点击直接查看多维认知统计。

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                totalTrials={totalTrials}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={card.tags.status === 'experimental'}
~~~~~
~~~~~typescript
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                totalTrials={totalTrials}
                hasAnalytics={true}
                isExperimental={card.tags.status === 'experimental'}
~~~~~

---

#### Acts 5: 更新中英文本地化词典 (i18n)

将“弱点分析”更名为“统计”，并补充通用 SAT、难度阶梯等词条。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
  "card": {
    "todayTrials": "今日刷题",
    "analyticsTooltip": "{{title}} 弱点分析",
    "settingsTooltip": "{{title}} 偏好设置",
    "experimentalBadge": "实验性",
~~~~~
~~~~~json
  "card": {
    "todayTrials": "今日刷题",
    "analyticsTooltip": "{{title}} 统计与分析",
    "settingsTooltip": "{{title}} 偏好设置",
    "experimentalBadge": "实验性",
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
  "analyticsModal": {
    "analyzing": "正在分析历史答题数据...",
    "noRecords": "暂无【{{title}}】的练习记录，先去完成几轮练习吧！",
    "overallEvaluation": "总体评估",
    "sampleSize": "样本量: {{count}} 题"
  },
~~~~~
~~~~~json
  "analyticsModal": {
    "analyzing": "正在分析历史答题数据...",
    "noRecords": "暂无【{{title}}】的练习记录，先去完成几轮练习吧！",
    "overallEvaluation": "总体评估",
    "sampleSize": "样本量: {{count}} 题"
  },
  "stats": {
    "cardStatsBadge": "卡片统计",
    "satTabLabel": "作答节奏 (SAT)",
    "satViewTitle": "反应速度与正确率权衡 (Speed-Accuracy Tradeoff)",
    "satViewSubtitle": "探查是否存在急躁盲击或过度犹豫导致的感知衰退",
    "satPacingInsightTitle": "作答节奏与直觉诊断",
    "satSweetSpot": "直觉甜点区",
    "satSweetSpotDesc": "在 {{range}} 反应区间作答时正确率最高，达到 {{accuracy}}%",
    "satNeedMoreSamples": "样本量不足，多练习几题后将自动生成认知节奏诊断。",
    "satRushingWarning": "极速盲击区间 (<1.0s) 正确率偏低，提示存在急躁冒进倾向，建议多观察 0.5 秒。",
    "satOverthinkingWarning": "长考区间 (>4.5s) 正确率显著下滑，提示视觉暂留出现衰退，超时后请相信第一直觉直接作答。",
    "plateauTabLabel": "难度阶梯分布",
    "plateauViewTitle": "能力层阶 (Level) 表现与瓶颈",
    "plateauViewSubtitle": "评估各难度阶梯下的胜率稳定性与抗压表现",
    "plateauInsightTitle": "能力层阶诊断",
    "comfortZone": "感知舒适区 (胜率≥80%)",
    "growthZone": "有效突破区 (胜率50%~80%)",
    "bottleneckZone": "认知阻断壁垒 (胜率<50%)",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
  "card": {
    "todayTrials": "Today",
    "analyticsTooltip": "{{title}} Weakness Analytics",
    "settingsTooltip": "{{title}} Preferences",
    "experimentalBadge": "Experimental",
~~~~~
~~~~~json
  "card": {
    "todayTrials": "Today",
    "analyticsTooltip": "{{title}} Statistics & Insights",
    "settingsTooltip": "{{title}} Preferences",
    "experimentalBadge": "Experimental",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
  "analyticsModal": {
    "analyzing": "Analyzing historical trial data...",
    "noRecords": "No practice records for [{{title}}]. Complete some trials first!",
    "overallEvaluation": "Overall Evaluation",
    "sampleSize": "Sample size: {{count}} trials"
  },
~~~~~
~~~~~json
  "analyticsModal": {
    "analyzing": "Analyzing historical trial data...",
    "noRecords": "No practice records for [{{title}}]. Complete some trials first!",
    "overallEvaluation": "Overall Evaluation",
    "sampleSize": "Sample size: {{count}} trials"
  },
  "stats": {
    "cardStatsBadge": "Card Stats",
    "satTabLabel": "Pacing (SAT)",
    "satViewTitle": "Speed-Accuracy Tradeoff (SAT Analysis)",
    "satViewSubtitle": "Analyze whether rushing or hesitation affects perceptual accuracy",
    "satPacingInsightTitle": "Pacing & Intuition Diagnostic",
    "satSweetSpot": "Optimal Intuition Zone",
    "satSweetSpotDesc": "Highest accuracy achieved in {{range}} with {{accuracy}}%",
    "satNeedMoreSamples": "Need more trials to generate cognitive pacing diagnostics.",
    "satRushingWarning": "Low accuracy under <1.0s indicates rushed responses. Take 0.5s more to observe.",
    "satOverthinkingWarning": "Accuracy drops after >4.5s due to sensory memory decay. Trust your initial intuition.",
    "plateauTabLabel": "Difficulty Spectrum",
    "plateauViewTitle": "Skill Level Spectrum & Resistance",
    "plateauViewSubtitle": "Evaluate accuracy stability across difficulty levels",
    "plateauInsightTitle": "Level Spectrum Diagnostic",
    "comfortZone": "Perceptual Comfort Zone (≥80%)",
    "growthZone": "Active Growth Zone (50%~80%)",
    "bottleneckZone": "Cognitive Ceiling (<50%)",
~~~~~

---

### 下一步建议
1. **构建与测试验证**：运行 `npm run check` 和 `npm run test`，确保所有类型与测试用例通过；
2. **会话疲劳曲线扩展 (Session Fatigue View)**：后续可基于 `sessionId` 与题号序号扩展会话疲劳衰减分析 Tab；
3. **完成提交**：若验收满意，可指示创建独立的 Git 提交计划。
