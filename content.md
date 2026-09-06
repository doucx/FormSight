我将按照设计心理学原则简化官方计划卡片的动作形态，专注于纯粹的内容复制；同时将计划编辑模块中导致页面抖动的内联横幅替换为全局浮动 Toast，消除 Layout Shift。

## [WIP] refactor(plan): 移除官方计划直接开练动作并消除删除计划时的界面抖动

### 用户需求
1. 在官方计划卡片中移除“复制并立即开练”按钮，仅保留“复制到我的计划”，避免上下文突变导致的位置迷失感。
2. 修复计划删除和操作时由内联提示框引起的页面垂直挤压（Layout Shift），改用全局浮层 Toast 提示。
3. 清理多语言词典中废弃的 `adoptAndStart` 字段。

### 评论
“浏览选课”与“高沉浸答题”属于两个差异极大的心智模式。直接开练强行跨越了心智边界，容易使用户丢失上下文；将其收敛为单一的“复制到我的计划”，能让官方库保持纯粹的内容源定位。同时，将计划编辑页面的本地内嵌提示框全面升级为全局浮层 Toast，从根本上杜绝了 DOM 树高度突变带来的布局抖动。

### 目标
1. 重构 `OfficialPlanCard.tsx`：移除 `onAdoptAndStart` 回调及“复制并立即开练”按钮，将“复制到我的计划”提升为主操作按钮。
2. 更新 `OfficialPlansView.tsx` 与 `AppRouter.tsx`：简化 `onAdoptPlan` 流程，复制完成后保留在当前浏览上下文。
3. 重构 `usePlanEditorState.ts` 与 `PlanEditorView.tsx`：彻底废弃内联嵌入式 `toastNotice` 容器，全部切换至全局浮层 `showToast`。
4. 清理 `zh-CN.json` 和 `en-US.json` 中的 `adoptAndStart` 词条。

### 基本原理
1. **单一明确行动点 (Single Clear CTA)**：官方卡片操作区收敛为单一主色调按钮“复制到我的计划”，符合“发现 -> 收藏/引用 -> 集中编排使用”的标准信息架构路径。
2. **零布局偏移 (Zero Cumulative Layout Shift)**：内联横幅的出现与定时消失会直接改变网格的起始 Y 坐标，导致下方元素产生突兀位移。接入固定在视口右上角、脱离常规文档流的全局 `ToastContainer`，可以彻底消除界面抖动。

### 标签
#intent/refine #flow/ready #priority/medium
#comp/cli #concept/ui #scope/ux
#ai/refine
#task/domain/plans
#task/object/plan-card-and-toast
#task/action/refactor
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 移除“复制并立即开练”按钮与废弃多语言

将 `OfficialPlanCard` 底部操作区简化为单一的“复制到我的计划”主按钮，并同步更新视图与语言包。

