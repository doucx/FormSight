现在开始制定消除 `mode` 历史包袱并将数据持久化模型与上层契约全面收敛至 `cardId` 的重构计划，同时移除废弃的 `prune.ts` 冷数据修剪功能及相关 UI。

## [WIP] refactor: 消除数据库 mode 冗余字段并移除 prune 冷数据修剪功能

### 用户需求
1. 升级底层数据库版本至 `DB_VERSION = 4`，对历史存储执行原子化清洗，彻底移除 `sessions`、`records`、`daily_summaries`、`user_profiles` 实体及类型中多余的 `mode` 字段，统一收敛为唯一主键 `cardId`。
2. 清除各业务层（查询、聚合、统计分析、卡片定义、训练会话等）中形如 `s.cardId || s.mode` 的历史防御性双取值代码。
3. 删除 `src/storage/db/prune.ts` 及其在 `DataGovernanceSection` 中的 UI 入口、二次确认弹窗与仓储层调用。

### 评论
早期单玩法演进至微内核多卡片架构时遗留的 `mode` 与 `cardId` 双生字段不仅污染了类型契约，而且容易导致下游开发者反复编写不必要的防御代码。将数据表 Schema 版本升级并在 upgrade 期间平滑清洗旧字段，能够从根源上斩断这一技术债务。同时，修剪冷数据的特性在纯客户端 IndexedDB 场景下使用率极低且存在误删历史细节的顾虑，移除该冗余功能可显著精简代码量与交互负担。

### 目标
1. 删除 `src/storage/db/prune.ts`，并从 `src/storage/db/index.ts` 与 `src/storage/repository.ts` 中移除相应导出与实现。
2. 升级 `src/storage/db/schema.ts` 的 `DB_VERSION` 为 `4`，更新 `FormSightDBSchema` 与实体接口（移除 `mode` 字段与相关索引），并在数据库升级函数中增加对旧版本的平滑数据迁移。
3. 清理 `src/storage/db/queries.ts` 与 `src/storage/db/importExport.ts` 中的 `mode` 逻辑，在导入旧版备份时自动将 `mode` 迁移至 `cardId`。
4. 重构 `src/types/card.ts`、`src/core/registry.ts`、`src/views/GenericTrainingView.tsx`、`src/hooks/useTrainingSession.ts`、`src/hooks/useGlobalStatsData.ts`、`src/hooks/useTodayStats.ts`、`src/stores/profileStore.ts`，全面剔除 `mode` 字段。
5. 移除 `src/components/settings/sections/DataGovernanceSection.tsx` 中的修剪冷数据模块及其二次确认逻辑。

### 基本原理
- 在 IndexedDB `upgrade` 钩子中，当 `oldVersion < 4` 时执行数据清洗，移除 `by-mode` 与 `by-domain-mode` 复合索引，同时通过游标遍历清洗旧数据中的 `mode` 并转为 `cardId`。
- 在 `importAllData` 备份还原流程中加入归一化清洗逻辑：当解析到老版本导出的备份中含有 `mode` 时，自动清洗为 `cardId`，保证向下兼容。
- 移除不再需要的修剪函数与组件，简化仓储与偏好设置面板的职责边界。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/api #ai/instruct #task/domain/storage #task/object/schema-unification #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 删除冷数据修剪功能模块 `prune.ts`

我们首先删除无用的 `src/storage/db/prune.ts` 文件。

~~~~~act
delete_file
src/storage/db/prune.ts
~~~~~

#### Acts 2: 升级数据库 Schema 至 v4 并迁移清洗数据

更新 `src/storage/db/schema.ts`，版本升至 4，剔除 `mode` 字段及索引，并编写向后兼容清洗逻辑。

~~~~~act
write_file
src/storage/db/schema.ts
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 3: 更新 `queries.ts`、`importExport.ts` 与 `db/index.ts`

移除 `queries.ts` 和 `importExport.ts` 中针对 `mode` 的双生取值逻辑，并在 `importExport.ts` 中对导入数据自动清洗 `mode`；从 `db/index.ts` 中移除 `prune` 导出。

