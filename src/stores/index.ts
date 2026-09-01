import { initPlanStore } from './planStore';
import { refreshAppData } from './profileStore';
import { initSettingsStore } from './settingsStore';

export * from './settingsStore';
export * from './planStore';
export * from './profileStore';
export * from './toastStore';

/**
 * 在全量导入、清空数据、重置计划后调用，使所有 Signal 状态与数据库完全同步
 */
export async function reloadAllStores(): Promise<void> {
  await Promise.all([initSettingsStore(), initPlanStore(), refreshAppData()]);
}
