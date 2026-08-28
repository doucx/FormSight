import { DEFAULT_PLAN_TEMPLATES } from '../config/planTemplates';
import { i18n } from '../core/i18n';
import type { PlanItem, PlanStorageState, PlanTemplate, TrainingPlan } from '../types/plan';

const PLANS_STORAGE_KEY = 'formsight_training_plans_store';
const LEGACY_PLAN_STORAGE_KEY = 'formsight_custom_training_plan';

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

export function loadPlanStorageState(): PlanStorageState {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.plans) && parsed.plans.length > 0) {
        const activeId = parsed.activePlanId || parsed.plans[0].id;
        return {
          activePlanId: activeId,
          plans: parsed.plans,
        };
      }
    }

    // 尝试迁移旧单计划存储
    const legacyRaw = localStorage.getItem(LEGACY_PLAN_STORAGE_KEY);
    const defaultPlans = getDefaultPlans();

    if (legacyRaw) {
      try {
        const legacyParsed = JSON.parse(legacyRaw);
        if (legacyParsed && Array.isArray(legacyParsed.items) && legacyParsed.items.length > 0) {
          const customPlan: TrainingPlan = {
            id: legacyParsed.id || `custom_${Date.now()}`,
            name: legacyParsed.name || i18n.t('common.defaultCustomPlanName'),
            description: i18n.t('common.migratedPlanDesc'),
            items: legacyParsed.items,
            isFavorite: true,
            isBuiltin: false,
            updatedAt: legacyParsed.updatedAt || Date.now(),
          };
          const state: PlanStorageState = {
            activePlanId: customPlan.id,
            plans: [customPlan, ...defaultPlans],
          };
          savePlanStorageState(state);
          return state;
        }
      } catch {}
    }

    const initialState: PlanStorageState = {
      activePlanId: defaultPlans[0]?.id || EMPTY_TRAINING_PLAN.id,
      plans: defaultPlans.length > 0 ? defaultPlans : [EMPTY_TRAINING_PLAN],
    };
    savePlanStorageState(initialState);
    return initialState;
  } catch (e) {
    console.error('Failed to load plan storage state:', e);
    const fallbackPlans = getDefaultPlans();
    return {
      activePlanId: fallbackPlans[0]?.id || EMPTY_TRAINING_PLAN.id,
      plans: fallbackPlans,
    };
  }
}

export function savePlanStorageState(state: PlanStorageState): void {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save plan storage state:', e);
  }
}

export function loadTrainingPlan(): TrainingPlan {
  const state = loadPlanStorageState();
  const active = state.plans.find((p) => p.id === state.activePlanId);
  return active || state.plans[0] || EMPTY_TRAINING_PLAN;
}

export function saveTrainingPlan(plan: TrainingPlan): void {
  const state = loadPlanStorageState();
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

  savePlanStorageState({
    activePlanId: updatedPlan.id,
    plans: newPlans,
  });
}

export function setActivePlan(planId: string): TrainingPlan | null {
  const state = loadPlanStorageState();
  const target = state.plans.find((p) => p.id === planId);
  if (!target) return null;

  savePlanStorageState({
    ...state,
    activePlanId: planId,
  });
  return target;
}

export function togglePlanFavorite(planId: string): PlanStorageState {
  const state = loadPlanStorageState();
  const newPlans = state.plans.map((p) =>
    p.id === planId ? { ...p, isFavorite: !(p.isFavorite ?? true) } : p,
  );
  const nextState = { ...state, plans: newPlans };
  savePlanStorageState(nextState);
  return nextState;
}

export function deletePlan(planId: string): PlanStorageState {
  const state = loadPlanStorageState();
  const newPlans = state.plans.filter((p) => p.id !== planId);
  const safePlans = newPlans.length > 0 ? newPlans : getDefaultPlans();
  const nextActiveId =
    state.activePlanId === planId
      ? safePlans.find((p) => p.isFavorite)?.id || safePlans[0].id
      : state.activePlanId;

  const nextState = { activePlanId: nextActiveId, plans: safePlans };
  savePlanStorageState(nextState);
  return nextState;
}

export function resetPlansToDefault(): PlanStorageState {
  const defaultPlans = getDefaultPlans();
  const initialState: PlanStorageState = {
    activePlanId: defaultPlans[0]?.id || EMPTY_TRAINING_PLAN.id,
    plans: defaultPlans.length > 0 ? defaultPlans : [EMPTY_TRAINING_PLAN],
  };
  savePlanStorageState(initialState);
  return initialState;
}

export function clonePlan(plan: TrainingPlan): TrainingPlan {
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
  saveTrainingPlan(cloned);
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

export function importPlanFromJson(jsonStr: string): TrainingPlan | null {
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

    saveTrainingPlan(importedPlan);
    return importedPlan;
  } catch (e) {
    console.error('Failed to import plan from json:', e);
    return null;
  }
}
