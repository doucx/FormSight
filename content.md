我将为你生成一个包含阶段一（计划重命名、多计划存储与收藏管理、主页快速切换）与阶段二（批量题量调整、单阶段跳过、单计划 JSON 导入导出）的完整升级实施计划。

## [WIP] feat: 实现多训练计划管理、收藏切换、批量题量调整与阶段跳过

### 用户需求
1. 允许用户自定义/修改训练计划名称。
2. 扩展训练计划存储为多计划列表，默认内置并收藏官方科学预设，支持用户对任意计划进行收藏、取消收藏、新建、复制与删除。
3. 在主页 Hero 卡片提供已收藏计划的快速切换能力。
4. 在计划编辑器中支持批量统一设置题量以及单计划的 JSON 导入与导出。
5. 在训练流执行界面顶部增加“跳过当前阶段”功能，增强训练心流控制弹性。

### 评论
该重构将训练计划从单一临时草稿状态升级为完整的“个人计划库与收藏夹”体系，极大地提升了用户对日常训练流的组织管理效率与多场景适配度（如晨间热身、睡前色感、周末大形专项），同时保持了轻量无侵入的本地存储与数据兼容。

### 目标
1. 扩展 `src/types/plan.ts`，为 `TrainingPlan` 补充 `isFavorite`、`isBuiltin`、`description` 等元数据。
2. 升级 `src/utils/planStorage.ts`，建立完整的多计划存储机制，自动迁移旧单计划并内置默认官方计划，提供增删改查、收藏切换、复制及独立 JSON 导入导出工具函数。
3. 重构 `src/components/plan/PlanEditorModal.tsx`，支持名称修改、批量题量设置、多计划库管理抽屉、计划导入与导出。
4. 增强 `src/components/plan/PlanHeroCard.tsx`，支持在已收藏计划间快速切换。
5. 优化 `src/views/PlanTrainingView.tsx`，增加单阶段跳过支持。
6. 适配 `src/utils/db/importExport.ts`、`src/views/Home.tsx` 与 `src/app.tsx` 的全局数据联动与持久化。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #comp/ui #scope/ux #scope/dx #ai/instruct #task/domain/plan #task/object/plan-library-system #task/action/build #task/state/begin

---

### Script

#### Acts 1: 扩展训练计划类型定义

升级 `src/types/plan.ts`，增加计划元数据与存储状态结构。

~~~~~act
write_file
src/types/plan.ts
~~~~~
~~~~~typescript
export interface PlanItem {
  id: string; // 阶段唯一 ID (用于渲染与排序 key)
  cardId: string; // 目标卡片 ID (如 'star_single', 'color_hue')
  targetTrials: number; // 本阶段目标题量
}

export interface TrainingPlan {
  id: string;
  name: string;
  description?: string;
  items: PlanItem[];
  isFavorite?: boolean;
  isBuiltin?: boolean;
  updatedAt: number;
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  badge?: string;
  items: Omit<PlanItem, 'id'>[];
}

export interface PlanStorageState {
  activePlanId: string;
  plans: TrainingPlan[];
}
~~~~~

#### Acts 2: 升级计划存储与管理逻辑

重写 `src/utils/planStorage.ts`，实现多计划存储、官方预设初始化、增删改查、收藏管理及导入导出。

~~~~~act
write_file
src/utils/planStorage.ts
~~~~~
~~~~~typescript
import { DEFAULT_PLAN_TEMPLATES } from '../config/planTemplates';
import type { PlanItem, PlanStorageState, PlanTemplate, TrainingPlan } from '../types/plan';

const PLANS_STORAGE_KEY = 'formsight_training_plans_store';
const LEGACY_PLAN_STORAGE_KEY = 'formsight_custom_training_plan';

export const EMPTY_TRAINING_PLAN: TrainingPlan = {
  id: 'custom_plan_default',
  name: '我的自选训练流',
  description: '自定义编排的日常多模块训练序列',
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

  return {
    id: `plan_${template.id}`,
    name: template.name,
    description: template.description,
    items,
    isFavorite,
    isBuiltin,
    updatedAt: Date.now(),
  };
}

