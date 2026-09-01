import { computed, signal } from '@preact/signals';
import {
  EMPTY_TRAINING_PLAN,
  clonePlan as clonePlanFromStorage,
  deletePlan as deletePlanFromStorage,
  loadPlanStorageState,
  resetPlansToDefault as resetPlansFromStorage,
  savePlanStorageState,
  togglePlanFavorite as toggleFavoriteFromStorage,
} from '../storage/planStorage';
import type { PlanStorageState, TrainingPlan } from '../types/plan';

export const $allPlans = signal<TrainingPlan[]>([]);
export const $activePlanId = signal<string>(EMPTY_TRAINING_PLAN.id);

export const $activePlan = computed<TrainingPlan>(() => {
  return (
    $allPlans.value.find((p) => p.id === $activePlanId.value) ||
    $allPlans.value[0] ||
    EMPTY_TRAINING_PLAN
  );
});

export const $favoritePlans = computed<TrainingPlan[]>(() => {
  return $allPlans.value.filter((p) => p.isFavorite ?? true);
});

export async function initPlanStore(): Promise<PlanStorageState> {
  const state = await loadPlanStorageState();
  $allPlans.value = state.plans;
  $activePlanId.value = state.activePlanId;
  return state;
}

export async function setActivePlanAction(planId: string): Promise<TrainingPlan | null> {
  const target = $allPlans.value.find((p) => p.id === planId);
  if (!target) return null;

  $activePlanId.value = planId;
  await savePlanStorageState({
    activePlanId: planId,
    plans: $allPlans.value,
  });
  return target;
}

export async function savePlanAction(plan: TrainingPlan): Promise<TrainingPlan> {
  const index = $allPlans.value.findIndex((p) => p.id === plan.id);
  const updatedPlan: TrainingPlan = {
    ...plan,
    updatedAt: Date.now(),
  };

  let nextPlans: TrainingPlan[];
  if (index >= 0) {
    nextPlans = [...$allPlans.value];
    nextPlans[index] = updatedPlan;
  } else {
    nextPlans = [updatedPlan, ...$allPlans.value];
  }

  $allPlans.value = nextPlans;
  $activePlanId.value = updatedPlan.id;

  await savePlanStorageState({
    activePlanId: updatedPlan.id,
    plans: nextPlans,
  });
  return updatedPlan;
}

export async function togglePlanFavoriteAction(planId: string): Promise<void> {
  const nextState = await toggleFavoriteFromStorage(planId);
  $allPlans.value = nextState.plans;
  $activePlanId.value = nextState.activePlanId;
}

export async function deletePlanAction(planId: string): Promise<void> {
  const nextState = await deletePlanFromStorage(planId);
  $allPlans.value = nextState.plans;
  $activePlanId.value = nextState.activePlanId;
}

export async function resetPlansAction(): Promise<void> {
  const nextState = await resetPlansFromStorage();
  $allPlans.value = nextState.plans;
  $activePlanId.value = nextState.activePlanId;
}

export async function clonePlanAction(plan: TrainingPlan): Promise<TrainingPlan> {
  const cloned = await clonePlanFromStorage(plan);
  const nextState = await loadPlanStorageState();
  $allPlans.value = nextState.plans;
  $activePlanId.value = cloned.id;
  return cloned;
}