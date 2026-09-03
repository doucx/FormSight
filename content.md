现在制定清理 IndexedDB 历史迁移分支、备份导入冗余回退逻辑以及废弃多语言词条的计划。

## [WIP] refactor: 移除 IndexedDB 历史版本升级迁移分支与冗余兼容逻辑

### 用户需求
鉴于全量用户已顺利升级至最新版本数据库，清除 `src/storage/db/schema.ts` 中的全部历史迁移兼容逻辑（如 `oldVersion < 2`, `< 3`, `< 4` 等老版本清洗分支），移除 `importExport.ts` 中的旧字段兜底处理，并清理国际化词典中遗留的 prune 死词条。

### 评论
在确认客户端全员已平稳到达新版架构的前提下，及时清理历史数据库升级与数据迁移分支是保持代码库轻盈、去除认知负担的关键工程动作。这不仅消除了底层对 LocalStorage 与废弃表结构的陈旧引用，也使 IndexedDB 建表逻辑回归到最纯粹清晰的声明式状态。

### 目标
1. 简化 `src/storage/db/schema.ts` 的 `upgrade` 逻辑，移除所有 `oldVersion < 2/3/4` 的历史兼容与存量清洗分支，仅保留标准干净的建表与索引创建逻辑。
2. 简化 `src/storage/db/importExport.ts` 中的导入还原逻辑，移除所有针对 `mode` 的类型转换与清理冗余代码。
3. 从 `src/locales/zh-CN.json` 与 `src/locales/en-US.json` 中移除 `prune*` 废弃词条。

### 基本原理
- 现存运行环境已全部升级为 v4 结构，新安装设备只需按 v4 定义直接初始化全部对象仓库（ObjectStores）与索引即可。
- 移除非必要的类型断言与旧版字段探测，使存储层代码保持单职责与高内聚。

### 标签
#intent/refine #flow/ready #priority/medium #comp/engine #concept/state #scope/core #scope/dx #ai/instruct #task/domain/storage #task/object/legacy-cleanup #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 精简 `src/storage/db/schema.ts` 中的建表与升级逻辑

移除非必要的历史版本判断和兼容清洗代码，升级回调仅维护干净的对象仓库与索引声明。

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
      upgrade(database) {
        // 1. sessions 表
        if (!database.objectStoreNames.contains('sessions')) {
          const sessionsStore = database.createObjectStore('sessions', { keyPath: 'id' });
          sessionsStore.createIndex('by-card', 'cardId');
          sessionsStore.createIndex('by-domain', 'domain');
        }

        // 2. records 表
        if (!database.objectStoreNames.contains('records')) {
          const recordsStore = database.createObjectStore('records', { keyPath: 'id' });
          recordsStore.createIndex('by-card', 'cardId');
          recordsStore.createIndex('by-session', 'sessionId');
          recordsStore.createIndex('by-domain', 'domain');
          recordsStore.createIndex('by-card-timestamp', ['cardId', 'timestamp']);
          recordsStore.createIndex('by-timestamp', 'timestamp');
        }

        // 3. user_profiles 表
        if (!database.objectStoreNames.contains('user_profiles')) {
          const profilesStore = database.createObjectStore('user_profiles', { keyPath: 'cardId' });
          profilesStore.createIndex('by-domain', 'domain');
        }

        // 4. daily_summaries 表
        if (!database.objectStoreNames.contains('daily_summaries')) {
          const dailyStore = database.createObjectStore('daily_summaries', { keyPath: 'id' });
          dailyStore.createIndex('by-date', 'date');
          dailyStore.createIndex('by-card', 'cardId');
          dailyStore.createIndex('by-domain', 'domain');
          dailyStore.createIndex('by-date-card', ['date', 'cardId']);
          dailyStore.createIndex('by-date-domain', ['date', 'domain']);
        }

        // 5. app_settings 表
        if (!database.objectStoreNames.contains('app_settings')) {
          database.createObjectStore('app_settings');
        }

        // 6. training_plans 表
        if (!database.objectStoreNames.contains('training_plans')) {
          const planStore = database.createObjectStore('training_plans', { keyPath: 'id' });
          planStore.createIndex('by-updated', 'updatedAt');
        }

        // 7. app_metadata 表
        if (!database.objectStoreNames.contains('app_metadata')) {
          database.createObjectStore('app_metadata');
        }
      },
    });
  }
  return dbPromise;
}
~~~~~

#### Acts 2: 清理 `src/storage/db/importExport.ts` 中的冗余类型转换