~~~~~act
patch_file
src/storage/db/queries.ts
~~~~~
~~~~~typescript
export async function saveTrialRecord(
  record: UnifiedTrialRecord,
  currentProfileLevel?: number,
): Promise<void> {
  const db = await getDB();
  const cardId = record.cardId || record.mode;
  const canonicalCard = registry.getCardById(cardId);
  const packId = canonicalCard ? canonicalCard.domain : record.domain || 'core';
  const targetProfileLevel = currentProfileLevel ?? record.difficultyLevel;

  const normalizedRecord: UnifiedTrialRecord = {
    ...record,
    cardId,
    domain: packId,
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
      domain: packId,
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
    existingDaily.domain = packId;
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
      domain: packId,
      mode: record.mode,
      currentLevel: targetProfileLevel,
      bestLevel: targetProfileLevel,
      totalTrials: 1,
      totalHits: record.isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await profileStore.put(newProfile);
  } else {
    existingProfile.domain = packId;
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
  const cardId = session.cardId || session.mode;
  const canonicalCard = registry.getCardById(cardId);
  const packId = canonicalCard ? canonicalCard.domain : session.domain || 'core';
  await db.put('sessions', { ...session, cardId, domain: packId });
}
~~~~~
~~~~~typescript
export async function saveTrialRecord(
  record: UnifiedTrialRecord,
  currentProfileLevel?: number,
): Promise<void> {
  const db = await getDB();
  const cardId = record.cardId;
  const canonicalCard = registry.getCardById(cardId);
  const packId = canonicalCard ? canonicalCard.domain : record.domain || 'core';
  const targetProfileLevel = currentProfileLevel ?? record.difficultyLevel;

  const normalizedRecord: UnifiedTrialRecord = {
    ...record,
    cardId,
    domain: packId,
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
      domain: packId,
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
    existingDaily.domain = packId;
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
      domain: packId,
      currentLevel: targetProfileLevel,
      bestLevel: targetProfileLevel,
      totalTrials: 1,
      totalHits: record.isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await profileStore.put(newProfile);
  } else {
    existingProfile.domain = packId;
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
  const cardId = session.cardId;
  const canonicalCard = registry.getCardById(cardId);
  const packId = canonicalCard ? canonicalCard.domain : session.domain || 'core';
  await db.put('sessions', { ...session, cardId, domain: packId });
}
~~~~~

~~~~~act
patch_file
src/storage/db/importExport.ts
~~~~~
~~~~~typescript
    // 1. 恢复 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const sessionStore = tx.objectStore('sessions');
      for (const s of parsed.sessions) {
        const cardId = s.cardId || s.mode;
        s.cardId = cardId;
        s.domain = getCachedDomain(cardId, s.domain);
        await sessionStore.put(s);
      }
    }

    // 2. 恢复 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const profileStore = tx.objectStore('user_profiles');
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        p.cardId = cardId;
        p.domain = getCachedDomain(cardId, p.domain);
        p.totalTrials = p.totalTrials ?? 0;
        await profileStore.put(p);
      }
    }

    // 3. 恢复 records
    if (parsed.records && parsed.records.length > 0) {
      const recordStore = tx.objectStore('records');
      for (let i = 0; i < parsed.records.length; i++) {
        const r = parsed.records[i];
        const cardId = r.cardId || r.mode;
        r.cardId = cardId;
        r.domain = getCachedDomain(cardId, r.domain);
        await recordStore.put(r);
      }
    }

    // 4. 恢复 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const dailyStore = tx.objectStore('daily_summaries');
      for (const d of parsed.dailySummaries) {
        const cardId = d.cardId || d.mode;
        d.cardId = cardId;
        d.domain = getCachedDomain(cardId, d.domain);
        await dailyStore.put(d);
      }
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      let lastTimestamp = -1;
      let lastDateStr = '';

      for (const r of parsed.records) {
        const cardId = r.cardId || r.mode;
        const domain = getCachedDomain(cardId, r.domain);

        let dateStr = lastDateStr;
        if (Math.abs(r.timestamp - lastTimestamp) > 1000 * 60 * 60 * 12 || lastDateStr === '') {
          dateStr = getLocalDateString(r.timestamp);
          lastTimestamp = r.timestamp;
          lastDateStr = dateStr;
        }

        const summaryId = `${dateStr}_${cardId}`;
        const respMs = Number(r.responseTimeMs) || 0;
        const level = Number(r.difficultyLevel) || 1;

        const existing = summaryMap.get(summaryId);
        if (!existing) {
          summaryMap.set(summaryId, {
            id: summaryId,
            date: dateStr,
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
~~~~~
~~~~~typescript
    // 1. 恢复 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const sessionStore = tx.objectStore('sessions');
      for (const s of parsed.sessions) {
        const raw = s as Record<string, unknown>;
        const cardId = (raw.cardId || raw.mode) as string;
        delete raw.mode;
        s.cardId = cardId;
        s.domain = getCachedDomain(cardId, s.domain);
        await sessionStore.put(s);
      }
    }

    // 2. 恢复 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const profileStore = tx.objectStore('user_profiles');
      for (const p of parsed.profiles) {
        const raw = p as Record<string, unknown>;
        const cardId = (raw.cardId || raw.mode) as string;
        delete raw.mode;
        p.cardId = cardId;
        p.domain = getCachedDomain(cardId, p.domain);
        p.totalTrials = p.totalTrials ?? 0;
        await profileStore.put(p);
      }
    }

    // 3. 恢复 records
    if (parsed.records && parsed.records.length > 0) {
      const recordStore = tx.objectStore('records');
      for (let i = 0; i < parsed.records.length; i++) {
        const r = parsed.records[i];
        const raw = r as Record<string, unknown>;
        const cardId = (raw.cardId || raw.mode) as string;
        delete raw.mode;
        r.cardId = cardId;
        r.domain = getCachedDomain(cardId, r.domain);
        await recordStore.put(r);
      }
    }

    // 4. 恢复 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const dailyStore = tx.objectStore('daily_summaries');
      for (const d of parsed.dailySummaries) {
        const raw = d as Record<string, unknown>;
        const cardId = (raw.cardId || raw.mode) as string;
        delete raw.mode;
        d.cardId = cardId;
        d.domain = getCachedDomain(cardId, d.domain);
        await dailyStore.put(d);
      }
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      let lastTimestamp = -1;
      let lastDateStr = '';

      for (const r of parsed.records) {
        const raw = r as Record<string, unknown>;
        const cardId = (raw.cardId || raw.mode) as string;
        delete raw.mode;
        const domain = getCachedDomain(cardId, r.domain);

        let dateStr = lastDateStr;
        if (Math.abs(r.timestamp - lastTimestamp) > 1000 * 60 * 60 * 12 || lastDateStr === '') {
          dateStr = getLocalDateString(r.timestamp);
          lastTimestamp = r.timestamp;
          lastDateStr = dateStr;
        }

        const summaryId = `${dateStr}_${cardId}`;
        const respMs = Number(r.responseTimeMs) || 0;
        const level = Number(r.difficultyLevel) || 1;

        const existing = summaryMap.get(summaryId);
        if (!existing) {
          summaryMap.set(summaryId, {
            id: summaryId,
            date: dateStr,
            cardId,
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
~~~~~

~~~~~act
patch_file
src/storage/db/index.ts
~~~~~
~~~~~typescript
export * from './schema';
export * from './queries';
export * from './importExport';
export * from './prune';
~~~~~
~~~~~typescript
export * from './schema';
export * from './queries';
export * from './importExport';
~~~~~

#### Acts 4: 从 `repository.ts` 中移除 prune 调用

修改 `src/storage/repository.ts`，移除对 `pruneColdRecords` 的导入及代理方法。

~~~~~act
patch_file
src/storage/repository.ts
~~~~~
~~~~~typescript
import type { TrainingPlan } from '../types/plan';
import { clearAllData, exportAllData, exportAllDataStream, importAllData } from './db/importExport';
import { pruneColdRecords } from './db/prune';
import {
~~~~~
~~~~~typescript
import type { TrainingPlan } from '../types/plan';
import { clearAllData, exportAllData, exportAllDataStream, importAllData } from './db/importExport';
import {
~~~~~

~~~~~act
patch_file
src/storage/repository.ts
~~~~~
~~~~~typescript
  // === 全局备份恢复与稳态治理 ===
  public exportAllData = exportAllData;
  public exportAllDataStream = exportAllDataStream;
  public importAllData = importAllData;
  public clearAllData = clearAllData;
  public pruneColdRecords = pruneColdRecords;
}

export const repository = new SystemRepository();
~~~~~
~~~~~typescript
  // === 全局备份恢复与稳态治理 ===
  public exportAllData = exportAllData;
  public exportAllDataStream = exportAllDataStream;
  public importAllData = importAllData;
  public clearAllData = clearAllData;
}

export const repository = new SystemRepository();
~~~~~

#### Acts 5: 清除卡片定义与注册表中的 `mode` 字段

修改 `src/types/card.ts` 和 `src/core/registry.ts`，彻底移除 `CardDefinition` 中的 `mode` 属性。

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  domain: VisualDomainTag;
  mode: string;
  title?: string;
  desc?: string;
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  domain: VisualDomainTag;
  title?: string;
  desc?: string;
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
    // 3. 构建标准 CardDefinition
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      mode: card.id,
      icon: card.icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      settingSchemas: normalizedSchemas,
      defaultSettings: card.defaultSettings,
    };
~~~~~
~~~~~typescript
    // 3. 构建标准 CardDefinition
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      icon: card.icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      settingSchemas: normalizedSchemas,
      defaultSettings: card.defaultSettings,
    };
~~~~~

#### Acts 6: 清理统计 Hooks 与 Stores 中的 `s.cardId || s.mode` 双生取值

更新 `src/hooks/useGlobalStatsData.ts`、`src/hooks/useTodayStats.ts` 与 `src/stores/profileStore.ts`。

~~~~~act
patch_file
src/hooks/useGlobalStatsData.ts
~~~~~
~~~~~typescript
      if (selectedFilter.startsWith('domain:')) {
        const targetDomain = selectedFilter.replace('domain:', '') as VisualDomainTag;
        const matchedCards = registry.queryCards({ domains: [targetDomain] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('path:')) {
        const targetPath = selectedFilter.replace('path:', '') as CognitivePathTag;
        const matchedCards = registry.queryCards({ paths: [targetPath] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('challenge:')) {
        const targetChallenge = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
        const matchedCards = registry.queryCards({ challenges: [targetChallenge] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('card:')) {
        const targetCardId = selectedFilter.replace('card:', '');
        return s.cardId === targetCardId || s.mode === targetCardId;
      }

      return true;
    });
  }, [summaries, selectedFilter]);
~~~~~
~~~~~typescript
      if (selectedFilter.startsWith('domain:')) {
        const targetDomain = selectedFilter.replace('domain:', '') as VisualDomainTag;
        const matchedCards = registry.queryCards({ domains: [targetDomain] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId);
      }

      if (selectedFilter.startsWith('path:')) {
        const targetPath = selectedFilter.replace('path:', '') as CognitivePathTag;
        const matchedCards = registry.queryCards({ paths: [targetPath] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId);
      }

      if (selectedFilter.startsWith('challenge:')) {
        const targetChallenge = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
        const matchedCards = registry.queryCards({ challenges: [targetChallenge] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId);
      }

      if (selectedFilter.startsWith('card:')) {
        const targetCardId = selectedFilter.replace('card:', '');
        return s.cardId === targetCardId;
      }

      return true;
    });
  }, [summaries, selectedFilter]);
~~~~~

~~~~~act
patch_file
src/hooks/useGlobalStatsData.ts
~~~~~
~~~~~typescript
  // 认知推演路径聚合
  const pathMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId || s.mode;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }
~~~~~
~~~~~typescript
  // 认知推演路径聚合
  const pathMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }
~~~~~

~~~~~act
patch_file
src/hooks/useGlobalStatsData.ts
~~~~~
~~~~~typescript
  // 心智抗性聚合
  const challengeMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId || s.mode;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }
~~~~~
~~~~~typescript
  // 心智抗性聚合
  const challengeMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }
~~~~~

~~~~~act
patch_file
src/hooks/useTodayStats.ts
~~~~~
~~~~~typescript
    for (const s of summaries) {
      const key = s.cardId || s.mode;
      if (!stats[key]) {
        stats[key] = { count: 0, timeMs: 0 };
      }
      stats[key].count += s.totalCount;
      stats[key].timeMs += s.totalTimeMs;
    }
~~~~~
~~~~~typescript
    for (const s of summaries) {
      const key = s.cardId;
      if (!stats[key]) {
        stats[key] = { count: 0, timeMs: 0 };
      }
      stats[key].count += s.totalCount;
      stats[key].timeMs += s.totalTimeMs;
    }
~~~~~

~~~~~act
patch_file
src/stores/profileStore.ts
~~~~~
~~~~~typescript
export const $todayStatsMap = computed<Record<string, { count: number; timeMs: number }>>(() => {
  const map: Record<string, { count: number; timeMs: number }> = {};
  for (const s of $todaySummaries.value) {
    const key = s.cardId || s.mode;
    if (!map[key]) {
      map[key] = { count: 0, timeMs: 0 };
    }
    map[key].count += s.totalCount;
    map[key].timeMs += s.totalTimeMs;
  }
  return map;
});
~~~~~
~~~~~typescript
export const $todayStatsMap = computed<Record<string, { count: number; timeMs: number }>>(() => {
  const map: Record<string, { count: number; timeMs: number }> = {};
  for (const s of $todaySummaries.value) {
    const key = s.cardId;
    if (!map[key]) {
      map[key] = { count: 0, timeMs: 0 };
    }
    map[key].count += s.totalCount;
    map[key].timeMs += s.totalTimeMs;
  }
  return map;
});
~~~~~

#### Acts 7: 清除训练会话 `useTrainingSession` 及 `GenericTrainingView` 中的 `mode`

将训练流程统一至 `cardId`。

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
~~~~~
~~~~~typescript
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  cardId: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
export function useTrainingSession<TQuestion, THitResult, TAnswerVal>({
  domain,
  mode,
  sessionType,
  initialLevel,
  autoNext,
  autoNextDelay,
  stepGranularity = 'standard',
  adaptiveMode = 'block',
  targetAccuracy = 0.8,
  blockSize = 10,
  idleTimeoutSec: optionsIdleTimeout,
  targetLimitTrials,
  onTargetLimitReached,
  onIdleChange,
  onIdleResume,
  generateQuestion,
  evaluateAnswer,
  isHit,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
  const sessionIdRef = useRef<string>(`${domain}_${mode}_session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
~~~~~
~~~~~typescript
export function useTrainingSession<TQuestion, THitResult, TAnswerVal>({
  domain,
  cardId,
  sessionType,
  initialLevel,
  autoNext,
  autoNextDelay,
  stepGranularity = 'standard',
  adaptiveMode = 'block',
  targetAccuracy = 0.8,
  blockSize = 10,
  idleTimeoutSec: optionsIdleTimeout,
  targetLimitTrials,
  onTargetLimitReached,
  onIdleChange,
  onIdleResume,
  generateQuestion,
  evaluateAnswer,
  isHit,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
  const sessionIdRef = useRef<string>(`${domain}_${cardId}_session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
    setShowAnswer(false);
    setUserAnswer(null);
    streakRef.current = 0;
    sessionIdRef.current = `${domain}_${mode}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    adaptiveEngineRef.current.setLevel(initialLevel);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, initialLevel, generateQuestion]);
~~~~~
~~~~~typescript
    setShowAnswer(false);
    setUserAnswer(null);
    streakRef.current = 0;
    sessionIdRef.current = `${domain}_${cardId}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    adaptiveEngineRef.current.setLevel(initialLevel);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, cardId, initialLevel, generateQuestion]);
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
  const domain = card.domain;
  const training = manifest.training;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain,
    mode: card.id,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    onIdleChange,
    onIdleResume,
    generateQuestion: (level) => training.generateQuestion(level, settings),
    evaluateAnswer: (userVal, q) => training.evaluateAnswer(userVal, q),
    isHit: (hitResult) => training.isHit(hitResult),
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      const qLevel =
        training.getQuestionLevel?.(q) ??
        (q as { difficultyLevel?: number })?.difficultyLevel ??
        initialLevel;

      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          mode: card.id,
          timestamp: Date.now(),
          difficultyLevel: qLevel,
          isHit: training.isHit(hitResult),
          responseTimeMs,
          details: training.extractRecordDetails?.(q, hitResult, userVal) ?? {},
        },
        currentProfileLevel,
      );
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        mode: card.id,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });
~~~~~
~~~~~typescript
  const domain = card.domain;
  const training = manifest.training;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain,
    cardId: card.id,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    onIdleChange,
    onIdleResume,
    generateQuestion: (level) => training.generateQuestion(level, settings),
    evaluateAnswer: (userVal, q) => training.evaluateAnswer(userVal, q),
    isHit: (hitResult) => training.isHit(hitResult),
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      const qLevel =
        training.getQuestionLevel?.(q) ??
        (q as { difficultyLevel?: number })?.difficultyLevel ??
        initialLevel;

      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          timestamp: Date.now(),
          difficultyLevel: qLevel,
          isHit: training.isHit(hitResult),
          responseTimeMs,
          details: training.extractRecordDetails?.(q, hitResult, userVal) ?? {},
        },
        currentProfileLevel,
      );
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });
~~~~~

