好的，我们现在开始执行 **Phase 1: 数据层重构与历史遗留清理**。

本阶段我们将完成以下核心改造：
1. **数据库与 LocalStorage 品牌归一**：建立 `FormSightDB` 与 `formsight_user_settings`，并提供对旧版本（`StarHoppingDB` / `star_hopping_user_settings`）的无感迁移机制。
2. **单一数据源重构（CardId-First）**：画像表 `user_profiles` 主键与训练记录全面升级为以 `cardId` 为主键，重命名 `totalTrainedCards` 为语义更精确的 `totalTrials`。
3. **废弃胶水层与仓库目录规范化**：收敛 Card 结构，将实验脚本归档至 `scripts/color-analysis/`。

## [WIP] refactor: 重构底层存储体系并建立自动平滑迁移机制

### 用户需求
1. 将 IndexedDB 数据库名称统一为 `FormSightDB`，LocalStorage 键名统一为 `formsight_user_settings`。
2. 支持自动检测并迁移旧版本数据库中的训练记录、会话与用户画像，确保老用户无感升级。
3. 统一以 `cardId` 为核心的数据实体映射，重命名画像字段 `totalTrainedCards` 为 `totalTrials`。
4. 清理并归档 `analysis/` 目录至 `scripts/color-analysis/`。

### 评论
这是整个系统演进的地基。通过在底层将数据模型从早期的 `domain + mode` 复合键升级为单一维度的 `cardId`，消除了大量的胶水代码，并为后续全域弱点分析和动态路由提供了坚实的数据契约支撑。

### 目标
1. 新建 `src/utils/db/migration.ts`，实现从 `StarHoppingDB` 自动读出、转换并写入新 `FormSightDB` 的逻辑。
2. 更新 `src/utils/db/schema.ts`、`src/utils/db/queries.ts` 和 `src/utils/db/importExport.ts`，确立新的表结构与索引。
3. 更新 `src/utils/settings.ts`，支持旧 LocalStorage 键名自动迁移。
4. 更新 `src/config/cards.ts`、`src/types/card.ts` 以及相关组件，彻底接轨 `cardId` 与 `totalTrials`。
5. 整理归档实验分析目录。

### 基本原理
1. 在 `getDB()` 初始化时，先执行轻量级异步探测与迁移逻辑（`migrateLegacyDatabase`），若存在 `StarHoppingDB` 则全量提取旧记录，补齐 `cardId` 后存入 `FormSightDB` 并清理旧库。
2. `user_profiles` 表改以 `cardId` 为主键，简化 CRUD 逻辑。
3. 保持数据导入导出的向下兼容性，解析时自动做字段别名转换。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/database-migration #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 归档实验脚本目录

~~~~~act
run_command
~~~~~
~~~~~
mkdir -p scripts/color-analysis
mv analysis/* scripts/color-analysis/ 2>/dev/null || true
rmdir analysis 2>/dev/null || true
~~~~~

#### Acts 2: 创建数据库与设置自动迁移模块 `src/utils/db/migration.ts`

~~~~~act
write_file
src/utils/db/migration.ts
~~~~~
~~~~~typescript
import { openDB } from 'idb';
import { resolveLegacyCardId } from '../../config/cards';
import {
  type FormSightDBSchema,
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
} from './schema';

const LEGACY_DB_NAME = 'StarHoppingDB';
const LEGACY_SETTINGS_KEY = 'star_hopping_user_settings';
const NEW_SETTINGS_KEY = 'formsight_user_settings';

/**
 * 迁移 LocalStorage 设置
 */
export function migrateLegacySettings(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
    const current = localStorage.getItem(NEW_SETTINGS_KEY);
    if (legacy && !current) {
      localStorage.setItem(NEW_SETTINGS_KEY, legacy);
      localStorage.removeItem(LEGACY_SETTINGS_KEY);
    }
  } catch (e) {
    console.warn('LocalStorage 设置迁移失败:', e);
  }
}

