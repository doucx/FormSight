经过对清空数据、导入 JSON 备份、计划重置及冷数据修剪链路的排查，我们发现原有的刷新机制存在以下**两处关键缺失**：

1. **`useGlobalStatsData.ts` 依然保有本地 `useState` 与 `useEffect` 机制**：由于之前移除了 `dataVersion`，`useGlobalStatsData` 变成了仅在挂载时拉取一次 `getDailySummaries()`。当在全局设置中执行“清除数据”或“导入备份”后，由于该 Hook 未直接订阅 Signal，认知档案页面**无法即时感知**底层数据的清空或还原。
2. **`profileStore.ts` 原先仅缓存了 `$todaySummaries`（今日）而未全局托管 `$dailySummaries`（全量日聚合）**：导致全局统计需要单独异步拉取，未纳入统一的响应式管道。
3. **数据治理回调只更新了 Profile 未联动 Settings 和 Plans Store**：导入备份时，JSON 中同时包含全局设置、训练计划与答题记录，如果只刷新 `refreshAppData()`，会导致已加载在内存中的计划和设置 Signal 未同步从 IndexedDB 重载。

我们将进行针对性补全与升级。

## [WIP] fix: 补全导入备份与清空数据后的全局响应式更新链路

### 错误分析
在移除 `key={...dataVersion}` 后，`useGlobalStatsData` 丢失了强制重载的触发媒介；同时 `DataGovernanceSection` 触发的 `onDataChanged` 仅刷新了部分状态，缺少将全量日聚合 (`$dailySummaries`)、计划库 (`$allPlans`) 与偏好设置 (`$settings`) 一并响应式重载的统一调度。

### 用户需求
确保在全局设置中执行“清空所有数据”、“还原 JSON 备份”、“重置官方计划”或“数据库修剪”后，认知档案（`GlobalStatsView`）、主页工作台（`HomeView`）与计划中心（`PlanEditorView`）能够即时自动响应并刷新最新数据，完全恢复甚至超越原先的数据一致性效果。

### 评论
将全量日聚合数据纳入 `profileStore` 的 Signal 托管，并提供统一的 `reloadAllStores()` 动作，能够让备份还原与清空操作在毫秒级内无缝广播至整个应用的所有页面，无需任何 DOM 销毁重挂，体验流畅且数据严格一致。

### 目标
1. 升级 `src/stores/profileStore.ts`：增加 `$dailySummaries` 全量日聚合 Signal，并将 `$todaySummaries` 转为纯派生计算。
2. 升级 `src/stores/index.ts`：导出 `reloadAllStores()` 统一动作，在备份还原/清空时并行刷新 Settings、Plans 与 Profiles。
3. 重构 `src/hooks/useGlobalStatsData.ts`：直接响应式读取 `$dailySummaries.value`，消除孤立的状态与无感刷新问题。
4. 更新 `src/app.tsx` 与 `src/components/modals/GlobalSettingsModal.tsx`：将 `onDataChanged` 绑定为 `reloadAllStores`。

### 基本原理
通过将 `daily_summaries` 数据源收敛为 Preact Signal，`useGlobalStatsData` 内的过滤与聚合计算（`filteredSummaries`、`heatmapData`、`pathMasteryList` 等）直接依赖 `$dailySummaries`。当 `importAllData()` 或 `clearAllData()` 完成后，调用 `reloadAllStores()` 重新从 IndexedDB 读取并原子化赋给 Signal，所有视图的统计图表和数据看板将立刻自动重绘。

### 标签
#intent/fix #flow/ready #priority/critical #comp/runtime #concept/state #concept/sync #scope/core #ai/instruct #task/domain/state #task/object/backup-import-clear-reactivity #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 升级 `profileStore.ts` 托管全量日聚合数据

将 `getDailySummaries()` 纳入 `$dailySummaries` Signal 统一管理，并使 `$todaySummaries` 成为自动过滤的计算属性。

~~~~~act
write_file
src/stores/profileStore.ts
~~~~~
~~~~~typescript
import { batch, computed, signal } from '@preact/signals';
import {
  getAllProfiles,
  getDailySummaries,
  getTrainingTimeMs,
} from '../storage/db/queries';
import {
  type DailySummaryData,
  type UnifiedProfileData,
  getLocalDateString,
} from '../storage/db/schema';

export const $profiles = signal<Record<string, UnifiedProfileData>>({});
export const $dailySummaries = signal<DailySummaryData[]>([]);
export const $totalTimeMs = signal<number>(0);
export const $isProfilesLoaded = signal<boolean>(false);

export const $todaySummaries = computed<DailySummaryData[]>(() => {
  const todayStr = getLocalDateString(Date.now());
  return $dailySummaries.value.filter((s) => s.date === todayStr);
});