export function createPlanFromTemplate(template: PlanTemplate): TrainingPlan {
  return createPlanFromTemplateInternal(template, false, true);
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
            name: legacyParsed.name || '我的自选训练流',
            description: '从旧版本迁移的自定义训练流',
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
    // 兼容旧接口读取
    const active = state.plans.find((p) => p.id === state.activePlanId) || state.plans[0];
    if (active) {
      localStorage.setItem(LEGACY_PLAN_STORAGE_KEY, JSON.stringify(active));
    }
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

export function clonePlan(plan: TrainingPlan): TrainingPlan {
  const newId = `plan_copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cloned: TrainingPlan = {
    ...plan,
    id: newId,
    name: `${plan.name} (副本)`,
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
      name: planData.name ? `${planData.name} (导入)` : '导入的训练流',
      description: planData.description || '从外部 JSON 导入的训练流',
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
~~~~~

#### Acts 3: 重构计划编排编辑器组件

全面重写 `src/components/plan/PlanEditorModal.tsx`，加入计划名称修改、批量题量调整、多计划库管理、新建/复制/删除/收藏及导入导出。

~~~~~act
write_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  Copy,
  Download,
  Edit3,
  Layers,
  Plus,
  RotateCcw,
  Sliders,
  Star,
  Trash2,
  Upload,
  Zap,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { ALL_CARDS, getCardById } from '../../config/cards';
import { DOMAINS_CONFIG } from '../../config/domains';
import { DEFAULT_PLAN_TEMPLATES } from '../../config/planTemplates';
import type { PlanItem, PlanStorageState, PlanTemplate, TrainingPlan } from '../../types/plan';
import {
  clonePlan,
  createPlanFromTemplate,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../../utils/planStorage';
import { ModalShell } from '../common/ModalShell';

interface PlanEditorModalProps {
  initialPlan: TrainingPlan;
  onClose: () => void;
  onSave: (newPlan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

const TRIAL_PRESETS = [10, 15, 20, 30, 50];

export function PlanEditorModal({
  initialPlan,
  onClose,
  onSave,
  onPlanListChanged,
}: PlanEditorModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 2500);
  };

  const handleSelectPlanFromList = (p: TrainingPlan) => {
    setCurrentPlan({ ...p });
    setPlanNameInput(p.name);
    setIsEditingName(false);
  };

  const handleApplyTemplate = (template: PlanTemplate) => {
    const newPlan = createPlanFromTemplate(template);
    setCurrentPlan(newPlan);
    setPlanNameInput(newPlan.name);
    showToast(`已套用【${template.name}】模板`);
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
    showToast(`已将所有阶段题量统一设为 ${trials} 题`);
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
    setIsAddingCard(false);
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
      name: '新建训练流',
      description: '自定义多阶段训练流',
      items: [],
      isFavorite: true,
      isBuiltin: false,
      updatedAt: Date.now(),
    };
    setCurrentPlan(newBlank);
    setPlanNameInput(newBlank.name);
    setIsEditingName(true);
    setIsAddingCard(true);
    showToast('已新建空白计划，请添加训练阶段');
  };

  const handleCloneCurrent = () => {
    const cloned = clonePlan(currentPlan);
    const nextState = loadPlanStorageState();
    setStorageState(nextState);
    setCurrentPlan(cloned);
    setPlanNameInput(cloned.name);
    onPlanListChanged?.();
    showToast(`已复制为【${cloned.name}】`);
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
      showToast('至少需保留一个训练计划');
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
    showToast('计划已删除');
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
    showToast('计划配置已导出为 JSON 文件');
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
          onPlanListChanged?.();
          showToast(`成功导入计划【${imported.name}】`);
        } else {
          showToast('导入失败：无效的训练计划文件');
        }
      });
    }
  };

  const handleSave = () => {
    const sanitizedPlan: TrainingPlan = {
      ...currentPlan,
      name: planNameInput.trim() || currentPlan.name,
      items: currentPlan.items.filter((item) => Boolean(getCardById(item.cardId))),
      updatedAt: Date.now(),
    };

    // 保存当前计划至库并设为激活
    const updatedPlans = storageState.plans.some((p) => p.id === sanitizedPlan.id)
      ? storageState.plans.map((p) => (p.id === sanitizedPlan.id ? sanitizedPlan : p))
      : [sanitizedPlan, ...storageState.plans];

    savePlanStorageState({
      activePlanId: sanitizedPlan.id,
      plans: updatedPlans,
    });

    onSave(sanitizedPlan);
    onPlanListChanged?.();
    onClose();
  };

  const validPlanItems = currentPlan.items.filter((item) => Boolean(getCardById(item.cardId)));
  const totalTrials = validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  const availableCards = ALL_CARDS.filter((card) => {
    if (selectedDomainFilter === 'all') return true;
    return card.domain === selectedDomainFilter;
  });

  return (
    <ModalShell title="定制日常训练流" icon={Sliders} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* 顶部计划名称编辑与管理切换 */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
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
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="输入计划名称..."
                  />
                  <button
                    type="button"
                    onClick={handleNameSave}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0"
                    title="确定"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-sm font-black text-slate-800 truncate tracking-tight">
                    {currentPlan.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                    title="重命名计划"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {currentPlan.isBuiltin && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 flex-shrink-0">
                      官方预设
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPlanManager(!showPlanManager)}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all flex items-center gap-1 ${
                  showPlanManager
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="切换/管理所有计划"
              >
                <Layers className="w-3.5 h-3.5" />
                计划库 ({storageState.plans.length})
              </button>

              <button
                type="button"
                onClick={handleCloneCurrent}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title="复制此计划为副本"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleExportPlan}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title="导出计划为 JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                title="导入 JSON 计划"
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
            </div>
          </div>

          {toastNotice && (
            <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-lg animate-in fade-in">
              {toastNotice}
            </div>
          )}
        </div>

        {/* 计划库抽屉管理 */}
        {showPlanManager && (
          <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">我的训练计划列表：</span>
              <button
                type="button"
                onClick={handleCreateNewBlankPlan}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                新建空白计划
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {storageState.plans.map((p) => {
                const isActive = currentPlan.id === p.id;
                const isFav = p.isFavorite ?? true;
                const stageCount = (p.items || []).length;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPlanFromList(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSelectPlanFromList(p);
                    }}
                    role="button"
                    tabIndex={0}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                        : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                        {p.isBuiltin && (
                          <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">
                            官方
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {stageCount} 个阶段 •{' '}
                        {(p.items || []).reduce((acc, c) => acc + c.targetTrials, 0)} 题
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavoriteItem(p.id, e)}
                        className={`p-1 rounded-lg transition-colors ${
                          isFav
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={isFav ? '已收藏 (显示在主页)' : '未收藏'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePlanItem(p.id, e)}
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="删除计划"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 预设模板快捷套用 */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
              快捷套用官方科学预设
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEFAULT_PLAN_TEMPLATES.map((tmpl) => (
              <button
                type="button"
                key={tmpl.id}
                onClick={() => handleApplyTemplate(tmpl)}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 rounded-2xl text-left transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                    {tmpl.name}
                  </span>
                  {tmpl.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">
                      {tmpl.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{tmpl.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 计划阶段列表 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span>已编排阶段序列 ({currentPlan.items.length})</span>
              <span className="text-slate-400 font-normal">
                • 合计 {totalTrials} 题 · 约 {estimatedMin} 分钟
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentPlan.items.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400">批量设为:</span>
                  {[10, 15, 20].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => handleBatchUpdateTrials(num)}
                      className="px-1.5 py-0.5 text-[10px] font-bold hover:text-indigo-600 rounded hover:bg-white transition-colors"
                    >
                      {num}题
                    </button>
                  ))}
                </div>
              )}

              {currentPlan.items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  清空阶段
                </button>
              )}
            </div>
          </div>

          {currentPlan.items.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50/50">
              <Zap className="w-6 h-6 text-slate-300" />
              <span>当前计划为空，请点击下方「添加训练阶段」或选用上方模板</span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {currentPlan.items.map((item, idx) => {
                const card = getCardById(item.cardId);
                if (!card) return null;
                const Icon = card.icon;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{card.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {card.desc.slice(0, 26)}...
                        </div>
                      </div>
                    </div>

                    {/* 题量选择档位 */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                        {TRIAL_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset}
                            onClick={() => handleUpdateTrials(item.id, preset)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                              item.targetTrials === preset
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {/* 排序与删除 */}
                      <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveItem(idx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                          title="上移"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === currentPlan.items.length - 1}
                          onClick={() => handleMoveItem(idx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                          title="下移"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1"
                          title="移除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 添加卡片选择器展开面板 */}
        {isAddingCard ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">挑选需要添加的训练模块：</span>
              <button
                type="button"
                onClick={() => setIsAddingCard(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                收起
              </button>
            </div>

            {/* 领域分类 Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedDomainFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  selectedDomainFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                全部
              </button>
              {Object.values(DOMAINS_CONFIG).map((d) => (
                <button
                  type="button"
                  key={d.domain}
                  onClick={() => setSelectedDomainFilter(d.domain)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
                    selectedDomainFilter === d.domain
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>

            {/* 模块卡片列表 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {availableCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    type="button"
                    key={card.id}
                    onClick={() => handleAddItem(card.id)}
                    className="p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 rounded-xl text-left transition-all flex items-center gap-2 group active:scale-95"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">
                      {card.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingCard(true)}
            className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            添加训练阶段
          </button>
        )}

        {/* 底部保存提交 */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={currentPlan.items.length === 0}
            className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all ${
              currentPlan.items.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-[0.98]'
            }`}
          >
            保存并使用此计划 {currentPlan.items.length === 0 && '(至少包含1个阶段)'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 4: 增强主页计划卡片（支持收藏计划快速切换）

重写 `src/components/plan/PlanHeroCard.tsx`，支持直接在主页通过快捷下拉切换收藏的计划。

~~~~~act
write_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~typescript
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  Play,
  Plus,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-preact';
import { getCardById } from '../../config/cards';
import type { TrainingPlan } from '../../types/plan';

interface PlanHeroCardProps {
  plan: TrainingPlan;
  allPlans?: TrainingPlan[];
  onStartPlan: () => void;
  onOpenEditor: () => void;
  onSelectPlan?: (planId: string) => void;
}

export function PlanHeroCard({
  plan,
  allPlans = [],
  onStartPlan,
  onOpenEditor,
  onSelectPlan,
}: PlanHeroCardProps) {
  const hasItems = plan.items && plan.items.length > 0;
  const totalTrials = (plan.items || []).reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  // 仅列出收藏的计划供主页一键快速切换
  const favoritePlans = allPlans.filter((p) => p.isFavorite ?? true);

  if (!hasItems) {
    return (
      <div className="w-full bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border-2 border-dashed border-indigo-200/80 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-100 text-indigo-600 rounded-2xl">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">今日训练计划</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                未设置
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              按需编排多模块定制训练流，一站式贯通寻星、色感、相对推移与空间负形。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          定制我的训练流
        </button>
      </div>
    );
  }

  return (
    <div className="group w-full bg-white border border-indigo-100 hover:border-indigo-300 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 relative overflow-hidden">
      {/* 顶部标题与快速切换入口 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shadow-indigo-200">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {favoritePlans.length > 1 && onSelectPlan ? (
                <div className="relative inline-flex items-center">
                  <select
                    value={plan.id}
                    onChange={(e) => onSelectPlan((e.target as HTMLSelectElement).value)}
                    className="text-lg font-black text-slate-900 tracking-tight bg-transparent pr-6 py-0.5 cursor-pointer appearance-none focus:outline-none hover:text-indigo-600 transition-colors"
                  >
                    {favoritePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none" />
                </div>
              ) : (
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{plan.name}</h2>
              )}

              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                {plan.items.length} 个训练阶段
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-0.5">
              <span>合计 {totalTrials} 题</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                预计约 {estimatedMin} 分钟
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          title="调整阶段或题量"
        >
          <Sliders className="w-3.5 h-3.5" />
          编排计划
        </button>
      </div>

      {/* 中部阶段流水线胶囊展示 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {plan.items.map((item, idx) => {
          const card = getCardById(item.cardId);
          if (!card) return null;
          const Icon = card.icon;

          return (
            <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-2xl shadow-inner">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">{card.title}</span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                  {item.targetTrials}题
                </span>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* 底部一键启动大按钮 */}
      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <div className="text-xs text-slate-400 font-medium">
          各阶段自适应难度与答题记录将自动同步至个人生涯档案
        </div>

        <button
          type="button"
          onClick={onStartPlan}
          className="py-3 px-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 ml-auto"
        >
          <Play className="w-4 h-4 fill-current" />
          开始今日训练流
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 优化计划训练流（增加单阶段跳过）

修改 `src/views/PlanTrainingView.tsx`，在顶部流水线提供“跳过此阶段”功能。

~~~~~act
write_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
import { FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { PlanStepTransitionOverlay } from '../components/plan/PlanStepTransitionOverlay';
import { type PlanStageResult, PlanSummaryModal } from '../components/plan/PlanSummaryModal';
import { getCardById } from '../config/cards';
import { CARD_PLUGINS } from '../config/trainingPlugins';
import type { TrainingPlan } from '../types/plan';
import { getProfile } from '../utils/db';
import { type UserSettings, getCardSettings } from '../utils/settings';
import { GenericTrainingView } from './GenericTrainingView';

interface PlanTrainingViewProps {
  plan: TrainingPlan;
  settings: UserSettings;
  onExit: () => void;
}

export function PlanTrainingView({ plan, settings, onExit }: PlanTrainingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stageResults, setStageResults] = useState<PlanStageResult[]>([]);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);
  const [planSessionKey, setPlanSessionKey] = useState<number>(0);

  const validItems = (plan.items || []).filter((item) => Boolean(getCardById(item.cardId)));

  const currentStep = validItems[currentStepIndex];
  const currentCard = currentStep ? getCardById(currentStep.cardId) : null;
  const nextStep = validItems[currentStepIndex + 1];
  const nextCard = nextStep ? getCardById(nextStep.cardId) : null;

  useEffect(() => {
    let isMounted = true;
    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id).then((p) => {
        if (!isMounted) return;
        setStageInitialLevel(p?.currentLevel || 5);
        setIsLevelLoaded(true);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [currentCard, currentStepIndex, planSessionKey]);

  // 总计时器
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal]);

  const handleStageReached = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard) return;

      const stageRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStep.targetTrials,
        history,
      };

      setStageResults((prev) => [...prev, stageRes]);

      if (currentStepIndex + 1 < validItems.length) {
        setIsTransitioning(true);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, validItems.length],
  );

  const handleSkipCurrentStage = useCallback(() => {
    if (!currentCard) return;
    const skippedRes: PlanStageResult = {
      card: currentCard,
      targetTrials: currentStep.targetTrials,
      history: [],
    };
    setStageResults((prev) => [...prev, skippedRes]);

    if (currentStepIndex + 1 < validItems.length) {
      setIsLevelLoaded(false);
      setIsTransitioning(false);
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setShowSummaryModal(true);
    }
  }, [currentCard, currentStep, currentStepIndex, validItems.length]);

  const handleProceedNextStage = useCallback(() => {
    setIsLevelLoaded(false);
    setIsTransitioning(false);
    setCurrentStepIndex((prev) => prev + 1);
  }, []);

  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
    setShowSummaryModal(false);
    setIsTransitioning(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
    setPlanSessionKey((prev) => prev + 1);
  }, []);

  if (!currentCard || validItems.length === 0) {
    onExit();
    return null;
  }

  const plugin = CARD_PLUGINS[currentCard.id];
  const cardConfig = getCardSettings(settings, currentCard.id);

  return (
    <div className="w-full">
      {/* 顶部流水线全局进度与操作栏 */}
      <div className="max-w-5xl mx-auto mb-4 bg-indigo-950 text-white px-5 py-3 rounded-2xl shadow-md flex items-center justify-between border border-indigo-800/60">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black bg-indigo-600 px-2.5 py-1 rounded-xl">
            阶段 {currentStepIndex + 1} / {validItems.length}
          </span>
          <span className="text-xs font-bold text-indigo-100">{plan.name}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-indigo-200 font-mono font-bold hidden sm:block">
            目标: {currentStep.targetTrials} 题
          </div>
          <button
            type="button"
            onClick={handleSkipCurrentStage}
            className="px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:text-white bg-indigo-900 hover:bg-indigo-800 border border-indigo-700/80 rounded-xl transition-all flex items-center gap-1"
            title="跳过当前阶段进入下一阶段"
          >
            <FastForward className="w-3.5 h-3.5" />
            跳过此阶段
          </button>
        </div>
      </div>

      {isTransitioning && nextCard ? (
        <PlanStepTransitionOverlay
          completedCard={currentCard}
          nextCard={nextCard}
          completedStepIndex={currentStepIndex}
          totalSteps={validItems.length}
          onProceed={handleProceedNextStage}
          onExit={onExit}
        />
      ) : !isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          正在加载【{currentCard.title}】的生涯能力层阶...
        </div>
      ) : (
        <GenericTrainingView
          key={`plan-stage-${planSessionKey}-${currentStepIndex}-${currentCard.id}`}
          card={currentCard}
          plugin={plugin}
          sessionType="training"
          initialLevel={stageInitialLevel}
          settings={cardConfig}
          globalSettings={settings.global}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          onExit={onExit}
        />
      )}

      {showSummaryModal && (
        <PlanSummaryModal
          planName={plan.name}
          stageResults={stageResults}
          totalElapsedSeconds={totalElapsedSeconds}
          onClose={onExit}
          onRestart={handleRestartPlan}
        />
      )}
    </div>
  );
}
~~~~~

#### Acts 6: 更新全局备份恢复模块以支持多计划

修改 `src/utils/db/importExport.ts`，导出/导入完整的 `plans` 列表与当前激活计划。

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript.old
import { getCardById } from '../../config/cards';
import { loadTrainingPlan, saveTrainingPlan } from '../planStorage';
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();
  const trainingPlan = loadTrainingPlan();

  const exportObject = {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    settings,
    trainingPlan,
  };

  return JSON.stringify(exportObject, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
~~~~~
~~~~~typescript.new
import { getCardById } from '../../config/cards';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  savePlanStorageState,
  saveTrainingPlan,
} from '../planStorage';
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();
  const trainingPlan = loadTrainingPlan();
  const planStorageState = loadPlanStorageState();

  const exportObject = {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    settings,
    trainingPlan,
    planStorageState,
  };

  return JSON.stringify(exportObject, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
>>>>>>>
~~~~~
~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript.old
    if (data.settings) {
      saveSettings(data.settings);
    }

    if (data.trainingPlan) {
      saveTrainingPlan(data.trainingPlan);
    }

    return true;
  } catch (err) {
~~~~~
~~~~~typescript.new
    if (data.settings) {
      saveSettings(data.settings);
    }

    if (data.planStorageState) {
      savePlanStorageState(data.planStorageState);
    } else if (data.trainingPlan) {
      saveTrainingPlan(data.trainingPlan);
    }

    return true;
  } catch (err) {
~~~~~

#### Acts 7: 更新主页与 App 主入口

更新 `src/views/Home.tsx` 和 `src/app.tsx`，透传所有计划列表并支持在首页下拉切换当前计划。

~~~~~act
write_file
src/views/Home.tsx
~~~~~
~~~~~typescript
import { ArrowRight, BarChart2, Clock, Sliders, Sparkles } from 'lucide-preact';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
import { DOMAINS_CONFIG } from '../config/domains';
import type { TrainingPlan } from '../types/plan';
import { type TrainingDomain, formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  domainTimes: Record<TrainingDomain, number>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  onNavigateDomain: (domain: TrainingDomain) => void;
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  domainTimes,
  trainingPlan,
  allPlans = [],
  onNavigateDomain,
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const domainOrder: TrainingDomain[] = [
    'star',
    'color',
    'relative_color',
    'negative_space',
    'abstraction',
    'concretization',
  ];
  const domains = domainOrder.map((d) => DOMAINS_CONFIG[d]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      {/* 品牌 Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-8 py-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              FormSight{' '}
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                v{__APP_VERSION__}
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">视觉造型构图与色彩感知强化训练系统</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
          <button
            type="button"
            onClick={onOpenGlobalStats}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            title="全局统计"
          >
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            统计
          </button>
          <button
            type="button"
            onClick={onOpenGlobalSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5"
            title="全局设置"
          >
            <Sliders className="w-4 h-4" />
            全局设置
          </button>
        </div>
      </div>

      {/* 计划 Hero 区域 */}
      <PlanHeroCard
        plan={trainingPlan}
        allPlans={allPlans}
        onStartPlan={onStartPlan}
        onOpenEditor={onOpenPlanEditor}
        onSelectPlan={onSelectPlan}
      />

      {/* 模块选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {domains.map((meta) => {
          const Icon = meta.icon;
          const timeMs = domainTimes[meta.domain] || 0;

          return (
            <button
              key={meta.domain}
              type="button"
              onClick={() => onNavigateDomain(meta.domain)}
              className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{meta.homeTitle}</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">{meta.homeDesc}</p>
                </div>
              </div>

              <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>累计练习: {formatTotalTime(timeMs)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>进入练习看板</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { getCardById } from './config/cards';
import { DOMAINS_CONFIG } from './config/domains';
import { CARD_PLUGINS } from './config/trainingPlugins';
import { useHashRoute } from './hooks/useHashRoute';
import type { TrainingPlan } from './types/plan';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
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

const ALL_DOMAINS: TrainingDomain[] = [
  'abstraction',
  'concretization',
  'star',
  'color',
  'relative_color',
  'negative_space',
];

export function App() {
  const { route, navigate } = useHashRoute();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(loadTrainingPlan);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(() => loadPlanStorageState().plans);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    abstraction: 0,
    concretization: 0,
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(ALL_DOMAINS.map((d) => getProfilesByDomain(d)));
    const pMap: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        pMap[p.cardId] = p;
      }
    }

    setDomainTimes(timesMap);
    setCurrentDomainProfiles(pMap);
    setSettings(loadSettings());
    const planState = loadPlanStorageState();
    setTrainingPlan(loadTrainingPlan());
    setAllPlans(planState.plans);
    setProfilesLoaded(true);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (route.type === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || '今日训练流'} - FormSight`;
    } else if (route.type === 'dashboard') {
      const meta = DOMAINS_CONFIG[route.domain];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    } else if (route.type === 'train') {
      const card = getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route, trainingPlan.name]);

  const handleSelectPlanOnHome = useCallback(
    (planId: string) => {
      const target = setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(`已切换至【${target.name}】`, 'info');
      }
    },
    [showToast],
  );

  const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

  const activeSettingsCard = activeSettingsCardId ? getCardById(activeSettingsCardId) : null;
  const activeAnalyticsCard = activeAnalyticsCardId ? getCardById(activeAnalyticsCardId) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          domainTimes={domainTimes}
          trainingPlan={trainingPlan}
          allPlans={allPlans}
          onNavigateDomain={(domain) => navigate({ type: 'dashboard', domain })}
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
          onExit={() => {
            refreshProfiles();
            navigate({ type: 'home' });
          }}
        />
      )}

      {route.type === 'dashboard' && (
        <GenericDashboard
          meta={DOMAINS_CONFIG[route.domain]}
          onStart={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
          onBackToHome={() => navigate({ type: 'home' })}
          onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
          onOpenCardAnalytics={(cardId) => setActiveAnalyticsCardId(cardId)}
        />
      )}

      {route.type === 'train' &&
        (() => {
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                正在同步能力层阶与训练数据...
              </div>
            );
          }
          const activeCard = getCardById(route.cardId);
          if (!activeCard) {
            navigate({ type: 'home' });
            return null;
          }
          const plugin = CARD_PLUGINS[activeCard.id];
          const activeLevel = currentDomainProfiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={getCardSettings(settings, activeCard.id)}
              globalSettings={settings.global}
              onExit={() => navigate({ type: 'dashboard', domain: activeCard.domain })}
            />
          );
        })()}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={settings}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

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
            showToast('训练计划已成功更新', 'success');
          }}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. **测试用例补充**：为 `src/utils/planStorage.ts` 新增单元测试，覆盖多计划迁移、收藏状态切换与 JSON 导入导出容错。
2. **阶段三规划**：准备按 `CardDefinition.tags` 引入基于技能标签（如 `spatial_orientation`, `color_fidelity`）的向导式智能一键成组计划功能。
