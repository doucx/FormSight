FormSight v0.4.x 里程碑 1 的核心目标是完成**数据引擎底座升级**。我们将把数据库版本升级至 v2，引入 `daily_summaries`（日聚合）物化视图表与复合索引，改造答题写链路为原子事务累加，并全面切换 `useTodayStats`、`GlobalStatsModal`、`importExport` 等读链路，消除 $O(N)$ 全表扫描与主线程内存负担。

## [WIP] feat: 升级数据引擎底座至 v2 (写时物化聚合与日统计视图)

### 用户需求
完成 FormSight v0.4.x 里程碑 1：
1. 升级 IndexedDB Schema 到 v2，新增 `daily_summaries` 表及 `by-card-timestamp`、`by-date` 等高效复合索引。
2. 改造 `saveTrialRecord` 为写时物化聚合（单次答题事务级更新 records、daily_summaries、user_profiles）。
3. 支持存量历史 records 无缝迁移并回填至 `daily_summaries`。
4. 全面重构 `useTodayStats`、`GlobalStatsModal` 与 `importExport` 读链路，从全表扫描 records 切换为基于日聚合表的亚毫秒级查询。

### 评论
该升级是系统应对数万至数十万条答题数据时的关键底座。通过“写时物化（Materialized Rollup）”，将统计复杂度从页面打开时的 $O(N)$ 降维至 $O(1)$，彻底消除海量数据下全局统计与看板的内存溢出 (OOM) 与卡顿隐患。

### 目标
1. **Schema 与索引升级**：`src/utils/db/schema.ts` 升级至 `DB_VERSION = 2`，建立 `daily_summaries` 表与索引，为 `records` 添加 `by-card-timestamp` 索引，并在数据库升级时自动迁移聚合存量 records。
2. **写时聚合事务**：`src/utils/db/queries.ts` 在单一 `readwrite` 事务中原子累加每日汇总记录。
3. **读链路切换与查询封装**：提供 `getDailySummaries`、`getTodaySummaries` 查询接口。
4. **统计与看板视图提速**：重构 `src/hooks/useTodayStats.ts` 与 `src/components/GlobalStatsModal.tsx`，直接读取 `daily_summaries`。
5. **数据备份与仓储适配**：更新 `src/utils/db/importExport.ts` 与 `src/utils/db/repository.ts`，确保导入导出与清空操作完整支持新表。

### 基本原理
- 采用本地日期（`YYYY-MM-DD`）结合 `cardId` 构成主键 `${date}_${cardId}`。
- 在答题完成调用 `saveTrialRecord` 时，利用事务原子累加当日答题量、击中数、用时及最高/最低难度。
- 在 IndexedDB `upgrade` 流程中，自动对历史 `records` 游标执行流式聚合，无感升级旧版数据库。
- 看板及全局图表直接拉取数量极少的日聚合条目（一年最多数百条），渲染时间从秒级降至亚毫秒级。

### 标签
#intent/build #flow/ready #priority/critical #comp/engine #concept/state #concept/history #scope/core #scope/api #ai/instruct #task/domain/storage #task/object/materialized-rollup #task/action/integration #task/state/begin

---

### Script

#### Acts 1: 升级数据库 Schema 并实现自动存量迁移

修改 `src/utils/db/schema.ts`，将版本升级至 2，新增 `daily_summaries` 对象仓库定义、索引以及升级迁移逻辑。

~~~~~act
write_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export type TrainingDomain =
  | 'star'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization'
  | 'angle';

export interface UnifiedSessionData {
  id: string;
  cardId?: string;
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
  cardId?: string;
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
  domain: TrainingDomain;
  mode: string;
  totalCount: number;
  hitCount: number;
  totalTimeMs: number;
  maxLevel: number;
  minLevel: number;
  lastLevel: number;
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
      'by-domain': TrainingDomain;
      'by-date-card': [string, string];
      'by-date-domain': [string, TrainingDomain];
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
export const DB_VERSION = 2;

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
                const domain = r.domain || 'star';
                const cardId = r.cardId || r.mode;
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
      },
    });
  }
  return dbPromise;
}
~~~~~