/**
 * 检测并迁移旧版 IndexedDB (StarHoppingDB -> FormSightDB)
 */
export async function migrateLegacyDatabase(newDb: import('idb').IDBPDatabase<FormSightDBSchema>): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  try {
    // 检查是否存在旧数据库
    let hasLegacy = false;
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      hasLegacy = dbs.some((db) => db.name === LEGACY_DB_NAME);
    } else {
      // 兜底探测
      hasLegacy = true;
    }

    if (!hasLegacy) return;

    // 打开旧数据库读取数据
    const legacyDb = await openDB(LEGACY_DB_NAME, 4).catch(() => null);
    if (!legacyDb) return;

    const sessionStoreNames = legacyDb.objectStoreNames;
    if (!sessionStoreNames.contains('sessions') || !sessionStoreNames.contains('records')) {
      legacyDb.close();
      return;
    }

    const oldSessions = (await legacyDb.getAll('sessions')) as unknown as (UnifiedSessionData & { domain?: TrainingDomain })[];
    const oldRecords = (await legacyDb.getAll('records')) as unknown as (UnifiedTrialRecord & { domain?: TrainingDomain })[];
    const oldProfiles = sessionStoreNames.contains('user_profiles')
      ? ((await legacyDb.getAll('user_profiles')) as unknown as (UnifiedProfileData & { totalTrainedCards?: number })[])
      : [];

    legacyDb.close();

    if (oldSessions.length === 0 && oldRecords.length === 0 && oldProfiles.length === 0) {
      indexedDB.deleteDatabase(LEGACY_DB_NAME);
      return;
    }

    // 写入新数据库
    const tx = newDb.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

    for (const s of oldSessions) {
      const domain = s.domain || 'star';
      const cardId = s.cardId || resolveLegacyCardId(domain, s.mode);
      await tx.objectStore('sessions').put({
        ...s,
        domain,
        cardId,
      });
    }

    for (const r of oldRecords) {
      const domain = r.domain || 'star';
      const cardId = r.cardId || resolveLegacyCardId(domain, r.mode);
      await tx.objectStore('records').put({
        ...r,
        domain,
        cardId,
      });
    }

    for (const p of oldProfiles) {
      const domain = p.domain || 'star';
      const cardId = p.cardId || resolveLegacyCardId(domain, p.mode);
      const totalTrials = p.totalTrials ?? p.totalTrainedCards ?? 0;
      await tx.objectStore('user_profiles').put({
        ...p,
        cardId,
        domain,
        totalTrials,
      });
    }

    await tx.done;

    // 迁移完毕，移除旧数据库
    indexedDB.deleteDatabase(LEGACY_DB_NAME);
    console.info('✅ FormSight: 旧版训练数据库已无缝平滑迁移至 FormSightDB。');
  } catch (e) {
    console.warn('FormSight 自动数据库迁移已跳过或遇到非阻断性异常:', e);
  }
}
~~~~~

#### Acts 3: 更新 `src/utils/db/schema.ts` 规范化数据模型与库名

~~~~~act
write_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 4: 更新 `src/utils/db/queries.ts` 支持以 `cardId` 为准的查询与保存

~~~~~act
write_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
import { resolveLegacyCardId } from '../../config/cards';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';

export async function saveTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const cardId = record.cardId || resolveLegacyCardId(domain, record.mode);
  const normalizedRecord: UnifiedTrialRecord = { ...record, domain, cardId };
  await db.put('records', normalizedRecord);
  await updateProfile(cardId, domain, record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  const cardId = session.cardId || resolveLegacyCardId(domain, session.mode);
  await db.put('sessions', { ...session, domain, cardId });
}

export async function getProfile(cardId: string): Promise<UnifiedProfileData | null>;
export async function getProfile(domain: TrainingDomain, mode: string): Promise<UnifiedProfileData | null>;
export async function getProfile(
  first: string | TrainingDomain,
  second?: string,
): Promise<UnifiedProfileData | null> {
  const db = await getDB();
  const cardId = second ? resolveLegacyCardId(first as TrainingDomain, second) : first;
  const profile = await db.get('user_profiles', cardId);
  return profile || null;
}

