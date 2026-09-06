用户在计划库中点击收藏（或切换收藏）后，今日工作台无法即时同步更新，根本原因是计划编辑器组件内部的收藏切换操作（`handleToggleFavoriteItem`）以及删除、切换等操作直接调用了底层的 IndexedDB 存取函数，而没有同步更新 `@preact/signals` 的全局响应式状态 `$allPlans` 和 `$activePlanId`；同时 `AppRouter` 传入的 `onPlanListChanged` 仅刷新了答题与能力档案，未重新同步计划 Store。这导致今日工作台持有的始终是旧的计划列表引用，必须刷新页面重新执行 `main.tsx` 的 `initPlanStore` 才能获取最新数据。

我已制定修复方案，将操作链路全面接入 `planStore` 的响应式 Actions，并在计划变动时同步刷新全局信号状态，实现无需刷新页面的毫秒级即时联动。

## [WIP] fix: 同步计划库收藏及选择状态到全局响应式 Store 以即时更新今日工作台

### 错误分析

1. **状态流脱节**：在 `src/components/plan/editor/usePlanEditorState.ts` 中，`handleToggleFavoriteItem` 直接调用了 `storage/planStorage.ts` 的 `togglePlanFavorite`，仅更新了 IndexedDB，而未触发 `src/stores/planStore.ts` 中的 `$allPlans` 和 `$activePlanId` 信号更新。
2. **回调未覆盖计划 Store**：在 `src/components/routing/AppRouter.tsx` 中，传递给 `PlanEditorView` 的 `onPlanListChanged` 回调仅调用了 `refreshAppData`（更新 profiles 和 summaries），遗漏了对 `initPlanStore` 的调用。
3. **主页被动滞后**：今日工作台（`HomeView`）依赖 `$allPlans` 和 `$activePlan` 计算今日展示的计划及多重收藏下拉选择菜单（`favoritePlans`），由于全局信号未发射变化通知，主页无法感知变更，必须手动刷新整个页面重新执行应用初始化逻辑。

### 用户需求

在「计划中心 / 计划库 - 切换正在编辑的训练计划」抽屉中，点击计划卡片的「已收藏 / 收藏」图标或切换计划后，今日工作台（HomeView）应当无需手动刷新页面，立即实时感知并同步更新展示最新的已收藏训练计划与下拉切换菜单。

### 评论

这是一个关键的响应式状态一致性体验问题。由于 FormSight 采用了轻量且高性能的 Preact Signals 状态架构，数据持久化层（IndexedDB）与响应式信号层（Signals）之间必须保持严格的单向或双向绑定同步，避免任何脱离 Store 独立修改存储导致“UI 幽灵滞后”的缺陷。

### 目标

1. 在 `src/stores/planStore.ts` 中，让 `togglePlanFavoriteAction` 与 `deletePlanAction` 返回最新的 `PlanStorageState`，便于调用方消费。
2. 在 `src/components/plan/editor/usePlanEditorState.ts` 中，将 `handleToggleFavoriteItem`、`handleDeletePlanItem`、`handleCloneCurrent`、`handleSelectPlanFromList` 以及 `persist` 全面接入 `planStore` 的响应式动作或状态同步，确保用户操作时立即触发 `$allPlans` 与 `$activePlanId` 变更。
3. 在 `src/components/routing/AppRouter.tsx` 中，将 `onPlanListChanged` 拓展为同时刷新计划 Store（`initPlanStore`）与用户档案（`refreshAppData`）。

### 基本原理

通过将 `usePlanEditorState` 中的数据变更动作从直接调用底层持久层函数迁移至调用 `planStore` 导出的 Action（如 `togglePlanFavoriteAction`、`setActivePlanAction` 等），在更新 IndexedDB 的同时直接驱动 `$allPlans` 和 `$activePlanId` 信号赋值。依赖该信号的 `HomeView` 和 `PlanHeroCard` 将在同一事件循环帧内被自动触发重渲染，实现零刷新无缝更新。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/ux #ai/instruct #task/domain/ui #task/object/plan-store-sync #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 优化 planStore 的 Action 返回值并支持外部同步

修改 `src/stores/planStore.ts`，让 `togglePlanFavoriteAction` 和 `deletePlanAction` 返回更新后的 `PlanStorageState`。

~~~~~act
patch_file
src/stores/planStore.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
export async function togglePlanFavoriteAction(planId: string): Promise<PlanStorageState> {
  const nextState = await toggleFavoriteFromStorage(planId);
  $allPlans.value = nextState.plans;
  $activePlanId.value = nextState.activePlanId;
  return nextState;
}

export async function deletePlanAction(planId: string): Promise<PlanStorageState> {
  const nextState = await deletePlanFromStorage(planId);
  $allPlans.value = nextState.plans;
  $activePlanId.value = nextState.activePlanId;
  return nextState;
}
~~~~~

