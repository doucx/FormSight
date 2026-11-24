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

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isString(value);
}

function isOptionalRecord(value: unknown): boolean {
  return value === undefined || isRecord(value);
}

function isSessionElement(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.cardId) &&
    isOptionalString(value.domain) &&
    (value.type === 'training' || value.type === 'benchmark') &&
    isFiniteNumber(value.startTimestamp) &&
    isFiniteNumber(value.endTimestamp) &&
    isFiniteNumber(value.totalTrials) &&
    isFiniteNumber(value.hitTrials) &&
    isFiniteNumber(value.startLevel) &&
    isFiniteNumber(value.endLevel)
  );
}

function isRecordElement(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.sessionId) &&
    isString(value.cardId) &&
    isOptionalString(value.domain) &&
    isFiniteNumber(value.timestamp) &&
    isFiniteNumber(value.difficultyLevel) &&
    typeof value.isHit === 'boolean' &&
    isFiniteNumber(value.responseTimeMs) &&
    isOptionalRecord(value.details)
  );
}

function isProfileElement(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isString(value.cardId) &&
    isOptionalString(value.domain) &&
    isFiniteNumber(value.currentLevel) &&
    isFiniteNumber(value.bestLevel) &&
    isFiniteNumber(value.totalTrials) &&
    isFiniteNumber(value.totalHits) &&
    isFiniteNumber(value.updatedAt)
  );
}

function isDailySummaryElement(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.date) &&
    isString(value.cardId) &&
    isOptionalString(value.domain) &&
    isFiniteNumber(value.totalCount) &&
    isFiniteNumber(value.hitCount) &&
    isFiniteNumber(value.totalTimeMs) &&
    isFiniteNumber(value.maxLevel) &&
    isFiniteNumber(value.minLevel) &&
    isFiniteNumber(value.lastLevel) &&
    isFiniteNumber(value.updatedAt)
  );
}

function isPlanItemElement(value: unknown): boolean {
  return isRecord(value) && isString(value.cardId) && isFiniteNumber(value.targetTrials);
}

function isPlanStorageState(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isString(value.activePlanId) &&
    Array.isArray(value.plans) &&
    value.plans.every((plan) => isRecord(plan) && isString(plan.id) && Array.isArray(plan.items))
  );
}

function isTrainingPlan(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    Array.isArray(value.items) &&
    value.items.every(isPlanItemElement) &&
    isFiniteNumber(value.updatedAt)
  );
}

/**
 * 校验备份数据是否符合规范结构（ADR 0005）
 *
 * 必须在清空事务之前完成全量校验：put() 的同步 DataError 不会中止已排队的 clear()。
 */
export function validateImportBundle(data: unknown): data is FormSightExportBundle {
  if (!isRecord(data)) return false;

  if (data.appName !== 'FormSight') return false;
  const version = data.version;
  if (typeof version !== 'number' || !Number.isInteger(version)) return false;
  if (version < 0 || version > DB_VERSION) return false;

  if (data.sessions !== undefined && !Array.isArray(data.sessions)) return false;
  if (data.records !== undefined && !Array.isArray(data.records)) return false;
  if (data.profiles !== undefined && !Array.isArray(data.profiles)) return false;
  if (data.dailySummaries !== undefined && !Array.isArray(data.dailySummaries)) return false;

  const sessions = data.sessions as unknown[] | undefined;
  const records = data.records as unknown[] | undefined;
  const profiles = data.profiles as unknown[] | undefined;
  const dailySummaries = data.dailySummaries as unknown[] | undefined;

  if (sessions && !sessions.every(isSessionElement)) return false;
  if (records && !records.every(isRecordElement)) return false;
  if (profiles && !profiles.every(isProfileElement)) return false;
  if (dailySummaries && !dailySummaries.every(isDailySummaryElement)) return false;

  if (data.settings !== undefined && !isRecord(data.settings)) return false;
  if (data.trainingPlan !== undefined && !isTrainingPlan(data.trainingPlan)) return false;
  if (data.planStorageState !== undefined && !isPlanStorageState(data.planStorageState)) {
    return false;
  }

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

    try {
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
          s.domain = getCachedDomain(s.cardId, s.domain);
          await sessionStore.put(s);
        }
      }

      // 2. 恢复 profiles
      if (parsed.profiles && parsed.profiles.length > 0) {
        const profileStore = tx.objectStore('user_profiles');
        for (const p of parsed.profiles) {
          p.domain = getCachedDomain(p.cardId, p.domain);
          p.totalTrials = p.totalTrials ?? 0;
          await profileStore.put(p);
        }
      }

      // 3. 恢复 records
      if (parsed.records && parsed.records.length > 0) {
        const recordStore = tx.objectStore('records');
        for (let i = 0; i < parsed.records.length; i++) {
          const r = parsed.records[i];
          r.domain = getCachedDomain(r.cardId, r.domain);
          await recordStore.put(r);
        }
      }

      // 4. 恢复 daily_summaries
      if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
        const dailyStore = tx.objectStore('daily_summaries');
        for (const d of parsed.dailySummaries) {
          d.domain = getCachedDomain(d.cardId, d.domain);
          await dailyStore.put(d);
        }
      } else if (parsed.records && parsed.records.length > 0) {
        const summaryMap = new Map<string, DailySummaryData>();

        // 直接按每条记录的时间戳归日：导出按主键 id 排序，不能假设时间有序
        for (const r of parsed.records) {
          const domain = getCachedDomain(r.cardId, r.domain);
          const dateStr = getLocalDateString(r.timestamp);
          const summaryId = `${dateStr}_${r.cardId}`;
          const respMs = Number(r.responseTimeMs) || 0;
          const level = Number(r.difficultyLevel) || 1;

          const existing = summaryMap.get(summaryId);
          if (!existing) {
            summaryMap.set(summaryId, {
              id: summaryId,
              date: dateStr,
              cardId: r.cardId,
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
    } catch (err) {
      tx.abort();
      tx.done.catch(() => undefined);
      throw err;
    }
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
