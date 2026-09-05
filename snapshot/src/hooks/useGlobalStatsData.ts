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