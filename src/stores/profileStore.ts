import { batch, computed, signal } from '@preact/signals';
import { getAllProfiles, getDailySummaries, getTrainingTimeMs } from '../storage/db/queries';
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