#### Acts 8: 移除 `DataGovernanceSection.tsx` 中的 prune UI 及二次确认弹窗

更新 `src/components/settings/sections/DataGovernanceSection.tsx`，彻底移除修剪逻辑与 UI。

~~~~~act
write_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript
import { Download, Loader2, RotateCcw, Trash2, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import {
  clearAllData,
  exportAllDataStream,
  importAllData,
} from '../../../storage/index';
import { resetPlansToDefault } from '../../../storage/planStorage';
import { ConfirmModal } from '../../common/ConfirmModal';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

interface DataGovernanceSectionProps {
  onDataChanged: () => Promise<void> | void;
  onCloseModal: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function DataGovernanceSection({
  onDataChanged,
  onCloseModal,
  showToast,
}: DataGovernanceSectionProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetPlansConfirm, setShowResetPlansConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAllDataStream();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      a.download = `formsight_data_${dateStr}_${timeStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('settings.exportSuccessToast'), 'success');
    } catch (e) {
      console.error('Export failed:', e);
      showToast(t('settings.exportFailToast'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      try {
        setIsImporting(true);
        const text = await file.text();
        target.value = '';
        const success = await importAllData(text);
        if (success) {
          showToast(t('settings.importSuccessToast'), 'success');
          await onDataChanged();
          onCloseModal();
        } else {
          showToast(t('settings.importInvalidToast'), 'error');
        }
      } catch (err) {
        console.error('Import exception:', err);
        showToast(t('settings.importInvalidToast'), 'error');
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleResetPlansConfirmed = async () => {
    setShowResetPlansConfirm(false);
    await resetPlansToDefault();
    showToast(t('settings.resetPlansSuccessToast'), 'success');
    await onDataChanged();
  };

  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    try {
      setIsClearing(true);
      await clearAllData();
      await onDataChanged();
      showToast(t('settings.clearDataSuccessToast'), 'info');
      onCloseModal();
    } catch (err) {
      console.error('Failed to clear data:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {t('settings.dataGovernance')}
      </div>

      {/* 备份导出与导入 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          disabled={isExporting || isImporting || isClearing}
          onClick={handleExport}
          className="py-3 px-4 rounded-2xl gap-2 h-auto"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Download className="w-4 h-4 text-primary" />
          )}
          {isExporting ? t('settings.exporting') : t('settings.exportStream')}
        </Button>
        <Button
          variant="outline"
          disabled={isExporting || isImporting || isClearing}
          onClick={() => fileInputRef.current?.click()}
          className="py-3 px-4 rounded-2xl gap-2 h-auto"
        >
          {isImporting ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-primary" />
          )}
          {isImporting ? t('settings.importing') : t('settings.importBackup')}
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".json"
          disabled={isImporting || isClearing}
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* 导入与清空中全屏阻断遮罩 */}
      {(isImporting || isClearing) && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-150 p-6 text-center select-none">
          <div className="bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <div className="p-3 bg-accent text-primary rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {isClearing ? t('settings.clearingTitle') : t('settings.importingTitle')}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isClearing ? t('settings.clearingDesc') : t('settings.importingDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 计划库重置与危险操作 */}
      <div className="pt-2 border-t border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.resetPlansTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.resetPlansDesc')}</div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowResetPlansConfirm(true)}
            className="gap-1 border border-border"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('settings.resetPlansBtn')}
          </Button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-bold text-rose-600">{t('settings.clearDataTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.clearDataDesc')}</div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            className="gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('settings.clearDataBtn')}
          </Button>
        </div>
      </div>

      {/* 二次确认弹窗群 */}
      <ConfirmModal
        isOpen={showResetPlansConfirm}
        title={t('settings.resetPlansTitle')}
        message={t('settings.resetPlansConfirmMessage')}
        confirmText={t('settings.resetPlansBtn')}
        isDangerous={false}
        onConfirm={handleResetPlansConfirmed}
        onCancel={() => setShowResetPlansConfirm(false)}
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        title={t('settings.clearDataTitle')}
        message={t('settings.clearDataConfirmMessage')}
        confirmText={t('settings.clearDataBtn')}
        isDangerous={true}
        onConfirm={handleClearDataConfirmed}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
~~~~~

---

### 下一步建议
- **回归与构建验证**: 执行 `pnpm check` (或 `biome check` / `tsc --noEmit`) 与自动化测试，确保没有遗漏类型或语法错误。
- **备份还原验证**: 测试老版本包含 `mode` 的历史导出 JSON 文件是否能在新版本中顺畅无损还原，并验证 IndexedDB 中的版本升级钩子是否正常触发并清洗。
