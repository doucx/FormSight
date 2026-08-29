我们将从评分最高（64.2）、复杂度最集中的首要上帝组件 **`PlanEditorView.tsx`** 开始进行 P0 级重构实施。

本次实施将：
1. 抽离 **`usePlanEditorState`** 自定义 Hook，彻底收敛计划编排的数据流、草稿变更、持久化及导入导出逻辑；
2. 抽离 **`PlanEditorHeader`** 头部操作组件（包含重命名、桌面操作组、移动端下拉菜单）；
3. 将 **`PlanEditorView.tsx`** 精简为纯粹的响应式布局容器（代码量从 532 行降至 ~100 行）。

## [WIP] refactor: 重构拆分 PlanEditorView 上帝组件与状态逻辑

### 用户需求
对代码库中复杂度最高、函数过多的上帝文件 `PlanEditorView.tsx`（SLOC: 532, 19 个函数）进行模块化解耦与重构，提高代码可读性与可维护性。

### 评论
`PlanEditorView` 承担了过多非展示层职责（文件 I/O、本地存储同步、草稿暂存、重命名判定、移动端菜单等），通过将状态逻辑下沉到独立 Hook 并将头部操作栏组件化，能大幅提升模块内聚性并消除上帝组件坏味道。

### 目标
1. 新建 `src/components/plan/editor/usePlanEditorState.ts` 集中管理计划编排的所有状态与动作。
2. 新建 `src/components/plan/editor/PlanEditorHeader.tsx` 封装顶部操作栏、重命名及移动端快捷菜单。
3. 重写 `src/views/PlanEditorView.tsx`，使其仅负责双列与移动端响应式布局拼装。

### 基本原理
遵循单一职责原则（SRP）与关注点分离（SoC）。视图组件仅负责响应式布局编排，状态机与持久化逻辑由 Hook 统一调度，桌面与移动端的操作交互收敛于头部组件中。

### 标签
#intent/refine #flow/ready #priority/high #comp/views #concept/ui #scope/core #scope/dx #ai/delegate #task/domain/refactoring #task/object/god-files #task/action/modularization #task/state/begin

---

### Script

#### Acts 1: 创建 `usePlanEditorState` 状态与逻辑 Hook

新建计划编辑器专属 Hook，收敛所有状态、操作处理函数与导入导出逻辑。

~~~~~act
write_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript
import { useMemo, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { PlanItem, PlanStorageState, TrainingPlan } from '../../../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../../../utils/planStorage';

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

  const validPlanItems = useMemo(
    () => currentPlan.items.filter((item) => Boolean(registry.getCardById(item.cardId))),
    [currentPlan.items],
  );

  const totalTrials = useMemo(
    () => validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0),
    [validPlanItems],
  );

  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

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
    validPlanItems,
    totalTrials,
    estimatedMin,
    fileInputRef,
    handleSelectPlanFromList,
    handleNameSave,
    handleBatchUpdateTrials,
    handleAddItem,
    handleRemoveItem,
    handleMoveItem,
    handleUpdateTrials,
    handleClearAll,
    handleCreateNewBlankPlan,
    handleCloneCurrent,
    handleToggleFavoriteItem,
    handleDeletePlanItem,
    handleExportPlan,
    handleImportPlan,
    handleSaveOnly,
    handleSaveAndStart,
  };
}
~~~~~

#### Acts 2: 创建 `PlanEditorHeader` 头部操作与菜单组件

新建头部操作栏组件，负责计划重命名、操作按钮、文件导入选择器以及移动端折叠菜单。

