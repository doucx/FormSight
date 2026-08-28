以下是关于将“难度抗压分析”彻底重构成**客观的难度层阶分布直方图与分级概览（Level & Accuracy Distribution）**的修复计划：

## [WIP] refactor: 将难度抗压分析重构为客观的层阶胜率直方图与明细分布

### 评论

正如前述分析，在自适应阶梯机制下，不同 Level 的样本量存在天然的非均匀性，静态累加历史全量数据也容易混淆新手期表现与当前真实能力。因此，我们将原先存在原理缺陷的“折线抗压衰减与瓶颈诊断”彻底重构为**客观的难度层阶柱状直方图与明细数据列表**：
1. **可视化重构为直方分布图**：横轴仅展示真实产生过试炼记录的 Level，纵向柱高代表该层阶的实际胜率（并附带题量标记），直观清晰展现用户在各难度档位的训练饱和度与正确率。
2. **诊断面板去主观化**：移除“绝对舒适区 / 突破区 / 崩溃瓶颈”等容易误导的定性标签，改为客观汇总“最高达到等级”、“训练最集中的核心层阶”及各层阶的详细题量占比与正确率列表。

### 目标

1. 重构 `calculateLevelStats` 与 `renderDifficultyPlateauVisualizer`，生成直观、自适应且支持高分屏的高清层阶直方图。
2. 重构 `diagnoseDifficultyPlateau`，呈现客观的各层阶训练明细与核心训练档位。
3. 更新 `CardAnalyticsView.tsx` 数据总览及多语言词条。

### 基本原理

1. **客观数据呈现**：以实际做答记录为准，展示各等级的样本频数直方图与命中率，不附带未经控制变量的单调性假设。
2. **自适应视口**：根据实际存在的难度等级数量动态分配柱宽与间距，保持界面整洁与高可读性。

### 标签

#intent/refactor #flow/ready #priority/high #comp/core #concept/ui #scope/ux #scope/core #ai/instruct #task/domain/ui #task/object/level-accuracy-distribution #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新多语言词条

更新中英文语言包中关于难度层阶分布的文案。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "plateauTabLabel": "难度抗压分析",
    "plateauTitle": "难度层阶 (Level) 衰减与瓶颈分析",
    "plateauSubtitle": "识别认知舒适区、有效增长区与临界崩溃瓶颈",
    "comfortZoneTitle": "绝对舒适区",
    "comfortZoneDesc": "在 Level 1 ~ {{maxLevel}} 保持 80% 以上高胜率，掌握扎实。",
    "growthZoneTitle": "当前突破区",
    "ceilingTitle": "临界崩溃瓶颈",
    "ceilingDesc": "在 Level {{level}} 胜率跌破 50%，建议在该阶梯附近重点巩固。"
~~~~~
~~~~~json.new
    "plateauTabLabel": "难度层阶-正确率",
    "plateauTitle": "难度层阶与正确率分布",
    "plateauSubtitle": "统计各难度层阶下的试炼题量分布与实际命中率",
    "levelDistributionTitle": "各层阶训练明细",
    "levelFocusSummaryTitle": "核心训练层阶",
    "levelFocusSummaryDesc": "最高达到 Lvl {{max}}，试炼最集中的层阶为 Lvl {{focus}}（{{count}} 题，正确率 {{acc}}%）"
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "plateauTabLabel": "Difficulty Fragility",
    "plateauTitle": "Skill Level Decay & Plateau Analysis",
    "plateauSubtitle": "Identifies comfort zones, growth zones, and cognitive breakdown ceilings",
    "comfortZoneTitle": "Comfort Zone",
    "comfortZoneDesc": "Maintains 80%+ accuracy across Level 1 ~ {{maxLevel}}.",
    "growthZoneTitle": "Current Growth Zone",
    "ceilingTitle": "Breakdown Ceiling",
    "ceilingDesc": "Accuracy drops below 50% around Level {{level}}. Focus on deliberate practice near this tier."
~~~~~
~~~~~json.new
    "plateauTabLabel": "Level - Accuracy",
    "plateauTitle": "Difficulty Level & Accuracy Distribution",
    "plateauSubtitle": "Distribution of trials and accuracy across difficulty tiers",
    "levelDistributionTitle": "Level Breakdown Details",
    "levelFocusSummaryTitle": "Core Training Tier",
    "levelFocusSummaryDesc": "Peak reached Lvl {{max}}, with most trials concentrated at Lvl {{focus}} ({{count}} trials, {{acc}}% accuracy)"
~~~~~

#### Acts 2: 重构层阶统计、Canvas 直方图渲染与明细展示

重构 `universalViews.tsx` 中的层阶图表与数据明细。

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
interface LevelBinStat {
  level: number;
  total: number;
  hits: number;
  accuracy: number;
}