export async function getProfilesByDomain(domain: TrainingDomain): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  return await db.getAllFromIndex('user_profiles', 'by-domain', domain);
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

export async function getTrialRecordsByCard(cardId: string): Promise<UnifiedTrialRecord[]> {
  const db = await getDB();
  const rawRecords = await db.getAllFromIndex('records', 'by-card', cardId);
  return rawRecords.map((r) => ({
    ...r,
    ...(r.details || {}),
  }));
}

async function updateProfile(
  cardId: string,
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('user_profiles', cardId);

  if (!existing) {
    const newProfile: UnifiedProfileData = {
      cardId,
      domain,
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrials: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await db.put('user_profiles', newProfile);
  } else {
    existing.totalTrials += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) {
      existing.bestLevel = currentLevel;
    }
    existing.updatedAt = Date.now();
    await db.put('user_profiles', existing);
  }
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

#### Acts 5: 更新 `src/utils/db/importExport.ts` 适配新结构与向下兼容

~~~~~act
write_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript
import { resolveLegacyCardId } from '../../config/cards';
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();

  const exportObject = {
    appName: 'FormSight',
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
        const domain = (s.domain || 'star') as TrainingDomain;
        const cardId = s.cardId || resolveLegacyCardId(domain, s.mode);
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || resolveLegacyCardId(domain, r.mode);
        await tx.objectStore('records').put({ ...r, domain, cardId });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const domain = (p.domain || 'star') as TrainingDomain;
        const cardId = p.cardId || resolveLegacyCardId(domain, p.mode);
        const totalTrials = p.totalTrials ?? p.totalTrainedCards ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
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
~~~~~

#### Acts 6: 更新 `src/utils/settings.ts` 引入迁移机制并更新键名

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~typescript
import { migrateLegacySettings } from './db/migration';

export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';

export interface BaseModuleSettings {
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity: StepGranularity;
  adaptiveMode: AdaptiveMode;
  targetAccuracy: number;
  blockSize: number;
}

export interface StarSettings extends BaseModuleSettings {
  gridSize: number;
  targetingMode: TargetingMode;
  manualTargetSectors: number[];
}

export interface ColorSenseSettings extends BaseModuleSettings {
  sliderHitMargin: number;
  showToleranceBand: boolean;
  enableHoverColorPreview: boolean;
  targetingMode: TargetingMode;
  manualTargetSectors: number[];
}

export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin: number;
  showToleranceBand: boolean;
  enableHoverColorPreview: boolean;
}

export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin: number;
  showToleranceBand: boolean;
}

export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  star: StarSettings;
  color: ColorSenseSettings;
  relative_color: RelativeColorSettings;
  negative_space: NegativeSpaceSettings;
}

const SETTINGS_KEY = 'formsight_user_settings';

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};

export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
  },
  star: {
    ...DEFAULT_BASE_SETTINGS,
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  color: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  relative_color: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
  negative_space: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
};

