import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type {
  RelativeColorMode,
  RelativeColorProfileData,
  RelativeColorSessionData,
  RelativeColorTrialRecord,
  TrainingMode,
  TrialRecord,
} from '../types';
import { loadSettings, saveSettings } from './settings';

export interface SessionData {
  id: string;
  mode: TrainingMode;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface UserProfileData {
  mode: TrainingMode;
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

export interface ColorSessionData {
  id: string;
  mode: 'H' | 'S' | 'V' | 'ALL';
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface ColorTrialRecord {
  id: string;
  sessionId: string;
  mode: 'H' | 'S' | 'V' | 'ALL';
  timestamp: number;
  difficultyLevel: number;
  targetHSV: [number, number, number];
  userHSV: [number, number, number];
  isHit: boolean;
  errorValue: number;
  responseTimeMs: number;
}

export interface ColorProfileData {
  mode: 'H' | 'S' | 'V' | 'ALL';
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

export interface RelativeColorProfileData {
  mode: RelativeColorMode;
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

export interface RelativeColorSessionData {
  id: string;
  mode: RelativeColorMode;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

interface FormSightDBSchema extends DBSchema {
  sessions: { key: string; value: SessionData };
  records: {
    key: string;
    value: TrialRecord;
    indexes: { 'by-session': string; 'by-mode': string };
  };
  user_profiles: { key: TrainingMode; value: UserProfileData };

  color_sessions: { key: string; value: ColorSessionData };
  color_records: {
    key: string;
    value: ColorTrialRecord;
    indexes: { 'by-session': string; 'by-mode': string };
  };
  color_profiles: { key: 'H' | 'S' | 'V' | 'ALL'; value: ColorProfileData };

  // === v4 新增：相对色感练习表 ===
  relative_color_sessions: { key: string; value: RelativeColorSessionData };
  relative_color_records: {
    key: string;
    value: RelativeColorTrialRecord;
    indexes: { 'by-session': string; 'by-mode': string };
  };
  relative_color_profiles: { key: RelativeColorMode; value: RelativeColorProfileData };
}

const DB_NAME = 'StarHoppingDB';
const DB_VERSION = 4; // v4: 支持相对色感训练模块

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('sessions')) db.deleteObjectStore('sessions');
          if (db.objectStoreNames.contains('records')) db.deleteObjectStore('records');
          if (db.objectStoreNames.contains('user_profiles')) db.deleteObjectStore('user_profiles');
        }

        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          recordStore.createIndex('by-session', 'sessionId');
          recordStore.createIndex('by-mode', 'mode');
        }
        if (!db.objectStoreNames.contains('user_profiles')) {
          db.createObjectStore('user_profiles', { keyPath: 'mode' });
        }

        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('color_sessions')) {
            db.createObjectStore('color_sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('color_records')) {
            const colorRecordStore = db.createObjectStore('color_records', { keyPath: 'id' });
            colorRecordStore.createIndex('by-session', 'sessionId');
            colorRecordStore.createIndex('by-mode', 'mode');
          }
          if (!db.objectStoreNames.contains('color_profiles')) {
            db.createObjectStore('color_profiles', { keyPath: 'mode' });
          }
        }

        // === v4 新增：相对色感存储表创建 ===
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('relative_color_sessions')) {
            db.createObjectStore('relative_color_sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('relative_color_records')) {
            const relRecordStore = db.createObjectStore('relative_color_records', {
              keyPath: 'id',
            });
            relRecordStore.createIndex('by-session', 'sessionId');
            relRecordStore.createIndex('by-mode', 'mode');
          }
          if (!db.objectStoreNames.contains('relative_color_profiles')) {
            db.createObjectStore('relative_color_profiles', { keyPath: 'mode' });
          }
        }
      },
    });
  }
  return dbPromise;
}

