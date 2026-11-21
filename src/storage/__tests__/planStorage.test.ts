import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';
import { getDB } from '../db/schema';
import { loadPlanStorageState } from '../planStorage';

/**
 * 回归来源：fb1931b "实现训练计划加载时的失效卡片自愈清洗机制"
 *
 * 真实故障：历史计划中残留了已被删除 / 重命名卡片的 cardId，
 * 加载计划时直接渲染这些悬空阶段会导致训练页崩溃。
 * 修复后：loadPlanStorageState 必须过滤掉未注册卡片的阶段，
 * 并把清洗结果回写 IndexedDB，避免每次加载重复清洗。
 */

const VALID_CARD_ID = 'star_single';
const SECOND_VALID_CARD_ID = 'color_hue';
const DANGLING_CARD_ID = 'card_removed_in_future_release';

function createPlan(cardIds: string[], updatedAt = 1_700_000_000_000): TrainingPlan {
  return {
    id: 'plan_regression_1',
    name: '回归验证计划',
    description: '包含失效卡片引用的历史计划',
    items: cardIds.map((cardId, index) => ({
      id: `item_${index}`,
      cardId,
      targetTrials: 20,
    })),
    isFavorite: true,
    isBuiltin: false,
    updatedAt,
  };
}

async function seedPlan(plan: TrainingPlan): Promise<void> {
  const db = await getDB();
  await db.clear('training_plans');
  await db.clear('app_metadata');
  await db.put('training_plans', plan);
  await db.put('app_metadata', plan.id, 'active_plan_id');
}

describe('planStorage 失效卡片自愈清洗 (fb1931b)', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('training_plans');
    await db.clear('app_metadata');
  });

  it('加载计划时过滤掉未注册卡片的阶段，只保留真实存在的卡片', async () => {
    // 前置断言：确保测试用的“有效卡片”确实已注册，避免夹具本身失效
    expect(registry.getCardById(VALID_CARD_ID)).toBeDefined();
    expect(registry.getCardById(SECOND_VALID_CARD_ID)).toBeDefined();
    expect(registry.getCardById(DANGLING_CARD_ID)).toBeUndefined();

    await seedPlan(createPlan([VALID_CARD_ID, DANGLING_CARD_ID, SECOND_VALID_CARD_ID]));

    const state = await loadPlanStorageState();
    const plan = state.plans.find((p) => p.id === 'plan_regression_1');

    expect(plan).toBeDefined();
    expect(plan?.items.map((item) => item.cardId)).toEqual([VALID_CARD_ID, SECOND_VALID_CARD_ID]);
  });

  it('清洗结果必须回写 IndexedDB，避免每次加载重复清洗', async () => {
    await seedPlan(createPlan([VALID_CARD_ID, DANGLING_CARD_ID]));

    const state = await loadPlanStorageState();
    const sanitized = state.plans.find((p) => p.id === 'plan_regression_1');
    expect(sanitized?.items).toHaveLength(1);

    // savePlanStorageState 为异步回写，轮询等待持久化完成
    await vi.waitFor(async () => {
      const db = await getDB();
      const persisted = await db.get('training_plans', 'plan_regression_1');
      expect(persisted?.items.map((item) => item.cardId)).toEqual([VALID_CARD_ID]);
    });
  });

  it('全部卡片均有效时不改动计划（避免误清洗）', async () => {
    const plan = createPlan([VALID_CARD_ID, SECOND_VALID_CARD_ID], 1_600_000_000_000);
    await seedPlan(plan);

    const state = await loadPlanStorageState();
    const loaded = state.plans.find((p) => p.id === 'plan_regression_1');

    expect(loaded?.items.map((item) => item.cardId)).toEqual([VALID_CARD_ID, SECOND_VALID_CARD_ID]);
    expect(loaded?.updatedAt).toBe(plan.updatedAt);
    expect(state.activePlanId).toBe(plan.id);
  });
});
