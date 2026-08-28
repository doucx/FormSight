以下是按照您的思路进行的重构计划，将“作答耗时与正确率（SAT）”彻底从**主观推论/评估**转变为**客观数据分布展示**，同时引入基于实际作答数据的自适应时间分箱，使其能天然适配各类长耗时与短耗时训练卡片：

## [WIP] refactor: 将反应速度与正确率分析重构为客观数据分布展示

### 评论

正如您所指出的，在未控制任务范式和题目难度的前提下，对耗时进行“急躁”或“犹豫”的定性归因是不严谨的。系统应当克制主观臆断，回归**客观、清晰的数据可视化与区间统计**：
1. **取消主观评估诊断**：移除“存在急躁盲击倾向”、“存在犹豫衰退倾向”、“直觉黄金甜点区”等缺乏因果证据的推断，替换为客观的各耗时区间题量、占比与命中率统计。
2. **自适应动态时间分箱**：放弃硬编码的固定秒数区间（如 `<1s`、`>4.5s`），改为根据卡片实际作答耗时的分位数（Quantile）动态划分 5 个区间，无论 1 秒的速判卡片还是 15 秒的复杂空间卡片，都能均匀展现客观数据分布。

### 目标

1. 在 `universalViews.tsx` 中实现自适应分位数耗时分箱算法。
2. 将 `diagnoseSpeedAccuracy` 重构为纯客观的耗时区间明细卡片。
3. 更新 `getCognitiveOverviewInsights` 与 `CardAnalyticsView.tsx` 总览视图，仅客观陈述作答节奏与能力层阶。
4. 更新多语言词条。

### 基本原理

1. **分位数自适应（Quantile Binning）**：根据有效作答反应时（$P_{20}, P_{40}, P_{60}, P_{80}$）动态生成 5 个连续区间，保证数据展示与卡片实际耗时特征高度契合。
2. **数据呈现去主观化**：只呈现“在 XX 区间内共完成了 N 题，正确率为 XX%”，将结论的解读权留给用户自身。

### 标签

#intent/refactor #flow/ready #priority/high #comp/core #concept/ui #scope/ux #scope/core #ai/instruct #task/domain/ui #task/object/sat-objective-distribution #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新中英文语言包词条

替换主观推论词条为客观统计词条。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "satTabLabel": "反应速度-正确率 (SAT)",
    "satTitle": "反应速度与准确率权衡 (SAT 分析)",
    "satSubtitle": "分析作答节奏：是否存在急躁盲击或过度犹豫导致的感知衰退",
    "sweetSpotTitle": "直觉黄金甜点区",
    "sweetSpotDesc": "在 {{range}} 区间内表现最稳健，胜率高达 {{acc}}%",
    "impatienceWarningTitle": "存在急躁盲击倾向",
    "impatienceWarningDesc": "在极速盲击 (<1.0s) 时胜率较低，建议略微放缓节奏，观察确认后再提交。",
    "hesitationWarningTitle": "存在犹豫衰退倾向",
    "hesitationWarningDesc": "思考时间超过 4.5s 时正确率显著下滑，视觉暂留可能被干扰，建议相信第一直觉。",
~~~~~
~~~~~json.new
    "satTabLabel": "作答耗时-正确率 (SAT)",
    "satTitle": "作答耗时与正确率分布 (SAT)",
    "satSubtitle": "统计不同作答耗时区间的题量分布与实际命中率",
    "satDistributionTitle": "耗时区间明细统计",
    "paceSummaryTitle": "作答节奏分布",
    "paceSummaryDesc": "平均作答耗时 {{avg}} 秒，作答最集中的耗时区间为 {{range}}（该区间正确率 {{acc}}%）",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "satTabLabel": "Speed-Accuracy (SAT)",
    "satTitle": "Speed-Accuracy Trade-off (SAT Analysis)",
    "satSubtitle": "Analyzes pace: reveals whether rushing or over-hesitation causes perception drop",
    "sweetSpotTitle": "Intuition Sweet Spot",
    "sweetSpotDesc": "Most accurate within {{range}}, reaching {{acc}}% accuracy",
    "impatienceWarningTitle": "Rushing Tendency Detected",
    "impatienceWarningDesc": "Lower accuracy under 1.0s. Consider slowing down slightly before committing.",
    "hesitationWarningTitle": "Over-Hesitation Drop-off",
    "hesitationWarningDesc": "Accuracy drops after 4.5s due to fading visual persistence. Trust your first instinct.",