#### Acts 2: 改造写时物化聚合与新增日统计查询接口

重构 `src/utils/db/queries.ts`，确保单次做答在同一事务中原子更新 `records`、`daily_summaries` 与 `user_profiles`，并新增 `getDailySummaries` 与 `getTodaySummaries` 接口。

~~~~~act
write_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
import { registry } from '../../core/registry';
import {
  type DailySummaryData,
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
  getLocalDateString,
} from './schema';

/**
 * 原子化保存单次做答记录并写时累加物化日聚合与能力档案
 */
export async function saveTrialRecord(
  record: UnifiedTrialRecord,
  currentProfileLevel?: number,
): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const cardId = record.cardId || record.mode;
  const canonicalCard = registry.getCardById(cardId);
  const canonicalDomain = canonicalCard ? canonicalCard.domain : domain;
  const targetProfileLevel = currentProfileLevel ?? record.difficultyLevel;

  const normalizedRecord: UnifiedTrialRecord = {
    ...record,
    domain: canonicalDomain,
    cardId,
  };

  const dateStr = getLocalDateString(record.timestamp);
  const summaryId = `${dateStr}_${cardId}`;
  const respMs = Number(record.responseTimeMs) || 0;

  // 使用单一读写事务保证原子性
  const tx = db.transaction(['records', 'daily_summaries', 'user_profiles'], 'readwrite');

  // 1. 写入原始答题记录
  await tx.objectStore('records').put(normalizedRecord);

  // 2. 写时物化更新日聚合表 (daily_summaries)
  const dailyStore = tx.objectStore('daily_summaries');
  const existingDaily = await dailyStore.get(summaryId);

  if (!existingDaily) {
    const newSummary: DailySummaryData = {
      id: summaryId,
      date: dateStr,
      cardId,
      domain: canonicalDomain,
      mode: record.mode,
      totalCount: 1,
      hitCount: record.isHit ? 1 : 0,
      totalTimeMs: respMs,
      maxLevel: targetProfileLevel,
      minLevel: targetProfileLevel,
      lastLevel: targetProfileLevel,
      updatedAt: record.timestamp,
    };
    await dailyStore.put(newSummary);
  } else {
    existingDaily.domain = canonicalDomain;
    existingDaily.mode = record.mode;
    existingDaily.totalCount += 1;
    if (record.isHit) existingDaily.hitCount += 1;
    existingDaily.totalTimeMs += respMs;
    existingDaily.maxLevel = Math.max(existingDaily.maxLevel, targetProfileLevel);
    existingDaily.minLevel = Math.min(existingDaily.minLevel, targetProfileLevel);
    existingDaily.lastLevel = targetProfileLevel;
    existingDaily.updatedAt = record.timestamp;
    await dailyStore.put(existingDaily);
  }

  // 3. 更新用户能力档案 (user_profiles)
  const profileStore = tx.objectStore('user_profiles');
  const existingProfile = await profileStore.get(cardId);

  if (!existingProfile) {
    const newProfile: UnifiedProfileData = {
      cardId,
      domain: canonicalDomain,
      mode: record.mode,
      currentLevel: targetProfileLevel,
      bestLevel: targetProfileLevel,
      totalTrials: 1,
      totalHits: record.isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await profileStore.put(newProfile);
  } else {
    existingProfile.domain = canonicalDomain;
    existingProfile.mode = record.mode;
    existingProfile.totalTrials += 1;
    if (record.isHit) existingProfile.totalHits += 1;
    existingProfile.currentLevel = targetProfileLevel;
    if (targetProfileLevel > existingProfile.bestLevel) {
      existingProfile.bestLevel = targetProfileLevel;
    }
    existingProfile.updatedAt = Date.now();
    await profileStore.put(existingProfile);
  }

  await tx.done;
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  const cardId = session.cardId || session.mode;
  await db.put('sessions', { ...session, domain, cardId });
}

export async function getProfile(cardId: string): Promise<UnifiedProfileData | null> {
  const db = await getDB();
  const profile = await db.get('user_profiles', cardId);
  return profile || null;
}

export async function getProfilesByDomain(domain: TrainingDomain): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  return db.getAllFromIndex('user_profiles', 'by-domain', domain);
}

