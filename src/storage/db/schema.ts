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

export type CalibrationRunStatus = 'in-progress' | 'completed' | 'aborted';

/** Calibration run metadata. Deliberately separate from training sessions. */
export interface CalibrationRunData {
  id: string;
  protocolId: string;
  cardId: string;
  sequence: number[];
  seed: number;
  index: number;
  status: CalibrationRunStatus;
  startedAt: number;
  finishedAt?: number;
  trialCount: number;
  hitCount: number;
}

/** One calibration trial. `level` is the scheduled level, not an adaptive one. */
export interface CalibrationTrialData {
  id: string;
  runId: string;
  index: number;
  level: number;
  isHit: boolean;
  responseTimeMs: number;
  timestamp: number;
  details?: Record<string, unknown>;
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
  calibration_runs: {
    key: string;
    value: CalibrationRunData;
    indexes: {
      'by-card': string;
      'by-status': string;
    };
  };
  calibration_trials: {
    key: string;
    value: CalibrationTrialData;
    indexes: {
      'by-run': string;
      'by-run-index': [string, number];
    };
  };
}

export const DB_NAME = 'FormSightDB';
export const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getLocalDateString(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(database, _oldVersion, _newVersion, transaction) {
        type StoreName =
          | 'sessions'
          | 'records'
          | 'daily_summaries'
          | 'user_profiles'
          | 'app_settings'
          | 'training_plans'
          | 'app_metadata'
          | 'calibration_runs'
          | 'calibration_trials';

        const ensureStore = (name: StoreName, options?: IDBObjectStoreParameters): void => {
          if (!database.objectStoreNames.contains(name)) {
            database.createObjectStore(name, options);
          }
        };

        // 表已存在时也必须补齐新增索引，否则旧库升级后按索引查询会抛 NotFoundError
        ensureStore('sessions', { keyPath: 'id' });
        const sessionsStore = transaction.objectStore('sessions');
        if (!sessionsStore.indexNames.contains('by-card')) {
          sessionsStore.createIndex('by-card', 'cardId');
        }
        if (!sessionsStore.indexNames.contains('by-domain')) {
          sessionsStore.createIndex('by-domain', 'domain');
        }

        ensureStore('records', { keyPath: 'id' });
        const recordsStore = transaction.objectStore('records');
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

        ensureStore('user_profiles', { keyPath: 'cardId' });
        const profilesStore = transaction.objectStore('user_profiles');
        if (!profilesStore.indexNames.contains('by-domain')) {
          profilesStore.createIndex('by-domain', 'domain');
        }

        ensureStore('daily_summaries', { keyPath: 'id' });
        const dailyStore = transaction.objectStore('daily_summaries');
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

        ensureStore('app_settings');

        ensureStore('training_plans', { keyPath: 'id' });
        const planStore = transaction.objectStore('training_plans');
        if (!planStore.indexNames.contains('by-updated')) {
          planStore.createIndex('by-updated', 'updatedAt');
        }

        ensureStore('app_metadata');

        ensureStore('calibration_runs', { keyPath: 'id' });
        const calibrationRuns = transaction.objectStore('calibration_runs');
        if (!calibrationRuns.indexNames.contains('by-card')) {
          calibrationRuns.createIndex('by-card', 'cardId');
        }
        if (!calibrationRuns.indexNames.contains('by-status')) {
          calibrationRuns.createIndex('by-status', 'status');
        }

        ensureStore('calibration_trials', { keyPath: 'id' });
        const calibrationTrials = transaction.objectStore('calibration_trials');
        if (!calibrationTrials.indexNames.contains('by-run')) {
          calibrationTrials.createIndex('by-run', 'runId');
        }
        if (!calibrationTrials.indexNames.contains('by-run-index')) {
          calibrationTrials.createIndex('by-run-index', ['runId', 'index']);
        }
      },
    });
  }
  return dbPromise;
}
