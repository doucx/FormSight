import type { TrainingPlan } from '../types/plan';
import { clearAllData, exportAllData, exportAllDataStream, importAllData } from './db/importExport';
import {
  formatTotalTime,
  getAllProfiles,
  getDailySummaries,
  getProfile,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecordsByCard,
  saveSession,
  saveTrialRecord,
} from './db/queries';
import type { UnifiedProfileData } from './db/schema';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  getPlanStorageStateSnapshot,
  importPlanFromJson,
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
  setActivePlan,
  togglePlanFavorite,
} from './planStorage';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  getSettingsSnapshot,
  loadSettings,
  saveSettings,
} from './settings';

export interface AppDataSummary {
  totalTimeMs: number;
  profiles: Record<string, UnifiedProfileData>;
  settings: UserSettings;
  trainingPlan: TrainingPlan;
  allPlans: TrainingPlan[];
}

/**
 * 聚合仓储层 (SystemRepository)
 * 统一收敛 IndexedDB 事务与稳态治理操作
 */
export class SystemRepository {
  // === 查询与聚合统计 ===
  public async getAppSummary(): Promise<AppDataSummary> {
    const [totalTimeMs, allProfilesList, settings, planState, trainingPlan] = await Promise.all([
      getTrainingTimeMs(),
      getAllProfiles(),
      loadSettings(),
      loadPlanStorageState(),
      loadTrainingPlan(),
    ]);

    const profiles: Record<string, UnifiedProfileData> = {};
    for (const p of allProfilesList) {
      profiles[p.cardId] = p;
    }

    return {
      totalTimeMs,
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
  public getAllProfiles = getAllProfiles;
  public getDailySummaries = getDailySummaries;
  public getTodaySummaries = getTodaySummaries;
  public getTrialRecordsByCard = getTrialRecordsByCard;
  public getTrainingTimeMs = getTrainingTimeMs;
  public formatTotalTime = formatTotalTime;

  // === 设置偏好管理 ===
  public getSettings = loadSettings;
  public getSettingsSnapshot = getSettingsSnapshot;
  public saveSettings = saveSettings;
  public getCardSettings(cardId: string): BaseModuleSettings {
    const current = getSettingsSnapshot();
    return getCardSettings(current, cardId);
  }

  // === 训练计划管理 ===
  public getPlanStorageState = loadPlanStorageState;
  public getPlanStorageStateSnapshot = getPlanStorageStateSnapshot;
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

  // === 全局备份恢复与稳态治理 ===
  public exportAllData = exportAllData;
  public exportAllDataStream = exportAllDataStream;
  public importAllData = importAllData;
  public clearAllData = clearAllData;
}

export const repository = new SystemRepository();
