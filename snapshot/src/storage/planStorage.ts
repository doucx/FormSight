import { DEFAULT_PLAN_TEMPLATES } from '../config/planTemplates';
import { i18n } from '../core/i18n';
import type { PlanItem, PlanStorageState, PlanTemplate, TrainingPlan } from '../types/plan';
import { getDB } from './db/schema';

export const EMPTY_TRAINING_PLAN: TrainingPlan = {
  id: 'custom_plan_default',
  name: i18n.t('common.defaultCustomPlanName'),
  description: i18n.t('common.defaultCustomPlanDesc'),
  items: [],
  isFavorite: true,
  isBuiltin: false,
  updatedAt: Date.now(),
};

function createPlanFromTemplateInternal(
  template: PlanTemplate,
  isBuiltin = false,
  isFavorite = true,
): TrainingPlan {
  const items: PlanItem[] = template.items.map((item, idx) => ({
    id: `item_${template.id}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    cardId: item.cardId,
    targetTrials: item.targetTrials,
  }));

  const templateName = i18n.t(`templates.${template.id}.name`) || template.name;
  const templateDesc = i18n.t(`templates.${template.id}.desc`) || template.description;

  return {
    id: `plan_${template.id}`,
    name: templateName,
    description: templateDesc,
    items,
    isFavorite,
    isBuiltin,
    updatedAt: Date.now(),
  };
}

export function getDefaultPlans(): TrainingPlan[] {
  return DEFAULT_PLAN_TEMPLATES.map((tmpl) => createPlanFromTemplateInternal(tmpl, true, true));
}

let cachedPlanState: PlanStorageState = {
  activePlanId: EMPTY_TRAINING_PLAN.id,
  plans: [EMPTY_TRAINING_PLAN],
};

/**
 * 异步从 IndexedDB 加载全部训练计划与激活计划状态
 */
export async function loadPlanStorageState(): Promise<PlanStorageState> {
  try {
    const db = await getDB();
    const plans = await db.getAll('training_plans');
    let activePlanId = (await db.get('app_metadata', 'active_plan_id')) as string | undefined;

    if (!plans || plans.length === 0) {
      const defaultPlans = getDefaultPlans();
      const tx = db.transaction(['training_plans', 'app_metadata'], 'readwrite');
      const planStore = tx.objectStore('training_plans');
      for (const p of defaultPlans) {
        await planStore.put(p);
      }
      activePlanId = defaultPlans[0]?.id || EMPTY_TRAINING_PLAN.id;
      await tx.objectStore('app_metadata').put(activePlanId, 'active_plan_id');
      await tx.done;

      cachedPlanState = {
        activePlanId,
        plans: defaultPlans,
      };
      return cachedPlanState;
    }

    if (!activePlanId || !plans.some((p) => p.id === activePlanId)) {
      activePlanId = plans[0].id;
      await db.put('app_metadata', activePlanId, 'active_plan_id');
    }

    cachedPlanState = {
      activePlanId,
      plans,
    };
    return cachedPlanState;
  } catch (e) {
    console.error('Failed to load plans from IndexedDB:', e);
    return cachedPlanState;
  }
}

export function getPlanStorageStateSnapshot(): PlanStorageState {
  return cachedPlanState;
}

export async function savePlanStorageState(state: PlanStorageState): Promise<void> {
  cachedPlanState = state;
  try {
    const db = await getDB();
    const tx = db.transaction(['training_plans', 'app_metadata'], 'readwrite');
    const planStore = tx.objectStore('training_plans');
    await planStore.clear();
    for (const p of state.plans) {
      await planStore.put(p);
    }
    await tx.objectStore('app_metadata').put(state.activePlanId, 'active_plan_id');
    await tx.done;
  } catch (e) {
    console.error('Failed to save plan storage state to IndexedDB:', e);
  }
}

export async function loadTrainingPlan(): Promise<TrainingPlan> {
  const state = await loadPlanStorageState();
  const active = state.plans.find((p) => p.id === state.activePlanId);
  return active || state.plans[0] || EMPTY_TRAINING_PLAN;
}

export async function saveTrainingPlan(plan: TrainingPlan): Promise<void> {
  const state = await loadPlanStorageState();
  const index = state.plans.findIndex((p) => p.id === plan.id);
  const updatedPlan: TrainingPlan = {
    ...plan,
    updatedAt: Date.now(),
  };

  let newPlans: TrainingPlan[];
  if (index >= 0) {
    newPlans = [...state.plans];
    newPlans[index] = updatedPlan;
  } else {
    newPlans = [updatedPlan, ...state.plans];
  }

  await savePlanStorageState({
    activePlanId: updatedPlan.id,
    plans: newPlans,
  });
}

export async function setActivePlan(planId: string): Promise<TrainingPlan | null> {
  const state = await loadPlanStorageState();
  const target = state.plans.find((p) => p.id === planId);
  if (!target) return null;

  await savePlanStorageState({
    ...state,
    activePlanId: planId,
  });
  return target;
}

export async function togglePlanFavorite(planId: string): Promise<PlanStorageState> {
  const state = await loadPlanStorageState();
  const newPlans = state.plans.map((p) =>
    p.id === planId ? { ...p, isFavorite: !(p.isFavorite ?? true) } : p,
  );
  const nextState = { ...state, plans: newPlans };
  await savePlanStorageState(nextState);
  return nextState;
}

export async function deletePlan(planId: string): Promise<PlanStorageState> {
  const state = await loadPlanStorageState();
  const newPlans = state.plans.filter((p) => p.id !== planId);
  const safePlans = newPlans.length > 0 ? newPlans : getDefaultPlans();
  const nextActiveId =
    state.activePlanId === planId
      ? safePlans.find((p) => p.isFavorite)?.id || safePlans[0].id
      : state.activePlanId;

  const nextState = { activePlanId: nextActiveId, plans: safePlans };
  await savePlanStorageState(nextState);
  return nextState;
}

export async function resetPlansToDefault(): Promise<PlanStorageState> {
  const defaultPlans = getDefaultPlans();
  const initialState: PlanStorageState = {
    activePlanId: defaultPlans[0]?.id || EMPTY_TRAINING_PLAN.id,
    plans: defaultPlans.length > 0 ? defaultPlans : [EMPTY_TRAINING_PLAN],
  };
  await savePlanStorageState(initialState);
  return initialState;
}

export async function clonePlan(plan: TrainingPlan): Promise<TrainingPlan> {
  const newId = `plan_copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cloned: TrainingPlan = {
    ...plan,
    id: newId,
    name: `${plan.name} (${i18n.t('common.copySuffix')})`,
    isBuiltin: false,
    isFavorite: true,
    items: plan.items.map((item) => ({
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    })),
    updatedAt: Date.now(),
  };
  await saveTrainingPlan(cloned);
  return cloned;
}

export function exportPlanToJson(plan: TrainingPlan): string {
  return JSON.stringify(
    {
      appName: 'FormSight',
      type: 'training_plan',
      version: 1,
      exportedAt: new Date().toISOString(),
      plan: {
        name: plan.name,
        description: plan.description,
        items: plan.items.map((item) => ({
          cardId: item.cardId,
          targetTrials: item.targetTrials,
        })),
      },
    },
    null,
    2,
  );
}

export async function importPlanFromJson(jsonStr: string): Promise<TrainingPlan | null> {
  try {
    const data = JSON.parse(jsonStr);
    const planData = data.plan || data;
    if (!planData || !Array.isArray(planData.items) || planData.items.length === 0) {
      return null;
    }

    const newId = `plan_imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const importedPlan: TrainingPlan = {
      id: newId,
      name: planData.name
        ? `${planData.name} (${i18n.t('common.importedSuffix')})`
        : i18n.t('common.importedPlanDesc'),
      description: planData.description || i18n.t('common.importedPlanDesc'),
      isFavorite: true,
      isBuiltin: false,
      items: planData.items.map((item: { cardId: string; targetTrials?: number }) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        cardId: item.cardId,
        targetTrials: item.targetTrials || 20,
      })),
      updatedAt: Date.now(),
    };

    await saveTrainingPlan(importedPlan);
    return importedPlan;
  } catch (e) {
    console.error('Failed to import plan from json:', e);
    return null;
  }
}
