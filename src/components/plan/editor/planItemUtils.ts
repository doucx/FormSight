import { isCardStage, normalizePlanItems } from '../../../core/plan/stages';
import type { MessageStageItem, PlanItem, RestStageItem, TrainingPlan } from '../../../types/plan';

function createStageId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createPlanItem(cardId: string): PlanItem {
  return {
    id: createStageId(),
    cardId,
    targetTrials: 20,
  };
}

export function createMessageStage(title: string, content: string): MessageStageItem {
  return {
    id: createStageId(),
    type: 'message',
    title,
    content,
  };
}

export function createRestStage(durationSeconds = 60): RestStageItem {
  return {
    id: createStageId(),
    type: 'rest',
    durationSeconds,
    allowSkip: true,
  };
}

export function updateMessageStage(
  items: PlanItem[],
  id: string,
  patch: Partial<Pick<MessageStageItem, 'title' | 'content' | 'actionLabel'>>,
): PlanItem[] {
  return items.map((item) =>
    item.id === id && item.type === 'message' ? { ...item, ...patch } : item,
  );
}

export function updateRestStage(
  items: PlanItem[],
  id: string,
  patch: Partial<Pick<RestStageItem, 'durationSeconds' | 'allowSkip' | 'tips'>>,
): PlanItem[] {
  return items.map((item) =>
    item.id === id && item.type === 'rest' ? { ...item, ...patch } : item,
  );
}

export function removePlanItem(items: PlanItem[], id: string): PlanItem[] {
  return items.filter((item) => item.id !== id);
}

export function movePlanItem(
  items: PlanItem[],
  index: number,
  direction: 'up' | 'down',
): PlanItem[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const newItems = [...items];
  const [moved] = newItems.splice(index, 1);
  newItems.splice(targetIndex, 0, moved);
  return newItems;
}

export function reorderPlanItem(items: PlanItem[], fromIndex: number, toIndex: number): PlanItem[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length
  ) {
    return items;
  }

  const newItems = [...items];
  const [moved] = newItems.splice(fromIndex, 1);
  newItems.splice(toIndex, 0, moved);
  return newItems;
}

export function updatePlanItemTrials(items: PlanItem[], id: string, trials: number): PlanItem[] {
  return items.map((item) =>
    item.id === id && isCardStage(item) ? { ...item, targetTrials: Math.max(5, trials) } : item,
  );
}

export function batchUpdateItemTrials(items: PlanItem[], trials: number): PlanItem[] {
  return items.map((item) => (isCardStage(item) ? { ...item, targetTrials: trials } : item));
}

export function createNewBlankPlan(name: string, desc: string): TrainingPlan {
  return {
    id: `custom_plan_${Date.now()}`,
    name,
    description: desc,
    items: [],
    isFavorite: true,
    isBuiltin: false,
    updatedAt: Date.now(),
  };
}

export function sanitizePlan(plan: TrainingPlan, nameInput: string): TrainingPlan {
  return {
    ...plan,
    name: nameInput.trim() || plan.name,
    items: normalizePlanItems(plan.items).items,
    updatedAt: Date.now(),
  };
}