/**
 * 从 daily_summaries 快速检索聚合数据 (毫秒级)
 */
export async function getDailySummaries(options?: {
  domain?: TrainingDomain;
  cardId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DailySummaryData[]> {
  const db = await getDB();

  if (options?.date && options?.cardId) {
    const item = await db.get('daily_summaries', `${options.date}_${options.cardId}`);
    return item ? [item] : [];
  }

  if (options?.date && options?.domain) {
    return db.getAllFromIndex('daily_summaries', 'by-date-domain', [options.date, options.domain]);
  }

  if (options?.date) {
    return db.getAllFromIndex('daily_summaries', 'by-date', options.date);
  }

  if (options?.cardId) {
    return db.getAllFromIndex('daily_summaries', 'by-card', options.cardId);
  }

  if (options?.domain) {
    return db.getAllFromIndex('daily_summaries', 'by-domain', options.domain);
  }

  let summaries = await db.getAll('daily_summaries');
  if (options?.startDate || options?.endDate) {
    summaries = summaries.filter((s) => {
      if (options.startDate && s.date < options.startDate) return false;
      if (options.endDate && s.date > options.endDate) return false;
      return true;
    });
  }

  return summaries;
}

/**
 * 快速获取今日所有卡片聚合数据
 */
export async function getTodaySummaries(domain?: TrainingDomain): Promise<DailySummaryData[]> {
  const todayStr = getLocalDateString(Date.now());
  return getDailySummaries({ date: todayStr, domain });
}

export async function getTrialRecords(
  domain?: TrainingDomain,
  mode?: string,
): Promise<UnifiedTrialRecord[]> {
  const db = await getDB();
  let rawRecords: UnifiedTrialRecord[] = [];
  if (domain && mode) {
    rawRecords = await db.getAllFromIndex('records', 'by-domain-mode', [domain, mode]);
  } else if (domain) {
    rawRecords = await db.getAllFromIndex('records', 'by-domain', domain);
  } else {
    rawRecords = await db.getAll('records');
  }

  return rawRecords.map((r) => ({
    ...r,
    ...(r.details || {}),
  }));
}

export async function getTrialRecordsByCard(
  cardId: string,
  limit?: number,
): Promise<UnifiedTrialRecord[]> {
  const db = await getDB();
  const rawRecords = await db.getAllFromIndex('records', 'by-card', cardId);
  const mapped = rawRecords.map((r) => ({
    ...r,
    ...(r.details || {}),
  }));
  return limit && mapped.length > limit ? mapped.slice(-limit) : mapped;
}

export async function getTrainingTimeMs(domain?: TrainingDomain): Promise<number> {
  const db = await getDB();
  const summaries = domain
    ? await db.getAllFromIndex('daily_summaries', 'by-domain', domain)
    : await db.getAll('daily_summaries');

  let totalMs = 0;
  for (const s of summaries) {
    totalMs += Number(s.totalTimeMs) || 0;
  }
  return totalMs;
}

export function formatTotalTime(ms: number): string {
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return '0天0小时0分钟';
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}
~~~~~

#### Acts 3: 适配数据导入导出与全局仓储层

更新 `src/utils/db/importExport.ts` 与 `src/utils/db/repository.ts`，支持 `daily_summaries` 备份、回填与清空。

~~~~~act
write_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript
import { registry } from '../../core/registry';
import type { PlanStorageState, TrainingPlan } from '../../types/plan';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
} from '../planStorage';
import { DEFAULT_SETTINGS, type UserSettings, loadSettings, saveSettings } from '../settings';
import {
  DB_VERSION,
  type DailySummaryData,
  type TrainingDomain,
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
 * 全量导出 FormSight 系统数据
 */
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const dailySummaries = await db.getAll('daily_summaries');
  const settings = loadSettings();
  const trainingPlan = loadTrainingPlan();
  const planStorageState = loadPlanStorageState();

  const exportObject: FormSightExportBundle = {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    dailySummaries,
    settings,
    trainingPlan,
    planStorageState,
  };

  return JSON.stringify(exportObject, null, 2);
}

/**
 * 原子化全量数据导入（支持预校验、物化视图自动补全与异常保护）
 */
export async function importAllData(jsonString: string): Promise<boolean> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    console.error('备份文件不是合法的 JSON 格式:', err);
    return false;
  }

  if (!validateImportBundle(parsed)) {
    console.error('备份文件结构校验失败');
    return false;
  }

  // 1. 创建 LocalStorage 关键配置快照，用于出现异常时回滚
  const previousSettingsSnapshot = loadSettings();
  const previousPlanStateSnapshot = loadPlanStorageState();

  try {
    // 2. 执行 IndexedDB 事务级写入
    const db = await getDB();
    const tx = db.transaction(
      ['sessions', 'records', 'user_profiles', 'daily_summaries'],
      'readwrite',
    );

    if (parsed.sessions && parsed.sessions.length > 0) {
      for (const s of parsed.sessions) {
        const domain = (s.domain || 'star') as TrainingDomain;
        const cardId = s.cardId || s.mode;
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
    }

    if (parsed.records && parsed.records.length > 0) {
      for (const r of parsed.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || r.mode;
        await tx.objectStore('records').put({ ...r, domain, cardId });
      }
    }

    if (parsed.profiles && parsed.profiles.length > 0) {
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
    }

    // 写入或根据 records 重新生成 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      for (const d of parsed.dailySummaries) {
        await tx.objectStore('daily_summaries').put(d);
      }
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      for (const r of parsed.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || r.mode;
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
        await tx.objectStore('daily_summaries').put(summary);
      }
    }

    await tx.done;

    // 3. 安全更新 LocalStorage
    if (parsed.settings) {
      saveSettings(parsed.settings);
    }

    if (parsed.planStorageState) {
      savePlanStorageState(parsed.planStorageState);
    } else if (parsed.trainingPlan) {
      saveTrainingPlan(parsed.trainingPlan);
    }

    return true;
  } catch (err) {
    console.error('导入数据事务执行失败，尝试回滚状态:', err);
    try {
      saveSettings(previousSettingsSnapshot);
      savePlanStorageState(previousPlanStateSnapshot);
    } catch (rollbackErr) {
      console.error('回滚快照失败:', rollbackErr);
    }
    return false;
  }
}

