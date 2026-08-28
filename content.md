我将为你重构训练流编排系统，消解 `PlanEditorModal` 的嵌套弹窗（Modalception），将计划编辑器升级为独立的沉浸式页面（`PlanEditorView`，路由 `#/plan-editor`），并优化删除与挑选交互。

## [WIP] refactor(plan): 将训练流编辑器升级为独立沉浸式视图并消解弹窗嵌套

### 用户需求
彻底消除 `PlanEditorModal` 中“弹窗内嵌抽屉再套卡片选择器”的 Modalception 问题，提供开阔、清晰、无遮罩冲突的训练流编排与管理体验。

### 评论
训练流编排（Plan Orchestration）是一个包含“阶段排序、单阶段题量微调、卡片库检索添加、计划库切换、导入导出”等多种操作的高频多维任务。将其禁锢在限制高度的局部 Modal 弹窗内不仅导致交互层级拥挤（抽屉+弹窗叠加），而且在大脑多步决策时极易因误触遮罩导致编辑丢失。将其提升为一级独立沉浸式页面是消除体验硬伤的关键重构。

### 目标
1. **路由扩展**：在 `useHashRoute.ts` 中新增 `plan-editor` 路由，支持从 URL 直接访问与返回。
2. **新增独立编排视图**：创建 `src/views/PlanEditorView.tsx`，具备完整宽敞的响应式布局，整合名称编辑、导入导出、阶段调序与卡片挑选。
3. **优化行内删除防误触**：在计划库管理中引入行内防误触确认，无需再次触发外部弹窗。
4. **接入应用主流程**：在 `App.tsx` 中移除旧的 `PlanEditorModal` 状态，统一通过 `navigate({ type: 'plan-editor' })` 驱动。

### 基本原理
- 将原本局促在 `max-w-2xl` 弹窗内的内容转为全宽响应式页面：上方为控制流与计划库快速切换条，中间为阶段流与卡片挑选库的双列/宽幅排版。
- 页面自带未保存提示或自动保存机制，完成修改后无缝返回主页或直接启动计划，彻底消除 Modal 遮罩层叠冲突。

### 标签
#intent/refactor #flow/ready #priority/high #comp/plan #concept/navigation #scope/ux #scope/dx #ai/instruct #task/domain/plan #task/object/plan-editor #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 在路由管理器中支持 `#/plan-editor`

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~ts.old
export type RouteLocation =
  | { type: 'home'; query?: CardQueryOptions }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' };
~~~~~
~~~~~ts.new
export type RouteLocation =
  | { type: 'home'; query?: CardQueryOptions }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' }
  | { type: 'plan-editor' };
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~ts.old
  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'train' && segments[1]) {
~~~~~
~~~~~ts.new
  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'plan-editor') {
    return { type: 'plan-editor' };
  }

  if (segments[0] === 'train' && segments[1]) {
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~ts.old
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
~~~~~
~~~~~ts.new
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'plan-editor') return '#/plan-editor';
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
~~~~~

