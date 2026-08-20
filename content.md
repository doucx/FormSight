收到，既然全量用户已经完成向最新统一架构的升级，我们将全面清理用于兼容旧版数据库（`StarHoppingDB`）和旧版 LocalStorage 结构的历史迁移与兜底逻辑，使存储层与类型定义回归精简纯粹。

## [WIP] refactor: 清理数据库与配置系统的历史版本迁移冗余代码

### 用户需求
移除所有针对旧版本（如 `StarHoppingDB` 数据库平滑迁移、旧键名 LocalStorage 迁移、历史字段兼容补全及类型兼容属性等）的过渡性代码，保持代码库的整洁性与可维护性。

### 评论
在确认所有客户端均已迁移至最新版本后，清理历史过渡层能够有效减小打包体积、消除不必要的运行时数据库探查开销（如每次初始化时的 `migrateLegacyDatabase`），并使数据流向更加直接清晰。

### 目标
1. 删除 `src/utils/db/migration.ts` 迁移脚本文件。
2. 移除 `src/utils/db/schema.ts` 中的迁移调用及相关异步包装。
3. 移除 `src/utils/settings.ts` 中针对旧版分模块配置项的兼容解析分支与迁移逻辑。
4. 简化 `src/utils/db/queries.ts` 中 `getProfilesByDomain` 的索引查询逻辑，去除历史未索引数据的兜底修复循环。
5. 清理 `src/types/card.ts` 和 `src/utils/db/importExport.ts` 中的历史兼容属性。

### 基本原理
- 移除不再需要的 `migration.ts` 文件，减少无用代码。
- 在 `getDB()` 中直接返回 `openDB` 实例，去除运行时对旧 IndexedDB 实例的探查。
- 简化 `loadSettings()` 与 `getProfilesByDomain()`，直接基于标准 Schema 操作，消除无效的降级逻辑。

### 标签
#intent/refine #flow/ready #priority/medium
#comp/engine #concept/state #scope/core
#ai/instruct
#task/domain/storage
#task/object/migration-cleanup
#task/action/refactor
#task/state/begin

---

### Script

#### Acts 1: 删除已废弃的数据库迁移模块并更新核心存储与配置逻辑

我们将删除 `src/utils/db/migration.ts` 文件，并同步修剪 `schema.ts`、`settings.ts`、`queries.ts`、`importExport.ts` 及 `types/card.ts`。

~~~~~act
delete_file
src/utils/db/migration.ts
~~~~~

~~~~~act
patch_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import { migrateLegacyDatabase } from './migration';

export type TrainingDomain =
~~~~~
~~~~~typescript
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export type TrainingDomain =
~~~~~

~~~~~act
patch_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
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
  }
  return dbPromise;
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
import { migrateLegacySettings } from './db/migration';

