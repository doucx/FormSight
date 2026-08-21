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