function calculateLevelStats(records: UnifiedTrialRecord[]): LevelBinStat[] {
  const levelMap = new Map<number, { total: number; hits: number }>();
  for (const r of records) {
    const lvl = Number(r.difficultyLevel) || 1;
    const curr = levelMap.get(lvl) || { total: 0, hits: 0 };
    curr.total += 1;
    if (r.isHit) curr.hits += 1;
    levelMap.set(lvl, curr);
  }

  const result: LevelBinStat[] = [];
  for (let l = 1; l <= 35; l++) {
    const data = levelMap.get(l);
    if (data) {
      result.push({
        level: l,
        total: data.total,
        hits: data.hits,
        accuracy: Math.round((data.hits / data.total) * 100),
      });
    }
  }
  return result;
}

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

  const padding = { top: 35, right: 20, bottom: 40, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  const levelStats = calculateLevelStats(records);

  // Y 轴参考线
  const yTicks = [100, 80, 50, 0];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 80 ? '#A7F3D0' : tick === 50 ? '#FECDD3' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = tick === 80 ? '#059669' : tick === 50 ? '#E11D48' : '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  // X 轴刻度
  const minLvl = 1;
  const maxLvl = 35;
  const getX = (lvl: number) => padding.left + ((lvl - minLvl) / (maxLvl - minLvl)) * chartW;
  const getY = (acc: number) => padding.top + (1 - acc / 100) * chartH;

  // 绘制散点与面积
  for (const stat of levelStats) {
    const x = getX(stat.level);
    const y = getY(stat.accuracy);
    const radius = Math.min(8, Math.max(3, Math.sqrt(stat.total) * 1.5));

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle =
      stat.accuracy >= 80
        ? 'rgba(16, 185, 129, 0.75)'
        : stat.accuracy >= 60
          ? 'rgba(245, 158, 11, 0.75)'
          : 'rgba(244, 63, 94, 0.75)';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 绘制趋势连接线
  if (levelStats.length >= 2) {
    ctx.beginPath();
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2;
    ctx.moveTo(getX(levelStats[0].level), getY(levelStats[0].accuracy));
    for (let i = 1; i < levelStats.length; i++) {
      ctx.lineTo(getX(levelStats[i].level), getY(levelStats[i].accuracy));
    }
    ctx.stroke();
  }

  // X 轴标签
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Lvl 1', getX(1), height - padding.bottom + 6);
  ctx.fillText('Lvl 18', getX(18), height - padding.bottom + 6);
  ctx.fillText('Lvl 35', getX(35), height - padding.bottom + 6);
}

export function diagnoseDifficultyPlateau(records: UnifiedTrialRecord[]): ComponentChildren {
  const levelStats = calculateLevelStats(records);
  const comfortLevels = levelStats.filter((s) => s.accuracy >= 80 && s.total >= 3);
  const growthLevels = levelStats.filter(
    (s) => s.accuracy >= 60 && s.accuracy < 80 && s.total >= 3,
  );
  const bottleneckLevels = levelStats.filter((s) => s.accuracy < 50 && s.total >= 3);

  const maxComfort = comfortLevels.length > 0 ? Math.max(...comfortLevels.map((s) => s.level)) : 1;
  const currentGrowth =
    growthLevels.length > 0 ? growthLevels.map((s) => `Lvl ${s.level}`).join(', ') : '暂未显现';
  const breakdownMin =
    bottleneckLevels.length > 0 ? Math.min(...bottleneckLevels.map((s) => s.level)) : null;

  return (
    <div className="space-y-2.5">
      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
        <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.comfortZoneTitle')}: </span>
          {i18n.t('analyticsModal.comfortZoneDesc', { maxLevel: maxComfort })}
        </div>
      </div>

      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-2.5">
        <Activity className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.growthZoneTitle')}: </span>
          {currentGrowth}
        </div>
      </div>

      {breakdownMin !== null && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5">
          <Gauge className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 leading-relaxed">
            <span className="font-bold">{i18n.t('analyticsModal.ceilingTitle')}: </span>
            {i18n.t('analyticsModal.ceilingDesc', { level: breakdownMin })}
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~
~~~~~typescript.new
interface LevelBinStat {
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
  return levels.map((l) => {
    const data = levelMap.get(l)!;
    return {
      level: l,
      total: data.total,
      hits: data.hits,
      accuracy: Math.round((data.hits / data.total) * 100),
    };
  });
}

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
~~~~~typescript.new
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
~~~~~

#### Acts 3: 更新 `CardAnalyticsView.tsx` 数据总览卡片标题

将总览右侧卡片标题由 `growthZoneTitle` 调整为客观的 `levelFocusSummaryTitle`。

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl flex-shrink-0">
                        <Gauge className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                        <div className="font-bold text-slate-900">
                          {t('analyticsModal.levelFocusSummaryTitle')}
                        </div>
                        <p className="text-slate-600">{insights.growthZoneText}</p>
                      </div>
                    </div>
~~~~~

---

### 下一步建议

1. **执行类型与格式校验**：运行 `npm run check` 确保所有 TypeScript 类型及代码规范检查通过。
2. **端到端效果核验**：在浏览器中打开任意模块的统计分析页（如 `#/analytics/abs_gesture_axis`），切换到“难度层阶-正确率”Tab，核验客观柱状直方图与右侧层阶明细列表是否呈现准确、清晰。
