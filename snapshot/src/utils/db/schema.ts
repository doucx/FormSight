import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import { migrateLegacyDatabase } from './migration';

export type TrainingDomain = 'star' | 'color' | 'relative_color' | 'negative_space';

export interface UnifiedSessionData {
  id: string;
  cardId: string;
  domain: TrainingDomain;
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
  domain: TrainingDomain;
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
  domain: TrainingDomain;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrials: number;
  totalTrainedCards?: number;
  totalHits: number;
  updatedAt: number;
}

export interface FormSightDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: UnifiedSessionData;
    indexes: {
      'by-card': string;
      'by-domain': TrainingDomain;
      'by-domain-mode': [TrainingDomain, string];
    };
  };
  records: {
    key: string;
    value: UnifiedTrialRecord;
    indexes: {
      'by-card': string;
      'by-session': string;
      'by-domain': TrainingDomain;
      'by-domain-mode': [TrainingDomain, string];
      'by-mode': string;
    };
  };
  user_profiles: {
    key: string;
    value: UnifiedProfileData;
    indexes: {
      'by-domain': TrainingDomain;
    };
  };
}

export const DB_NAME = 'FormSightDB';
export const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(database, _oldVersion, _newVersion, transaction) {
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

          const profilesStore = database.objectStoreNames.contains('user_profiles')
            ? transaction.objectStore('user_profiles')
            : database.createObjectStore('user_profiles', { keyPath: 'cardId' });

          if (!profilesStore.indexNames.contains('by-domain')) {
            profilesStore.createIndex('by-domain', 'domain');
          }
        },
      });

      // 异步执行旧数据无感迁移
      await migrateLegacyDatabase(db);
      return db;
    })();
  }
  return dbPromise;
}