/**
 * 原子化清空全量数据并重置为初始状态
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['sessions', 'records', 'user_profiles', 'daily_summaries'],
    'readwrite',
  );
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.objectStore('daily_summaries').clear();
  await tx.done;

  resetPlansToDefault();
  saveSettings(DEFAULT_SETTINGS);
}
~~~~~

~~~~~act
write_file
src/utils/db/repository.ts
~~~~~
~~~~~typescript
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
  setActivePlan,
  togglePlanFavorite,
} from '../planStorage';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  loadSettings,
  saveSettings,
} from '../settings';
import { clearAllData, exportAllData, importAllData } from './importExport';
import {
  formatTotalTime,
  getDailySummaries,
  getProfile,
  getProfilesByDomain,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecords,
  getTrialRecordsByCard,
  saveSession,
  saveTrialRecord,
} from './queries';
import type { TrainingDomain, UnifiedProfileData } from './schema';

export interface AppDataSummary {
  totalTimeMs: number;
  domainTimes: Record<TrainingDomain, number>;
  profiles: Record<string, UnifiedProfileData>;
  settings: UserSettings;
  trainingPlan: TrainingPlan;
  allPlans: TrainingPlan[];
}

/**
 * 聚合仓储层 (SystemRepository)
 * 统一收敛 IndexedDB、LocalStorage 及跨介质事务操作
 */
export class SystemRepository {
  // === 查询与聚合统计 ===
  public async getAppSummary(): Promise<AppDataSummary> {
    const domains = registry.getAllDomains();

    const timesEntries = await Promise.all(
      domains.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const domainTimes = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;
    const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

    const allProfilesList = await Promise.all(domains.map((d) => getProfilesByDomain(d)));
    const profiles: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        profiles[p.cardId] = p;
      }
    }

    const settings = loadSettings();
    const planState = loadPlanStorageState();
    const trainingPlan = loadTrainingPlan();

