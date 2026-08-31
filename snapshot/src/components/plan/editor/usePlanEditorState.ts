import { useMemo, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { PlanItem, PlanStorageState, TrainingPlan } from '../../../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../../../storage/planStorage';
import {
  batchUpdateItemTrials,
  createNewBlankPlan,
  createPlanItem,
  movePlanItem,
  removePlanItem,
  sanitizePlan,
  updatePlanItemTrials,
} from './planItemUtils';

export interface UsePlanEditorStateOptions {
  initialPlan: TrainingPlan;
  onSaveAndExit: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

export function usePlanEditorState({
  initialPlan,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: UsePlanEditorStateOptions) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const isNewPlan = !storageState.plans.some((p) => p.id === currentPlan.id);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 2500);
  };

  const updatePlanItems = (updater: (items: PlanItem[]) => PlanItem[]) => {
    setCurrentPlan((prev) => ({ ...prev, items: updater(prev.items) }));
  };

  const handleNameSave = () => {
    const trimmed = planNameInput.trim();
    if (!trimmed) {
      setPlanNameInput(currentPlan.name);
    } else {
      setCurrentPlan((prev) => ({ ...prev, name: trimmed }));
    }
    setIsEditingName(false);
  };

  const handleCreateNewBlankPlan = () => {
    const newBlank = createNewBlankPlan(t('plan.newBlankPlan'), t('common.defaultCustomPlanDesc'));
    setCurrentPlan(newBlank);
    setPlanNameInput(newBlank.name);
    setIsEditingName(true);
    setShowPlanManager(false);
    showToast(t('plan.newPlanModeToast'));
  };

  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      target.files[0].text().then((text) => {
        const imported = importPlanFromJson(text);
        if (imported) {
          const nextState = loadPlanStorageState();
          setStorageState(nextState);
          setCurrentPlan(imported);
          setPlanNameInput(imported.name);
          setShowPlanManager(false);
          onPlanListChanged?.();
          showToast(t('plan.importedPlanSuccessToast', { name: imported.name }));
        } else {
          showToast(t('plan.importedPlanFailToast'));
        }
      });
    }
  };

  const persist = (): TrainingPlan => {
    const sanitized = sanitizePlan(currentPlan, planNameInput);
    const updatedPlans = storageState.plans.some((p) => p.id === sanitized.id)
      ? storageState.plans.map((p) => (p.id === sanitized.id ? sanitized : p))
      : [sanitized, ...storageState.plans];

    savePlanStorageState({ activePlanId: sanitized.id, plans: updatedPlans });
    onPlanListChanged?.();
    return sanitized;
  };

  const totalTrials = useMemo(
    () => currentPlan.items.reduce((acc, curr) => acc + curr.targetTrials, 0),
    [currentPlan.items],
  );

  return {
    storageState,
    setStorageState,
    currentPlan,
    setCurrentPlan,
    isEditingName,
    setIsEditingName,
    planNameInput,
    setPlanNameInput,
    showPlanManager,
    setShowPlanManager,
    toastNotice,
    isNewPlan,
    totalTrials,
    estimatedMin: Math.max(1, Math.round((totalTrials * 3.5) / 60)),
    fileInputRef,
    handleSelectPlanFromList: (p: TrainingPlan) => {
      setCurrentPlan({ ...p });
      setPlanNameInput(p.name);
      setIsEditingName(false);
    },
    handleNameSave,
    handleBatchUpdateTrials: (trials: number) => {
      updatePlanItems((items) => batchUpdateItemTrials(items, trials));
      showToast(t('plan.batchSetTrialsToast', { trials }));
    },
    handleAddItem: (cardId: string) =>
      updatePlanItems((items) => [...items, createPlanItem(cardId)]),
    handleRemoveItem: (id: string) => updatePlanItems((items) => removePlanItem(items, id)),
    handleMoveItem: (idx: number, dir: 'up' | 'down') =>
      updatePlanItems((items) => movePlanItem(items, idx, dir)),
    handleUpdateTrials: (id: string, trials: number) =>
      updatePlanItems((items) => updatePlanItemTrials(items, id, trials)),
    handleClearAll: () => updatePlanItems(() => []),
    handleCreateNewBlankPlan,
    handleCloneCurrent: () => {
      const cloned = clonePlan(currentPlan);
      const nextState = loadPlanStorageState();
      setStorageState(nextState);
      setCurrentPlan(cloned);
      setPlanNameInput(cloned.name);
      onPlanListChanged?.();
      showToast(t('plan.clonedPlanToast', { name: cloned.name }));
    },
    handleToggleFavoriteItem: (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      const nextState = togglePlanFavorite(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        setCurrentPlan((prev) => ({ ...prev, isFavorite: !(prev.isFavorite ?? true) }));
      }
      onPlanListChanged?.();
    },
    handleDeletePlanItem: (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      if (storageState.plans.length <= 1) {
        showToast(t('plan.minOnePlanToast'));
        return;
      }
      const nextState = deletePlan(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        const fallback = nextState.plans[0];
        setCurrentPlan(fallback);
        setPlanNameInput(fallback.name);
      }
      onPlanListChanged?.();
      showToast(t('plan.planDeletedToast'));
    },
    handleExportPlan: () => {
      const jsonStr = exportPlanToJson(currentPlan);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('plan.exportedJsonToast'));
    },
    handleImportPlan,
    handleSaveOnly: () => onSaveAndExit(persist()),
    handleSaveAndStart: () => onStartPlanDirectly(persist()),
  };
}
