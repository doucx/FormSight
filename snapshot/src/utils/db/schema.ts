import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export type TrainingDomain = 'star' | 'color' | 'relative_color' | 'negative_space';

export interface UnifiedSessionData {
  id: string;
  domain?: TrainingDomain;
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
  domain?: TrainingDomain;
  mode: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UnifiedProfileData {
  key: string;
  domain: TrainingDomain;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

export interface FormSightDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: UnifiedSessionData;
    indexes: {
      'by-domain': TrainingDomain;
      'by-domain-mode': [TrainingDomain, string];
    };
  };
  records: {
    key: string;
    value: UnifiedTrialRecord;
    indexes: {
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

export const DB_NAME = 'StarHoppingDB';
export const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        const sessionsStore = db.objectStoreNames.contains('sessions')
          ? transaction.objectStore('sessions')
          : db.createObjectStore('sessions', { keyPath: 'id' });

        if (!sessionsStore.indexNames.contains('by-domain')) {
          sessionsStore.createIndex('by-domain', 'domain');
        }
        if (!sessionsStore.indexNames.contains('by-domain-mode')) {
          sessionsStore.createIndex('by-domain-mode', ['domain', 'mode']);
        }

        const recordsStore = db.objectStoreNames.contains('records')
          ? transaction.objectStore('records')
          : db.createObjectStore('records', { keyPath: 'id' });

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

        const profilesStore = db.objectStoreNames.contains('user_profiles')
          ? transaction.objectStore('user_profiles')
          : db.createObjectStore('user_profiles', { keyPath: 'key' });

        if (!profilesStore.indexNames.contains('by-domain')) {
          profilesStore.createIndex('by-domain', 'domain');
        }

        if (oldVersion < 4) {
          const oldStores = Array.from(db.objectStoreNames);
          if (oldStores.includes('color_sessions' as never)) {
            const colorSessionsStore = transaction.objectStore('color_sessions' as never);
            colorSessionsStore.getAll().then((oldCSessions: UnifiedSessionData[]) => {
              for (const cs of oldCSessions) {
                sessionsStore.put({
                  id: cs.id,
                  domain: 'color',
                  mode: cs.mode,
                  type: cs.type,
                  startTimestamp: cs.startTimestamp,
                  endTimestamp: cs.endTimestamp,
                  totalTrials: cs.totalTrials,
                  hitTrials: cs.hitTrials,
                  startLevel: cs.startLevel,
                  endLevel: cs.endLevel,
                });
              }
            });
            db.deleteObjectStore('color_sessions' as never);
          }

          if (oldStores.includes('color_records' as never)) {
            const colorRecordsStore = transaction.objectStore('color_records' as never);
            colorRecordsStore.getAll().then((oldCRecords: Record<string, unknown>[]) => {
              for (const cr of oldCRecords) {
                recordsStore.put({
                  id: cr.id as string,
                  sessionId: cr.sessionId as string,
                  domain: 'color',
                  mode: cr.mode as string,
                  timestamp: cr.timestamp as number,
                  difficultyLevel: cr.difficultyLevel as number,
                  isHit: cr.isHit as boolean,
                  responseTimeMs: cr.responseTimeMs as number,
                  details: {
                    targetHSV: cr.targetHSV,
                    userHSV: cr.userHSV,
                    errorValue: cr.errorValue,
                  },
                });
              }
            });
            db.deleteObjectStore('color_records' as never);
          }

          if (oldStores.includes('color_profiles' as never)) {
            const colorProfilesStore = transaction.objectStore('color_profiles' as never);
            colorProfilesStore.getAll().then((oldCProfiles: Record<string, unknown>[]) => {
              for (const cp of oldCProfiles) {
                profilesStore.put({
                  key: `color:${cp.mode}`,
                  domain: 'color',
                  mode: cp.mode as string,
                  currentLevel: cp.currentLevel as number,
                  bestLevel: cp.bestLevel as number,
                  totalTrainedCards: cp.totalTrainedCards as number,
                  totalHits: cp.totalHits as number,
                  updatedAt: cp.updatedAt as number,
                });
              }
            });
            db.deleteObjectStore('color_profiles' as never);
          }
        }
      },
    });
  }
  return dbPromise;
}
