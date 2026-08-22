import { registry } from '../../core/registry';
import {
  type DailySummaryData,
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
  getLocalDateString,
} from './schema';

/**
 * 原子化保存单次做答记录并写时累加物化日聚合与能力档案
 */
export async function saveTrialRecord(
  record: UnifiedTrialRecord,
  currentProfileLevel?: number,
): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const cardId = record.cardId || record.mode;
  const canonicalCard = registry.getCardById(cardId);
  const canonicalDomain = canonicalCard ? canonicalCard.domain : domain;
  const targetProfileLevel = currentProfileLevel ?? record.difficultyLevel;

  const normalizedRecord: UnifiedTrialRecord = {
    ...record,
    domain: canonicalDomain,
    cardId,
  };

  const dateStr = getLocalDateString(record.timestamp);
  const summaryId = `${dateStr}_${cardId}`;
  const respMs = Number(record.responseTimeMs) || 0;

  // 使用单一读写事务保证原子性
  const tx = db.transaction(['records', 'daily_summaries', 'user_profiles'], 'readwrite');

  // 1. 写入原始答题记录
  await tx.objectStore('records').put(normalizedRecord);

  // 2. 写时物化更新日聚合表 (daily_summaries)
  const dailyStore = tx.objectStore('daily_summaries');
  const existingDaily = await dailyStore.get(summaryId);

  if (!existingDaily) {
    const newSummary: DailySummaryData = {
      id: summaryId,
      date: dateStr,
      cardId,
      domain: canonicalDomain,
      mode: record.mode,
      totalCount: 1,
      hitCount: record.isHit ? 1 : 0,
      totalTimeMs: respMs,
      maxLevel: targetProfileLevel,
      minLevel: targetProfileLevel,
      lastLevel: targetProfileLevel,
      updatedAt: record.timestamp,
    };
    await dailyStore.put(newSummary);
  } else {
    existingDaily.domain = canonicalDomain;
    existingDaily.mode = record.mode;
    existingDaily.totalCount += 1;
    if (record.isHit) existingDaily.hitCount += 1;
    existingDaily.totalTimeMs += respMs;
    existingDaily.maxLevel = Math.max(existingDaily.maxLevel, targetProfileLevel);
    existingDaily.minLevel = Math.min(existingDaily.minLevel, targetProfileLevel);
    existingDaily.lastLevel = targetProfileLevel;
    existingDaily.updatedAt = record.timestamp;
    await dailyStore.put(existingDaily);
  }

  // 3. 更新用户能力档案 (user_profiles)
  const profileStore = tx.objectStore('user_profiles');
  const existingProfile = await profileStore.get(cardId);

  if (!existingProfile) {
    const newProfile: UnifiedProfileData = {
      cardId,
      domain: canonicalDomain,
      mode: record.mode,
      currentLevel: targetProfileLevel,
      bestLevel: targetProfileLevel,
      totalTrials: 1,
      totalHits: record.isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await profileStore.put(newProfile);
  } else {
    existingProfile.domain = canonicalDomain;
    existingProfile.mode = record.mode;
    existingProfile.totalTrials += 1;
    if (record.isHit) existingProfile.totalHits += 1;
    existingProfile.currentLevel = targetProfileLevel;
    if (targetProfileLevel > existingProfile.bestLevel) {
      existingProfile.bestLevel = targetProfileLevel;
    }
    existingProfile.updatedAt = Date.now();
    await profileStore.put(existingProfile);
  }

  await tx.done;
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  const cardId = session.cardId || session.mode;
  await db.put('sessions', { ...session, domain, cardId });
}

export async function getProfile(cardId: string): Promise<UnifiedProfileData | null> {
  const db = await getDB();
  const profile = await db.get('user_profiles', cardId);
  return profile || null;
}

export async function getProfilesByDomain(domain: TrainingDomain): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  return db.getAllFromIndex('user_profiles', 'by-domain', domain);
}

/**
 * 从 daily_summaries 快速检索聚合数据 (毫秒级)
 */
export async function getDailySummaries(options?: {
  domain?: TrainingDomain;
  cardId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DailySummaryData[]> {
  const db = await getDB();

  if (options?.date && options?.cardId) {
    const item = await db.get('daily_summaries', `${options.date}_${options.cardId}`);
    return item ? [item] : [];
  }

  if (options?.date && options?.domain) {
    return db.getAllFromIndex('daily_summaries', 'by-date-domain', [options.date, options.domain]);
  }

  if (options?.date) {
    return db.getAllFromIndex('daily_summaries', 'by-date', options.date);
  }

  if (options?.cardId) {
    return db.getAllFromIndex('daily_summaries', 'by-card', options.cardId);
  }

  if (options?.domain) {
    return db.getAllFromIndex('daily_summaries', 'by-domain', options.domain);
  }

  let summaries = await db.getAll('daily_summaries');
  if (options?.startDate || options?.endDate) {
    summaries = summaries.filter((s) => {
      if (options.startDate && s.date < options.startDate) return false;
      if (options.endDate && s.date > options.endDate) return false;
      return true;
    });
  }

  return summaries;
}

/**
 * 快速获取今日所有卡片聚合数据
 */
export async function getTodaySummaries(domain?: TrainingDomain): Promise<DailySummaryData[]> {
  const todayStr = getLocalDateString(Date.now());
  return getDailySummaries({ date: todayStr, domain });
}

export async function getTrialRecords(
  domain?: TrainingDomain,
  mode?: string,
): Promise<UnifiedTrialRecord[]> {
  const db = await getDB();
  let rawRecords: UnifiedTrialRecord[] = [];
  if (domain && mode) {
    rawRecords = await db.getAllFromIndex('records', 'by-domain-mode', [domain, mode]);
  } else if (domain) {
    rawRecords = await db.getAllFromIndex('records', 'by-domain', domain);
  } else {
    rawRecords = await db.getAll('records');
  }

  return rawRecords.map((r) => ({
    ...r,
    ...(r.details || {}),
  }));
}

export async function getTrialRecordsByCard(
  cardId: string,
  limit?: number,
): Promise<UnifiedTrialRecord[]> {
  const db = await getDB();
  const rawRecords = await db.getAllFromIndex('records', 'by-card', cardId);
  const mapped = rawRecords.map((r) => ({
    ...r,
    ...(r.details || {}),
  }));
  return limit && mapped.length > limit ? mapped.slice(-limit) : mapped;
}

export async function getTrainingTimeMs(domain?: TrainingDomain): Promise<number> {
  const db = await getDB();
  const summaries = domain
    ? await db.getAllFromIndex('daily_summaries', 'by-domain', domain)
    : await db.getAll('daily_summaries');

  let totalMs = 0;
  for (const s of summaries) {
    totalMs += Number(s.totalTimeMs) || 0;
  }
  return totalMs;
}

export function formatTotalTime(ms: number): string {
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return '0天0小时0分钟';
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}