~~~~~act
write_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~typescript
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Edit3,
  Layers,
  MoreHorizontal,
  Play,
  Save,
  Sparkles,
  Upload,
} from 'lucide-preact';
import type { RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { TrainingPlan } from '../../../types/plan';

export interface PlanEditorHeaderProps {
  currentPlan: TrainingPlan;
  isNewPlan: boolean;
  isEditingName: boolean;
  planNameInput: string;
  showPlanManager: boolean;
  plansCount: number;
  fileInputRef: RefObject<HTMLInputElement>;
  onExit: () => void;
  onStartEditingName: () => void;
  onCancelEditingName: () => void;
  onPlanNameChange: (name: string) => void;
  onNameSave: () => void;
  onTogglePlanManager: () => void;
  onClonePlan: () => void;
  onExportPlan: () => void;
  onImportPlan: (e: Event) => void;
  onSaveOnly: () => void;
  onSaveAndStart: () => void;
}

export function PlanEditorHeader({
  currentPlan,
  isNewPlan,
  isEditingName,
  planNameInput,
  showPlanManager,
  plansCount,
  fileInputRef,
  onExit,
  onStartEditingName,
  onCancelEditingName,
  onPlanNameChange,
  onNameSave,
  onTogglePlanManager,
  onClonePlan,
  onExportPlan,
  onImportPlan,
  onSaveOnly,
  onSaveAndStart,
}: PlanEditorHeaderProps) {
  const { t } = useTranslation();
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState<boolean>(false);

  useEffect(() => {
    if (!showMobileMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMobileMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileMoreMenu]);

  return (
    <header className="w-full bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 flex-shrink-0">
      {/* 左侧：返回与计划名 */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onExit}
          className="p-2 sm:px-3 sm:py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
          title={t('common.exit')}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('common.exit')}</span>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block flex-shrink-0" />

        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-1 w-full max-w-xs">
              <input
                type="text"
                value={planNameInput}
                onInput={(e) => onPlanNameChange((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onNameSave();
                  if (e.key === 'Escape') onCancelEditingName();
                }}
                maxLength={32}
                className="w-full px-2.5 py-1 text-xs sm:text-sm font-black text-slate-800 bg-slate-50 border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder={t('plan.nameInputPlaceholder')}
              />
              <button
                type="button"
                onClick={onNameSave}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                title={t('common.confirm')}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-sm sm:text-lg font-black text-slate-900 truncate tracking-tight">
                {currentPlan.name}
              </h1>
              <button
                type="button"
                onClick={onStartEditingName}
                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                title={t('plan.renameTitle')}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              {isNewPlan ? (
                <span className="hidden sm:inline-flex text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex-shrink-0 items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('common.newPlanBadge')}
                </span>
              ) : currentPlan.isBuiltin ? (
                <span className="hidden sm:inline-flex text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 flex-shrink-0">
                  {t('common.officialBadge')}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：桌面端平铺操作 & 移动端收纳操作 */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* 桌面端平铺操作区 */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlanManager}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showPlanManager
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title={t('plan.switchAndManageTitle')}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('plan.planLibraryTitle', { count: plansCount })}</span>
          </button>

          <button
            type="button"
            onClick={onClonePlan}
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title={t('plan.cloneCopyTitle')}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExportPlan}
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

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onSaveOnly}
            disabled={currentPlan.items.length === 0}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('common.save')}</span>
          </button>
        </div>

        {/* 移动端更多操作弹层菜单 */}
        <div ref={moreMenuRef} className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
            className="p-2 text-slate-600 bg-slate-50 border border-slate-200 rounded-xl transition-all active:scale-95"
            title={t('common.settings')}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMobileMoreMenu && (
            <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onTogglePlanManager();
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 text-left"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('plan.libraryBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onClonePlan();
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 text-left"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('plan.cloneBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onExportPlan();
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 text-left"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('plan.exportBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  fileInputRef.current?.click();
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 text-left"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('plan.importBtn')}</span>
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onSaveOnly();
                }}
                disabled={currentPlan.items.length === 0}
                className="w-full px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center gap-2 text-left disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('common.save')}</span>
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImportPlan}
          className="hidden"
        />

        {/* 统一开始训练主 CTA */}
        <button
          type="button"
          onClick={onSaveAndStart}
          disabled={currentPlan.items.length === 0}
          className="px-3.5 py-2 sm:px-4 sm:py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t('plan.startPlan')}</span>
        </button>
      </div>
    </header>
  );
}
~~~~~

#### Acts 3: 重写 `PlanEditorView.tsx` 为纯粹的清晰布局视图

重写 `src/views/PlanEditorView.tsx`，使用 `usePlanEditorState` 和 `PlanEditorHeader` 装配视图。

