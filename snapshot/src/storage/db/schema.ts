import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export type TrainingDomain = string;

export interface UnifiedSessionData {
  id: string;
  cardId: string;
  domain?: string;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface UnifiedTrialRecord {
  id: string;
  sessionId: string;
  cardId: string;
  domain?: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UnifiedProfileData {
  cardId: string;
  domain?: string;
  currentLevel: number;
  bestLevel: number;
  totalTrials: number;
  totalHits: number;
  updatedAt: number;
}

/**
 * 每日卡片级聚合统计物化视图数据模型
 */
export interface DailySummaryData {
  id: string; // 格式: `${date}_${cardId}` (例如 '2026-08-22_star_single')
  date: string; // 本地日期 'YYYY-MM-DD'
  cardId: string;
  domain?: string;
  totalCount: number;
  hitCount: number;
  totalTimeMs: number;
  maxLevel: number;
  minLevel: number;
  lastLevel: number;
  updatedAt: number;
}

import type { TrainingPlan } from '../../types/plan';
import type { UserSettings } from '../settings';

export interface FormSightDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: UnifiedSessionData;
    indexes: {
      'by-card': string;
      'by-domain': string;
    };
  };
  records: {
    key: string;
    value: UnifiedTrialRecord;
    indexes: {
      'by-card': string;
      'by-session': string;
      'by-domain': string;
      'by-card-timestamp': [string, number];
      'by-timestamp': number;
    };
  };
  daily_summaries: {
    key: string;
    value: DailySummaryData;
    indexes: {
      'by-date': string;
      'by-card': string;
      'by-domain': string;
      'by-date-card': [string, string];
      'by-date-domain': [string, string];
    };
  };
  user_profiles: {
    key: string;
    value: UnifiedProfileData;
    indexes: {
      'by-domain': string;
    };
  };
  app_settings: {
    key: string;
    value: UserSettings;
  };
  training_plans: {
    key: string;
    value: TrainingPlan;
    indexes: {
      'by-updated': number;
    };
  };
  app_metadata: {
    key: string;
    value: unknown;
  };
}

