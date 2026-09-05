好的，我们将严格按照选定的方案（**`1.1` 模块卡片层阶化** + **`2.1` 今日仪表盘峰值导向** + **`3.1 & 3.2` 认知档案多维层阶化** + **`4.1` 结算演进核心化** + **`5.1` 正确率转为稳态指示**）进行系统性重构。

以下是完整的执行计划。

## [WIP] refactor: 重构全局认知度量体系为 Level 优先

### 用户需求
在自适应难度系统（Staircase / Block Adaptive）中，正确率长期会自然收敛至算法平衡点（如 50%~80%），无法真实反映用户的感知进化。用户需要：
1. 模块卡片、主页仪表盘与统计图表将 **能力层阶 (Level)** 提升为第一视觉焦点与核心标尺。
2. 将 **正确率 (Accuracy)** 降权为衡量自适应算法是否处于稳态调优的辅助诊断状态（Optimal Zone / Ascending / Exploring）。
3. 认知推演路径与心智抗性矩阵全面按掌握层阶（Avg / Peak Level）展示与着色。
4. 训练结算页优先高亮展示层阶突破与演进（Level Evolution）。

### 评论
该重构从根本上修正了自适应认知训练系统中“长期正确率失真”的心理学缺陷，让用户的训练收益直观反映在层阶数字（Level）的单调递增与突破上，极大地提升正反馈与成就感。

### 目标
1. **多语言字典**：在 `zh-CN.json` 与 `en-US.json` 中补充稳态指示、峰值层阶等相关词条。
2. **卡片大盘 (`ModeCard.tsx` & `DiscoveryView.tsx`)**：底部主大字切换为 `Lvl {currentLevel}` 及 `(最高 Lvl {bestLevel})`，正确率降为稳态调优指示灯。
3. **今日主页 (`HomeView.tsx`)**：底部概览卡片由全盘平均正确率改为今日突破层阶与挑战深度。
4. **统计数据流 (`useGlobalStatsData.ts`)**：聚合各时段的峰值层阶（Peak Level）与均阶（Avg Level），为路径与抗性矩阵计算平均层阶与最高层阶。
5. **统计视图 (`StatsMetricCards.tsx` & `CognitiveMasteryGrid.tsx`)**：重构 4 维顶栏与 8 维认知矩阵，以层阶深度取代百分比作为主视觉与配色基准。
6. **结算弹窗 (`SessionSummaryModal.tsx` & `PlanSummaryModal.tsx`)**：将层阶演进卡片升级为主主角，阶段结算列表右侧徽章展示最终达到层阶。

### 基本原理
利用底层已经完整采集的 `user_profiles.bestLevel`、`user_profiles.currentLevel` 以及 `daily_summaries.maxLevel`，在表现层与数据 Hook 层完成主次权重的彻底颠倒。正确率保留在诊断层，作为算法收敛度的指示（Optimal Zone / Ascending / Exploring），全面释放自适应系统的进阶正反馈。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/level-centric-metrics #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 补充中英文多语言词典中的层阶与稳态诊断词条

我们首先在 `zh-CN.json` 和 `en-US.json` 中添加有关层阶巅峰、稳态调优状态及挑战深度的文案。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "accuracy": "正确率",
    "startAdaptive": "开始自适应训练",
    "startBenchmark": "20 题基准测试"
  },
~~~~~
~~~~~json.new
    "accuracy": "正确率",
    "peakLevel": "最高 Lvl {{level}}",
    "statusOptimal": "稳态调优中",
    "statusAscending": "快速攀升中",
    "statusExploring": "深水摸索中",
    "startAdaptive": "开始自适应训练",
    "startBenchmark": "20 题基准测试"
  },
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "allTimeTrials": "生涯总计",
    "pathMasteryTitle": "认知推演路径掌握度 (Cognitive Path Mastery)",
~~~~~
~~~~~json.new
    "allTimeTrials": "生涯总计",
    "todayPeakLevel": "今日挑战峰值",
    "weekAvgLevel": "7天活跃均阶",
    "yearPeakLevel": "年度突破峰值",
    "allTimePeakLevel": "生涯巅峰突破",
    "avgLevelLabel": "均阶 Lvl {{level}}",
    "peakLevelLabel": "峰值 Lvl {{level}}",
    "pathMasteryTitle": "认知推演路径掌握度 (Cognitive Path Mastery)",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "accuracy": "Accuracy",
    "startAdaptive": "Adaptive Training",
    "startBenchmark": "20-Trial Benchmark"
  },