export type StepGranularity = 'standard' | 'fine';
~~~~~
~~~~~typescript
export type StepGranularity = 'standard' | 'fine';
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export function loadSettings(): UserSettings {
  try {
    migrateLegacySettings();
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    // 自动兼容并迁移旧版 domain 挂载的配置
    const cards: Record<string, BaseModuleSettings> = { ...DEFAULT_SETTINGS.cards };

    if (parsed.cards && typeof parsed.cards === 'object') {
      for (const [cardId, val] of Object.entries(parsed.cards)) {
        cards[cardId] = {
          ...(cards[cardId] || DEFAULT_BASE_SETTINGS),
          ...(val as Record<string, unknown>),
        };
      }
    } else {
      // 从旧结构（star/color/relative_color/negative_space）迁移到卡片
      if (parsed.star) {
        cards.star_single = { ...cards.star_single, ...parsed.star };
        cards.star_double_h = { ...cards.star_double_h, ...parsed.star };
        cards.star_double_r = { ...cards.star_double_r, ...parsed.star };
      }
      if (parsed.color) {
        cards.color_hue = { ...cards.color_hue, ...parsed.color };
        cards.color_val = { ...cards.color_val, ...parsed.color };
        cards.color_sat = { ...cards.color_sat, ...parsed.color };
        cards.color_all = { ...cards.color_all, ...parsed.color };
      }
      if (parsed.relative_color) {
        cards.rel_vector_shift = { ...cards.rel_vector_shift, ...parsed.relative_color };
        cards.rel_lightness_induction = {
          ...cards.rel_lightness_induction,
          ...parsed.relative_color,
        };
        cards.rel_hue_induction = { ...cards.rel_hue_induction, ...parsed.relative_color };
        cards.rel_decontextual_2afc = { ...cards.rel_decontextual_2afc, ...parsed.relative_color };
      }
      if (parsed.negative_space) {
        cards.neg_ratio_estimation = { ...cards.neg_ratio_estimation, ...parsed.negative_space };
        cards.neg_area_comparison_2afc = {
          ...cards.neg_area_comparison_2afc,
          ...parsed.negative_space,
        };
        cards.neg_vertex_fitting = { ...cards.neg_vertex_fitting, ...parsed.negative_space };
        cards.neg_shape_match_2afc = { ...cards.neg_shape_match_2afc, ...parsed.negative_space };
      }
    }

    return {
      global: { ...DEFAULT_SETTINGS.global, ...(parsed.global || {}) },
      cards,
    };
  } catch (e) {
    console.error('Failed to load user settings, fallback to default:', e);
    return DEFAULT_SETTINGS;
  }
}
~~~~~
~~~~~typescript
export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    const cards: Record<string, BaseModuleSettings> = { ...DEFAULT_SETTINGS.cards };

    if (parsed.cards && typeof parsed.cards === 'object') {
      for (const [cardId, val] of Object.entries(parsed.cards)) {
        cards[cardId] = {
          ...(cards[cardId] || DEFAULT_BASE_SETTINGS),
          ...(val as Record<string, unknown>),
        };
      }
    }

    return {
      global: { ...DEFAULT_SETTINGS.global, ...(parsed.global || {}) },
      cards,
    };
  } catch (e) {
    console.error('Failed to load user settings, fallback to default:', e);
    return DEFAULT_SETTINGS;
  }
}
~~~~~

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
export async function getProfilesByDomain(domain: TrainingDomain): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  const domainCards = getCardsByDomain(domain);
  const indexProfiles = await db.getAllFromIndex('user_profiles', 'by-domain', domain);
  const map = new Map<string, UnifiedProfileData>();

  for (const p of indexProfiles) {
    map.set(p.cardId, p);
  }

  // 兜底补齐因历史 domain 迁移未匹配索引的 Profile 并自愈写入
  for (const card of domainCards) {
    if (!map.has(card.id)) {
      const p = await db.get('user_profiles', card.id);
      if (p) {
        if (p.domain !== domain) {
          p.domain = domain;
          await db.put('user_profiles', p);
        }
        map.set(p.cardId, p);
      }
    }
  }

  return Array.from(map.values());
}
~~~~~
~~~~~typescript
export async function getProfilesByDomain(domain: TrainingDomain): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  return db.getAllFromIndex('user_profiles', 'by-domain', domain);
}
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript
    if (data.profiles) {
      for (const p of data.profiles) {
        const cardId = p.cardId || resolveLegacyCardId(p.domain || 'star', p.mode);
        const card = getCardById(cardId);
        const domain = card ? card.legacyDomain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? p.totalTrainedCards ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
    }
~~~~~
~~~~~typescript
    if (data.profiles) {
      for (const p of data.profiles) {
        const cardId = p.cardId || resolveLegacyCardId(p.domain || 'star', p.mode);
        const card = getCardById(cardId);
        const domain = card ? card.legacyDomain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
    }
~~~~~

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  legacyDomain: TrainingDomain;
  legacyMode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  settingsKey?: string; // 兼容
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  isExperimental?: boolean;
}
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  legacyDomain: TrainingDomain;
  legacyMode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  isExperimental?: boolean;
}
~~~~~

### 下一步建议
1. 执行 `npm run check` 或 `npx biome check .` 确保无任何残留死代码或未使用的导入。
2. 运行 `npm test` 确认全量测试套件正常通过。