~~~~~act
write_file
src/components/plan/official/OfficialPlanCard.tsx
~~~~~
~~~~~typescript
import { ChevronRight, Clock, Copy } from 'lucide-preact';
import type { OfficialPlanPreset } from '../../../config/plans';
import { getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface OfficialPlanCardProps {
  preset: OfficialPlanPreset;
  onAdoptToLibrary: (preset: OfficialPlanPreset) => void;
}

export function OfficialPlanCard({
  preset,
  onAdoptToLibrary,
}: OfficialPlanCardProps) {
  const { t, locale } = useTranslation();

  const dict =
    preset.locales[locale as 'zh-CN' | 'en-US'] ||
    preset.locales['zh-CN'] ||
    preset.locales['en-US'];

  const name = dict?.name || preset.id;
  const description = dict?.description || '';

  const validItems = (preset.items || []).filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  return (
    <div className="group bg-card border border-border hover:border-primary/60 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between gap-5 relative select-none">
      <div className="space-y-4">
        {/* 顶栏：纯粹标题与详细阐述 */}
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {description}
          </p>
        </div>

        {/* 阶段管线可视化预览 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>{t('plan.stageCount', { count: validItems.length })}</span>
            <div className="flex items-center gap-2">
              <span>{t('plan.totalTrialsSummary', { trials: totalTrials })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {t('plan.estimatedTime', { min: estimatedMin })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {validItems.map((item, idx) => {
              const card = registry.getCardById(item.cardId);
              if (!card) return null;
              const Icon = card.icon;
              const cardTitle = getCardTitle(card, t);

              return (
                <div key={`${preset.id}_${item.cardId}_${idx}`} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-2xl shadow-inner">
                    <div className="w-4 h-4 rounded-md bg-accent text-primary flex items-center justify-center font-mono text-[10px] font-black">
                      {idx + 1}
                    </div>
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">{cardTitle}</span>
                    <Badge variant="secondary" size="sm" className="font-mono font-bold text-[10px]">
                      {item.targetTrials}
                      {t('common.trialsUnit')}
                    </Badge>
                  </div>
                  {idx < validItems.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部单一明确的 CTA 操作区 */}
      <div className="flex items-center justify-end pt-4 border-t border-border/60">
        <Button
          variant="default"
          size="sm"
          onClick={() => onAdoptToLibrary(preset)}
          className="gap-1.5"
          title={t('officialPlans.adoptToLibrary')}
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{t('officialPlans.adoptToLibrary')}</span>
        </Button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/views/OfficialPlansView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, BookOpen, Layers } from 'lucide-preact';
import { useMemo } from 'preact/hooks';
import { OfficialPlanCard } from '../components/plan/official/OfficialPlanCard';
import { Button } from '../components/ui/button';
import { officialPlanRegistry } from '../config/plans';
import { useTranslation } from '../core/i18n';

interface OfficialPlansViewProps {
  onExit: () => void;
  onNavigateToMyPlans: () => void;
  onAdoptPlan: (preset: import('../config/plans').OfficialPlanPreset) => Promise<void>;
}

export function OfficialPlansView({
  onExit,
  onNavigateToMyPlans,
  onAdoptPlan,
}: OfficialPlansViewProps) {
  const { t } = useTranslation();

  const allPresets = useMemo(() => officialPlanRegistry.getAllPresets(), []);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 顶部标题与导航栏 */}
      <header className="w-full bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onExit} className="gap-1.5 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common.exit')}</span>
          </Button>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-accent text-primary rounded-2xl shadow-xs flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  {t('officialPlans.title')}
                </h1>
                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                  {allPresets.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {t('officialPlans.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onNavigateToMyPlans}
          className="gap-1.5 border border-border self-end sm:self-auto"
        >
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>{t('officialPlans.myPlansBtn')}</span>
        </Button>
      </header>

      {/* 官方计划卡片平铺网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {allPresets.map((preset) => (
          <OfficialPlanCard
            key={preset.id}
            preset={preset}
            onAdoptToLibrary={(p) => onAdoptPlan(p)}
          />
        ))}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~old
    if (route.type === 'official-plans') {
      const exitTargetRoute: RouteLocation =
        previousRoute && previousRoute.type !== 'official-plans'
          ? previousRoute
          : { type: 'plan-editor' };

      return (
        <OfficialPlansView
          onExit={() => navigate(exitTargetRoute)}
          onNavigateToMyPlans={() => navigate({ type: 'plan-editor' })}
          onAdoptPlan={async (preset, startImmediately) => {
            const adopted = await forkOfficialPlanAction(preset, startImmediately);
            await refreshAppData();
            showToast(t('officialPlans.adoptedToast', { name: adopted.name }), 'success');
            if (startImmediately) {
              navigate({ type: 'plan-train' });
            } else {
              navigate({ type: 'plan-editor' });
            }
          }}
        />
      );
    }
~~~~~
~~~~~new
    if (route.type === 'official-plans') {
      const exitTargetRoute: RouteLocation =
        previousRoute && previousRoute.type !== 'official-plans'
          ? previousRoute
          : { type: 'plan-editor' };

      return (
        <OfficialPlansView
          onExit={() => navigate(exitTargetRoute)}
          onNavigateToMyPlans={() => navigate({ type: 'plan-editor' })}
          onAdoptPlan={async (preset) => {
            const adopted = await forkOfficialPlanAction(preset, false);
            await refreshAppData();
            showToast(t('officialPlans.adoptedToast', { name: adopted.name }), 'success');
          }}
        />
      );
    }
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~old
  "officialPlans": {
    "title": "官方推荐训练流",
    "subtitle": "针对构图、起形与色彩深度推演调优的官方权威训练序列，可自由复制到个人计划库并进行自定义编排",
    "browseBtn": "官方计划库",
    "myPlansBtn": "我的计划库",
    "adoptToLibrary": "复制到我的计划",
    "adoptAndStart": "复制并立即开练",
    "adoptedToast": "已成功将【{{name}}】导入到您的个人计划库！"
  },
~~~~~
~~~~~new
  "officialPlans": {
    "title": "官方推荐训练流",
    "subtitle": "针对构图、起形与色彩深度推演调优的官方权威训练序列，可自由复制到个人计划库并进行自定义编排",
    "browseBtn": "官方计划库",
    "myPlansBtn": "我的计划库",
    "adoptToLibrary": "复制到我的计划",
    "adoptedToast": "已成功将【{{name}}】导入到您的个人计划库！"
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~old
  "officialPlans": {
    "title": "Official Routine Presets",
    "subtitle": "Authoritative training sequences carefully crafted for perception, form, and color. Adopt them into your personal routine library for personalized customization.",
    "browseBtn": "Official Library",
    "myPlansBtn": "My Routines",
    "adoptToLibrary": "Adopt into My Library",
    "adoptAndStart": "Adopt & Start Now",
    "adoptedToast": "Successfully adopted [{{name}}] into your personal library!"
  },
~~~~~
~~~~~new
  "officialPlans": {
    "title": "Official Routine Presets",
    "subtitle": "Authoritative training sequences carefully crafted for perception, form, and color. Adopt them into your personal routine library for personalized customization.",
    "browseBtn": "Official Library",
    "myPlansBtn": "My Routines",
    "adoptToLibrary": "Adopt into My Library",
    "adoptedToast": "Successfully adopted [{{name}}] into your personal library!"
  },
~~~~~

#### Acts 2: 消除删除计划与操作时的页面抖动 (Layout Shift)

将计划编排状态管理中的内联消息框彻底移除，统一使用全局右上角浮动 `showToast`。

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~old
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
import type { PlanItem, PlanStorageState, TrainingPlan } from '../../../types/plan';
import {
  batchUpdateItemTrials,
  createNewBlankPlan,
  createPlanItem,
  movePlanItem,
  removePlanItem,
  sanitizePlan,
  updatePlanItemTrials,
} from './planItemUtils';
~~~~~
~~~~~new
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
import {
  batchUpdateItemTrials,
  createNewBlankPlan,
  createPlanItem,
  movePlanItem,
  removePlanItem,
  sanitizePlan,
  updatePlanItemTrials,
} from './planItemUtils';
~~~~~

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~old
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 2500);
  };

  const updatePlanItems = (updater: (items: PlanItem[]) => PlanItem[]) => {
    setCurrentPlan((prev) => ({ ...prev, items: updater(prev.items) }));
  };
~~~~~
~~~~~new
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
~~~~~

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~old
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
      target.files[0].text().then(async (text) => {
        const imported = await importPlanFromJson(text);
        if (imported) {
          const nextState = await loadPlanStorageState();
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
~~~~~
~~~~~new
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
~~~~~

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~old
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
    handleCloneCurrent: async () => {
      const cloned = await clonePlan(currentPlan);
      const nextState = await loadPlanStorageState();
      setStorageState(nextState);
      setCurrentPlan(cloned);
      setPlanNameInput(cloned.name);
      onPlanListChanged?.();
      showToast(t('plan.clonedPlanToast', { name: cloned.name }));
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
        showToast(t('plan.minOnePlanToast'));
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
    handleSaveOnly: async () => onSaveAndExit(await persist()),
    handleSaveAndStart: async () => onStartPlanDirectly(await persist()),
  };
~~~~~
~~~~~new
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
    handleSaveOnly: async () => onSaveAndExit(await persist()),
    handleSaveAndStart: async () => onStartPlanDirectly(await persist()),
  };
~~~~~

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~old
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
        onStartEditingName={() => setIsEditingName(true)}
        onCancelEditingName={() => {
          setPlanNameInput(currentPlan.name);
          setIsEditingName(false);
        }}
        onPlanNameChange={setPlanNameInput}
        onNameSave={handleNameSave}
        onTogglePlanManager={() => setShowPlanManager(!showPlanManager)}
        onNavigateToOfficialPlans={onNavigateToOfficialPlans}
        onClonePlan={handleCloneCurrent}
        onExportPlan={handleExportPlan}
        onImportPlan={handleImportPlan}
        onSaveOnly={handleSaveOnly}
        onSaveAndStart={handleSaveAndStart}
      />

      {toastNotice && (
        <div className="w-full text-xs font-bold text-primary bg-accent border border-border/60 dark:border-border px-4 py-2 rounded-2xl animate-in fade-in flex-shrink-0">
          {toastNotice}
        </div>
      )}

      {/* 展开的计划库总览抽屉 */}
~~~~~
~~~~~new
  const {
    storageState,
    currentPlan,
    isEditingName,
    setIsEditingName,
    planNameInput,
    setPlanNameInput,
    showPlanManager,
    setShowPlanManager,
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
        onStartEditingName={() => setIsEditingName(true)}
        onCancelEditingName={() => {
          setPlanNameInput(currentPlan.name);
          setIsEditingName(false);
        }}
        onPlanNameChange={setPlanNameInput}
        onNameSave={handleNameSave}
        onTogglePlanManager={() => setShowPlanManager(!showPlanManager)}
        onNavigateToOfficialPlans={onNavigateToOfficialPlans}
        onClonePlan={handleCloneCurrent}
        onExportPlan={handleExportPlan}
        onImportPlan={handleImportPlan}
        onSaveOnly={handleSaveOnly}
        onSaveAndStart={handleSaveAndStart}
      />

      {/* 展开的计划库总览抽屉 */}
~~~~~

### 下一步建议
1. **体验与防抖验证**：
   - 进入 `http://localhost:5173/#/official-plans`，验证每张官方计划卡片仅呈现“复制到我的计划”按钮。
   - 点击复制后，确认页面保持在当前位置，右上角浮现无布局偏移的 Toast 提示。
   - 进入 `http://localhost:5173/#/plan-editor` 打开计划库抽屉，尝试删除计划或在只剩一个计划时尝试删除，确认页面不再发生任何纵向位移/跳动。
2. **代码提交流程**：验证体验符合要求后，生成 `[COMMIT]` 计划将此项体验优化合入版本库。