使数据还原直接写入纯粹的 `cardId`。

~~~~~act
patch_file
src/storage/db/importExport.ts
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
~~~~~typescript
    // 1. 恢复 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const sessionStore = tx.objectStore('sessions');
      for (const s of parsed.sessions) {
        s.domain = getCachedDomain(s.cardId, s.domain);
        await sessionStore.put(s);
      }
    }

    // 2. 恢复 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const profileStore = tx.objectStore('user_profiles');
      for (const p of parsed.profiles) {
        p.domain = getCachedDomain(p.cardId, p.domain);
        p.totalTrials = p.totalTrials ?? 0;
        await profileStore.put(p);
      }
    }

    // 3. 恢复 records
    if (parsed.records && parsed.records.length > 0) {
      const recordStore = tx.objectStore('records');
      for (let i = 0; i < parsed.records.length; i++) {
        const r = parsed.records[i];
        r.domain = getCachedDomain(r.cardId, r.domain);
        await recordStore.put(r);
      }
    }

    // 4. 恢复 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const dailyStore = tx.objectStore('daily_summaries');
      for (const d of parsed.dailySummaries) {
        d.domain = getCachedDomain(d.cardId, d.domain);
        await dailyStore.put(d);
      }
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      let lastTimestamp = -1;
      let lastDateStr = '';

      for (const r of parsed.records) {
        const domain = getCachedDomain(r.cardId, r.domain);

        let dateStr = lastDateStr;
        if (Math.abs(r.timestamp - lastTimestamp) > 1000 * 60 * 60 * 12 || lastDateStr === '') {
          dateStr = getLocalDateString(r.timestamp);
          lastTimestamp = r.timestamp;
          lastDateStr = dateStr;
        }

        const summaryId = `${dateStr}_${r.cardId}`;
        const respMs = Number(r.responseTimeMs) || 0;
        const level = Number(r.difficultyLevel) || 1;

        const existing = summaryMap.get(summaryId);
        if (!existing) {
          summaryMap.set(summaryId, {
            id: summaryId,
            date: dateStr,
            cardId: r.cardId,
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

#### Acts 3: 清理语言包中已废弃的 prune 词条

从 `zh-CN.json` 和 `en-US.json` 中移除已删除的冷数据修剪相关国际化词条。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "clearingTitle": "正在清空数据",
    "clearingDesc": "正在重置数据库与个人能力档案，请稍候且勿关闭窗口...",
    "pruneTitle": "数据库瘦身与修剪",
    "pruneDesc": "清理 90 天以前的高开销图形几何细节",
    "pruneBtn": "安全瘦身",
    "pruneSuccessToast": "已修剪 {{count}} 条 90 天前记录中的多边形/点阵细节，释放了海量存储空间！",
    "pruneFailToast": "修剪操作失败",
    "pruneConfirmMessage": "确定要清理 90 天前记录中的多边形/点阵冗余图形细节吗？此操作将大幅压缩存储空间，且完全保留您的总做答数、打卡日历、正确率与能力层阶！",
    "resetPlansTitle": "恢复官方训练计划",
~~~~~
~~~~~json
    "clearingTitle": "正在清空数据",
    "clearingDesc": "正在重置数据库与个人能力档案，请稍候且勿关闭窗口...",
    "resetPlansTitle": "恢复官方训练计划",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
    "clearingTitle": "Clearing All Data",
    "clearingDesc": "Resetting database and career profiles, please wait and do not close the window...",
    "pruneTitle": "Database Prune & Clean",
    "pruneDesc": "Prune polygon/grid geometry details older than 90 days",
    "pruneBtn": "Safe Prune",
    "pruneSuccessToast": "Pruned {{count}} cold records older than 90 days, storage reclaimed!",
    "pruneFailToast": "Prune operation failed",
    "pruneConfirmMessage": "Are you sure you want to prune geometry details from records older than 90 days? Your total trial counts, attendance calendar, and skill levels will be 100% preserved.",
    "resetPlansTitle": "Reset Official Plans",
~~~~~
~~~~~json
    "clearingTitle": "Clearing All Data",
    "clearingDesc": "Resetting database and career profiles, please wait and do not close the window...",
    "resetPlansTitle": "Reset Official Plans",
~~~~~

---

### 下一步建议
- **代码质检**: 运行 `pnpm build` 或 `biome check`，确认全部文件构建通过。
- **全流程验收**: 验证新环境安装或直接打开应用时，数据库初始化、各模块训练、答题保存、日统计与全量导出/导入均平稳正常运作。
