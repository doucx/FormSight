接下来我们重构排行第 2 名的 **`GlobalStatsView.tsx`**（Score: 50.4, SLOC: 509）。

本次实施将：
1. 创建 **`useGlobalStatsData`** Hook：将 84 天热力图计算、认知推演路径聚合、心智抗性聚合、四维时间段试炼统计以及多维 Filter 过滤逻辑全部下沉；
2. 创建 **`StatsMetricCards`**：负责渲染「今日 / 近 7 天 / 本年 / 生涯」四维核心指标大卡片；
3. 创建 **`CognitiveMasteryGrid`**：负责渲染「认知路径推演掌握度」与「核心心智抗性」两大能力矩阵；
4. 创建 **`ActivityHeatmapCard`**：负责渲染 12 周活动热力图；
5. 将 **`GlobalStatsView.tsx`** 精简为纯粹的展示组装层（从 509 行降至 ~120 行）。

## [WIP] refactor: 模块化拆分 GlobalStatsView 统计大盘视图

### 用户需求
对聚合大量物化数据与 Canvas 图表的 `GlobalStatsView.tsx` 进行模块化拆分，抽离繁杂的数据聚合计算与细分子卡片。

### 评论
`GlobalStatsView` 同时承担了多维倒排过滤查询、时间桶聚类、四维掌握度加权计算以及热力图和 Canvas 图表的渲染。将纯数据聚合下沉至 Hook，将大盘各分区独立为子组件，能极大提升数据流的清晰度与可测试性。

### 目标
1. 新建 `src/hooks/useGlobalStatsData.ts` 集中管理所有统计分析的数据聚合逻辑。
2. 新建 `src/components/stats/StatsMetricCards.tsx` 承载指标统计卡片组。
3. 新建 `src/components/stats/CognitiveMasteryGrid.tsx` 承载推演路径与心智抗性矩阵。
4. 新建 `src/components/stats/ActivityHeatmapCard.tsx` 承载 12 周热力图网格。
5. 重写 `src/views/GlobalStatsView.tsx`，保持精简纯粹的布局结构。

### 基本原理
采用容器-展示（Container-Presenter）模式与自定义 Hook 结合，实现数据聚合流与视图卡片组件的解耦。

### 标签
#intent/refine #flow/ready #priority/high #comp/views #concept/history #scope/core #scope/dx #ai/delegate #task/domain/refactoring #task/object/god-files #task/action/modularization #task/state/continue

---

### Script

#### Acts 1: 创建 `useGlobalStatsData` 统计分析聚合 Hook

新建专用 Hook，封装全部数据加载、倒排过滤计算、各时间段汇总、84天热力图与双维度能力矩阵。

~~~~~act
write_file
src/hooks/useGlobalStatsData.ts
~~~~~
~~~~~typescript
import { useEffect, useMemo, useState } from 'preact/hooks';
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';
import { type DailySummaryData, getDailySummaries, getLocalDateString } from '../utils/db/index';

