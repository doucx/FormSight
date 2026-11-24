import type { CardStageItem, MessageStageItem, PlanItem, RestStageItem } from '../../types/plan';
import { registry } from '../registry';

export const DEFAULT_CARD_TRIALS = 20;
export const DEFAULT_REST_SECONDS = 60;
export const MIN_REST_SECONDS = 10;
export const MAX_REST_SECONDS = 3600;
export const MAX_CARD_TRIALS = 500;

const SECONDS_PER_TRIAL = 3.5;
const SECONDS_PER_MESSAGE_STAGE = 20;

export function isCardStage(item: PlanItem): item is CardStageItem {
  return item.type === undefined || item.type === 'card';
}

export function isMessageStage(item: PlanItem): item is MessageStageItem {
  return item.type === 'message';
}

export function isRestStage(item: PlanItem): item is RestStageItem {
  return item.type === 'rest';
}

export function getPlanCardStages(items: PlanItem[]): CardStageItem[] {
  return items.filter(isCardStage);
}

export function countPlanTrials(items: PlanItem[]): number {
  return getPlanCardStages(items).reduce((acc, item) => acc + item.targetTrials, 0);
}

/**
 * 估算训练流时长：卡片按 3.5s/题，提示页按 20s，休息段按配置秒数。
 */
export function estimatePlanMinutes(items: PlanItem[]): number {
  const seconds = items.reduce((acc, item) => {
    if (isCardStage(item)) return acc + item.targetTrials * SECONDS_PER_TRIAL;
    if (isRestStage(item)) return acc + item.durationSeconds;
    return acc + SECONDS_PER_MESSAGE_STAGE;
  }, 0);
  return Math.max(1, Math.round(seconds / 60));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createStageId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface PlanItemsNormalization {
  items: PlanItem[];
  /** 输入中存在被丢弃或补全默认值的阶段时为 true，调用方可据此决定是否回写。 */
  changed: boolean;
}

/**
 * 将持久化 / 导入的未知阶段数据归一化为 PlanItem。
 * 旧数据没有 `type` 时视为卡片阶段；未知类型直接丢弃。
 */
export function normalizePlanItems(rawItems: unknown): PlanItemsNormalization {
  if (!Array.isArray(rawItems)) return { items: [], changed: rawItems !== undefined };

  const items: PlanItem[] = [];
  let changed = false;

  for (const raw of rawItems) {
    const normalized = normalizePlanItem(raw);
    if (!normalized) {
      changed = true;
      continue;
    }
    if (normalized.changed) changed = true;
    items.push(normalized.item);
  }

  return { items, changed };
}

interface NormalizedPlanItem {
  item: PlanItem;
  changed: boolean;
}

function normalizeId(raw: Record<string, unknown>): { id: string; changed: boolean } {
  if (typeof raw.id === 'string') {
    const trimmed = raw.id.trim();
    if (trimmed) return { id: trimmed, changed: trimmed !== raw.id };
  }
  return { id: createStageId(), changed: true };
}

function normalizePlanItem(raw: unknown): NormalizedPlanItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const record = raw as Record<string, unknown>;
  const { id, changed: idChanged } = normalizeId(record);
  const type = record.type;

  if (type === 'message') {
    const hasTitle = typeof record.title === 'string';
    const hasContent = typeof record.content === 'string';
    if (!hasTitle && !hasContent) return null;

    const title = hasTitle ? (record.title as string) : '';
    const content = hasContent ? (record.content as string) : '';
    const actionLabel =
      typeof record.actionLabel === 'string' && record.actionLabel.trim()
        ? record.actionLabel
        : undefined;

    return {
      item: { id, type: 'message', title, content, actionLabel },
      changed: idChanged || !hasTitle || !hasContent || actionLabel !== record.actionLabel,
    };
  }

  if (type === 'rest') {
    const rawDuration = record.durationSeconds;
    const hasValidDuration = typeof rawDuration === 'number' && Number.isFinite(rawDuration);
    const durationSeconds = hasValidDuration
      ? clamp(Math.round(rawDuration), MIN_REST_SECONDS, MAX_REST_SECONDS)
      : DEFAULT_REST_SECONDS;
    const allowSkip = typeof record.allowSkip === 'boolean' ? record.allowSkip : true;
    const tips = typeof record.tips === 'string' && record.tips.trim() ? record.tips : undefined;

    return {
      item: { id, type: 'rest', durationSeconds, allowSkip, tips },
      changed:
        idChanged ||
        !hasValidDuration ||
        durationSeconds !== rawDuration ||
        allowSkip !== record.allowSkip ||
        tips !== record.tips,
    };
  }

  if (type !== undefined && type !== 'card') return null;

  const cardId = record.cardId;
  if (typeof cardId !== 'string' || !registry.getCardById(cardId)) return null;

  const rawTrials = record.targetTrials;
  const hasValidTrials = typeof rawTrials === 'number' && Number.isFinite(rawTrials);
  const targetTrials = hasValidTrials
    ? clamp(Math.round(rawTrials), 1, MAX_CARD_TRIALS)
    : DEFAULT_CARD_TRIALS;

  return {
    item: { id, cardId, targetTrials },
    changed: idChanged || !hasValidTrials || targetTrials !== rawTrials,
  };
}
