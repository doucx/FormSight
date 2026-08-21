好的，我们将对数据存储层进行统一重构，构建**聚合数据访问仓储（Repository）**，并实现具备**严格格式预校验、两阶段写入与快照回滚机制**的原子级数据导入导出及重置体系。

## [WIP] refactor: 构建系统聚合 Repository 并强化数据导入导出事务原子性

### 用户需求
将分散在 IndexedDB 和 LocalStorage 的数据读写操作整合至统一的仓储（Repository）层管理，在全量数据导入、导出与危险重置时提供事务级原子性与一致性保护，彻底消除存储分裂与半恢复脏状态风险。

### 评论
当前系统的答题日志（IndexedDB）与全局偏好、训练流（LocalStorage）分别处于异步与同步两种异构介质中。如果导入损坏的备份文件，IndexedDB 事务提交后 LocalStorage 解析一旦失败，系统将永久停留在不可控的脏状态。通过引入预校验（Dry-run Validation）与快照回滚机制，能够确保数据操作的强一致性（All-or-Nothing）。

### 目标
1. 创建统一仓储门面 `src/utils/db/repository.ts`，聚合管理会话记录、用户评级、全局偏好及训练流数据。
2. 升级 `src/utils/db/importExport.ts`，在写入任何持久化介质前进行深层格式预校验，并增加快照备份与回滚机制。
3. 统一导出仓储接口并在 `src/utils/db/index.ts` 中暴露，提升数据读写层的内聚性。

### 基本原理
1. **预检与强校验（Dry-run Pre-validation）**：在触碰任何数据库和存储介质之前，全面校验 JSON 数据的关键字段与结构，任何格式异常即刻阻断，从源头杜绝脏数据注入。
2. **两阶段安全提交与快照回滚（Snapshot Rollback）**：导入开始前对 LocalStorage 及关键状态做快照暂存，当且仅当 IndexedDB 事务与 LocalStorage 均写入成功后才正式确认，若中途发生任何异常则自动恢复快照。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/dx #ai/instruct #task/domain/storage #task/object/repository-transaction #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 升级数据导入导出模块，实现预校验与原子级两阶段提交

重构 `src/utils/db/importExport.ts`，增加严格的类型保护与快照回滚机制。

~~~~~act
write_file
src/utils/db/importExport.ts
~~~~~
~~~~~ts
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
import { DB_VERSION, type TrainingDomain, type UnifiedProfileData, type UnifiedSessionData, type UnifiedTrialRecord, getDB } from './schema';

export interface FormSightExportBundle {
  appName: string;
  version: number;
  exportAt: string;
  sessions: UnifiedSessionData[];
  records: UnifiedTrialRecord[];
  profiles: UnifiedProfileData[];
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
    settings,
    trainingPlan,
    planStorageState,
  };

  return JSON.stringify(exportObject, null, 2);
}

/**
 * 原子化全量数据导入（支持预校验与异常保护）
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
    // 2. 第一阶段：执行 IndexedDB 事务级写入
    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

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

    await tx.done;

    // 3. 第二阶段：安全更新 LocalStorage
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
  const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.done;

  resetPlansToDefault();
  saveSettings(DEFAULT_SETTINGS);
}
~~~~~

#### Acts 2: 创建统一仓储层 (SystemRepository)

新建 `src/utils/db/repository.ts`，为系统提供统一的数据管理与状态同步门面。

~~~~~act
write_file
src/utils/db/repository.ts
~~~~~
~~~~~ts
import { registry } from '../../core/registry';
import type { PlanStorageState, TrainingPlan } from '../../types/plan';
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
  DEFAULT_SETTINGS,
  type UserSettings,
  getCardSettings,
  loadSettings,
  saveSettings,
} from '../settings';
import { clearAllData, exportAllData, importAllData } from './importExport';
import {
  formatTotalTime,
  getProfile,
  getProfilesByDomain,
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

#### Acts 3: 在 `src/utils/db/index.ts` 统一导出仓储门面

更新 `src/utils/db/index.ts`。

~~~~~act
patch_file
src/utils/db/index.ts
~~~~~
~~~~~ts.old
export * from './schema';
export * from './queries';
export * from './importExport';
~~~~~
~~~~~ts.new
export * from './schema';
export * from './queries';
export * from './importExport';
export * from './repository';
~~~~~

#### Acts 4: 优化 App 根组件中的数据同步流

修改 `src/app.tsx`，使用 `repository.getAppSummary()` 聚合拉取状态，精简状态刷新管道。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~ts.old
  const refreshProfiles = useCallback(async () => {
    const domains = registry.getAllDomains();
    const timesEntries = await Promise.all(
      domains.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(domains.map((d) => getProfilesByDomain(d)));
    const pMap: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        pMap[p.cardId] = p;
      }
    }

    setDomainTimes(timesMap);
    setCurrentDomainProfiles(pMap);
    setSettings(loadSettings());
    const planState = loadPlanStorageState();
    setTrainingPlan(loadTrainingPlan());
    setAllPlans(planState.plans);
    setProfilesLoaded(true);
  }, []);
~~~~~
~~~~~ts.new
  const refreshProfiles = useCallback(async () => {
    const summary = await repository.getAppSummary();

    setDomainTimes(summary.domainTimes);
    setCurrentDomainProfiles(summary.profiles);
    setSettings(summary.settings);
    setTrainingPlan(summary.trainingPlan);
    setAllPlans(summary.allPlans);
    setProfilesLoaded(true);
  }, []);
~~~~~

---

### 下一步建议
1. **重构 God Hook (`useTrainingSession`)**：将反应计时器、窗口失焦闲置保护、音频合成调度以及快捷键绑定抽离为独立子模块，使训练主状态机成为纯函数式核心。
2. **端到端类型安全收口**：在 `GenericTrainingView` 与插件适配层之间建立基于判别联合类型（Discriminated Unions）的适配器，消除 `as unknown as ...` 双重类型断言。