export const $todayStatsMap = computed<Record<string, { count: number; timeMs: number }>>(() => {
  const map: Record<string, { count: number; timeMs: number }> = {};
  for (const s of $todaySummaries.value) {
    const key = s.cardId || s.mode;
    if (!map[key]) {
      map[key] = { count: 0, timeMs: 0 };
    }
    map[key].count += s.totalCount;
    map[key].timeMs += s.totalTimeMs;
  }
  return map;
});

export const $allProfilesList = computed<UnifiedProfileData[]>(() => {
  return Object.values($profiles.value);
});

export const $overallStats = computed(() => {
  const list = $allProfilesList.value;
  const totalTrials = list.reduce((acc, p) => acc + (p.totalTrials || 0), 0);
  const totalHits = list.reduce((acc, p) => acc + (p.totalHits || 0), 0);
  const accuracy = totalTrials > 0 ? Math.round((totalHits / totalTrials) * 100) : 0;
  return { totalTrials, totalHits, accuracy };
});

export async function refreshAppData(): Promise<void> {
  const [timeMs, profileList, allSummaries] = await Promise.all([
    getTrainingTimeMs(),
    getAllProfiles(),
    getDailySummaries(),
  ]);

  const pMap: Record<string, UnifiedProfileData> = {};
  for (const p of profileList) {
    pMap[p.cardId] = p;
  }

  batch(() => {
    $totalTimeMs.value = timeMs;
    $profiles.value = pMap;
    $dailySummaries.value = allSummaries;
    $isProfilesLoaded.value = true;
  });
}
~~~~~

#### Acts 2: 完善 `src/stores/index.ts` 导出统一全量重载动作

在 `src/stores/index.ts` 中封装 `reloadAllStores()`，确保当发生数据还原或彻底清空时，所有在内存中的 Signal 能够一次性全部与数据库同步。

~~~~~act
write_file
src/stores/index.ts
~~~~~
~~~~~typescript
import { initPlanStore } from './planStore';
import { refreshAppData } from './profileStore';
import { initSettingsStore } from './settingsStore';

export * from './settingsStore';
export * from './planStore';
export * from './profileStore';
export * from './toastStore';

/**
 * 在全量导入、清空数据、重置计划后调用，使所有 Signal 状态与数据库完全同步
 */
export async function reloadAllStores(): Promise<void> {
  await Promise.all([initSettingsStore(), initPlanStore(), refreshAppData()]);
}
~~~~~

#### Acts 3: 重构 `src/hooks/useGlobalStatsData.ts` 直连 Signal 状态

去除 `useGlobalStatsData` 内部孤立的 `useEffect` 和 `useState`，使其直接消费 `$dailySummaries.value`。

~~~~~act
write_file
src/hooks/useGlobalStatsData.ts
~~~~~
~~~~~typescript
import { useMemo, useState } from 'preact/hooks';
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { getLocalDateString } from '../storage/index';
import { $dailySummaries, $isProfilesLoaded } from '../stores/profileStore';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';

export function useGlobalStatsData() {
  const { t } = useTranslation();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const summaries = $dailySummaries.value;
  const loading = !$isProfilesLoaded.value;

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (selectedFilter === 'all') return true;

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

#### Acts 4: 更新 `src/app.tsx` 的全局数据治理刷新回调

在 `src/app.tsx` 中将 `GlobalSettingsModal` 的 `onDataChanged` 绑定至 `reloadAllStores`。

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useState } from 'preact/hooks';
import { ToastContainer } from './components/common/Toast';
import { GlobalSettingsModal } from './components/modals/GlobalSettingsModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { AppRouter } from './components/routing/AppRouter';
import { registry } from './core/registry';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useHashRoute } from './hooks/useHashRoute';
import { useTheme } from './hooks/useTheme';
import { reloadAllStores } from './stores/index';
import { refreshAppData } from './stores/profileStore';
import { $settings } from './stores/settingsStore';
import { $toasts, dismissToast, showToast } from './stores/toastStore';

export function App() {
  const { route, navigate } = useHashRoute();
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);

  const { lastHomeRoute } = useAppBootstrap(route);

  // 挂载夜间模式全局响应与监听
  useTheme($settings.value);

  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground antialiased transition-colors duration-200">
      <AppRouter
        route={route}
        navigate={navigate}
        lastHomeRoute={lastHomeRoute}
        onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
        onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
      />

      <ToastContainer toasts={$toasts.value} onDismiss={dismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          settings={$settings.value}
          onClose={() => setIsGlobalSettingsOpen(false)}
          onSave={() => refreshAppData()}
          onDataChanged={reloadAllStores}
          showToast={showToast}
        />
      )}

      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={$settings.value}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={() => refreshAppData()}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. 打开全局设置，测试点击“清空所有数据”，确认认知档案页面、今日工作台与所有卡片等级立即归零/重置。
2. 测试“导出 JSON 备份”后再进行“还原 JSON 备份”，确认所有历史做答曲线与年度热力图能无缝且无白屏闪烁地恢复原状。