~~~~~act
write_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~typescript
import { ListOrdered, Sparkles } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { CardPickerPanel } from '../components/plan/editor/CardPickerPanel';
import { PlanEditorHeader } from '../components/plan/editor/PlanEditorHeader';
import { PlanLibraryDrawer } from '../components/plan/editor/PlanLibraryDrawer';
import { PlanStageList } from '../components/plan/editor/PlanStageList';
import { usePlanEditorState } from '../components/plan/editor/usePlanEditorState';
import { useTranslation } from '../core/i18n';
import type { TrainingPlan } from '../types/plan';

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
  const [mobileTab, setMobileTab] = useState<'stages' | 'picker'>(
    initialPlan.items.length === 0 ? 'picker' : 'stages',
  );

  const {
    storageState,
    currentPlan,
    isEditingName,
    setIsEditingName,
    planNameInput,
    setPlanNameInput,
    showPlanManager,
    setShowPlanManager,
    toastNotice,
    isNewPlan,
    totalTrials,
    estimatedMin,
    fileInputRef,
    handleSelectPlanFromList,
    handleNameSave,
    handleBatchUpdateTrials,
    handleAddItem,
    handleRemoveItem,
    handleMoveItem,
    handleUpdateTrials,
    handleClearAll,
    handleCreateNewBlankPlan,
    handleCloneCurrent,
    handleToggleFavoriteItem,
    handleDeletePlanItem,
    handleExportPlan,
    handleImportPlan,
    handleSaveOnly,
    handleSaveAndStart,
  } = usePlanEditorState({
    initialPlan,
    onSaveAndExit,
    onStartPlanDirectly,
    onPlanListChanged,
  });

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col h-[calc(100dvh-2rem)] sm:h-[calc(100vh-4rem)] gap-3 sm:gap-5 animate-in fade-in duration-200">
      {/* 顶部单行主操作栏 */}
      <PlanEditorHeader
        currentPlan={currentPlan}
        isNewPlan={isNewPlan}
        isEditingName={isEditingName}
        planNameInput={planNameInput}
        showPlanManager={showPlanManager}
        plansCount={storageState.plans.length}
        fileInputRef={fileInputRef}
        onExit={onExit}
        onStartEditingName={() => setIsEditingName(true)}
        onCancelEditingName={() => {
          setPlanNameInput(currentPlan.name);
          setIsEditingName(false);
        }}
        onPlanNameChange={setPlanNameInput}
        onNameSave={handleNameSave}
        onTogglePlanManager={() => setShowPlanManager(!showPlanManager)}
        onClonePlan={handleCloneCurrent}
        onExportPlan={handleExportPlan}
        onImportPlan={handleImportPlan}
        onSaveOnly={handleSaveOnly}
        onSaveAndStart={handleSaveAndStart}
      />

      {toastNotice && (
        <div className="w-full text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl animate-in fade-in flex-shrink-0">
          {toastNotice}
        </div>
      )}

      {/* 展开的计划库总览抽屉 */}
      {showPlanManager && (
        <div className="flex-shrink-0">
          <PlanLibraryDrawer
            storageState={storageState}
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlanFromList}
            onCreateNewBlankPlan={() => {
              handleCreateNewBlankPlan();
              setMobileTab('picker');
            }}
            onClose={() => setShowPlanManager(false)}
            onToggleFavorite={handleToggleFavoriteItem}
            onDeletePlan={handleDeletePlanItem}
          />
        </div>
      )}

      {/* 移动端专属：双 Tab 切换栏 (只在 < lg 时渲染) */}
      <div className="flex lg:hidden items-center bg-slate-100 p-1 rounded-2xl flex-shrink-0 border border-slate-200/60">
        <button
          type="button"
          onClick={() => setMobileTab('stages')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'stages'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>{t('plan.stageCount', { count: currentPlan.items.length })}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('picker')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'picker'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('plan.selectCardPrompt')}</span>
        </button>
      </div>

      {/* 核心双列/响应式编排区 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 min-h-0 items-stretch overflow-hidden">
        {/* 左侧：已编排的阶段序列 */}
        <div
          className={`lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col min-h-0 overflow-hidden ${
            mobileTab === 'stages' ? 'flex' : 'hidden lg:flex'
          }`}
        >
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

        {/* 右侧：模块添加与搜索挑选区 */}
        <div
          className={`lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col min-h-0 overflow-hidden ${
            mobileTab === 'picker' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <CardPickerPanel
            addedCardIds={currentPlan.items.map((it) => it.cardId)}
            onAddItem={handleAddItem}
          />
        </div>
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
1. 运行 `npm run check` 校验类型检查与 Biome 代码格式。
2. 重新运行 `python3 scripts/check_god_files.py` 观察 `PlanEditorView.tsx` 指数是否已从 64.2 下降至绿色安全区间。
3. 接着进入下一个 P0 目标：重构拆分 `GlobalSettingsModal.tsx`（常规偏好与高危数据治理两段式拆解）。