    return {
      totalTimeMs,
      domainTimes,
      profiles,
      settings,
      trainingPlan,
      allPlans: planState.plans,
    };
  }

  // === 答题与会话持久化 ===
  public saveTrial = saveTrialRecord;
  public saveSession = saveSession;
  public getProfile = getProfile;
  public getProfilesByDomain = getProfilesByDomain;
  public getDailySummaries = getDailySummaries;
  public getTodaySummaries = getTodaySummaries;
  public getTrialRecords = getTrialRecords;
  public getTrialRecordsByCard = getTrialRecordsByCard;
  public getTrainingTimeMs = getTrainingTimeMs;
  public formatTotalTime = formatTotalTime;

  // === 设置偏好管理 ===
  public getSettings = loadSettings;
  public saveSettings = saveSettings;
  public getCardSettings(cardId: string): BaseModuleSettings {
    const current = loadSettings();
    return getCardSettings(current, cardId);
  }

  // === 训练计划管理 ===
  public getPlanStorageState = loadPlanStorageState;
  public savePlanStorageState = savePlanStorageState;
  public getActivePlan = loadTrainingPlan;
  public savePlan = saveTrainingPlan;
  public setActivePlan = setActivePlan;
  public toggleFavorite = togglePlanFavorite;
  public deletePlan = deletePlan;
  public resetPlans = resetPlansToDefault;
  public clonePlan = clonePlan;
  public exportPlanJson = exportPlanToJson;
  public importPlanJson = importPlanFromJson;

  // === 全局备份恢复与危险操作 ===
  public exportAllData = exportAllData;
  public importAllData = importAllData;
  public clearAllData = clearAllData;
}

export const repository = new SystemRepository();
~~~~~

#### Acts 4: 重构 `useTodayStats` 与 `GlobalStatsModal` 读链路

改造 `useTodayStats` 读 `getTodaySummaries`，改造 `GlobalStatsModal` 读 `getDailySummaries`，实现全页面零全表扫描。

~~~~~act
write_file
src/hooks/useTodayStats.ts
~~~~~
~~~~~typescript
import { useEffect, useState } from 'preact/hooks';
import { type TrainingDomain, getTodaySummaries } from '../utils/db/index';

export function useTodayStats(domain?: TrainingDomain) {
  const [todayStats, setTodayStats] = useState<Record<string, { count: number; timeMs: number }>>(
    {},
  );

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const summaries = await getTodaySummaries(domain);
      const stats: Record<string, { count: number; timeMs: number }> = {};

      for (const s of summaries) {
        const key = s.cardId || s.mode;
        if (!stats[key]) {
          stats[key] = { count: 0, timeMs: 0 };
        }
        stats[key].count += s.totalCount;
        stats[key].timeMs += s.totalTimeMs;
      }

      if (isMounted) {
        setTodayStats(stats);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [domain]);

  return todayStats;
}
~~~~~