#### Acts 2: 优化计划库抽屉组件与行内删除防误触

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~tsx.old
import { Plus, Star, Trash2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import type { PlanStorageState, TrainingPlan } from '../../../types/plan';

interface PlanLibraryDrawerProps {
  storageState: PlanStorageState;
  currentPlan: TrainingPlan;
  onSelectPlan: (p: TrainingPlan) => void;
  onCreateNewBlankPlan: () => void;
  onClose: () => void;
  onToggleFavorite: (planId: string, e: MouseEvent) => void;
  onDeletePlan: (planId: string, e: MouseEvent) => void;
}

export function PlanLibraryDrawer({
  storageState,
  currentPlan,
  onSelectPlan,
  onCreateNewBlankPlan,
  onClose,
  onToggleFavorite,
  onDeletePlan,
}: PlanLibraryDrawerProps) {
  const { t } = useTranslation();

  return (
    <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">{t('plan.switchEditingPlan')}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCreateNewBlankPlan}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('plan.createNewBlankPlan')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            {t('plan.collapse')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {storageState.plans.map((p) => {
          const isActive = currentPlan.id === p.id;
          const isFav = p.isFavorite ?? true;
          const stageCount = (p.items || []).length;
          const totalTrials = (p.items || []).reduce((acc, c) => acc + c.targetTrials, 0);

          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                  : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">
                      {t('plan.officialTag')}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(p.id, e)}
                  className={`p-1 rounded-lg transition-colors ${
                    isFav
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-slate-300 hover:text-slate-500'
                  }`}
                  title={isFav ? t('common.favoritedTooltip') : t('common.unfavoritedTooltip')}
                >
                  <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={(e) => onDeletePlan(p.id, e)}
                  className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title={t('common.deletePlan')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~
~~~~~tsx.new
import { Check, Plus, Star, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { PlanStorageState, TrainingPlan } from '../../../types/plan';

interface PlanLibraryDrawerProps {
  storageState: PlanStorageState;
  currentPlan: TrainingPlan;
  onSelectPlan: (p: TrainingPlan) => void;
  onCreateNewBlankPlan: () => void;
  onClose: () => void;
  onToggleFavorite: (planId: string, e: MouseEvent) => void;
  onDeletePlan: (planId: string, e: MouseEvent) => void;
}

export function PlanLibraryDrawer({
  storageState,
  currentPlan,
  onSelectPlan,
  onCreateNewBlankPlan,
  onClose,
  onToggleFavorite,
  onDeletePlan,
}: PlanLibraryDrawerProps) {
  const { t } = useTranslation();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === planId) {
      setConfirmDeleteId(null);
      onDeletePlan(planId, e);
    } else {
      setConfirmDeleteId(planId);
      setTimeout(() => setConfirmDeleteId((prev) => (prev === planId ? null : prev)), 3000);
    }
  };

  return (
    <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-slate-700 tracking-tight">
          {t('plan.switchEditingPlan')}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCreateNewBlankPlan}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('plan.createNewBlankPlan')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            {t('plan.collapse')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
        {storageState.plans.map((p) => {
          const isActive = currentPlan.id === p.id;
          const isFav = p.isFavorite ?? true;
          const stageCount = (p.items || []).length;
          const totalTrials = (p.items || []).reduce((acc, c) => acc + c.targetTrials, 0);
          const isPendingDelete = confirmDeleteId === p.id;

          return (
            <div
              key={p.id}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-white border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-800 truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                      {t('plan.officialTag')}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(p.id, e)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isFav
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-slate-300 hover:text-slate-500'
                  }`}
                  title={isFav ? t('common.favoritedTooltip') : t('common.unfavoritedTooltip')}
                >
                  <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(p.id, e)}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isPendingDelete
                      ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                      : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title={isPendingDelete ? t('common.confirm') : t('common.deletePlan')}
                >
                  {isPendingDelete ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

#### Acts 3: 创建全新独立全屏计划编排视图 `PlanEditorView`

~~~~~act
write_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~tsx
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Edit3,
  Layers,
  Play,
  Save,
  Sparkles,
  Upload,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { CardPickerPanel } from '../components/plan/editor/CardPickerPanel';
import { PlanLibraryDrawer } from '../components/plan/editor/PlanLibraryDrawer';
import { PlanStageList } from '../components/plan/editor/PlanStageList';
import { useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { PlanItem, PlanStorageState, TrainingPlan } from '../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../utils/planStorage';

interface PlanEditorViewProps {
  initialPlan: TrainingPlan;
  onExit: () => void;
  onSaveAndExit: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

const TRIAL_PRESETS = [10, 15, 20, 30, 50];

export function PlanEditorView({
  initialPlan,
  onExit,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: PlanEditorViewProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const isNewPlan = !storageState.plans.some((p) => p.id === currentPlan.id);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 2500);
  };

  const handleSelectPlanFromList = (p: TrainingPlan) => {
    setCurrentPlan({ ...p });
    setPlanNameInput(p.name);
    setIsEditingName(false);
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

  const handleBatchUpdateTrials = (trials: number) => {
    setCurrentPlan((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, targetTrials: trials })),
    }));
    showToast(t('plan.batchSetTrialsToast', { trials }));
  };

  const handleAddItem = (cardId: string) => {
    const newItem: PlanItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      cardId,
      targetTrials: 20,
    };
    setCurrentPlan((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleRemoveItem = (id: string) => {
    setCurrentPlan((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentPlan.items.length) return;

    const newItems = [...currentPlan.items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    setCurrentPlan((prev) => ({ ...prev, items: newItems }));
  };

  const handleUpdateTrials = (id: string, trials: number) => {
    setCurrentPlan((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, targetTrials: Math.max(5, trials) } : item,
      ),
    }));
  };

  const handleClearAll = () => {
    setCurrentPlan((prev) => ({ ...prev, items: [] }));
  };

  const handleCreateNewBlankPlan = () => {
    const newBlank: TrainingPlan = {
      id: `custom_plan_${Date.now()}`,
      name: t('plan.newBlankPlan'),
      description: t('common.defaultCustomPlanDesc'),
      items: [],
      isFavorite: true,
      isBuiltin: false,
      updatedAt: Date.now(),
    };
    setCurrentPlan(newBlank);
    setPlanNameInput(newBlank.name);
    setIsEditingName(true);
    setIsAddingCard(true);
    setShowPlanManager(false);
    showToast(t('plan.newPlanModeToast'));
  };

  const handleCloneCurrent = () => {
    const cloned = clonePlan(currentPlan);
    const nextState = loadPlanStorageState();
    setStorageState(nextState);
    setCurrentPlan(cloned);
    setPlanNameInput(cloned.name);
    onPlanListChanged?.();
    showToast(t('plan.clonedPlanToast', { name: cloned.name }));
  };

  const handleToggleFavoriteItem = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    const nextState = togglePlanFavorite(planId);
    setStorageState(nextState);
    if (currentPlan.id === planId) {
      setCurrentPlan((prev) => ({ ...prev, isFavorite: !(prev.isFavorite ?? true) }));
    }
    onPlanListChanged?.();
  };

  const handleDeletePlanItem = (planId: string, e: MouseEvent) => {
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
  };

  const handleExportPlan = () => {
    const jsonStr = exportPlanToJson(currentPlan);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('plan.exportedJsonToast'));
  };

  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      file.text().then((text) => {
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

  const sanitizeAndPersist = (): TrainingPlan => {
    const sanitizedPlan: TrainingPlan = {
      ...currentPlan,
      name: planNameInput.trim() || currentPlan.name,
      items: currentPlan.items.filter((item) => Boolean(registry.getCardById(item.cardId))),
      updatedAt: Date.now(),
    };

    const updatedPlans = storageState.plans.some((p) => p.id === sanitizedPlan.id)
      ? storageState.plans.map((p) => (p.id === sanitizedPlan.id ? sanitizedPlan : p))
      : [sanitizedPlan, ...storageState.plans];

    savePlanStorageState({
      activePlanId: sanitizedPlan.id,
      plans: updatedPlans,
    });

    onPlanListChanged?.();
    return sanitizedPlan;
  };

  const handleSaveOnly = () => {
    const saved = sanitizeAndPersist();
    onSaveAndExit(saved);
  };

  const handleSaveAndStart = () => {
    const saved = sanitizeAndPersist();
    onStartPlanDirectly(saved);
  };

  const validPlanItems = currentPlan.items.filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 顶部主操作栏 */}
      <header className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.exit')}
          </button>
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 w-full max-w-sm">
                <input
                  type="text"
                  value={planNameInput}
                  onInput={(e) => setPlanNameInput((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') {
                      setPlanNameInput(currentPlan.name);
                      setIsEditingName(false);
                    }
                  }}
                  maxLength={32}
                  className="w-full px-3 py-1.5 text-sm font-black text-slate-800 bg-slate-50 border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder={t('plan.nameInputPlaceholder')}
                />
                <button
                  type="button"
                  onClick={handleNameSave}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                  title={t('common.confirm')}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 truncate tracking-tight">
                  {currentPlan.name}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                  title={t('plan.renameTitle')}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {isNewPlan ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex-shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {t('common.newPlanBadge')}
                  </span>
                ) : currentPlan.isBuiltin ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 flex-shrink-0">
                    {t('common.officialBadge')}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* 右侧全局操作区 */}
        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowPlanManager(!showPlanManager)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showPlanManager
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title={t('plan.switchAndManageTitle')}
          >
            <Layers className="w-3.5 h-3.5" />
            {t('plan.planLibraryTitle', { count: storageState.plans.length })}
          </button>

          <button
            type="button"
            onClick={handleCloneCurrent}
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title={t('plan.cloneCopyTitle')}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportPlan}
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title={t('plan.exportJsonTitle')}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title={t('plan.importJsonTitle')}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportPlan}
            className="hidden"
          />

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={handleSaveOnly}
            disabled={currentPlan.items.length === 0}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {t('common.save')}
          </button>

          <button
            type="button"
            onClick={handleSaveAndStart}
            disabled={currentPlan.items.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {t('plan.startPlan')}
          </button>
        </div>
      </header>

      {toastNotice && (
        <div className="w-full text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-2xl animate-in fade-in">
          {toastNotice}
        </div>
      )}

      {/* 展开的计划库总览抽屉 */}
      {showPlanManager && (
        <PlanLibraryDrawer
          storageState={storageState}
          currentPlan={currentPlan}
          onSelectPlan={handleSelectPlanFromList}
          onCreateNewBlankPlan={handleCreateNewBlankPlan}
          onClose={() => setShowPlanManager(false)}
          onToggleFavorite={handleToggleFavoriteItem}
          onDeletePlan={handleDeletePlanItem}
        />
      )}

      {/* 核心双列/响应式编排区 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧/上半部：已编排的阶段序列与调序 */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <PlanStageList
            currentPlan={currentPlan}
            totalTrials={totalTrials}
            estimatedMin={estimatedMin}
            trialPresets={TRIAL_PRESETS}
            onBatchUpdateTrials={handleBatchUpdateTrials}
            onClearAll={handleClearAll}
            onUpdateTrials={handleUpdateTrials}
            onMoveItem={handleMoveItem}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        {/* 右侧/下半部：模块添加与搜索挑选区 */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <CardPickerPanel
            isAddingCard={isAddingCard || currentPlan.items.length === 0}
            onToggleAdding={setIsAddingCard}
            onAddItem={handleAddItem}
          />
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 在 `App.tsx` 中集成 `PlanEditorView` 并清理 Modal 弹窗代码

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { i18n, useTranslation } from './core/i18n';
import { registry } from './core/registry';
import { type RouteLocation, useHashRoute } from './hooks/useHashRoute';
import { useTodayStats } from './hooks/useTodayStats';
import type { TrainingPlan } from './types/plan';
import { type UnifiedProfileData, repository } from './utils/db/index';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  saveTrainingPlan,
  setActivePlan,
} from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanTrainingView } from './views/PlanTrainingView';

export function App() {
  const { t } = useTranslation();
  const { route, navigate } = useHashRoute();
  const { todayStats, refreshTodayStats } = useTodayStats();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);
~~~~~
~~~~~tsx.new
import { i18n, useTranslation } from './core/i18n';
import { registry } from './core/registry';
import { type RouteLocation, useHashRoute } from './hooks/useHashRoute';
import { useTodayStats } from './hooks/useTodayStats';
import type { TrainingPlan } from './types/plan';
import { type UnifiedProfileData, repository } from './utils/db/index';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  saveTrainingPlan,
  setActivePlan,
} from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanEditorView } from './views/PlanEditorView';
import { PlanTrainingView } from './views/PlanTrainingView';

export function App() {
  const { t } = useTranslation();
  const { route, navigate } = useHashRoute();
  const { todayStats, refreshTodayStats } = useTodayStats();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
~~~~~
~~~~~tsx.new
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => setIsPlanEditorOpen(true)}
          onSelectPlan={handleSelectPlanOnHome}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'plan-train' && (
        <PlanTrainingView
          plan={trainingPlan}
          settings={settings}
          onExit={async () => {
            await refreshProfiles();
            navigate(lastHomeRouteRef.current);
          }}
        />
      )}
~~~~~
~~~~~tsx.new
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => navigate({ type: 'plan-editor' })}
          onSelectPlan={handleSelectPlanOnHome}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'plan-editor' && (
        <PlanEditorView
          initialPlan={trainingPlan}
          onExit={() => navigate(lastHomeRouteRef.current)}
          onPlanListChanged={refreshProfiles}
          onSaveAndExit={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRouteRef.current);
          }}
          onStartPlanDirectly={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            navigate({ type: 'plan-train' });
          }}
        />
      )}

      {route.type === 'plan-train' && (
        <PlanTrainingView
          plan={trainingPlan}
          settings={settings}
          onExit={async () => {
            await refreshProfiles();
            navigate(lastHomeRouteRef.current);
          }}
        />
      )}
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
      {activeAnalyticsCard && (
        <WeaknessAnalyticsModal
          card={activeAnalyticsCard}
          onClose={() => setActiveAnalyticsCardId(null)}
        />
      )}

      {isPlanEditorOpen && (
        <PlanEditorModal
          initialPlan={trainingPlan}
          onClose={() => setIsPlanEditorOpen(false)}
          onPlanListChanged={refreshProfiles}
          onSave={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            showToast(t('common.planUpdatedToast'), 'success');
          }}
        />
      )}
    </div>
  );
}
~~~~~
~~~~~tsx.new
      {activeAnalyticsCard && (
        <WeaknessAnalyticsModal
          card={activeAnalyticsCard}
          onClose={() => setActiveAnalyticsCardId(null)}
        />
      )}
    </div>
  );
}
~~~~~

#### Acts 5: 删除已被替代的冗余 `PlanEditorModal.tsx` 文件

~~~~~act
delete_file
src/components/plan/PlanEditorModal.tsx
~~~~~

### 下一步建议
1. **代码检查**：执行 `npm run check` 验证路由类型定义与编译情况。
2. **继续实施 P1 项**：重构首页 `FilterEngine.tsx`，将学术化标签折叠并引入基于直观训练目标的分类切换器。
