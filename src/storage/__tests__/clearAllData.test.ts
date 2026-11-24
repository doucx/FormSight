import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllData } from '../../storage/db';
import {
  getAllProfiles,
  getDailySummaries,
  getTrialRecordsByCard,
  saveSession,
  saveTrialRecord,
} from '../../storage/db/queries';
import { getDB } from '../../storage/db/schema';
import { loadPlanStorageState, savePlanStorageState } from '../../storage/planStorage';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../storage/settings';
import type { TrainingPlan } from '../../types/plan';

/**
 * 回归来源：1bf8448 "修复清空所有数据时未重置训练计划和用户数据的问题"
 *
 * 真实故障：清空数据只清 IndexedDB 的答题数据，训练计划与全局设置残留，
 * 用户看到「清空成功」但计划/偏好仍是旧的。修复后 clearAllData 必须回落默认。
 */

function customPlan(): TrainingPlan {
  return {
    id: 'custom_clear_me',
    name: '待清空计划',
    description: '',
    items: [{ id: 'item_1', cardId: 'star_single', targetTrials: 10 }],
    isFavorite: false,
    isBuiltin: false,
    updatedAt: 1_700_000_000_000,
  };
}

describe('clearAllData 重置训练计划与用户数据 (1bf8448)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('清空后计划、设置、记录、会话、聚合与档案全部回落默认', async () => {
    const db = await getDB();
    await savePlanStorageState({ activePlanId: 'custom_clear_me', plans: [customPlan()] });
    const custom = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as typeof DEFAULT_SETTINGS;
    custom.global.locale = 'en-US';
    custom.global.theme = 'dark';
    custom.cards.star_single.sliderHitMargin = 33;
    await saveSettings(custom);
    await saveTrialRecord({
      id: 'clear_record',
      sessionId: 'clear_session',
      cardId: 'star_single',
      timestamp: 1_700_000_000_000,
      difficultyLevel: 5,
      isHit: true,
      responseTimeMs: 800,
    });
    await saveSession({
      id: 'clear_session',
      cardId: 'star_single',
      type: 'training',
      startTimestamp: 1_700_000_000_000,
      endTimestamp: 1_700_000_060_000,
      totalTrials: 1,
      hitTrials: 1,
      startLevel: 5,
      endLevel: 5,
    });

    await clearAllData();

    // 直接读原始表：清空后必须当场写入默认计划/设置，而不是依赖下次加载自愈
    expect((await db.getAll('training_plans')).length).toBeGreaterThan(0);
    expect(await db.get('app_settings', 'global_settings')).toBeDefined();
    expect(await db.get('app_metadata', 'active_plan_id')).toBeDefined();

    const planState = await loadPlanStorageState();
    expect(planState.plans.map((plan) => plan.id)).not.toContain('custom_clear_me');
    expect(planState.plans.length).toBeGreaterThan(0);
    expect(planState.plans.some((plan) => plan.id === planState.activePlanId)).toBe(true);

    const settings = await loadSettings();
    expect(settings.global.locale).toBe(DEFAULT_SETTINGS.global.locale);
    expect(settings.global.theme).toBe(DEFAULT_SETTINGS.global.theme);
    expect(settings.cards.star_single.sliderHitMargin).toBe(
      DEFAULT_SETTINGS.cards.star_single.sliderHitMargin,
    );

    expect(await getTrialRecordsByCard('star_single')).toEqual([]);
    expect(await getAllProfiles()).toEqual([]);
    expect(await getDailySummaries()).toEqual([]);
    expect(await db.getAll('sessions')).toEqual([]);
    expect(await db.getAll('records')).toEqual([]);
  });
});