#### Acts 2: 修复 usePlanEditorState 中的响应式同步逻辑

在 `src/components/plan/editor/usePlanEditorState.ts` 中接入 `planStore` 的响应式 Actions，确保收藏切换、选择计划、复制、删除与导入均能实时反映到全局 Store。

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  getPlanStorageStateSnapshot,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../../../storage/planStorage';
import { showToast } from '../../../stores/toastStore';
import type { PlanItem, PlanStorageState, TrainingPlan } from '../../../types/plan';
~~~~~
~~~~~typescript
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
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
import type { PlanItem, PlanStorageState, TrainingPlan } from '../../../types/plan';
~~~~~

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript
  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      target.files[0].text().then(async (text) => {
        const imported = await importPlanFromJson(text);
        if (imported) {
          const nextState = await loadPlanStorageState();
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
    onPlanListChanged?.();
    return sanitized;
  };
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript
    fileInputRef,
    handleSelectPlanFromList: (p: TrainingPlan) => {
      setCurrentPlan({ ...p });
      setPlanNameInput(p.name);
      setIsEditingName(false);
    },
    handleNameSave,
    handleBatchUpdateTrials: (trials: number) => {
      updatePlanItems((items) => batchUpdateItemTrials(items, trials));
      showToast(t('plan.batchSetTrialsToast', { trials }), 'info');
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
    handleCloneCurrent: async () => {
      const cloned = await clonePlan(currentPlan);
      const nextState = await loadPlanStorageState();
      setStorageState(nextState);
      setCurrentPlan(cloned);
      setPlanNameInput(cloned.name);
      onPlanListChanged?.();
      showToast(t('plan.clonedPlanToast', { name: cloned.name }), 'success');
    },
    handleToggleFavoriteItem: async (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      const nextState = await togglePlanFavorite(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        setCurrentPlan((prev) => ({ ...prev, isFavorite: !(prev.isFavorite ?? true) }));
      }
      onPlanListChanged?.();
    },
    handleDeletePlanItem: async (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      if (storageState.plans.length <= 1) {
        showToast(t('plan.minOnePlanToast'), 'error');
        return;
      }
      const nextState = await deletePlan(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        const fallback = nextState.plans[0];
        setCurrentPlan(fallback);
        setPlanNameInput(fallback.name);
      }
      onPlanListChanged?.();
      showToast(t('plan.planDeletedToast'), 'info');
    },
~~~~~
~~~~~typescript
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
    handleRemoveItem: (id: string) => updatePlanItems((items) => removePlanItem(items, id)),
    handleMoveItem: (idx: number, dir: 'up' | 'down') =>
      updatePlanItems((items) => movePlanItem(items, idx, dir)),
    handleUpdateTrials: (id: string, trials: number) =>
      updatePlanItems((items) => updatePlanItemTrials(items, id, trials)),
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
~~~~~

#### Acts 3: 在 AppRouter 中连接全量计划重新加载

修改 `src/components/routing/AppRouter.tsx`，确保 `onPlanListChanged` 同时执行 `initPlanStore()` 和 `refreshAppData()`。

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
import {
  $activePlan,
  $allPlans,
  savePlanAction,
  setActivePlanAction,
} from '../../stores/planStore';
~~~~~
~~~~~typescript
import {
  $activePlan,
  $allPlans,
  initPlanStore,
  savePlanAction,
  setActivePlanAction,
} from '../../stores/planStore';
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
    if (route.type === 'plan-editor') {
      return (
        <PlanEditorView
          initialPlan={currentPlan}
          onExit={() => navigate(lastHomeRoute)}
          onNavigateToOfficialPlans={() => navigate({ type: 'official-plans' })}
          onPlanListChanged={refreshAppData}
          onSaveAndExit={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRoute);
          }}
          onStartPlanDirectly={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            navigate({ type: 'plan-train' });
          }}
        />
      );
    }
~~~~~
~~~~~typescript
    if (route.type === 'plan-editor') {
      return (
        <PlanEditorView
          initialPlan={currentPlan}
          onExit={() => navigate(lastHomeRoute)}
          onNavigateToOfficialPlans={() => navigate({ type: 'official-plans' })}
          onPlanListChanged={async () => {
            await Promise.all([initPlanStore(), refreshAppData()]);
          }}
          onSaveAndExit={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRoute);
          }}
          onStartPlanDirectly={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            navigate({ type: 'plan-train' });
          }}
        />
      );
    }
~~~~~

### 下一步建议

1. **测试与验证**：在应用中进入「计划中心」，展开「计划库」，针对任一计划点击收藏星星，然后切回「今日工作台」，验证工作台顶部的计划 Hero 卡片与快捷下拉切换菜单是否已无需刷新页面即可实时更新。
2. **提交代码**：验证无误后，可以生成相应的 `[COMMIT]` 计划将此次状态响应式重构正式纳入版本控制。