export function useGlobalStatsData() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummaryData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const data = await getDailySummaries();
      if (isMounted) {
        setSummaries(data);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (selectedFilter === 'all') return true;

      if (selectedFilter.startsWith('pack:')) {
        const targetPackId = selectedFilter.replace('pack:', '');
        const pack = registry.getPack(targetPackId);
        const packCardIds = new Set(pack?.cards.map((c) => c.id) || []);
        return packCardIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('domain:')) {
        const targetDomain = selectedFilter.replace('domain:', '') as VisualDomainTag;
        const matchedCards = registry.queryCards({ domains: [targetDomain] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('path:')) {
        const targetPath = selectedFilter.replace('path:', '') as CognitivePathTag;
        const matchedCards = registry.queryCards({ paths: [targetPath] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('challenge:')) {
        const targetChallenge = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
        const matchedCards = registry.queryCards({ challenges: [targetChallenge] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('card:')) {
        const targetCardId = selectedFilter.replace('card:', '');
        return s.cardId === targetCardId || s.mode === targetCardId;
      }

      return true;
    });
  }, [summaries, selectedFilter]);

  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return t('stats.allModules');
    if (selectedFilter.startsWith('pack:')) {
      const pId = selectedFilter.replace('pack:', '');
      const pack = registry.getPack(pId);
      const pTitle = pack ? getPackTitle(pack, t) : pId;
      return `${t('home.allPacks')} • ${pTitle}`;
    }
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
    const statsObj = {
      today: { total: 0, hits: 0 },
      week: { total: 0, hits: 0 },
      year: { total: 0, hits: 0 },
      allTime: { total: 0, hits: 0 },
    };

    const data: Record<string, { total: number; maxLevel: number }> = {};

    for (const s of filteredSummaries) {
      statsObj.allTime.total += s.totalCount;
      statsObj.allTime.hits += s.hitCount;

      if (s.date === todayStr) {
        statsObj.today.total += s.totalCount;
        statsObj.today.hits += s.hitCount;
      }
      if (s.date >= startOfWeekStr) {
        statsObj.week.total += s.totalCount;
        statsObj.week.hits += s.hitCount;
      }
      if (s.date >= startOfYearStr) {
        statsObj.year.total += s.totalCount;
        statsObj.year.hits += s.hitCount;
      }

      if (!data[s.date]) {
        data[s.date] = { total: 0, maxLevel: s.maxLevel };
      }
      data[s.date].total += s.totalCount;
      data[s.date].maxLevel = Math.max(data[s.date].maxLevel, s.maxLevel);
    }

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

  // 认知推演路径聚合
  const pathMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId || s.mode;
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

      for (const card of matchingCards) {
        const item = cardSummaryMap.get(card.id);
        if (item) {
          pathTotal += item.total;
          pathHits += item.hits;
        }
      }

      const acc = pathTotal > 0 ? Math.round((pathHits / pathTotal) * 100) : 0;
      return {
        path,
        label: t(PATH_TAGS[path].i18nKey),
        total: pathTotal,
        hits: pathHits,
        accuracy: acc,
        cardCount: matchingCards.length,
      };
    });
  }, [summaries, t]);

  // 心智抗性聚合
  const challengeMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId || s.mode;
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

      for (const card of matchingCards) {
        const item = cardSummaryMap.get(card.id);
        if (item) {
          chTotal += item.total;
          chHits += item.hits;
        }
      }

      const acc = chTotal > 0 ? Math.round((chHits / chTotal) * 100) : 0;
      return {
        challenge: ch,
        label: t(CHALLENGE_TAGS[ch].i18nKey),
        total: chTotal,
        hits: chHits,
        accuracy: acc,
        cardCount: matchingCards.length,
      };
    });
  }, [summaries, t]);

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

#### Acts 2: 创建 `StatsMetricCards` 四维核心指标卡片组件

新建核心数据卡片组，清晰呈现今日、本周、本年与生涯总计。