~~~~~
~~~~~json.new
    "accuracy": "Accuracy",
    "peakLevel": "Peak Lvl {{level}}",
    "statusOptimal": "Optimal Zone",
    "statusAscending": "Ascending",
    "statusExploring": "Exploring",
    "startAdaptive": "Adaptive Training",
    "startBenchmark": "20-Trial Benchmark"
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "allTimeTrials": "All-Time",
    "pathMasteryTitle": "Cognitive Path Mastery",
~~~~~
~~~~~json.new
    "allTimeTrials": "All-Time",
    "todayPeakLevel": "Today's Peak Level",
    "weekAvgLevel": "7-Day Avg Level",
    "yearPeakLevel": "Year Peak Level",
    "allTimePeakLevel": "All-Time Peak Level",
    "avgLevelLabel": "Avg Lvl {{level}}",
    "peakLevelLabel": "Peak Lvl {{level}}",
    "pathMasteryTitle": "Cognitive Path Mastery",
~~~~~

#### Acts 2: 重构模块卡片 `ModeCard.tsx` 与 `DiscoveryView.tsx`

将 `ModeCard.tsx` 的主视觉展示重构为当前层阶与巅峰层阶，引入稳态指示灯，并在 `DiscoveryView.tsx` 中向其传递 `bestLevel`。

