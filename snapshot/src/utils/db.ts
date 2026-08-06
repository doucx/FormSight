import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { TrainingMode, TrialRecord } from '../types';

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
  currentLevel: number; // 当前维持的难度 Level
  bestLevel: number; // 历史最高难度 Level
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

interface StarHoppingDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: SessionData;
  };
  records: {
    key: string;
    value: TrialRecord;
    indexes: {
      'by-session': string;
      'by-mode': string;
    };
  };
  user_profiles: {
    key: TrainingMode;
    value: UserProfileData;
  };
}

const DB_NAME = 'StarHoppingDB';
const DB_VERSION = 2; // 升级版本号以支撑 Level 难度重构

let dbPromise: Promise<IDBPDatabase<StarHoppingDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<StarHoppingDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<StarHoppingDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          // 清理旧版本以 px 为单位的数据结构，避免层阶混淆
          if (db.objectStoreNames.contains('sessions')) {
            db.deleteObjectStore('sessions');
          }
          if (db.objectStoreNames.contains('records')) {
            db.deleteObjectStore('records');
          }
          if (db.objectStoreNames.contains('user_profiles')) {
            db.deleteObjectStore('user_profiles');
          }
        }

        // 1. 会话表
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }

        // 2. 试题点击日志表
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          recordStore.createIndex('by-session', 'sessionId');
          recordStore.createIndex('by-mode', 'mode');
        }

        // 3. 用户模式能力表
        if (!db.objectStoreNames.contains('user_profiles')) {
          db.createObjectStore('user_profiles', { keyPath: 'mode' });
        }
      },
    });
  }
  return dbPromise;
}

// === API 1: 保存单次答题记录 ===
export async function saveTrialRecord(record: TrialRecord): Promise<void> {
  const db = await getDB();
  await db.put('records', record);

  // 同步更新模式能力看板
  await updateUserProfile(record.mode, record.isHit, record.difficultyLevel);
}

// === API 2: 保存/更新训练会话 ===
export async function saveSession(session: SessionData): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

// === API 3: 获取用户指定模式的能力看板 ===
export async function getUserProfile(mode: TrainingMode): Promise<UserProfileData | null> {
  const db = await getDB();
  const profile = await db.get('user_profiles', mode);
  return profile || null;
}

// === API 4: 获取用户所有模式的能力看板 ===
export async function getAllUserProfiles(): Promise<Record<TrainingMode, UserProfileData | null>> {
  const db = await getDB();
  const single = (await db.get('user_profiles', 'single')) || null;
  const doubleH = (await db.get('user_profiles', 'double_h')) || null;
  const doubleR = (await db.get('user_profiles', 'double_r')) || null;

  return {
    single,
    double_h: doubleH,
    double_r: doubleR,
  };
}

// === 内部辅助：更新能力看板 ===
async function updateUserProfile(
  mode: TrainingMode,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('user_profiles', mode);

  if (!existing) {
    const newProfile: UserProfileData = {
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
    // Level 越高代表能力越强，因此 bestLevel 取最大值
    if (currentLevel > existing.bestLevel) {
      existing.bestLevel = currentLevel;
    }
    existing.updatedAt = Date.now();
    await db.put('user_profiles', existing);
  }
}

// === API 5: 全量 JSON 数据导出 ===
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');

  const exportObject = {
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
  };

  return JSON.stringify(exportObject, null, 2);
}

// === API 6: 全量 JSON 数据导入 ===
export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.records || !Array.isArray(data.records)) {
      throw new Error('无效的寻星练习导出格式');
    }

    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

    if (data.sessions) {
      for (const s of data.sessions) {
        await tx.objectStore('sessions').put(s);
      }
    }
    for (const r of data.records) {
      await tx.objectStore('records').put(r);
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        await tx.objectStore('user_profiles').put(p);
      }
    }

    await tx.done;
    return true;
  } catch (err) {
    console.error('导入寻星数据失败:', err);
    return false;
  }
}

// === API 7: 获取历史做答日志（支持按模式筛选） ===
export async function getAllTrialRecords(mode?: TrainingMode): Promise<TrialRecord[]> {
  const db = await getDB();
  if (mode) {
    return await db.getAllFromIndex('records', 'by-mode', mode);
  }
  return await db.getAll('records');
}

// === API 8: 获取累积练习总时长 (ms) 与格式化辅助 ===
export function formatTotalTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}

export async function getTotalTrainingTimeMs(): Promise<number> {
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