export const DB_NAME = 'FormSightDB';
export const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getLocalDateString(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      async upgrade(database, oldVersion, _newVersion, transaction) {
        // 1. sessions 表
        const sessionsStore = database.objectStoreNames.contains('sessions')
          ? transaction.objectStore('sessions')
          : database.createObjectStore('sessions', { keyPath: 'id' });

        if (!sessionsStore.indexNames.contains('by-card')) {
          sessionsStore.createIndex('by-card', 'cardId');
        }
        if (!sessionsStore.indexNames.contains('by-domain')) {
          sessionsStore.createIndex('by-domain', 'domain');
        }

        // 2. records 表
        const recordsStore = database.objectStoreNames.contains('records')
          ? transaction.objectStore('records')
          : database.createObjectStore('records', { keyPath: 'id' });

        if (!recordsStore.indexNames.contains('by-card')) {
          recordsStore.createIndex('by-card', 'cardId');
        }
        if (!recordsStore.indexNames.contains('by-session')) {
          recordsStore.createIndex('by-session', 'sessionId');
        }
        if (!recordsStore.indexNames.contains('by-domain')) {
          recordsStore.createIndex('by-domain', 'domain');
        }
        if (!recordsStore.indexNames.contains('by-card-timestamp')) {
          recordsStore.createIndex('by-card-timestamp', ['cardId', 'timestamp']);
        }
        if (!recordsStore.indexNames.contains('by-timestamp')) {
          recordsStore.createIndex('by-timestamp', 'timestamp');
        }

        // 3. user_profiles 表
        const profilesStore = database.objectStoreNames.contains('user_profiles')
          ? transaction.objectStore('user_profiles')
          : database.createObjectStore('user_profiles', { keyPath: 'cardId' });

        if (!profilesStore.indexNames.contains('by-domain')) {
          profilesStore.createIndex('by-domain', 'domain');
        }

        // 4. daily_summaries 表
        const dailyStore = database.objectStoreNames.contains('daily_summaries')
          ? transaction.objectStore('daily_summaries')
          : database.createObjectStore('daily_summaries', { keyPath: 'id' });

        if (!dailyStore.indexNames.contains('by-date')) {
          dailyStore.createIndex('by-date', 'date');
        }
        if (!dailyStore.indexNames.contains('by-card')) {
          dailyStore.createIndex('by-card', 'cardId');
        }
        if (!dailyStore.indexNames.contains('by-domain')) {
          dailyStore.createIndex('by-domain', 'domain');
        }
        if (!dailyStore.indexNames.contains('by-date-card')) {
          dailyStore.createIndex('by-date-card', ['date', 'cardId']);
        }
        if (!dailyStore.indexNames.contains('by-date-domain')) {
          dailyStore.createIndex('by-date-domain', ['date', 'domain']);
        }

        // 5. 存量历史记录迁移：升级时回填已有 records 至 daily_summaries (v1 -> v2)
        if (oldVersion < 2) {
          try {
            const allRecords = await recordsStore.getAll();
            if (allRecords && allRecords.length > 0) {
              const summaryMap = new Map<string, DailySummaryData>();

              for (const r of allRecords) {
                const raw = r as Record<string, unknown>;
                const cardId = (raw.cardId || raw.mode || 'unknown') as string;
                const domain = (raw.domain || cardId) as string;
                const date = getLocalDateString(Number(raw.timestamp));
                const summaryId = `${date}_${cardId}`;
                const respMs = Number(raw.responseTimeMs) || 0;
                const level = Number(raw.difficultyLevel) || 1;

                const existing = summaryMap.get(summaryId);
                if (!existing) {
                  summaryMap.set(summaryId, {
                    id: summaryId,
                    date,
                    cardId,
                    domain,
                    totalCount: 1,
                    hitCount: raw.isHit ? 1 : 0,
                    totalTimeMs: respMs,
                    maxLevel: level,
                    minLevel: level,
                    lastLevel: level,
                    updatedAt: Number(raw.timestamp),
                  });
                } else {
                  existing.totalCount += 1;
                  if (raw.isHit) existing.hitCount += 1;
                  existing.totalTimeMs += respMs;
                  existing.maxLevel = Math.max(existing.maxLevel, level);
                  existing.minLevel = Math.min(existing.minLevel, level);
                  if (Number(raw.timestamp) >= existing.updatedAt) {
                    existing.lastLevel = level;
                    existing.updatedAt = Number(raw.timestamp);
                  }
                }
              }

              for (const summary of summaryMap.values()) {
                await dailyStore.put(summary);
              }
            }
          } catch (e) {
            console.error('Failed to migrate legacy records to daily_summaries:', e);
          }
        }

        // 6. v3 升级：新增 app_settings, training_plans, app_metadata 并迁移 LocalStorage
        if (!database.objectStoreNames.contains('app_settings')) {
          database.createObjectStore('app_settings');
        }

        if (!database.objectStoreNames.contains('training_plans')) {
          const planStore = database.createObjectStore('training_plans', { keyPath: 'id' });
          planStore.createIndex('by-updated', 'updatedAt');
        }

        if (!database.objectStoreNames.contains('app_metadata')) {
          database.createObjectStore('app_metadata');
        }

        if (
          oldVersion < 3 &&
          typeof window !== 'undefined' &&
          typeof localStorage !== 'undefined'
        ) {
          try {
            const settingsStore = transaction.objectStore('app_settings');
            const planStore = transaction.objectStore('training_plans');
            const metaStore = transaction.objectStore('app_metadata');

            const rawSettings = localStorage.getItem('formsight_user_settings');
            if (rawSettings) {
              const parsedSettings = JSON.parse(rawSettings);
              if (parsedSettings && typeof parsedSettings === 'object') {
                await settingsStore.put(parsedSettings, 'global_settings');
              }
            }

            const rawPlans = localStorage.getItem('formsight_training_plans_store');
            let activeId: string | null = null;
            if (rawPlans) {
              const parsed = JSON.parse(rawPlans);
              if (parsed && Array.isArray(parsed.plans)) {
                for (const p of parsed.plans) {
                  await planStore.put(p);
                }
                activeId = parsed.activePlanId || (parsed.plans[0] ? parsed.plans[0].id : null);
              }
            } else {
              const legacyRaw = localStorage.getItem('formsight_custom_training_plan');
              if (legacyRaw) {
                const legacyPlan = JSON.parse(legacyRaw);
                if (legacyPlan?.id) {
                  await planStore.put(legacyPlan);
                  activeId = legacyPlan.id;
                }
              }
            }

            if (activeId) {
              await metaStore.put(activeId, 'active_plan_id');
            }
          } catch (migrationErr) {
            console.error(
              'Failed to migrate LocalStorage to IndexedDB in v3 upgrade:',
              migrationErr,
            );
          }
        }

        // 7. v4 升级：移除 mode 字段并清理过时索引
        if (oldVersion < 4) {
          if (sessionsStore.indexNames.contains('by-domain-mode')) {
            sessionsStore.deleteIndex('by-domain-mode');
          }
          if (recordsStore.indexNames.contains('by-domain-mode')) {
            recordsStore.deleteIndex('by-domain-mode');
          }
          if (recordsStore.indexNames.contains('by-mode')) {
            recordsStore.deleteIndex('by-mode');
          }

          try {
            // 清洗 sessions
            const allSessions = await sessionsStore.getAll();
            for (const s of allSessions) {
              const raw = s as Record<string, unknown>;
              if ('mode' in raw) {
                raw.cardId = (raw.cardId || raw.mode) as string;
                delete raw.mode;
                await sessionsStore.put(s);
              }
            }

            // 清洗 user_profiles
            const allProfiles = await profilesStore.getAll();
            for (const p of allProfiles) {
              const raw = p as Record<string, unknown>;
              if ('mode' in raw) {
                raw.cardId = (raw.cardId || raw.mode) as string;
                delete raw.mode;
                await profilesStore.put(p);
              }
            }

            // 清洗 daily_summaries
            const allDaily = await dailyStore.getAll();
            for (const d of allDaily) {
              const raw = d as Record<string, unknown>;
              if ('mode' in raw) {
                raw.cardId = (raw.cardId || raw.mode) as string;
                delete raw.mode;
                await dailyStore.put(d);
              }
            }

            // 清洗 records (使用游标更新)
            let cursor = await recordsStore.openCursor();
            while (cursor) {
              const rec = cursor.value as Record<string, unknown>;
              if ('mode' in rec) {
                rec.cardId = (rec.cardId || rec.mode) as string;
                delete rec.mode;
                await cursor.update(cursor.value);
              }
              cursor = await cursor.continue();
            }
          } catch (cleanErr) {
            console.error('Failed to clean mode fields in v4 upgrade:', cleanErr);
          }
        }
      },
    });
  }
  return dbPromise;
}