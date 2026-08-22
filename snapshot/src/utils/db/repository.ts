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
import { clearAllData, exportAllData, exportAllDataStream, importAllData } from './importExport';
import { pruneColdRecords } from './prune';
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
} from './queries';
import type { UnifiedProfileData } from './schema';

export interface AppDataSummary {
  totalTimeMs: number;
  profiles: Record<string, UnifiedProfileData>;
  settings: UserSettings;
  trainingPlan: TrainingPlan;
  allPlans: TrainingPlan[];
}

/**
 * 聚合仓储层 (SystemRepository)
 * 统一收敛 IndexedDB、LocalStorage 及跨介质事务与稳态治理操作
 */
export class SystemRepository {
  // === 查询与聚合统计 ===
  public async getAppSummary(): Promise<AppDataSummary> {
    const totalTimeMs = await getTrainingTimeMs();
    const allProfilesList = await getAllProfiles();
    const profiles: Record<string, UnifiedProfileData> = {};

    for (const p of allProfilesList) {
      profiles[p.cardId] = p;
    }

    const settings = loadSettings();
    const planState = loadPlanStorageState();
    const trainingPlan = loadTrainingPlan();

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

  // === 全局备份恢复与稳态治理 ===
  public exportAllData = exportAllData;
  public exportAllDataStream = exportAllDataStream;
  public importAllData = importAllData;
  public clearAllData = clearAllData;
  public pruneColdRecords = pruneColdRecords;
}

export const repository = new SystemRepository();