~~~~~act
write_file
src/components/stats/StatsMetricCards.tsx
~~~~~
~~~~~typescript
import { Activity, Calendar, Target, TrendingUp } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';

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
      <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <Calendar className="w-4 h-4 text-indigo-500" />
          {t('stats.todayTrials')}
        </div>
        <div className="text-3xl font-black text-slate-800">
          {stats.today.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-indigo-600 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.today.hits, stats.today.total)}%
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <Target className="w-4 h-4 text-emerald-500" />
          {t('stats.weekTrials')}
        </div>
        <div className="text-3xl font-black text-slate-800">
          {stats.week.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-emerald-600 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.week.hits, stats.week.total)}%
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <Activity className="w-4 h-4 text-amber-500" />
          {t('stats.yearTrials')}
        </div>
        <div className="text-3xl font-black text-slate-800">
          {stats.year.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-amber-600 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.year.hits, stats.year.total)}%
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          {t('stats.allTimeTrials')}
        </div>
        <div className="text-3xl font-black text-slate-800">
          {stats.allTime.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-slate-500 font-semibold mt-1">
          {t('stats.streakDays', { days: streakDays })}
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 3: 创建 `CognitiveMasteryGrid` 认知矩阵卡片组件

新建推演路径与心智抗性掌握度网格组件。

~~~~~act
write_file
src/components/stats/CognitiveMasteryGrid.tsx
~~~~~
~~~~~typescript
import { Brain, Compass } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';

export interface MasteryItem {
  label: string;
  total: number;
  hits: number;
  accuracy: number;
  cardCount: number;
}

interface CognitiveMasteryGridProps {
  pathMasteryList: MasteryItem[];
  challengeMasteryList: MasteryItem[];
}

export function CognitiveMasteryGrid({
  pathMasteryList,
  challengeMasteryList,
}: CognitiveMasteryGridProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* 认知路径推演能力矩阵 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-600" />
            {t('stats.pathMasteryTitle')}
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {t('stats.pathMasterySubtitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pathMasteryList.map((pm) => (
            <div
              key={pm.label}
              className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="truncate">{pm.label}</span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-lg ${
                    pm.total === 0
                      ? 'bg-slate-100 text-slate-400'
                      : pm.accuracy >= 80
                        ? 'bg-emerald-50 text-emerald-700 font-black'
                        : pm.accuracy >= 60
                          ? 'bg-amber-50 text-amber-700 font-black'
                          : 'bg-rose-50 text-rose-700 font-black'
                  }`}
                >
                  {pm.total > 0 ? `${pm.accuracy}%` : '--'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>{t('stats.practicedTrials', { count: pm.total })}</span>
                <span>{t('stats.modulesCount', { count: pm.cardCount })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 核心心智抗性矩阵 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4 text-rose-500" />
            {t('stats.challengeMasteryTitle')}
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {t('stats.challengeMasterySubtitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {challengeMasteryList.map((cm) => (
            <div
              key={cm.label}
              className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="truncate">{cm.label.split(' ')[0]}</span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-lg ${
                    cm.total === 0
                      ? 'bg-slate-100 text-slate-400'
                      : cm.accuracy >= 80
                        ? 'bg-rose-50 text-rose-700 font-black'
                        : cm.accuracy >= 60
                          ? 'bg-amber-50 text-amber-700 font-black'
                          : 'bg-slate-100 text-slate-600 font-black'
                  }`}
                >
                  {cm.total > 0 ? `${cm.accuracy}%` : '--'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>{t('stats.practicedTrials', { count: cm.total })}</span>
                <span>{t('stats.modulesCount', { count: cm.cardCount })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
~~~~~

#### Acts 4: 创建 `ActivityHeatmapCard` 活跃热力图组件

新建 12 周活动热力图展示卡片。

~~~~~act
write_file
src/components/stats/ActivityHeatmapCard.tsx
~~~~~
~~~~~typescript
import { useTranslation } from '../../core/i18n';

interface ActivityHeatmapCardProps {
  heatmapData: { date: string; count: number }[];
}

export function ActivityHeatmapCard({ heatmapData }: ActivityHeatmapCardProps) {
  const { t } = useTranslation();

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count < 10) return 'bg-indigo-200';
    if (count < 25) return 'bg-indigo-400';
    if (count < 50) return 'bg-indigo-600';
    return 'bg-indigo-800';
  };

  return (
    <div className="bg-white border border-slate-200/80 shadow-sm p-6 rounded-3xl flex flex-col gap-4">
      <div className="text-sm font-bold text-slate-800 flex items-center justify-between">
        <span>{t('stats.heatmapTitle')}</span>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-normal">
          {t('stats.heatmapLess')} <div className="w-3 h-3 rounded-sm bg-slate-100" />
          <div className="w-3 h-3 rounded-sm bg-indigo-200" />
          <div className="w-3 h-3 rounded-sm bg-indigo-400" />
          <div className="w-3 h-3 rounded-sm bg-indigo-600" />
          <div className="w-3 h-3 rounded-sm bg-indigo-800" /> {t('stats.heatmapMore')}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-2 self-center py-2">
        {heatmapData.map((day) => (
          <div
            key={day.date}
            title={t('stats.heatmapTooltip', { date: day.date, count: day.count })}
            className={`w-4 h-4 rounded-[4px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
              day.count,
            )}`}
          />
        ))}
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 重写 `GlobalStatsView.tsx` 为纯粹的装配视图

使用拆解后的 Hook 和子组件对 `GlobalStatsView.tsx` 进行轻量组装。

~~~~~act
write_file
src/views/GlobalStatsView.tsx
~~~~~
~~~~~typescript
import { Activity, ArrowLeft, BarChart2, ChevronDown, Filter } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { ActivityHeatmapCard } from '../components/stats/ActivityHeatmapCard';
import { CognitiveMasteryGrid } from '../components/stats/CognitiveMasteryGrid';
import { StatsMetricCards } from '../components/stats/StatsMetricCards';
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { useGlobalStatsData } from '../hooks/useGlobalStatsData';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';

interface GlobalStatsViewProps {
  onExit: () => void;
}

export function GlobalStatsView({ onExit }: GlobalStatsViewProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    loading,
    selectedFilter,
    setSelectedFilter,
    getCurrentFilterLabel,
    stats,
    dailyData,
    heatmapData,
    pathMasteryList,
    challengeMasteryList,
  } = useGlobalStatsData();

  const packs = registry.getAllPacks();
  const allCards = registry.getAllCards();

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 顶部主操作栏 */}
      <header className="w-full bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.exit')}
          </button>
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-xs">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                {t('stats.title')}
              </h1>
              <p className="text-xs text-slate-400 font-medium">{t('stats.subTitle')}</p>
            </div>
          </div>
        </div>

        {/* 筛选选择器 */}
        <div className="relative flex items-center self-end sm:self-center w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
            className="w-full sm:w-auto pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all shadow-sm max-w-xs truncate"
          >
            <option value="all">{t('stats.allModules')}</option>

            <optgroup label={t('stats.optgroupPacks')}>
              {packs.map((p) => (
                <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                  {getPackTitle(p, t)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupDomains')}>
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
                <option key={`domain:${domain}`} value={`domain:${domain}`}>
                  {t(DOMAIN_TAGS[domain].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupPaths')}>
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((path) => (
                <option key={`path:${path}`} value={`path:${path}`}>
                  {t(PATH_TAGS[path].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupChallenges')}>
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((ch) => (
                <option key={`challenge:${ch}`} value={`challenge:${ch}`}>
                  {t(CHALLENGE_TAGS[ch].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupCards')}>
              {allCards.map((card) => (
                <option key={`card:${card.id}`} value={`card:${card.id}`}>
                  {getCardTitle(card, t)}
                </option>
              ))}
            </optgroup>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
        </div>
      </header>

      {/* 主体展示区 */}
      {loading ? (
        <div className="h-96 bg-white rounded-3xl border border-slate-200/80 p-6 flex items-center justify-center text-slate-400 text-sm shadow-sm">
          {t('stats.loading')}
        </div>
      ) : stats.allTime.total === 0 ? (
        <div className="h-96 bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 shadow-sm">
          <Activity className="w-10 h-10 text-slate-300" />
          {t('stats.noRecords', { filter: getCurrentFilterLabel() })}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <StatsMetricCards
            stats={stats}
            streakDays={Object.keys(dailyData).length}
          />

          <CognitiveMasteryGrid
            pathMasteryList={pathMasteryList}
            challengeMasteryList={challengeMasteryList}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityHeatmapCard heatmapData={heatmapData} />

            <div className="bg-white border border-slate-200/80 shadow-sm p-6 rounded-3xl flex flex-col gap-2">
              <div className="text-sm font-bold text-slate-800 flex items-center justify-between">
                <span>{t('stats.trendTitle')}</span>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                  {t('stats.dailyMaxLevel')}
                </span>
              </div>
              <canvas ref={canvasRef} width={480} height={160} className="w-full mt-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. 运行 `npm run check` 校验类型和格式。
2. 运行 `python3 scripts/check_god_files.py` 查看全局评分，确认 `GlobalStatsView.tsx` 与前述模块已被清理出榜单。
3. 接着可根据实际需要对 `src/app.tsx` 或 `src/core/analytics/universalViews.tsx` 进行解耦。