~~~~~act
write_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~tsx
import { BarChart2, FlaskConical, Play, Sliders, Target } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useTranslation } from '../../core/i18n';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export function formatTodayTimeWithT(ms: number, t: (key: string) => string): string {
  if (ms <= 0) return `0${t('common.sec')}`;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}${t('common.sec')}`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0
    ? `${min}${t('common.min')}${sec}${t('common.sec')}`
    : `${min}${t('common.minFull')}`;
}

interface ModeCardProps {
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  bestLevel?: number;
  accuracy: number;
  totalTrials?: number;
  hasAnalytics?: boolean;
  isExperimental?: boolean;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  bestLevel,
  accuracy,
  totalTrials = 0,
  isExperimental = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
  const { t } = useTranslation();
  const isNeverPracticed = totalTrials === 0;

  // 未练习过的卡片默认进入基准测试，已有做答记录的默认进入自适应强化
  const handleCardClick = isNeverPracticed ? onStartBenchmark : onStartTraining;

  const effectiveBestLevel = Math.max(currentLevel, bestLevel || currentLevel);

  // 稳态算法指示解析 (5.1)
  const renderConvergenceStatus = () => {
    if (isNeverPracticed || totalTrials < 5) return null;
    if (accuracy >= 70 && accuracy <= 85) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md"
          title={`${accuracy}% 正确率：处在心理物理学最佳稳态调优区间`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t('card.statusOptimal')}
        </span>
      );
    }
    if (accuracy > 85) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md"
          title={`${accuracy}% 正确率：表现优异，难度正在快速攀升`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          {t('card.statusAscending')}
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md"
        title={`${accuracy}% 正确率：当前处在深水极限摸索区`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {t('card.statusExploring')}
      </span>
    );
  };

  return (
    <div
      role="presentation"
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group bg-card border border-border hover:border-primary/60 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative cursor-pointer select-none"
    >
      <div>
        {/* 顶部标题、图标与右上角状态徽章 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 transition-all shadow-xs flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors truncate">
                  {title}
                </h3>
                {isExperimental && (
                  <Badge variant="warning" size="sm">
                    <FlaskConical className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {t('card.experimentalBadge')}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                {todayCount > 0
                  ? `${t('card.todayTrials')}: ${todayCount} ${t('common.trialsUnit')}${
                      todayTimeMs > 0 ? ` (${formatTodayTimeWithT(todayTimeMs, t)})` : ''
                    }`
                  : isNeverPracticed
                    ? t('common.empty')
                    : `${t('card.todayTrials')}: 0 ${t('common.trialsUnit')}`}
              </div>
            </div>
          </div>

          {/* 右上角：巅峰/基准层阶与快捷操作 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!isNeverPracticed && effectiveBestLevel > currentLevel ? (
              <Badge variant="secondary" size="default" className="font-mono text-xs font-bold text-muted-foreground">
                Peak L{effectiveBestLevel}
              </Badge>
            ) : null}

            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1 gap-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {onOpenAnalytics && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={onOpenAnalytics}
                  title={t('card.statsTooltip', { title })}
                >
                  <BarChart2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onOpenSettings}
                title={t('card.settingsTooltip', { title })}
              >
                <Sliders className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 卡片描述 */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem] mb-5">
          {desc}
        </p>
      </div>

      {/* 底部指标栏与浮动操作按钮（Level 作为主宰一等公民大字） */}
      <div
        className="flex items-end justify-between border-t border-border/60 pt-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* 左侧：当前层阶大字显示与稳态指示 */}
        <div className="space-y-1">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span>{t('card.skillLevel')}</span>
            {renderConvergenceStatus()}
          </div>
          <div className="text-sm font-black text-foreground font-mono flex items-baseline gap-2">
            <span
              className={
                isNeverPracticed
                  ? 'text-muted-foreground text-base'
                  : 'text-primary font-black text-lg'
              }
            >
              {isNeverPracticed ? '--' : `Lvl ${currentLevel}`}
            </span>
            {!isNeverPracticed && (
              <span className="text-[11px] font-normal text-muted-foreground font-sans">
                ({totalTrials} {t('common.trialsUnit')})
              </span>
            )}
          </div>
        </div>

        {/* 右侧：紧凑动作按钮组 */}
        <div className="flex items-center gap-2">
          {isNeverPracticed ? (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={onStartTraining}
                title={t('card.startAdaptive')}
              >
                <Play className="w-4 h-4 fill-current text-muted-foreground" />
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={onStartBenchmark}
                className="gap-1.5 font-bold"
              >
                <Target className="w-3.5 h-3.5" />
                <span>{t('card.startBenchmark')}</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={onStartBenchmark}
                title={t('card.startBenchmark')}
              >
                <Target className="w-4 h-4 text-muted-foreground" />
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={onStartTraining}
                className="gap-1.5 font-bold"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('card.startAdaptive')}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/views/DiscoveryView.tsx
~~~~~
~~~~~tsx.old
            const currentLevel = profile?.currentLevel || 5;
            const stat = todayStats[card.id] || { count: 0, timeMs: 0 };
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);

            return (
              <ModeCard
                key={card.id}
                title={cardTitle}
                desc={cardDesc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                totalTrials={totalTrials}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={card.tags.status === 'experimental'}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
~~~~~
~~~~~tsx.new
            const currentLevel = profile?.currentLevel || 5;
            const bestLevel = profile?.bestLevel || currentLevel;
            const stat = todayStats[card.id] || { count: 0, timeMs: 0 };
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);

            return (
              <ModeCard
                key={card.id}
                title={cardTitle}
                desc={cardDesc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                bestLevel={bestLevel}
                accuracy={accuracy}
                totalTrials={totalTrials}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={card.tags.status === 'experimental'}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
~~~~~

#### Acts 3: 重构今日仪表盘 `HomeView.tsx`

将主页底部统计大卡片的“综合正确率”重构为“今日挑战深度/峰值层阶”。

~~~~~act
patch_file
src/views/HomeView.tsx
~~~~~
~~~~~tsx.old
  // 统计所有模块的平均正确率
  const allProfilesList = Object.values(profiles);
  const allTotalTrials = allProfilesList.reduce((acc, p) => acc + p.totalTrials, 0);
  const allTotalHits = allProfilesList.reduce((acc, p) => acc + p.totalHits, 0);
  const overallAccuracy =
    allTotalTrials > 0 ? Math.round((allTotalHits / allTotalTrials) * 100) : 0;
~~~~~
~~~~~tsx.new
  // 统计今日活跃模块的挑战峰值与平均层阶
  const activeTodayCardIds = Object.keys(todayStats).filter((id) => (todayStats[id]?.count || 0) > 0);
  const todayLevels = activeTodayCardIds.map((id) => profiles[id]?.currentLevel || 5);
  const todayPeakLevel = todayLevels.length > 0 ? Math.max(...todayLevels) : 0;
  const todayAvgLevel =
    todayLevels.length > 0
      ? (todayLevels.reduce((a, b) => a + b, 0) / todayLevels.length).toFixed(1)
      : null;
~~~~~

~~~~~act
patch_file
src/views/HomeView.tsx
~~~~~
~~~~~tsx.old
          <div className="text-2xl font-black text-foreground font-mono">
            {todayTotalCount}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              {t('common.trialsUnit')}
            </span>
          </div>
          <div className="text-xs text-muted-foreground pt-0.5">
            {t('common.accuracy')}:{' '}
            <span className="font-bold text-foreground font-mono">{overallAccuracy}%</span>
          </div>
        </div>
~~~~~
~~~~~tsx.new
          <div className="text-2xl font-black text-foreground font-mono">
            {todayTotalCount}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              {t('common.trialsUnit')}
            </span>
          </div>
          <div className="text-xs text-muted-foreground pt-0.5 flex items-center gap-1">
            <span>{t('stats.todayPeakLevel')}:</span>
            <span className="font-bold text-primary font-mono">
              {todayPeakLevel > 0 ? `Lvl ${todayPeakLevel}` : '--'}
            </span>
            {todayAvgLevel && (
              <span className="text-muted-foreground font-sans">
                ({t('stats.avgLevelLabel', { level: todayAvgLevel })})
              </span>
            )}
          </div>
        </div>
~~~~~

#### Acts 4: 重构全局认知数据统计 Hook `useGlobalStatsData.ts`

升级数据聚合逻辑，从物化表提取今日、7天、年度及生涯峰值层阶与均阶，并将认知路径与心智抗性的掌握度统计升级为包含 `avgLevel` 和 `peakLevel`。

~~~~~act
write_file
src/hooks/useGlobalStatsData.ts
~~~~~
~~~~~ts
import { useMemo, useState } from 'preact/hooks';
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { getLocalDateString } from '../storage/index';
import { $dailySummaries, $isProfilesLoaded, $profiles } from '../stores/profileStore';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';

export interface TimeTierStats {
  total: number;
  hits: number;
  peakLevel: number;
  avgLevel: number;
}

export interface MasteryItem {
  label: string;
  total: number;
  hits: number;
  accuracy: number;
  avgLevel: number;
  peakLevel: number;
  cardCount: number;
}

export function useGlobalStatsData() {
  const { t } = useTranslation();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const summaries = $dailySummaries.value;
  const profilesMap = $profiles.value;
  const loading = !$isProfilesLoaded.value;

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (selectedFilter === 'all') return true;

      if (selectedFilter.startsWith('domain:')) {
        const targetDomain = selectedFilter.replace('domain:', '') as VisualDomainTag;
        const matchedCards = registry.queryCards({ domains: [targetDomain] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId);
      }

      if (selectedFilter.startsWith('path:')) {
        const targetPath = selectedFilter.replace('path:', '') as CognitivePathTag;
        const matchedCards = registry.queryCards({ paths: [targetPath] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId);
      }

      if (selectedFilter.startsWith('challenge:')) {
        const targetChallenge = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
        const matchedCards = registry.queryCards({ challenges: [targetChallenge] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId);
      }

      if (selectedFilter.startsWith('card:')) {
        const targetCardId = selectedFilter.replace('card:', '');
        return s.cardId === targetCardId;
      }

      return true;
    });
  }, [summaries, selectedFilter]);

  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return t('stats.allModules');
    if (selectedFilter.startsWith('domain:')) {
      const d = selectedFilter.replace('domain:', '') as VisualDomainTag;
      return `Domain • ${t(DOMAIN_TAGS[d]?.i18nKey || d)}`;
    }
    if (selectedFilter.startsWith('path:')) {
      const p = selectedFilter.replace('path:', '') as CognitivePathTag;
      return `Path • ${t(PATH_TAGS[p]?.i18nKey || p)}`;
    }
    if (selectedFilter.startsWith('challenge:')) {
      const c = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
      return `Challenge • ${t(CHALLENGE_TAGS[c]?.i18nKey || c)}`;
    }
    if (selectedFilter.startsWith('card:')) {
      const cardId = selectedFilter.replace('card:', '');
      const card = registry.getCardById(cardId);
      const cTitle = card ? getCardTitle(card, t) : cardId;
      return `${cTitle}`;
    }
    return t('stats.allModules');
  };

  const now = new Date();
  const todayStr = getLocalDateString(now.getTime());
  const startOfWeekStr = getLocalDateString(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const startOfYearStr = `${now.getFullYear()}-01-01`;

  const { stats, dailyData } = useMemo(() => {
    const rawTiers: Record<'today' | 'week' | 'year' | 'allTime', { total: number; hits: number; levels: number[] }> = {
      today: { total: 0, hits: 0, levels: [] },
      week: { total: 0, hits: 0, levels: [] },
      year: { total: 0, hits: 0, levels: [] },
      allTime: { total: 0, hits: 0, levels: [] },
    };

    const data: Record<string, { total: number; maxLevel: number }> = {};

    for (const s of filteredSummaries) {
      rawTiers.allTime.total += s.totalCount;
      rawTiers.allTime.hits += s.hitCount;
      if (s.maxLevel) rawTiers.allTime.levels.push(s.maxLevel);

      if (s.date === todayStr) {
        rawTiers.today.total += s.totalCount;
        rawTiers.today.hits += s.hitCount;
        if (s.maxLevel) rawTiers.today.levels.push(s.maxLevel);
      }
      if (s.date >= startOfWeekStr) {
        rawTiers.week.total += s.totalCount;
        rawTiers.week.hits += s.hitCount;
        if (s.maxLevel) rawTiers.week.levels.push(s.maxLevel);
      }
      if (s.date >= startOfYearStr) {
        rawTiers.year.total += s.totalCount;
        rawTiers.year.hits += s.hitCount;
        if (s.maxLevel) rawTiers.year.levels.push(s.maxLevel);
      }

      if (!data[s.date]) {
        data[s.date] = { total: 0, maxLevel: s.maxLevel };
      }
      data[s.date].total += s.totalCount;
      data[s.date].maxLevel = Math.max(data[s.date].maxLevel, s.maxLevel);
    }

    const calcTier = (item: { total: number; hits: number; levels: number[] }): TimeTierStats => {
      const peakLevel = item.levels.length > 0 ? Math.max(...item.levels) : 0;
      const avgLevel =
        item.levels.length > 0
          ? Math.round((item.levels.reduce((a, b) => a + b, 0) / item.levels.length) * 10) / 10
          : 0;
      return {
        total: item.total,
        hits: item.hits,
        peakLevel,
        avgLevel,
      };
    };

    const statsObj = {
      today: calcTier(rawTiers.today),
      week: calcTier(rawTiers.week),
      year: calcTier(rawTiers.year),
      allTime: calcTier(rawTiers.allTime),
    };

    return { stats: statsObj, dailyData: data };
  }, [filteredSummaries, todayStr, startOfWeekStr, startOfYearStr]);

  const heatmapDays = 84;
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const heatmapData = useMemo(() => {
    return Array.from({ length: heatmapDays }).map((_, i) => {
      const dMs = startOfTodayMs - (heatmapDays - 1 - i) * 24 * 60 * 60 * 1000;
      const dateStr = getLocalDateString(dMs);
      return {
        date: dateStr,
        count: dailyData[dateStr]?.total || 0,
      };
    });
  }, [startOfTodayMs, dailyData]);

  // 认知推演路径聚合（包含层阶维度）
  const pathMasteryList = useMemo((): MasteryItem[] => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }

    return (Object.keys(PATH_TAGS) as CognitivePathTag[]).map((path) => {
      const matchingCards = registry.queryCards({ paths: [path] });
      let pathTotal = 0;
      let pathHits = 0;
      const levels: number[] = [];

      for (const card of matchingCards) {
        const item = cardSummaryMap.get(card.id);
        if (item) {
          pathTotal += item.total;
          pathHits += item.hits;
        }
        const prof = profilesMap[card.id];
        if (prof && prof.totalTrials > 0) {
          levels.push(prof.currentLevel);
        }
      }

      const acc = pathTotal > 0 ? Math.round((pathHits / pathTotal) * 100) : 0;
      const peakLevel = levels.length > 0 ? Math.max(...levels) : 0;
      const avgLevel =
        levels.length > 0 ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10 : 0;

      return {
        label: t(PATH_TAGS[path].i18nKey),
        total: pathTotal,
        hits: pathHits,
        accuracy: acc,
        avgLevel,
        peakLevel,
        cardCount: matchingCards.length,
      };
    });
  }, [summaries, profilesMap, t]);

  // 心智抗性聚合（包含层阶维度）
  const challengeMasteryList = useMemo((): MasteryItem[] => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }

    return (Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((ch) => {
      const matchingCards = registry.queryCards({ challenges: [ch] });
      let chTotal = 0;
      let chHits = 0;
      const levels: number[] = [];

      for (const card of matchingCards) {
        const item = cardSummaryMap.get(card.id);
        if (item) {
          chTotal += item.total;
          chHits += item.hits;
        }
        const prof = profilesMap[card.id];
        if (prof && prof.totalTrials > 0) {
          levels.push(prof.currentLevel);
        }
      }

      const acc = chTotal > 0 ? Math.round((chHits / chTotal) * 100) : 0;
      const peakLevel = levels.length > 0 ? Math.max(...levels) : 0;
      const avgLevel =
        levels.length > 0 ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10 : 0;

      return {
        label: t(CHALLENGE_TAGS[ch].i18nKey),
        total: chTotal,
        hits: chHits,
        accuracy: acc,
        avgLevel,
        peakLevel,
        cardCount: matchingCards.length,
      };
    });
  }, [summaries, profilesMap, t]);

  return {
    loading,
    selectedFilter,
    setSelectedFilter,
    getCurrentFilterLabel,
    stats,
    dailyData,
    heatmapData,
    pathMasteryList,
    challengeMasteryList,
  };
}
~~~~~

#### Acts 5: 重构认知统计大盘视图 `StatsMetricCards.tsx` 与 `CognitiveMasteryGrid.tsx`

替换 `StatsMetricCards.tsx` 中各时段卡片底部的百分比小字为峰值与均阶；在 `CognitiveMasteryGrid.tsx` 中使用掌握层阶及层阶色梯替换旧的正确率百分比。

~~~~~act
write_file
src/components/stats/StatsMetricCards.tsx
~~~~~
~~~~~tsx
import { Activity, Calendar, Target, TrendingUp } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { TimeTierStats } from '../../hooks/useGlobalStatsData';
import { MetricCard } from '../ui/metric-card';

interface StatsMetricCardsProps {
  stats: {
    today: TimeTierStats;
    week: TimeTierStats;
    year: TimeTierStats;
    allTime: TimeTierStats;
  };
  streakDays: number;
}

export function StatsMetricCards({ stats, streakDays }: StatsMetricCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 1. 今日刷题与日挑战峰值 */}
      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Calendar className="w-4 h-4 text-primary" />
          {t('stats.todayTrials')}
        </div>
        <div className="text-3xl font-black text-foreground font-mono">
          {stats.today.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
          <span>{t('stats.todayPeakLevel')}:</span>
          <span className="font-mono font-black">
            {stats.today.peakLevel > 0 ? `Lvl ${stats.today.peakLevel}` : '--'}
          </span>
        </div>
      </MetricCard>

      {/* 2. 7天刷题与活跃均阶 */}
      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Target className="w-4 h-4 text-emerald-500" />
          {t('stats.weekTrials')}
        </div>
        <div className="text-3xl font-black text-foreground font-mono">
          {stats.week.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
          <span>{t('stats.weekAvgLevel')}:</span>
          <span className="font-mono font-black">
            {stats.week.avgLevel > 0 ? `Lvl ${stats.week.avgLevel}` : '--'}
          </span>
        </div>
      </MetricCard>

      {/* 3. 年度累计与年度突破峰值 */}
      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Activity className="w-4 h-4 text-amber-500" />
          {t('stats.yearTrials')}
        </div>
        <div className="text-3xl font-black text-foreground font-mono">
          {stats.year.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
          <span>{t('stats.yearPeakLevel')}:</span>
          <span className="font-mono font-black">
            {stats.year.peakLevel > 0 ? `Lvl ${stats.year.peakLevel}` : '--'}
          </span>
        </div>
      </MetricCard>

      {/* 4. 生涯总计与生涯巅峰 */}
      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          {t('stats.allTimeTrials')}
        </div>
        <div className="text-3xl font-black text-foreground font-mono">
          {stats.allTime.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-semibold mt-1 flex items-center justify-between">
          <span>{t('stats.streakDays', { days: streakDays })}</span>
          <span className="font-mono font-bold text-foreground">
            {stats.allTime.peakLevel > 0 ? `Peak L${stats.allTime.peakLevel}` : ''}
          </span>
        </div>
      </MetricCard>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/stats/CognitiveMasteryGrid.tsx
~~~~~
~~~~~tsx
import { Brain, Compass } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { MasteryItem } from '../../hooks/useGlobalStatsData';
import { MetricCard } from '../ui/metric-card';

interface CognitiveMasteryGridProps {
  pathMasteryList: MasteryItem[];
  challengeMasteryList: MasteryItem[];
}

export function CognitiveMasteryGrid({
  pathMasteryList,
  challengeMasteryList,
}: CognitiveMasteryGridProps) {
  const { t } = useTranslation();

  // 依据能力层阶深浅赋予视觉梯队色彩 (L1~10 浅水区, L11~20 进阶区, L21+ 专家区)
  const getLevelBadgeClass = (avgLevel: number) => {
    if (avgLevel === 0) return 'bg-muted text-muted-foreground';
    if (avgLevel >= 21) return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black';
    if (avgLevel >= 11) return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black';
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black';
  };

  return (
    <>
      {/* 认知路径推演能力矩阵 */}
      <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-600" />
            {t('stats.pathMasteryTitle')}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {t('stats.pathMasterySubtitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pathMasteryList.map((pm) => (
            <MetricCard key={pm.label} variant="subtle" padding="compact" className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="truncate">{pm.label}</span>
                <span className={`font-mono text-xs px-2 py-0.5 rounded-lg ${getLevelBadgeClass(pm.avgLevel)}`}>
                  {pm.avgLevel > 0 ? `Avg L${pm.avgLevel}` : '--'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{pm.peakLevel > 0 ? `Peak L${pm.peakLevel}` : t('stats.practicedTrials', { count: pm.total })}</span>
                <span>{t('stats.modulesCount', { count: pm.cardCount })}</span>
              </div>
            </MetricCard>
          ))}
        </div>
      </div>

      {/* 核心心智抗性矩阵 */}
      <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4 text-rose-500" />
            {t('stats.challengeMasteryTitle')}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {t('stats.challengeMasterySubtitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {challengeMasteryList.map((cm) => (
            <MetricCard key={cm.label} variant="subtle" padding="compact" className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="truncate">{cm.label.split(' ')[0]}</span>
                <span className={`font-mono text-xs px-2 py-0.5 rounded-lg ${getLevelBadgeClass(cm.avgLevel)}`}>
                  {cm.avgLevel > 0 ? `Avg L${cm.avgLevel}` : '--'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{cm.peakLevel > 0 ? `Peak L${cm.peakLevel}` : t('stats.practicedTrials', { count: cm.total })}</span>
                <span>{t('stats.modulesCount', { count: cm.cardCount })}</span>
              </div>
            </MetricCard>
          ))}
        </div>
      </div>
    </>
  );
}
~~~~~

#### Acts 6: 重构单局结算与训练流结算弹窗 (`SessionSummaryModal.tsx` & `PlanSummaryModal.tsx`)

将单局练习结算中的“层阶演进卡片”升级为第一主角大卡，正确率降为辅助状态指示；将多阶段训练流总结中的百分比指标替换为达到的层阶。

~~~~~act
write_file
src/components/modals/SessionSummaryModal.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { renderSessionTrendChartCanvas } from '../../core/canvas/charts/drawTrendChart';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import { ModalShell } from '../common/ModalShell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MetricCard } from '../ui/metric-card';

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
        {/* 1. 核心第一视觉主角：层阶演进与突破大卡 (Level Evolution Hero) */}
        <div className="bg-accent border border-border/60 dark:border-border/60 p-4 sm:p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-2xl shadow-xs">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('summary.levelEvolution')}
              </div>
              <div className="text-sm text-foreground font-black mt-0.5">
                {levelDiff > 0
                  ? t('summary.levelUp', { diff: levelDiff })
                  : levelDiff < 0
                    ? t('summary.levelDown', { diff: Math.abs(levelDiff) })
                    : t('summary.levelMaintain')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-foreground text-sm">
            <Badge variant="secondary" size="default" className="font-mono text-xs">
              Lvl {startLevel}
            </Badge>
            <ArrowRight className="w-4 h-4 text-primary" />
            <Badge variant="default" size="default" className="font-mono text-sm px-3 py-1 bg-primary text-primary-foreground">
              Lvl {endLevel}
            </Badge>
          </div>
        </div>

        {/* 2. 次级指标卡片 (时长与做答节奏，正确率降为辅助) */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t('summary.duration')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground font-mono">
                {formatSecondsToTimer(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('summary.secPerTrial', { sec: avgResponseTimeSec })}
              </span>
            </div>
          </MetricCard>

          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span>{t('summary.accuracyCount')}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground font-mono">{totalTrials}</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t('common.trialsUnit')} ({accuracy}% 稳态)
              </span>
            </div>
          </MetricCard>
        </div>

        {/* 3. 折线图 Canvas 区 */}
        <div className="bg-muted/60 p-3.5 rounded-2xl border border-border w-full overflow-hidden">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-xs font-bold text-muted-foreground">
              {t('summary.curveTitle')}
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Badge
                  variant="success"
                  size="sm"
                  className="w-2 h-2 p-0 rounded-full border-none"
                />{' '}
                {t('summary.hitLegend')}
              </span>
              <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-semibold">
                <Badge
                  variant="destructive"
                  size="sm"
                  className="w-2 h-2 p-0 rounded-full border-none"
                />{' '}
                {t('summary.missLegend')}
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full max-w-full aspect-[11/4] rounded-xl block border border-border/60 shadow-inner"
          />
        </div>

        {/* 4. 底部操作按钮 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="h-11 gap-1.5">
            <Home className="w-4 h-4" />
            <span>{t('summary.backHome')}</span>
          </Button>
          <Button variant="default" onClick={onRestart} className="h-11 gap-1.5">
            <RotateCcw className="w-4 h-4" />
            <span>{t('summary.trainAgain')}</span>
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Award, Clock, Home, Layers, RotateCcw, Zap } from 'lucide-preact';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import { ModalShell } from '../common/ModalShell';
import type { SessionHistoryItem } from '../modals/SessionSummaryModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MetricCard } from '../ui/metric-card';

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

  // 统计各阶段的最终层阶与峰值
  const endLevels = stageResults.map((s) => {
    if (s.history.length === 0) return 5;
    return s.history[s.history.length - 1].levelAfter;
  });
  const peakLevelAchieved = endLevels.length > 0 ? Math.max(...endLevels) : 5;

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
        {/* 核心综合指标卡片 (以突破峰值与完成规模为核心) */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard variant="accent" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>{t('stats.todayPeakLevel')}</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              Lvl {peakLevelAchieved}
            </div>
          </MetricCard>

          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-muted-foreground">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>{t('plan.stageCount', { count: stageResults.length })}</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {totalTrials}{' '}
              <span className="text-xs font-normal text-muted-foreground">{t('common.trialsUnit')}</span>
            </div>
          </MetricCard>

          <MetricCard variant="subtle" padding="dense" className="space-y-1">
            <div className="flex items-center gap-1 text-xs uppercase font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{t('common.totalTimeSpent')}</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {formatSecondsToTimer(totalElapsedSeconds)}
            </div>
          </MetricCard>
        </div>

        {/* 分阶段明细成果 (右侧大徽章突出最终晋级 Level) */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('common.stageBreakdown')}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stageResults.map((stage, idx) => {
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
                  className="p-3 bg-muted/60 border border-border rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-lg bg-foreground text-background font-mono text-xs font-black flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-card text-primary border border-border/60 shadow-xs flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate">{cardTitle}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {stage.history.length} {t('common.trialsUnit')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-muted-foreground bg-card px-2 py-1 rounded-xl border border-border/60">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                      <span className="text-primary font-black">L{endLvl}</span>
                    </div>

                    <Badge
                      variant={endLvl >= startLvl ? 'accent' : 'secondary'}
                      size="default"
                      className="font-mono text-xs font-black"
                    >
                      Lvl {endLvl}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部动作按钮 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="h-11 gap-1.5">
            <Home className="w-4 h-4" />
            <span>{t('common.completeAndReturnHome')}</span>
          </Button>
          <Button variant="default" onClick={onRestart} className="h-11 gap-1.5">
            <RotateCcw className="w-4 h-4" />
            <span>{t('common.restartPlan')}</span>
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

### 下一步建议
1. 执行测试或在本地启动开发环境，验证模块卡片、主页、统计大盘及结算弹窗在各分辨率下的视觉排版与交互。
2. 观察实际做答训练一轮后，结算弹窗中层阶演进（Level Evolution）及主页今日挑战峰值（Today Peak Level）的数据流转是否丝滑准确。
