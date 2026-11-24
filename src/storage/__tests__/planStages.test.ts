import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { newbieTour } from '../../config/plans/presets/newbieTour';
import { isCardStage, isMessageStage, isRestStage } from '../../core/plan/stages';
import type { TrainingPlan } from '../../types/plan';
import { clearAllData } from '../db';
import {
  exportPlanToJson,
  forkOfficialPlan,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
} from '../planStorage';

/**
 * 多类型阶段管道（文字提示 / 休息段）的持久化与导入导出契约。
 *
 * 真实风险：旧的自愈逻辑只识别 cardId，会把 message/rest 阶段当成
 * 悬空卡片删除；导出/导入 JSON 若只序列化 cardId，也会静默丢失新阶段。
 */

function plan(items: TrainingPlan['items']): TrainingPlan {
  return {
    id: 'plan_stage_types',
    name: '阶段类型验证',
    description: '',
    items,
    isFavorite: true,
    isBuiltin: false,
    updatedAt: 1_700_000_000_000,
  };
}

describe('多类型阶段持久化与导入导出', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('加载计划时保留提示页与休息段，只清理悬空卡片', async () => {
    await savePlanStorageState({
      activePlanId: 'plan_stage_types',
      plans: [
        plan([
          { id: 'card_ok', cardId: 'star_single', targetTrials: 10 },
          { id: 'message_ok', type: 'message', title: '提示', content: '正文' },
          { id: 'rest_ok', type: 'rest', durationSeconds: 90, allowSkip: true },
          { id: 'card_ghost', cardId: 'ghost_card', targetTrials: 10 },
        ]),
      ],
    });

    const state = await loadPlanStorageState();
    const loaded = state.plans.find((p) => p.id === 'plan_stage_types');

    expect(loaded?.items).toHaveLength(3);
    expect(loaded?.items.map((item) => item.id)).toEqual(['card_ok', 'message_ok', 'rest_ok']);
    expect(loaded?.items.some((item) => isMessageStage(item))).toBe(true);
    expect(loaded?.items.some((item) => isRestStage(item))).toBe(true);
  });

  it('导出 JSON 保留 message/rest 字段，导入后不回退为卡片', async () => {
    const source = plan([
      { id: 'card_ok', cardId: 'star_single', targetTrials: 10 },
      {
        id: 'message_ok',
        type: 'message',
        title: '领域过渡',
        content: '**色彩** 阶段',
        actionLabel: '开始',
      },
      { id: 'rest_ok', type: 'rest', durationSeconds: 45, allowSkip: false, tips: '远眺' },
    ]);

    const exported = JSON.parse(exportPlanToJson(source));
    expect(exported.version).toBe(2);
    expect(exported.plan.items).toEqual([
      { cardId: 'star_single', targetTrials: 10 },
      { type: 'message', title: '领域过渡', content: '**色彩** 阶段', actionLabel: '开始' },
      { type: 'rest', durationSeconds: 45, allowSkip: false, tips: '远眺' },
    ]);

    const imported = await importPlanFromJson(JSON.stringify(exported));

    expect(imported).not.toBeNull();
    expect(imported?.items).toHaveLength(3);
    expect(imported?.items.some((item) => isMessageStage(item))).toBe(true);
    expect(imported?.items.some((item) => isRestStage(item))).toBe(true);
    expect(imported?.items.filter(isCardStage).map((item) => item.cardId)).toEqual(['star_single']);
  });

  it('导入时丢弃无法识别的阶段而不是整份拒绝', async () => {
    const imported = await importPlanFromJson(
      JSON.stringify({
        type: 'training_plan',
        plan: {
          name: '混合阶段',
          items: [
            { cardId: 'star_single', targetTrials: 10 },
            { type: 'media', src: 'x' },
            { type: 'message', title: '仍保留', content: '' },
          ],
        },
      }),
    );

    expect(imported?.items).toHaveLength(2);
    expect(imported?.items.some((item) => isMessageStage(item))).toBe(true);
  });

  it('官方新手演示计划包含提示、休息与卡片三类阶段', () => {
    const forked = forkOfficialPlan(newbieTour, 'zh-CN');

    expect(forked.items.some((item) => isMessageStage(item))).toBe(true);
    expect(forked.items.some((item) => isRestStage(item))).toBe(true);
    expect(forked.items.filter(isCardStage).length).toBeGreaterThanOrEqual(3);

    for (const item of forked.items) {
      if (isMessageStage(item)) {
        expect(item.title).not.toBe('plan.newbie.welcomeTitle');
        expect(item.content.length).toBeGreaterThan(0);
      }
      if (isRestStage(item)) {
        expect(item.durationSeconds).toBeGreaterThan(0);
      }
    }
  });
});
