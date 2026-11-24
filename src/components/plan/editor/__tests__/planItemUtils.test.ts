import { describe, expect, it } from 'vitest';
import { isCardStage, isMessageStage, isRestStage } from '../../../../core/plan/stages';
import type { PlanItem } from '../../../../types/plan';
import {
  batchUpdateItemTrials,
  createMessageStage,
  createRestStage,
  sanitizePlan,
  updateMessageStage,
  updateRestStage,
} from '../planItemUtils';

const items: PlanItem[] = [
  { id: 'c1', cardId: 'star_single', targetTrials: 10 },
  { id: 'm1', type: 'message', title: '旧标题', content: '旧正文' },
  { id: 'r1', type: 'rest', durationSeconds: 60, allowSkip: true },
];

describe('plan editor item utils', () => {
  it('批量改题量只影响卡片阶段，不污染 message/rest 字段', () => {
    const updated = batchUpdateItemTrials(items, 30);

    expect(isCardStage(updated[0]) && updated[0].targetTrials).toBe(30);
    expect(updated[1]).toEqual(items[1]);
    expect(updated[2]).toEqual(items[2]);
    expect('targetTrials' in updated[1]).toBe(false);
    expect('targetTrials' in updated[2]).toBe(false);
  });

  it('创建提示页与休息段时生成独立 id 与类型标记', () => {
    const message = createMessageStage('标题', '正文');
    const rest = createRestStage(90);

    expect(isMessageStage(message)).toBe(true);
    expect(message.id).toMatch(/^item_/);
    expect(isRestStage(rest)).toBe(true);
    expect(rest.durationSeconds).toBe(90);
    expect(rest.allowSkip).toBe(true);
    expect(message.id).not.toBe(rest.id);
  });

  it('按 id 更新提示页内容，其他阶段保持不变', () => {
    const updated = updateMessageStage(items, 'm1', {
      title: '新标题',
      content: '新正文',
      actionLabel: '出发',
    });

    expect(isMessageStage(updated[1]) && updated[1].title).toBe('新标题');
    expect(isMessageStage(updated[1]) && updated[1].actionLabel).toBe('出发');
    expect(updated[0]).toEqual(items[0]);
  });

  it('按 id 更新休息段时长与跳过设置', () => {
    const updated = updateRestStage(items, 'r1', { durationSeconds: 120, allowSkip: false });

    expect(isRestStage(updated[2]) && updated[2].durationSeconds).toBe(120);
    expect(isRestStage(updated[2]) && updated[2].allowSkip).toBe(false);
  });

  it('保存清洗保留 message/rest，只移除悬空卡片', () => {
    const sanitized = sanitizePlan(
      {
        id: 'p',
        name: 'p',
        items: [...items, { id: 'ghost', cardId: 'ghost_card', targetTrials: 10 }],
        updatedAt: 1,
      },
      'p',
    );

    expect(sanitized.items.map((item) => item.id)).toEqual(['c1', 'm1', 'r1']);
    expect(sanitized.items.some((item) => isMessageStage(item))).toBe(true);
    expect(sanitized.items.some((item) => isRestStage(item))).toBe(true);
  });
});
