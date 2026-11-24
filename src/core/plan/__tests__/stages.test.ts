import { describe, expect, it } from 'vitest';
import {
  countPlanTrials,
  estimatePlanMinutes,
  isCardStage,
  isMessageStage,
  isRestStage,
  normalizePlanItems,
} from '../stages';

const legacyCard = { id: 'legacy', cardId: 'star_single', targetTrials: 10 };
const message = { id: 'm1', type: 'message', title: '标题', content: '正文' };
const rest = { id: 'r1', type: 'rest', durationSeconds: 45, allowSkip: true };

describe('plan stage normalization', () => {
  it('旧数据缺少 type 时视为卡片阶段且不产生改动', () => {
    const result = normalizePlanItems([legacyCard]);

    expect(result.changed).toBe(false);
    expect(result.items).toHaveLength(1);
    expect(isCardStage(result.items[0])).toBe(true);
  });

  it('保留文字提示与休息段，并补全休息默认值', () => {
    const result = normalizePlanItems([message, rest]);

    expect(result.changed).toBe(false);
    expect(result.items.map((item) => item.type)).toEqual(['message', 'rest']);
    expect(isMessageStage(result.items[0]) && result.items[0].content).toBe('正文');
    expect(isRestStage(result.items[1]) && result.items[1].durationSeconds).toBe(45);
  });

  it('休息段缺少 allowSkip 时补 true 并标记 changed', () => {
    const result = normalizePlanItems([{ id: 'r2', type: 'rest', durationSeconds: 30 }]);

    expect(result.changed).toBe(true);
    const [stage] = result.items;
    expect(isRestStage(stage) && stage.allowSkip).toBe(true);
  });

  it('丢弃未知类型、悬空卡片与非法元素', () => {
    const result = normalizePlanItems([
      legacyCard,
      { id: 'ghost', cardId: 'ghost_card', targetTrials: 10 },
      { id: 'x', type: 'media' },
      null,
    ]);

    expect(result.changed).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('legacy');
  });

  it('对题量与休息时长做边界收敛', () => {
    const result = normalizePlanItems([
      { id: 'a', cardId: 'color_hue', targetTrials: 9999 },
      { id: 'b', type: 'rest', durationSeconds: 99999, allowSkip: true },
    ]);

    const [card, restStage] = result.items;
    expect(isCardStage(card) && card.targetTrials).toBe(500);
    expect(isRestStage(restStage) && restStage.durationSeconds).toBe(3600);
  });

  it('补齐缺失的阶段 id', () => {
    const result = normalizePlanItems([{ cardId: 'star_single', targetTrials: 10 }]);

    expect(result.changed).toBe(true);
    expect(result.items[0].id).toMatch(/^item_/);
  });
});

describe('plan stage metrics', () => {
  const items = [
    { id: 'c1', cardId: 'star_single', targetTrials: 10 },
    { id: 'm1', type: 'message', title: 't', content: 'c' },
    { id: 'r1', type: 'rest', durationSeconds: 60, allowSkip: true },
  ] as const;

  it('题量只统计卡片阶段', () => {
    expect(countPlanTrials(normalizePlanItems(items).items)).toBe(10);
  });

  it('时长估算包含提示页与休息段，且至少 1 分钟', () => {
    // 10 题 * 3.5s + 提示 20s + 休息 60s = 115s -> 2 min
    expect(estimatePlanMinutes(normalizePlanItems(items).items)).toBe(2);
    expect(estimatePlanMinutes([])).toBe(1);
  });
});