// === 寻星 API ===
export async function saveTrialRecord(record: TrialRecord): Promise<void> {
  const db = await getDB();
  await db.put('records', record);
  await updateUserProfile(record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: SessionData): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function getUserProfile(mode: TrainingMode): Promise<UserProfileData | null> {
  const db = await getDB();
  return (await db.get('user_profiles', mode)) || null;
}

export async function getAllUserProfiles(): Promise<Record<TrainingMode, UserProfileData | null>> {
  const db = await getDB();
  const single = (await db.get('user_profiles', 'single')) || null;
  const doubleH = (await db.get('user_profiles', 'double_h')) || null;
  const doubleR = (await db.get('user_profiles', 'double_r')) || null;
  return { single, double_h: doubleH, double_r: doubleR };
}

async function updateUserProfile(
  mode: TrainingMode,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('user_profiles', mode);
  if (!existing) {
    await db.put('user_profiles', {
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    });
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) existing.bestLevel = currentLevel;
    existing.updatedAt = Date.now();
    await db.put('user_profiles', existing);
  }
}

// === 绝对色感 API ===
export async function saveColorTrialRecord(record: ColorTrialRecord): Promise<void> {
  const db = await getDB();
  await db.put('color_records', record);
  await updateColorProfile(record.mode, record.isHit, record.difficultyLevel);
}

export async function saveColorSession(session: ColorSessionData): Promise<void> {
  const db = await getDB();
  await db.put('color_sessions', session);
}

export async function getAllColorProfiles(): Promise<
  Record<'H' | 'S' | 'V' | 'ALL', ColorProfileData | null>
> {
  const db = await getDB();
  const h = (await db.get('color_profiles', 'H')) || null;
  const s = (await db.get('color_profiles', 'S')) || null;
  const v = (await db.get('color_profiles', 'V')) || null;
  const all = (await db.get('color_profiles', 'ALL')) || null;
  return { H: h, S: s, V: v, ALL: all };
}

export async function getAllColorTrialRecords(
  mode?: 'H' | 'S' | 'V' | 'ALL',
): Promise<ColorTrialRecord[]> {
  const db = await getDB();
  if (mode) return await db.getAllFromIndex('color_records', 'by-mode', mode);
  return await db.getAll('color_records');
}

async function updateColorProfile(
  mode: 'H' | 'S' | 'V' | 'ALL',
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('color_profiles', mode);
  if (!existing) {
    await db.put('color_profiles', {
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    });
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) existing.bestLevel = currentLevel;
    existing.updatedAt = Date.now();
    await db.put('color_profiles', existing);
  }
}

// === v4 新增：相对色感 API ===
export async function saveRelativeColorTrialRecord(
  record: RelativeColorTrialRecord,
): Promise<void> {
  const db = await getDB();
  await db.put('relative_color_records', record);
  await updateRelativeColorProfile(record.mode, record.isHit, record.difficultyLevel);
}

export async function saveRelativeColorSession(session: RelativeColorSessionData): Promise<void> {
  const db = await getDB();
  await db.put('relative_color_sessions', session);
}

export async function getAllRelativeColorProfiles(): Promise<
  Record<RelativeColorMode, RelativeColorProfileData | null>
> {
  const db = await getDB();
  const vectorShift = (await db.get('relative_color_profiles', 'VECTOR_SHIFT')) || null;
  const contrastMatch = (await db.get('relative_color_profiles', 'CONTRAST_MATCH')) || null;
  const threeToneScale = (await db.get('relative_color_profiles', 'THREE_TONE_SCALE')) || null;

  return {
    VECTOR_SHIFT: vectorShift,
    CONTRAST_MATCH: contrastMatch,
    THREE_TONE_SCALE: threeToneScale,
  };
}

export async function getAllRelativeColorTrialRecords(
  mode?: RelativeColorMode,
): Promise<RelativeColorTrialRecord[]> {
  const db = await getDB();
  if (mode) return await db.getAllFromIndex('relative_color_records', 'by-mode', mode);
  return await db.getAll('relative_color_records');
}

