import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import { countPlanTrials, estimatePlanMinutes } from '../../../core/plan/stages';
import {
  exportPlanToJson,
  getPlanStorageStateSnapshot,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
} from '../../../storage/planStorage';
import {
  clonePlanAction,
  deletePlanAction,
  initPlanStore,
  setActivePlanAction,
  togglePlanFavoriteAction,
} from '../../../stores/planStore';
import { showToast } from '../../../stores/toastStore';
import type {
  MessageStageItem,
  PlanItem,
  PlanStorageState,
  RestStageItem,
  TrainingPlan,
} from '../../../types/plan';
import {
  batchUpdateItemTrials,
  createMessageStage,
  createNewBlankPlan,
  createPlanItem,
  createRestStage,
  movePlanItem,
  removePlanItem,
  reorderPlanItem,
  sanitizePlan,
  updateMessageStage,
  updatePlanItemTrials,
  updateRestStage,
} from './planItemUtils';

export interface UsePlanEditorStateOptions {
  initialPlan: TrainingPlan;
  onSave?: (plan: TrainingPlan) => void;
  onSaveAndExit?: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

export function usePlanEditorState({
  initialPlan,
  onSave,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: UsePlanEditorStateOptions) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storageState, setStorageState] = useState<PlanStorageState>(getPlanStorageStateSnapshot);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>(() =>
    sanitizePlan(initialPlan, initialPlan.name),
  );
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);

  useEffect(() => {
    loadPlanStorageState().then((state) => {
      setStorageState(state);
      const synced = state.plans.find((p) => p.id === initialPlan.id);
      if (synced) {
        setCurrentPlan((prev) =>
          prev.id === synced.id && prev.items.length !== synced.items.length ? synced : prev,
        );
      }
    });
  }, [initialPlan.id]);

  const isNewPlan = !storageState.plans.some((p) => p.id === currentPlan.id);

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
    showToast(t('plan.newPlanModeToast'), 'info');
  };

  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      target.files[0].text().then(async (text) => {
        const imported = await importPlanFromJson(text);
        if (imported) {
          const nextState = await initPlanStore();
          setStorageState(nextState);
          setCurrentPlan(imported);
          setPlanNameInput(imported.name);
          setShowPlanManager(false);
          onPlanListChanged?.();
          showToast(t('plan.importedPlanSuccessToast', { name: imported.name }), 'success');
        } else {
          showToast(t('plan.importedPlanFailToast'), 'error');
        }
      });
    }
  };

  const persist = async (): Promise<TrainingPlan> => {
    const sanitized = sanitizePlan(currentPlan, planNameInput);
    const updatedPlans = storageState.plans.some((p) => p.id === sanitized.id)
      ? storageState.plans.map((p) => (p.id === sanitized.id ? sanitized : p))
      : [sanitized, ...storageState.plans];

    await savePlanStorageState({ activePlanId: sanitized.id, plans: updatedPlans });
    await initPlanStore();
    onPlanListChanged?.();
    return sanitized;
  };

  const totalTrials = useMemo(() => countPlanTrials(currentPlan.items), [currentPlan.items]);

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
    isNewPlan,
    totalTrials,
    estimatedMin: estimatePlanMinutes(currentPlan.items),
    fileInputRef,
    handleSelectPlanFromList: async (p: TrainingPlan) => {
      setCurrentPlan({ ...p });
      setPlanNameInput(p.name);
      setIsEditingName(false);
      await setActivePlanAction(p.id);
      onPlanListChanged?.();
    },
    handleNameSave,
    handleBatchUpdateTrials: (trials: number) => {
      updatePlanItems((items) => batchUpdateItemTrials(items, trials));
      showToast(t('plan.batchSetTrialsToast', { trials }), 'info');
    },
    handleAddItem: (cardId: string) =>
      updatePlanItems((items) => [...items, createPlanItem(cardId)]),
    handleAddMessageStage: () =>
      updatePlanItems((items) => [
        ...items,
        createMessageStage(t('plan.defaultMessageTitle'), t('plan.defaultMessageContent')),
      ]),
    handleAddRestStage: () => updatePlanItems((items) => [...items, createRestStage(60)]),
    handleRemoveItem: (id: string) => updatePlanItems((items) => removePlanItem(items, id)),
    handleMoveItem: (idx: number, dir: 'up' | 'down') =>
      updatePlanItems((items) => movePlanItem(items, idx, dir)),
    handleReorderItem: (fromIdx: number, toIdx: number) =>
      updatePlanItems((items) => reorderPlanItem(items, fromIdx, toIdx)),
    handleUpdateTrials: (id: string, trials: number) =>
      updatePlanItems((items) => updatePlanItemTrials(items, id, trials)),
    handleUpdateMessageStage: (
      id: string,
      patch: Pick<MessageStageItem, 'title' | 'content'> & { actionLabel?: string },
    ) => updatePlanItems((items) => updateMessageStage(items, id, patch)),
    handleUpdateRestStage: (
      id: string,
      patch: Pick<RestStageItem, 'durationSeconds'> & {
        allowSkip?: boolean;
        tips?: string;
      },
    ) => updatePlanItems((items) => updateRestStage(items, id, patch)),
    handleClearAll: () => updatePlanItems(() => []),
    handleCreateNewBlankPlan,
    handleCloneCurrent: async () => {
      const cloned = await clonePlanAction(currentPlan);
      const nextState = await loadPlanStorageState();
      setStorageState(nextState);
      setCurrentPlan(cloned);
      setPlanNameInput(cloned.name);
      onPlanListChanged?.();
      showToast(t('plan.clonedPlanToast', { name: cloned.name }), 'success');
    },
    handleToggleFavoriteItem: async (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      const nextState = await togglePlanFavoriteAction(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        const updated = nextState.plans.find((p) => p.id === planId);
        setCurrentPlan((prev) => ({
          ...prev,
          isFavorite: updated?.isFavorite ?? !(prev.isFavorite ?? true),
        }));
      }
      onPlanListChanged?.();
    },
    handleDeletePlanItem: async (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      if (storageState.plans.length <= 1) {
        showToast(t('plan.minOnePlanToast'), 'error');
        return;
      }
      const nextState = await deletePlanAction(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        const fallback = nextState.plans[0];
        setCurrentPlan(fallback);
        setPlanNameInput(fallback.name);
      }
      onPlanListChanged?.();
      showToast(t('plan.planDeletedToast'), 'info');
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
      showToast(t('plan.exportedJsonToast'), 'success');
    },
    handleImportPlan,
    handleSaveOnly: async () => {
      const saved = await persist();
      if (onSave) {
        onSave(saved);
      } else if (onSaveAndExit) {
        onSaveAndExit(saved);
      }
    },
    handleSaveAndStart: async () => onStartPlanDirectly(await persist()),
  };
}
