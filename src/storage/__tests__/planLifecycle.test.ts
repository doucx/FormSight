import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { officialPlanRegistry } from '../../config/plans';
import { isCardStage } from '../../core/plan/stages';
import { registry } from '../../core/registry';
import { clearAllData } from '../../storage/db';
import {
  clonePlan,
  deletePlan,
  forkOfficialPlan,
  getDefaultPlans,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
} from '../../storage/planStorage';
import type { TrainingPlan } from '../../types/plan';

/**
 * 训练计划导入与状态机契约（G1-04 / G1-06）
 *
 * 真实失败：importPlanFromJson 不过滤未注册卡片的 cardId，
 * 与 loadPlanStorageState 的自愈路径不对称；导入返回的内存对象仍带悬空阶段。
 */

function plan(id: string, cardIds: string[]): TrainingPlan {
  return {
    id,
    name: id,
    description: '',
    items: cardIds.map((cardId, index) => ({
      id: `${id}_item_${index}`,
      cardId,
      targetTrials: 20,
    })),
    isFavorite: true,
    isBuiltin: false,
    updatedAt: 1_700_000_000_000,
  };
}

describe('训练计划导入与状态机 (G1-06)', () => {
  beforeEach(async () => {
    await clearAllData();
    expect(registry.getCardById('star_single')).toBeDefined();
    expect(registry.getCardById('ghost_card')).toBeUndefined();
  });

  it('导入计划时过滤未注册卡片，返回对象不含悬空阶段', async () => {
    const imported = await importPlanFromJson(
      JSON.stringify({
        type: 'training_plan',
        plan: {
          name: '导入计划',
          items: [
            { cardId: 'ghost_card', targetTrials: 5 },
            { cardId: 'star_single', targetTrials: 10 },
          ],
        },
      }),
    );

    expect(imported).not.toBeNull();
    expect(imported?.items.filter(isCardStage).map((item) => item.cardId)).toEqual(['star_single']);
  });

  it('全部阶段都失效时拒绝导入且不落库', async () => {
    const before = await loadPlanStorageState();

    const imported = await importPlanFromJson(
      JSON.stringify({
        type: 'training_plan',
        plan: { name: '全失效', items: [{ cardId: 'ghost_card', targetTrials: 5 }] },
      }),
    );

    expect(imported).toBeNull();
    const after = await loadPlanStorageState();
    expect(after.plans.map((p) => p.id).sort()).toEqual(before.plans.map((p) => p.id).sort());
  });

  it('加载时陈旧 activePlanId 自愈为存在的计划', async () => {
    await savePlanStorageState({
      activePlanId: 'ghost_plan',
      plans: [plan('p1', ['star_single'])],
    });

    const state = await loadPlanStorageState();

    expect(state.activePlanId).toBe('p1');
    expect(state.plans.some((p) => p.id === state.activePlanId)).toBe(true);
  });

  it('删除最后一个计划时回落默认计划且激活 id 有效', async () => {
    await savePlanStorageState({ activePlanId: 'only', plans: [plan('only', ['star_single'])] });

    await deletePlan('only');
    const state = await loadPlanStorageState();

    expect(state.plans.length).toBeGreaterThan(0);
    expect(state.plans.some((p) => p.id === state.activePlanId)).toBe(true);
  });

  it('删除激活计划时优先选择收藏计划，否则选第一个', async () => {
    const favorite = { ...plan('favorite', ['star_single']), isFavorite: true };
    const other = { ...plan('other', ['color_hue']), isFavorite: false };
    await savePlanStorageState({ activePlanId: 'other', plans: [other, favorite] });

    const state = await deletePlan('other');

    expect(state.activePlanId).toBe('favorite');
    expect(state.plans.map((p) => p.id)).toEqual(['favorite']);
  });

  it('clonePlan 生成唯一的计划 id 与阶段 id', async () => {
    const source = plan('source', ['star_single', 'color_hue']);
    await savePlanStorageState({ activePlanId: 'source', plans: [source] });

    const cloned = await clonePlan(source);
    const state = await loadPlanStorageState();

    expect(cloned.id).not.toBe(source.id);
    expect(cloned.items.map((item) => item.id)).not.toEqual(source.items.map((item) => item.id));
    expect(state.plans).toHaveLength(2);
    expect(state.activePlanId).toBe(cloned.id);
  });

  it('forkOfficialPlan 过滤未注册卡片', () => {
    const preset = {
      id: 'preset_probe',
      category: 'general' as const,
      locales: {
        'zh-CN': { name: '探针', description: '' },
        'en-US': { name: 'Probe', description: '' },
      },
      items: [
        { cardId: 'ghost_card', targetTrials: 5 },
        { cardId: 'star_single', targetTrials: 10 },
      ],
    };

    expect(
      forkOfficialPlan(preset)
        .items.filter(isCardStage)
        .map((item) => item.cardId),
    ).toEqual(['star_single']);
  });

  it('官方预置中的卡片全部已注册（防止新增卡漏注册）', () => {
    const dangling = officialPlanRegistry
      .getAllPresets()
      .flatMap((preset) => preset.items)
      .filter((item) => item.type !== 'message' && item.type !== 'rest')
      .filter((item) => !registry.getCardById(item.cardId));

    expect(dangling).toEqual([]);
  });

  it('getDefaultPlans 生成的计划激活 id 始终在计划列表内', async () => {
    const defaults = getDefaultPlans();
    await savePlanStorageState({ activePlanId: defaults[0].id, plans: defaults });

    const state = await loadPlanStorageState();
    expect(state.plans.some((p) => p.id === state.activePlanId)).toBe(true);
  });
});