~~~~~
~~~~~json.new
    "satTabLabel": "Response Time - Accuracy",
    "satTitle": "Response Time & Accuracy Distribution (SAT)",
    "satSubtitle": "Objective distribution of trials and accuracy across response time tiers",
    "satDistributionTitle": "Response Time Distribution Details",
    "paceSummaryTitle": "Response Pace Summary",
    "paceSummaryDesc": "Average response time {{avg}}s, with most trials concentrated in {{range}} ({{acc}}% accuracy)",
~~~~~

#### Acts 2: 重构 SAT 分箱算法与客观数据展示面板

在 `universalViews.tsx` 中引入自适应分箱，并将侧边诊断替换为纯客观数据卡片。

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
interface SatBinStat {
  rangeLabel: string;
  minMs: number;
  maxMs: number;
  total: number;
  hits: number;
  accuracy: number;
}

function calculateSpeedBins(records: UnifiedTrialRecord[]): SatBinStat[] {
  const bins: Omit<SatBinStat, 'total' | 'hits' | 'accuracy'>[] = [
    { rangeLabel: '< 1.0s', minMs: 0, maxMs: 1000 },
    { rangeLabel: '1.0~1.8s', minMs: 1000, maxMs: 1800 },
    { rangeLabel: '1.8~2.8s', minMs: 1800, maxMs: 2800 },
    { rangeLabel: '2.8~4.5s', minMs: 2800, maxMs: 4500 },
    { rangeLabel: '> 4.5s', minMs: 4500, maxMs: Number.MAX_SAFE_INTEGER },
  ];

  return bins.map((bin) => {
    const matched = records.filter(
      (r) => r.responseTimeMs >= bin.minMs && r.responseTimeMs < bin.maxMs,
    );
    const total = matched.length;
    const hits = matched.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { ...bin, total, hits, accuracy };
  });
}
~~~~~
~~~~~typescript.new
interface SatBinStat {
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
      { rangeLabel: '> 6.0s', minMs: 6000, maxMs: Number.MAX_SAFE_INTEGER, total: 0, hits: 0, accuracy: 0 },
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
    { minMs: thresholds[0], maxMs: thresholds[1], rangeLabel: `${formatSec(thresholds[0])}~${formatSec(thresholds[1])}` },
    { minMs: thresholds[1], maxMs: thresholds[2], rangeLabel: `${formatSec(thresholds[1])}~${formatSec(thresholds[2])}` },
    { minMs: thresholds[2], maxMs: thresholds[3], rangeLabel: `${formatSec(thresholds[2])}~${formatSec(thresholds[3])}` },
    { minMs: thresholds[3], maxMs: Number.MAX_SAFE_INTEGER, rangeLabel: `> ${formatSec(thresholds[3])}` },
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
~~~~~

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
export function diagnoseSpeedAccuracy(records: UnifiedTrialRecord[]): ComponentChildren {
  const bins = calculateSpeedBins(records);
  const validBins = bins.filter((b) => b.total >= 3);
  if (validBins.length === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  // 寻找最佳反应时间区间
  const bestBin = [...validBins].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0];
  const fastBin = bins[0];
  const slowBin = bins[bins.length - 1];

  const hasRushImpatience = fastBin.total >= 5 && fastBin.accuracy < 60;
  const hasHesitationDrop = slowBin.total >= 5 && slowBin.accuracy < 60;

  return (
    <div className="space-y-2.5">
      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.sweetSpotTitle')}: </span>
          {i18n.t('analyticsModal.sweetSpotDesc', {
            range: bestBin.rangeLabel,
            acc: bestBin.accuracy,
          })}
        </div>
      </div>

      {hasRushImpatience && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-800 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.impatienceWarningTitle')}: </span>
          {i18n.t('analyticsModal.impatienceWarningDesc')}
        </div>
      )}

      {hasHesitationDrop && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-800 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.hesitationWarningTitle')}: </span>
          {i18n.t('analyticsModal.hesitationWarningDesc')}
        </div>
      )}
    </div>
  );
}
~~~~~
~~~~~typescript.new
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
export function getCognitiveOverviewInsights(records: UnifiedTrialRecord[]): {
  sweetSpotText: string;
  growthZoneText: string;
} {
  if (!records || records.length === 0) {
    return {
      sweetSpotText: i18n.t('analyticsModal.needMoreSamples'),
      growthZoneText: i18n.t('analyticsModal.needMoreSamples'),
    };
  }

  // 1. SAT 作答速度黄金甜点区计算
  const bins = calculateSpeedBins(records);
  const validBins = bins.filter((b) => b.total >= 3);
  let sweetSpotText = '';

  if (validBins.length > 0) {
    const bestBin = [...validBins].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0];
    sweetSpotText = i18n.t('analyticsModal.sweetSpotDesc', {
      range: bestBin.rangeLabel,
      acc: bestBin.accuracy,
    });
  } else if (records.length >= 3) {
    const populatedBins = bins.filter((b) => b.total > 0);
    const bestBin = populatedBins.sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0];
    if (bestBin) {
      sweetSpotText = i18n.t('analyticsModal.sweetSpotDesc', {
        range: bestBin.rangeLabel,
        acc: bestBin.accuracy,
      });
    }
  }

  if (!sweetSpotText) {
    sweetSpotText = i18n.t('analyticsModal.needMoreSamples');
  }

  // 2. 难度突破区计算
  const levelStats = calculateLevelStats(records);
  const growthLevels = levelStats.filter(
    (s) => s.accuracy >= 60 && s.accuracy < 80 && s.total >= 2,
  );

  let growthZoneText = '';
  if (growthLevels.length > 0) {
    growthZoneText = growthLevels.map((s) => `Lvl ${s.level}`).join(', ');
  } else {
    const maxLvl = Math.max(...records.map((r) => Number(r.difficultyLevel) || 1));
    growthZoneText = `Lvl ${Math.max(1, maxLvl - 2)} ~ Lvl ${maxLvl}`;
  }

  return {
    sweetSpotText,
    growthZoneText,
  };
}
~~~~~
~~~~~typescript.new
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

  // 2. 难度突破区计算
  const levelStats = calculateLevelStats(records);
  const growthLevels = levelStats.filter(
    (s) => s.accuracy >= 60 && s.accuracy < 80 && s.total >= 2,
  );

  let growthZoneText = '';
  if (growthLevels.length > 0) {
    growthZoneText = growthLevels.map((s) => `Lvl ${s.level}`).join(', ');
  } else {
    const maxLvl = Math.max(...records.map((r) => Number(r.difficultyLevel) || 1));
    growthZoneText = `Lvl ${Math.max(1, maxLvl - 2)} ~ Lvl ${maxLvl}`;
  }

  return {
    paceSummaryText,
    growthZoneText,
  };
}
~~~~~

