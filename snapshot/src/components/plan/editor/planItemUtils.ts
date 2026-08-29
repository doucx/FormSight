import { registry } from '../../../core/registry';
import type { PlanItem, TrainingPlan } from '../../../types/plan';

export function createPlanItem(cardId: string): PlanItem {
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    cardId,
    targetTrials: 20,
  };
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

export function updatePlanItemTrials(
  items: PlanItem[],
  id: string,
  trials: number,
): PlanItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, targetTrials: Math.max(5, trials) } : item,
  );
}

export function batchUpdateItemTrials(items: PlanItem[], trials: number): PlanItem[] {
  return items.map((item) => ({ ...item, targetTrials: trials }));
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
    items: plan.items.filter((item) => Boolean(registry.getCardById(item.cardId))),
    updatedAt: Date.now(),
  };
}