~~~~~act
write_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
import {
  Activity,
  BarChart2,
  Calendar,
  ChevronDown,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { registry } from '../core/registry';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import {
  type DailySummaryData,
  type TrainingDomain,
  getDailySummaries,
  getLocalDateString,
} from '../utils/db/index';

interface GlobalStatsModalProps {
  onClose: () => void;
}

export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummaryData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const data = await getDailySummaries();
      if (isMounted) {
        setSummaries(data);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSummaries = summaries.filter((s) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter.endsWith('_all')) {
      const targetDomain = selectedFilter.replace('_all', '');
      return s.domain === targetDomain;
    }
    const [domain, mode] = selectedFilter.split(':');
    return s.domain === domain && (s.mode === mode || s.cardId === mode);
  });

  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return '全部练习项目';
    if (selectedFilter.endsWith('_all')) {
      const d = selectedFilter.replace('_all', '') as TrainingDomain;
      const meta = registry.getDomainMeta(d);
      return `${meta?.title || d} (全部)`;
    }
    const [domain, mode] = selectedFilter.split(':') as [TrainingDomain, string];
    const meta = registry.getDomainMeta(domain);
    const card = meta?.cards.find((c) => c.mode === mode || c.id === mode);
    return `${meta?.title || domain} • ${card?.title || mode}`;
  };

  const now = new Date();
  const todayStr = getLocalDateString(now.getTime());
  const startOfWeekStr = getLocalDateString(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const startOfYearStr = `${now.getFullYear()}-01-01`;

  const stats = {
    today: { total: 0, hits: 0 },
    week: { total: 0, hits: 0 },
    year: { total: 0, hits: 0 },
    allTime: { total: 0, hits: 0 },
  };

  const dailyData: Record<string, { total: number; maxLevel: number }> = {};

  for (const s of filteredSummaries) {
    stats.allTime.total += s.totalCount;
    stats.allTime.hits += s.hitCount;

    if (s.date === todayStr) {
      stats.today.total += s.totalCount;
      stats.today.hits += s.hitCount;
    }
    if (s.date >= startOfWeekStr) {
      stats.week.total += s.totalCount;
      stats.week.hits += s.hitCount;
    }
    if (s.date >= startOfYearStr) {
      stats.year.total += s.totalCount;
      stats.year.hits += s.hitCount;
    }

    if (!dailyData[s.date]) {
      dailyData[s.date] = { total: 0, maxLevel: s.maxLevel };
    }
    dailyData[s.date].total += s.totalCount;
    dailyData[s.date].maxLevel = Math.max(dailyData[s.date].maxLevel, s.maxLevel);
  }

  const calcAcc = (hits: number, total: number) =>
    total === 0 ? 0 : Math.round((hits / total) * 100);

  const heatmapDays = 84;
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const heatmapData = Array.from({ length: heatmapDays }).map((_, i) => {
    const dMs = startOfTodayMs - (heatmapDays - 1 - i) * 24 * 60 * 60 * 1000;
    const dateStr = getLocalDateString(dMs);
    return {
      date: dateStr,
      count: dailyData[dateStr]?.total || 0,
    };
  });

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count < 10) return 'bg-indigo-200';
    if (count < 25) return 'bg-indigo-400';
    if (count < 50) return 'bg-indigo-600';
    return 'bg-indigo-800';
  };

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">全局数据统计</h2>
              <p className="text-xs text-slate-400">洞察你的训练足迹与能力成长</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
                className="pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all shadow-sm"
              >
                <option value="all">全部练习项目</option>
                {registry.getAllDomainMetas().map((meta) => (
                  <optgroup key={meta.domain} label={meta.title}>
                    <option value={`${meta.domain}_all`}>{meta.title} (全部)</option>
                    {meta.cards.map((card) => (
                      <option
                        key={`${meta.domain}:${card.mode}`}
                        value={`${meta.domain}:${card.mode}`}
                      >
                        {card.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            正在统计海量数据...
          </div>
        ) : stats.allTime.total === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Activity className="w-10 h-10 text-slate-300" />【{getCurrentFilterLabel()}
            】下暂无训练数据，先去练习几道题吧！
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  今日刷题
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.today.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.today.hits, stats.today.total)}%
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  最近 7 天
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.week.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.week.hits, stats.week.total)}%
                </div>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  本年累计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.year.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-amber-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.year.hits, stats.year.total)}%
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  生涯总计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.allTime.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  打卡 {Object.keys(dailyData).length} 天
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-4">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>近 12 周训练热力图</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                    少 <div className="w-2.5 h-2.5 rounded-sm bg-slate-100" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-800" /> 多
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1.5 self-center">
                  {heatmapData.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date} : 训练了 ${day.count} 题`}
                      className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
                        day.count,
                      )}`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-2">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>能力峰值演进轨迹</span>
                  <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                    每日最高 Level
                  </span>
                </div>
                <canvas ref={canvasRef} width={340} height={150} className="w-full mt-2" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
1. 运行系统构建与类型检查（`npm run check` 或 `npm run build`），确保升级后的数据库类型定义与读写接口无任何类型冲突。
2. 启动开发服务器（`npm run dev`），模拟答题并检验 IndexedDB 中的 `daily_summaries` 表是否按预期实时更新。
3. 验证通过后，继续推进**里程碑 2：本体架构解耦与插件化 (Ontology & Plugin Architecture)**，全面解耦 `Domain` 转向 `Pack` 与多维标签体系。
