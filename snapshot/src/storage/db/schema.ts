import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export type TrainingDomain = string;

export interface UnifiedSessionData {
  id: string;
  cardId: string;
  domain?: string;
  mode: string;
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
  mode: string;
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
  mode: string;
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
  mode: string;
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
      'by-domain-mode': [string, string];
    };
  };
  records: {
    key: string;
    value: UnifiedTrialRecord;
    indexes: {
      'by-card': string;
      'by-session': string;
      'by-domain': string;
      'by-domain-mode': [string, string];
      'by-mode': string;
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
export const DB_VERSION = 3;

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
        if (!sessionsStore.indexNames.contains('by-domain-mode')) {
          sessionsStore.createIndex('by-domain-mode', ['domain', 'mode']);
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
        if (!recordsStore.indexNames.contains('by-domain-mode')) {
          recordsStore.createIndex('by-domain-mode', ['domain', 'mode']);
        }
        if (!recordsStore.indexNames.contains('by-mode')) {
          recordsStore.createIndex('by-mode', 'mode');
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

        // 4. daily_summaries 表 (v2 新增物化日聚合)
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

        // 5. 存量历史记录迁移：升级时回填已有 records 至 daily_summaries
        if (oldVersion < 2) {
          try {
            const allRecords = await recordsStore.getAll();
            if (allRecords && allRecords.length > 0) {
              const summaryMap = new Map<string, DailySummaryData>();

              for (const r of allRecords) {
                const cardId = r.cardId || r.mode;
                const domain = r.domain || cardId;
                const date = getLocalDateString(r.timestamp);
                const summaryId = `${date}_${cardId}`;
                const respMs = Number(r.responseTimeMs) || 0;
                const level = Number(r.difficultyLevel) || 1;

                const existing = summaryMap.get(summaryId);
                if (!existing) {
                  summaryMap.set(summaryId, {
                    id: summaryId,
                    date,
                    cardId,
                    domain,
                    mode: r.mode,
                    totalCount: 1,
                    hitCount: r.isHit ? 1 : 0,
                    totalTimeMs: respMs,
                    maxLevel: level,
                    minLevel: level,
                    lastLevel: level,
                    updatedAt: r.timestamp,
                  });
                } else {
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

        if (oldVersion < 3 && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          try {
            const settingsStore = transaction.objectStore('app_settings');
            const planStore = transaction.objectStore('training_plans');
            const metaStore = transaction.objectStore('app_metadata');

            // 迁移 LocalStorage 中的 settings
            const rawSettings = localStorage.getItem('formsight_user_settings');
            if (rawSettings) {
              const parsedSettings = JSON.parse(rawSettings);
              if (parsedSettings && typeof parsedSettings === 'object') {
                await settingsStore.put(parsedSettings, 'global_settings');
              }
            }

            // 迁移 LocalStorage 中的 plans
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
              // 兼容极早期的 formsight_custom_training_plan
              const legacyRaw = localStorage.getItem('formsight_custom_training_plan');
              if (legacyRaw) {
                const legacyPlan = JSON.parse(legacyRaw);
                if (legacyPlan && legacyPlan.id) {
                  await planStore.put(legacyPlan);
                  activeId = legacyPlan.id;
                }
              }
            }

            if (activeId) {
              await metaStore.put(activeId, 'active_plan_id');
            }
          } catch (migrationErr) {
            console.error('Failed to migrate LocalStorage to IndexedDB in v3 upgrade:', migrationErr);
          }
        }
      },
    });
  }
  return dbPromise;
}
