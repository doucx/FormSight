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
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';

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
