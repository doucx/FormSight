import { registry } from '../../core/registry';
import type { PlanStorageState, TrainingPlan } from '../../types/plan';
import { getDefaultPlans, loadPlanStorageState, loadTrainingPlan } from '../planStorage';
import {
  DEFAULT_SETTINGS,
  type UserSettings,
  buildDefaultCardSettings,
  loadSettings,
} from '../settings';
import {
  DB_VERSION,
  type DailySummaryData,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
  getLocalDateString,
} from './schema';

export interface FormSightExportBundle {
  appName: string;
  version: number;
  exportAt: string;
  sessions: UnifiedSessionData[];
  records: UnifiedTrialRecord[];
  profiles: UnifiedProfileData[];
  dailySummaries?: DailySummaryData[];
  settings: UserSettings;
  trainingPlan?: TrainingPlan;
  planStorageState?: PlanStorageState;
}

/**
 * 校验备份数据是否符合规范结构
 */
function validateImportBundle(data: unknown): data is FormSightExportBundle {
  if (!data || typeof data !== 'object') return false;
  const bundle = data as Record<string, unknown>;

  if (bundle.appName !== 'FormSight') {
    return false;
  }

  if (bundle.sessions && !Array.isArray(bundle.sessions)) return false;
  if (bundle.records && !Array.isArray(bundle.records)) return false;
  if (bundle.profiles && !Array.isArray(bundle.profiles)) return false;

  return true;
}

/**
 * 流式分块导出 FormSight 全量系统数据为 Blob
 */
export async function exportAllDataStream(): Promise<Blob> {
  const db = await getDB();
  const settings = await loadSettings();
  const trainingPlan = await loadTrainingPlan();
  const planStorageState = await loadPlanStorageState();

  const header = {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    settings,
    trainingPlan,
    planStorageState,
  };

  const blobParts: BlobPart[] = [];

  // 1. 写入 Header 元信息
  blobParts.push('{\n');
  blobParts.push(`  "appName": ${JSON.stringify(header.appName)},\n`);
  blobParts.push(`  "version": ${header.version},\n`);
  blobParts.push(`  "exportAt": ${JSON.stringify(header.exportAt)},\n`);
  blobParts.push(`  "settings": ${JSON.stringify(header.settings)},\n`);
  blobParts.push(`  "trainingPlan": ${JSON.stringify(header.trainingPlan)},\n`);
  blobParts.push(`  "planStorageState": ${JSON.stringify(header.planStorageState)},\n`);

  // 2. 分块输出 sessions
  blobParts.push('  "sessions": [\n');
  const sessions = await db.getAll('sessions');
  for (let i = 0; i < sessions.length; i++) {
    blobParts.push(`    ${JSON.stringify(sessions[i])}${i < sessions.length - 1 ? ',' : ''}\n`);
  }
  blobParts.push('  ],\n');

  // 3. 分块输出 user_profiles
  blobParts.push('  "profiles": [\n');
  const profiles = await db.getAll('user_profiles');
  for (let i = 0; i < profiles.length; i++) {
    blobParts.push(`    ${JSON.stringify(profiles[i])}${i < profiles.length - 1 ? ',' : ''}\n`);
  }
  blobParts.push('  ],\n');

  // 4. 分块输出 daily_summaries
  blobParts.push('  "dailySummaries": [\n');
  const dailySummaries = await db.getAll('daily_summaries');
  for (let i = 0; i < dailySummaries.length; i++) {
    blobParts.push(
      `    ${JSON.stringify(dailySummaries[i])}${i < dailySummaries.length - 1 ? ',' : ''}\n`,
    );
  }
  blobParts.push('  ],\n');

  // 5. 分块输出海量 records
  blobParts.push('  "records": [\n');
  const tx = db.transaction('records', 'readonly');
  const store = tx.objectStore('records');
  let cursor = await store.openCursor();
  let isFirst = true;

  while (cursor) {
    if (!isFirst) {
      blobParts.push(',\n');
    }
    blobParts.push(`    ${JSON.stringify(cursor.value)}`);
    isFirst = false;
    cursor = await cursor.continue();
  }

  blobParts.push('\n  ]\n}');

  return new Blob(blobParts, { type: 'application/json' });
}

export async function exportAllData(): Promise<string> {
  const blob = await exportAllDataStream();
  return blob.text();
}

/**
 * 单一 ACID 事务全量还原导入
 */