async function updateRelativeColorProfile(
  mode: RelativeColorMode,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('relative_color_profiles', mode);
  if (!existing) {
    await db.put('relative_color_profiles', {
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    });
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) existing.bestLevel = currentLevel;
    existing.updatedAt = Date.now();
    await db.put('relative_color_profiles', existing);
  }
}

// === 全局数据统计 & 导入导出 API ===
export function formatTotalTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return `${days}天${hours}小时${minutes}分钟`;
}

export async function getStarHoppingTrainingTimeMs(): Promise<number> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}

export async function getColorTrainingTimeMs(): Promise<number> {
  const db = await getDB();
  const sessions = await db.getAll('color_sessions');
  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}

export async function getRelativeColorTrainingTimeMs(): Promise<number> {
  const db = await getDB();
  const sessions = await db.getAll('relative_color_sessions');
  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}

export async function getTotalTrainingTimeMs(): Promise<number> {
  const starMs = await getStarHoppingTrainingTimeMs();
  const colorMs = await getColorTrainingTimeMs();
  const relColorMs = await getRelativeColorTrainingTimeMs();
  return starMs + colorMs + relColorMs;
}

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');

  const colorSessions = await db.getAll('color_sessions');
  const colorRecords = await db.getAll('color_records');
  const colorProfiles = await db.getAll('color_profiles');

  const relColorSessions = await db.getAll('relative_color_sessions');
  const relColorRecords = await db.getAll('relative_color_records');
  const relColorProfiles = await db.getAll('relative_color_profiles');

  const settings = loadSettings();

  const exportObject = {
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    color_sessions: colorSessions,
    color_records: colorRecords,
    color_profiles: colorProfiles,
    relative_color_sessions: relColorSessions,
    relative_color_records: relColorRecords,
    relative_color_profiles: relColorProfiles,
    settings,
  };

  return JSON.stringify(exportObject, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction(
      [
        'sessions',
        'records',
        'user_profiles',
        'color_sessions',
        'color_records',
        'color_profiles',
        'relative_color_sessions',
        'relative_color_records',
        'relative_color_profiles',
      ],
      'readwrite',
    );

    if (data.sessions) {
      for (const s of data.sessions) await tx.objectStore('sessions').put(s);
    }
    if (data.records) {
      for (const r of data.records) await tx.objectStore('records').put(r);
    }
    if (data.profiles) {
      for (const p of data.profiles) await tx.objectStore('user_profiles').put(p);
    }

    if (data.color_sessions) {
      for (const cs of data.color_sessions) await tx.objectStore('color_sessions').put(cs);
    }
    if (data.color_records) {
      for (const cr of data.color_records) await tx.objectStore('color_records').put(cr);
    }
    if (data.color_profiles) {
      for (const cp of data.color_profiles) await tx.objectStore('color_profiles').put(cp);
    }

    if (data.relative_color_sessions) {
      for (const rcs of data.relative_color_sessions)
        await tx.objectStore('relative_color_sessions').put(rcs);
    }
    if (data.relative_color_records) {
      for (const rcr of data.relative_color_records)
        await tx.objectStore('relative_color_records').put(rcr);
    }
    if (data.relative_color_profiles) {
      for (const rcp of data.relative_color_profiles)
        await tx.objectStore('relative_color_profiles').put(rcp);
    }

    await tx.done;
    if (data.settings) saveSettings(data.settings);
    return true;
  } catch (err) {
    console.error('导入寻星与色感数据失败:', err);
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [
      'sessions',
      'records',
      'user_profiles',
      'color_sessions',
      'color_records',
      'color_profiles',
      'relative_color_sessions',
      'relative_color_records',
      'relative_color_profiles',
    ],
    'readwrite',
  );
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.objectStore('color_sessions').clear();
  await tx.objectStore('color_records').clear();
  await tx.objectStore('color_profiles').clear();
  await tx.objectStore('relative_color_sessions').clear();
  await tx.objectStore('relative_color_records').clear();
  await tx.objectStore('relative_color_profiles').clear();
  await tx.done;
}