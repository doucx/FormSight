import type { PlanItem, PlanTemplate, TrainingPlan } from '../types/plan';

const PLAN_STORAGE_KEY = 'formsight_custom_training_plan';

export const EMPTY_TRAINING_PLAN: TrainingPlan = {
  id: 'custom_plan',
  name: '我的自选训练流',
  items: [],
  updatedAt: Date.now(),
};

export function loadTrainingPlan(): TrainingPlan {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return EMPTY_TRAINING_PLAN;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return EMPTY_TRAINING_PLAN;
    return {
      id: parsed.id || 'custom_plan',
      name: parsed.name || '我的自选训练流',
      items: parsed.items,
      updatedAt: parsed.updatedAt || Date.now(),
    };
  } catch (e) {
    console.error('Failed to load training plan:', e);
    return EMPTY_TRAINING_PLAN;
  }
}

export function saveTrainingPlan(plan: TrainingPlan): void {
  try {
    localStorage.setItem(
      PLAN_STORAGE_KEY,
      JSON.stringify({
        ...plan,
        updatedAt: Date.now(),
      }),
    );
  } catch (e) {
    console.error('Failed to save training plan:', e);
  }
}

export function createPlanFromTemplate(template: PlanTemplate): TrainingPlan {
  const items: PlanItem[] = template.items.map((item, idx) => ({
    id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 9)}`,
    cardId: item.cardId,
    targetTrials: item.targetTrials,
  }));

  return {
    id: `plan_${template.id}`,
    name: template.name,
    items,
    updatedAt: Date.now(),
  };
}