export async function importAllData(jsonString: string): Promise<boolean> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    console.error('Backup file is not valid JSON:', err);
    return false;
  }

  if (!validateImportBundle(parsed)) {
    console.error('Backup bundle validation failed');
    return false;
  }

  try {
    const db = await getDB();

    // 开启跨所有表的统一原子事务
    const tx = db.transaction(
      [
        'sessions',
        'records',
        'user_profiles',
        'daily_summaries',
        'app_settings',
        'training_plans',
        'app_metadata',
      ],
      'readwrite',
    );

    // 0. 清空现有所有表
    await tx.objectStore('sessions').clear();
    await tx.objectStore('records').clear();
    await tx.objectStore('user_profiles').clear();
    await tx.objectStore('daily_summaries').clear();
    await tx.objectStore('app_settings').clear();
    await tx.objectStore('training_plans').clear();
    await tx.objectStore('app_metadata').clear();

    const cardDomainCache = new Map<string, string>();
    const getCachedDomain = (cardId: string, fallbackDomain?: string): string => {
      const cached = cardDomainCache.get(cardId);
      if (cached !== undefined) return cached;
      const card = registry.getCardById(cardId);
      const domain = card ? card.domain : fallbackDomain || 'core';
      cardDomainCache.set(cardId, domain);
      return domain;
    };

    // 1. 恢复 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const sessionStore = tx.objectStore('sessions');
      for (const s of parsed.sessions) {
        const raw = s as Record<string, unknown>;
        const cardId = (raw.cardId || raw.mode) as string;
        delete raw.mode;
        s.cardId = cardId;
        s.domain = getCachedDomain(cardId, s.domain);
        await sessionStore.put(s);
      }
    }

    // 2. 恢复 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const profileStore = tx.objectStore('user_profiles');
      for (const p of parsed.profiles) {
        const raw = p as Record<string, unknown>;
        const cardId = (raw.cardId || raw.mode) as string;
        delete raw.mode;
        p.cardId = cardId;
        p.domain = getCachedDomain(cardId, p.domain);
        p.totalTrials = p.totalTrials ?? 0;
        await profileStore.put(p);
      }
    }

    // 3. 恢复 records
    if (parsed.records && parsed.records.length > 0) {
      const recordStore = tx.objectStore('records');
      for (let i = 0; i < parsed.records.length; i++) {
        const r = parsed.records[i];
        const raw = r as Record<string, unknown>;
        const cardId = (raw.cardId || raw.mode) as string;
        delete raw.mode;
        r.cardId = cardId;
        r.domain = getCachedDomain(cardId, r.domain);
        await recordStore.put(r);
      }
    }

    // 4. 恢复 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const dailyStore = tx.objectStore('daily_summaries');
      for (const d of parsed.dailySummaries) {
        const raw = d as Record<string, unknown>;
        const cardId = (raw.cardId || raw.mode) as string;
        delete raw.mode;
        d.cardId = cardId;
        d.domain = getCachedDomain(cardId, d.domain);
        await dailyStore.put(d);
      }
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      let lastTimestamp = -1;
      let lastDateStr = '';

      for (const r of parsed.records) {
        const raw = r as Record<string, unknown>;
        const cardId = (raw.cardId || raw.mode) as string;
        delete raw.mode;
        const domain = getCachedDomain(cardId, r.domain);

        let dateStr = lastDateStr;
        if (Math.abs(r.timestamp - lastTimestamp) > 1000 * 60 * 60 * 12 || lastDateStr === '') {
          dateStr = getLocalDateString(r.timestamp);
          lastTimestamp = r.timestamp;
          lastDateStr = dateStr;
        }

        const summaryId = `${dateStr}_${cardId}`;
        const respMs = Number(r.responseTimeMs) || 0;
        const level = Number(r.difficultyLevel) || 1;

        const existing = summaryMap.get(summaryId);
        if (!existing) {
          summaryMap.set(summaryId, {
            id: summaryId,
            date: dateStr,
            cardId,
            domain,
            totalCount: 1,
            hitCount: r.isHit ? 1 : 0,
            totalTimeMs: respMs,
            maxLevel: level,
            minLevel: level,
            lastLevel: level,
            updatedAt: r.timestamp,
          });
        } else {
          existing.domain = domain;
          existing.totalCount += 1;
          if (r.isHit) existing.hitCount += 1;
          existing.totalTimeMs += respMs;
          existing.maxLevel = Math.max(existing.maxLevel, level);
          existing.minLevel = Math.min(existing.minLevel, level);
          if (r.timestamp >= existing.updatedAt) {
            existing.lastLevel = level;
            existing.updatedAt = r.timestamp;
          }
        }
      }

      const dailyStore = tx.objectStore('daily_summaries');
      for (const summary of summaryMap.values()) {
        await dailyStore.put(summary);
      }
    }

    // 5. 恢复 app_settings
    const settingsStore = tx.objectStore('app_settings');
    const defaultCards = buildDefaultCardSettings();
    const restoredSettings: UserSettings = parsed.settings
      ? {
          global: { ...DEFAULT_SETTINGS.global, ...(parsed.settings.global || {}) },
          cards: { ...defaultCards, ...(parsed.settings.cards || {}) },
        }
      : {
          global: { ...DEFAULT_SETTINGS.global },
          cards: defaultCards,
        };
    await settingsStore.put(restoredSettings, 'global_settings');

    // 6. 恢复 training_plans 与 activePlanId
    const planStore = tx.objectStore('training_plans');
    const metaStore = tx.objectStore('app_metadata');

    if (parsed.planStorageState && Array.isArray(parsed.planStorageState.plans)) {
      for (const p of parsed.planStorageState.plans) {
        await planStore.put(p);
      }
      await metaStore.put(parsed.planStorageState.activePlanId, 'active_plan_id');
    } else if (parsed.trainingPlan) {
      await planStore.put(parsed.trainingPlan);
      await metaStore.put(parsed.trainingPlan.id, 'active_plan_id');
    } else {
      const defaultPlans = getDefaultPlans();
      for (const p of defaultPlans) {
        await planStore.put(p);
      }
      await metaStore.put(defaultPlans[0]?.id, 'active_plan_id');
    }

    await tx.done;
    return true;
  } catch (err) {
    console.error('Failed to import data transactionally:', err);
    return false;
  }
}

/**
 * 清空全量数据
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [
      'sessions',
      'records',
      'user_profiles',
      'daily_summaries',
      'app_settings',
      'training_plans',
      'app_metadata',
    ],
    'readwrite',
  );
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.objectStore('daily_summaries').clear();
  await tx.objectStore('app_settings').clear();
  await tx.objectStore('training_plans').clear();
  await tx.objectStore('app_metadata').clear();

  const defaultPlans = getDefaultPlans();
  const planStore = tx.objectStore('training_plans');
  for (const p of defaultPlans) {
    await planStore.put(p);
  }
  await tx.objectStore('app_metadata').put(defaultPlans[0]?.id, 'active_plan_id');
  await tx.objectStore('app_settings').put(DEFAULT_SETTINGS, 'global_settings');

  await tx.done;
}
