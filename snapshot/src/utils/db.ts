import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { TrainingMode } from '../types';
import { loadSettings, saveSettings } from './settings';

// ==========================================
// 1. 统一数据模型类型定义
// ==========================================

export type TrainingDomain = 'star' | 'color' | 'relative_color';

export interface UnifiedSessionData {
  id: string;
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
  domain: TrainingDomain;
  mode: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, any>;
}

export interface UnifiedProfileData {
  key: string; // `${domain}:${mode}`
  domain: TrainingDomain;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

// 兼容别名导出
export type SessionData = UnifiedSessionData;
export type UserProfileData = UnifiedProfileData;
export type ColorSessionData = UnifiedSessionData;
export type ColorTrialRecord = UnifiedTrialRecord;
export type ColorProfileData = UnifiedProfileData;

// ==========================================
// 2. IDB Schema 统一表定义
// ==========================================

interface FormSightDBSchema extends DBSchema {
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

const DB_NAME = 'StarHoppingDB';
const DB_VERSION = 4; // v4: 通用实体架构，合并所有领域表为通用 3 表结构

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        let sessionsStore: any;
        let recordsStore: any;
        let profilesStore: any;

        if (!db.objectStoreNames.contains('sessions')) {
          sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
        } else {
          sessionsStore = transaction.objectStore('sessions');
        }

        if (!db.objectStoreNames.contains('records')) {
          recordsStore = db.createObjectStore('records', { keyPath: 'id' });
        } else {
          recordsStore = transaction.objectStore('records');
        }

        if (!db.objectStoreNames.contains('user_profiles')) {
          profilesStore = db.createObjectStore('user_profiles', { keyPath: 'key' });
        } else {
          profilesStore = transaction.objectStore('user_profiles');
        }

        if (!sessionsStore.indexNames.contains('by-domain')) {
          sessionsStore.createIndex('by-domain', 'domain');
        }
        if (!sessionsStore.indexNames.contains('by-domain-mode')) {
          sessionsStore.createIndex('by-domain-mode', ['domain', 'mode']);
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

        if (!profilesStore.indexNames.contains('by-domain')) {
          profilesStore.createIndex('by-domain', 'domain');
        }

        // v4 迁移逻辑：平滑无损迁移老版本数据并清理旧专属表
        if (oldVersion < 4) {
          if (db.objectStoreNames.contains('color_sessions' as any)) {
            const colorSessionsStore = transaction.objectStore('color_sessions' as any);
            colorSessionsStore.getAll().then((oldCSessions: any[]) => {
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
            db.deleteObjectStore('color_sessions' as any);
          }

          if (db.objectStoreNames.contains('color_records' as any)) {
            const colorRecordsStore = transaction.objectStore('color_records' as any);
            colorRecordsStore.getAll().then((oldCRecords: any[]) => {
              for (const cr of oldCRecords) {
                recordsStore.put({
                  id: cr.id,
                  sessionId: cr.sessionId,
                  domain: 'color',
                  mode: cr.mode,
                  timestamp: cr.timestamp,
                  difficultyLevel: cr.difficultyLevel,
                  isHit: cr.isHit,
                  responseTimeMs: cr.responseTimeMs,
                  details: {
                    targetHSV: cr.targetHSV,
                    userHSV: cr.userHSV,
                    errorValue: cr.errorValue,
                  },
                });
              }
            });
            db.deleteObjectStore('color_records' as any);
          }

          if (db.objectStoreNames.contains('color_profiles' as any)) {
            const colorProfilesStore = transaction.objectStore('color_profiles' as any);
            colorProfilesStore.getAll().then((oldCProfiles: any[]) => {
              for (const cp of oldCProfiles) {
                profilesStore.put({
                  key: `color:${cp.mode}`,
                  domain: 'color',
                  mode: cp.mode,
                  currentLevel: cp.currentLevel,
                  bestLevel: cp.bestLevel,
                  totalTrainedCards: cp.totalTrainedCards,
                  totalHits: cp.totalHits,
                  updatedAt: cp.updatedAt,
                });
              }
            });
            db.deleteObjectStore('color_profiles' as any);
          }
        }
      },
    });
  }
  return dbPromise;
}

// ==========================================
// 3. 泛型通用 API 接口
// ==========================================

export async function saveTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const normalizedRecord = { ...record, domain };
  await db.put('records', normalizedRecord);
  await updateProfile(domain, record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  await db.put('sessions', { ...session, domain });
}

export async function getProfile(
  domain: TrainingDomain,
  mode: string,
): Promise<UnifiedProfileData | null> {
  const db = await getDB();
  const profile = await db.get('user_profiles', `${domain}:${mode}`);
  return profile || null;
}

export async function getProfilesByDomain(
  domain: TrainingDomain,
): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  return await db.getAllFromIndex('user_profiles', 'by-domain', domain);
}

export async function getTrialRecords(
  domain?: TrainingDomain,
  mode?: string,
): Promise<UnifiedTrialRecord[]> {
  const db = await getDB();
  if (domain && mode) {
    return await db.getAllFromIndex('records', 'by-domain-mode', [domain, mode]);
  }
  if (domain) {
    return await db.getAllFromIndex('records', 'by-domain', domain);
  }
  return await db.getAll('records');
}