#### Acts 3: 更新 `CardAnalyticsView.tsx` 数据总览面板

将原先的 `sweetSpotTitle` / `sweetSpotText` 替换为中立客观的 `paceSummaryTitle` / `paceSummaryText`。

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {(() => {
                const insights = getCognitiveOverviewInsights(records);
                return (
                  <>
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                        <div className="font-bold text-slate-900">
                          {t('analyticsModal.sweetSpotTitle')}
                        </div>
                        <p className="text-slate-600">{insights.sweetSpotText}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl flex-shrink-0">
                        <Gauge className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                        <div className="font-bold text-slate-900">
                          {t('analyticsModal.growthZoneTitle')}
                        </div>
                        <p className="text-slate-600">{insights.growthZoneText}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
~~~~~
~~~~~typescript.new
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {(() => {
                const insights = getCognitiveOverviewInsights(records);
                return (
                  <>
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                        <div className="font-bold text-slate-900">
                          {t('analyticsModal.paceSummaryTitle')}
                        </div>
                        <p className="text-slate-600">{insights.paceSummaryText}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl flex-shrink-0">
                        <Gauge className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                        <div className="font-bold text-slate-900">
                          {t('analyticsModal.growthZoneTitle')}
                        </div>
                        <p className="text-slate-600">{insights.growthZoneText}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
~~~~~

---

### 下一步建议

1. **类型与语法检查**：运行 `npm run check` 确保无 TypeScript 报错及代码风格问题。
2. **多题型页面验证**：访问不同耗时维度的卡片（如毫秒级快选卡片与长耗时多边形卡片），在“数据总览”和“作答耗时-正确率”Tab 下核验客观数据与自适应分箱呈现。