export function loadSettings(): UserSettings {
  try {
    migrateLegacySettings();
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    return {
      global: { ...DEFAULT_SETTINGS.global, ...(parsed.global || {}) },
      star: { ...DEFAULT_SETTINGS.star, ...(parsed.star || {}) },
      color: { ...DEFAULT_SETTINGS.color, ...(parsed.color || {}) },
      relative_color: { ...DEFAULT_SETTINGS.relative_color, ...(parsed.relative_color || {}) },
      negative_space: { ...DEFAULT_SETTINGS.negative_space, ...(parsed.negative_space || {}) },
    };
  } catch (e) {
    console.error('Failed to load user settings, fallback to default:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}
~~~~~

#### Acts 7: 更新 `GenericDashboard.tsx` 消除 legacyMode 直接使用 cardId 映射

~~~~~act
patch_file
src/components/dashboard/GenericDashboard.tsx
~~~~~
~~~~~typescript.old
  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain(meta.domain).then((list) => {
      if (!isMounted) return;
      const map: Record<string, UnifiedProfileData> = {};
      for (const p of list) {
        map[p.mode] = p;
      }
      setProfiles(map);
    });
    return () => {
      isMounted = false;
    };
  }, [meta.domain]);

  return (
    <DashboardShell
      title={meta.title}
      subTitle={meta.subTitle}
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
      onOpenAnalytics={meta.hasWeaknessAnalytics ? onOpenAnalytics : undefined}
    >
      {meta.cards.map((card) => {
        const profile = profiles[card.legacyMode];
        const totalCards = profile?.totalTrainedCards || 0;
        const accuracy =
          totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[card.legacyMode] || { count: 0, timeMs: 0 };
~~~~~
~~~~~typescript.new
  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain(meta.domain).then((list) => {
      if (!isMounted) return;
      const map: Record<string, UnifiedProfileData> = {};
      for (const p of list) {
        map[p.cardId] = p;
      }
      setProfiles(map);
    });
    return () => {
      isMounted = false;
    };
  }, [meta.domain]);

  return (
    <DashboardShell
      title={meta.title}
      subTitle={meta.subTitle}
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
      onOpenAnalytics={meta.hasWeaknessAnalytics ? onOpenAnalytics : undefined}
    >
      {meta.cards.map((card) => {
        const profile = profiles[card.id];
        const totalTrials = profile?.totalTrials || 0;
        const accuracy =
          totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[card.legacyMode] || todayStats[card.id] || { count: 0, timeMs: 0 };
~~~~~

#### Acts 8: 更新 `src/app.tsx` 中 Profiles 缓存主键为 cardId

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
    if (currentApp !== 'home') {
      const d = APP_TO_DOMAIN[currentApp];
      const pList = await getProfilesByDomain(d);
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.mode] = p;
      }
      setCurrentDomainProfiles(pMap);
    }
  }, [currentApp]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else {
      const d = APP_TO_DOMAIN[currentApp];
      const meta = DOMAINS_CONFIG[d];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    }
  }, [currentApp]);

  const handleStartSession = (cardId: string, type: 'training' | 'benchmark') => {
    setActiveCardId(cardId);
    setSessionType(type);
    setCurrentView('training');
  };

  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

  const activeCard = getCardById(activeCardId);
  const activeLevel = activeCard
    ? currentDomainProfiles[activeCard.legacyMode]?.currentLevel || 5
    : 5;
~~~~~
~~~~~typescript.new
    if (currentApp !== 'home') {
      const d = APP_TO_DOMAIN[currentApp];
      const pList = await getProfilesByDomain(d);
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.cardId] = p;
      }
      setCurrentDomainProfiles(pMap);
    }
  }, [currentApp]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else {
      const d = APP_TO_DOMAIN[currentApp];
      const meta = DOMAINS_CONFIG[d];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    }
  }, [currentApp]);

  const handleStartSession = (cardId: string, type: 'training' | 'benchmark') => {
    setActiveCardId(cardId);
    setSessionType(type);
    setCurrentView('training');
  };

  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

  const activeCard = getCardById(activeCardId);
  const activeLevel = activeCard
    ? currentDomainProfiles[activeCard.id]?.currentLevel || 5
    : 5;
~~~~~

### 下一步建议

执行：
~~~~~
npm run check
npm run test:coverage || npm run test
~~~~~

1. 验证 Phase 1 变更后的数据存储与迁移稳定性。
2. 开启 **Phase 2: 弱点分析插件化（OCP）与业务功能闭环**，新建 `src/config/analyticsPlugins.tsx`，将 `WeaknessAnalyticsModal` 与 `SessionSummaryModal` 解耦为多态策略插件，并开启相对色感与正负形的弱点分析。