async function updateProfile(
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const key = `${domain}:${mode}`;
  const existing = await db.get('user_profiles', key);

  if (!existing) {
    const newProfile: UnifiedProfileData = {
      key,
      domain,
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await db.put('user_profiles', newProfile);
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) {
      existing.bestLevel = currentLevel;
    }
    existing.updatedAt = Date.now();
    await db.put('user_profiles', existing);
  }
}

// ==========================================
// 4. 通用导入 / 导出与统计 API
// ==========================================

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();

  const exportObject = {
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    settings,
  };

  return JSON.stringify(exportObject, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

    if (data.sessions) {
      for (const s of data.sessions) {
        const domain = s.domain || 'star';
        await tx.objectStore('sessions').put({ ...s, domain });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        const domain = r.domain || 'star';
        await tx.objectStore('records').put({ ...r, domain });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const domain = p.domain || 'star';
        const key = p.key || `${domain}:${p.mode}`;
        await tx.objectStore('user_profiles').put({ ...p, key, domain });
      }
    }

    // 兼容导入旧格式 JSON 文件中的 color 数据
    if (data.color_sessions) {
      for (const cs of data.color_sessions) {
        await tx.objectStore('sessions').put({ ...cs, domain: 'color' });
      }
    }
    if (data.color_records) {
      for (const cr of data.color_records) {
        await tx.objectStore('records').put({
          id: cr.id,
          sessionId: cr.sessionId,
          domain: 'color',
          mode: cr.mode,
          timestamp: cr.timestamp,
          difficultyLevel: cr.difficultyLevel,
          isHit: cr.isHit,
          responseTimeMs: cr.responseTimeMs,
          details: {
            targetHSV: cr.targetHSV,
            userHSV: cr.userHSV,
            errorValue: cr.errorValue,
          },
        });
      }
    }
    if (data.color_profiles) {
      for (const cp of data.color_profiles) {
        await tx.objectStore('user_profiles').put({
          key: `color:${cp.mode}`,
          domain: 'color',
          mode: cp.mode,
          currentLevel: cp.currentLevel,
          bestLevel: cp.bestLevel,
          totalTrainedCards: cp.totalTrainedCards,
          totalHits: cp.totalHits,
          updatedAt: cp.updatedAt,
        });
      }
    }

    await tx.done;

    if (data.settings) {
      saveSettings(data.settings);
    }

    return true;
  } catch (err) {
    console.error('导入数据失败:', err);
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.done;
}

export async function getTrainingTimeMs(domain?: TrainingDomain): Promise<number> {
  const db = await getDB();
  const sessions = domain
    ? await db.getAllFromIndex('sessions', 'by-domain', domain)
    : await db.getAll('sessions');

  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}

export function formatTotalTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}

// ==========================================
// 5. 兼容层别名函数 (对既有页面逻辑完全透明)
// ==========================================

export async function getUserProfile(mode: TrainingMode): Promise<UnifiedProfileData | null> {
  return await getProfile('star', mode);
}

export async function getAllUserProfiles(): Promise<Record<TrainingMode, UnifiedProfileData | null>> {
  const profiles = await getProfilesByDomain('star');
  const result: Record<TrainingMode, UnifiedProfileData | null> = {
    single: null,
    double_h: null,
    double_r: null,
  };
  for (const p of profiles) {
    if (p.mode in result) {
      result[p.mode as TrainingMode] = p;
    }
  }
  return result;
}

export async function getAllTrialRecords(mode?: TrainingMode): Promise<UnifiedTrialRecord[]> {
  return await getTrialRecords('star', mode);
}

export async function saveColorTrialRecord(record: any): Promise<void> {
  return await saveTrialRecord({
    id: record.id,
    sessionId: record.sessionId,
    domain: 'color',
    mode: record.mode,
    timestamp: record.timestamp,
    difficultyLevel: record.difficultyLevel,
    isHit: record.isHit,
    responseTimeMs: record.responseTimeMs,
    details: {
      targetHSV: record.targetHSV,
      userHSV: record.userHSV,
      errorValue: record.errorValue,
    },
  });
}

export async function saveColorSession(session: any): Promise<void> {
  return await saveSession({
    ...session,
    domain: 'color',
  });
}

export async function getAllColorProfiles(): Promise<
  Record<'H' | 'S' | 'V' | 'ALL', UnifiedProfileData | null>
> {
  const profiles = await getProfilesByDomain('color');
  const result: Record<'H' | 'S' | 'V' | 'ALL', UnifiedProfileData | null> = {
    H: null,
    S: null,
    V: null,
    ALL: null,
  };
  for (const p of profiles) {
    if (p.mode in result) {
      result[p.mode as 'H' | 'S' | 'V' | 'ALL'] = p;
    }
  }
  return result;
}

export async function getAllColorTrialRecords(
  mode?: 'H' | 'S' | 'V' | 'ALL',
): Promise<UnifiedTrialRecord[]> {
  return await getTrialRecords('color', mode);
}

export async function getStarHoppingTrainingTimeMs(): Promise<number> {
  return await getTrainingTimeMs('star');
}

export async function getColorTrainingTimeMs(): Promise<number> {
  return await getTrainingTimeMs('color');
}

export async function getTotalTrainingTimeMs(): Promise<number> {
  return await getTrainingTimeMs();
}