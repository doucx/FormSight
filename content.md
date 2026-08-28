我将生成一个 `[WIP]` 计划，通过在移动端引入轻量 Tab 视图切换（已选阶段 ⇋ 挑选模块）、紧凑单行 Header（收纳更多次要动作）以及单行横滑 Pack 筛选条，彻底解决手机端顶栏折行与卡片被遮挡挤压的问题。

## [WIP] feat: 优化训练计划编排器移动端响应式布局与交互

### 用户需求
1. **顶栏在手机端折成多行**：移动端宽度有限，顶栏堆叠了过多操作按钮导致换行臃肿，挤占了手机纵向屏幕空间。
2. **卡片列表被筛选器严重挤占/遮挡**：在手机单列上下堆叠模式下，筛选器占据了大量高度，导致下方的卡片网格滚动区可视范围极小。

### 评论
在移动端小屏设备上，“双列并排”退化为“上下堆叠”往往是纵向视口灾难的根源。通过将移动端降级为清晰的 **双 Tab 视图（已选阶段 ⇋ 浏览挑选）**，并配合单行 Header 与 Pack 标签横向滑动，可以让用户在手机端无论调序还是挑卡片都能享有 100% 完整舒适的垂直视口，同时桌面端继续无缝保留左右双列并排能力。

### 目标
1. **单行 Header 响应式优化**：在 `< sm` 屏幕下，Header 保持单行（高度 ~48px），左侧精简返回与标题，右侧保留主 CTA（开始训练）并将次要管理操作（计划库、克隆、导入导出、仅保存）收纳进 `···` 浮层菜单。
2. **移动端 Tab 视图切换**：在 `< lg` 屏幕下提供「阶段清单」与「挑选模块」两个标签页切换，各个面板独占完整纵向视口；在 `>= lg` 桌面端自动并排双列展示。
3. **筛选组件紧凑横滑**：在 `compact` 模式下将 Pack 筛选标签改为单行横向滑动（`flex-nowrap overflow-x-auto`），避免换行挤占纵向高度。

### 基本原理
1. **自适应视图降级（Adaptive View Degrade）**：大屏双列协同，小屏 Tab 分离，打破上下堆叠相互争夺有限高度的僵局。
2. **渐进式操作收纳（Progressive Action Disclosure）**：高频动作平铺直达，低频配置动作浮层收敛，锁定移动端顶栏在单行内。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/mobile-plan-editor #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 优化 `FilterEngine.tsx` 紧凑模式下的 Pack 横滑与高度约束

让 Pack 标签在 `compact` 模式下保持单行平滑横向滚动，减少垂直高度消耗。

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript.old
      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className={`space-y-1.5 border-t border-slate-200/60 ${isCompact ? 'pt-2' : 'pt-3'}`}>
          <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            {t('home.allPacks')}
          </div>
          <div className="flex flex-wrap gap-1">
            <TagPill
              size={tagSize}
              label={t('home.allPacks')}
              selected={!query.packId}
              onClick={() => handleSelectPack(undefined)}
            />
            {packs.map((p) => (
              <TagPill
                key={p.packId}
                size={tagSize}
                label={getPackTitle(p, t)}
                count={p.cards.length}
                selected={query.packId === p.packId}
                onClick={() => handleSelectPack(query.packId === p.packId ? undefined : p.packId)}
              />
            ))}
          </div>
        </div>
      )}
~~~~~
~~~~~typescript.new
      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className={`space-y-1 border-t border-slate-200/60 ${isCompact ? 'pt-1.5' : 'pt-3'}`}>
          <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            {t('home.allPacks')}
          </div>
          <div
            className={`flex gap-1 ${
              isCompact
                ? 'flex-nowrap overflow-x-auto pb-1 scrollbar-none items-center'
                : 'flex-wrap'
            }`}
          >
            <TagPill
              size={tagSize}
              label={t('home.allPacks')}
              selected={!query.packId}
              onClick={() => handleSelectPack(undefined)}
            />
            {packs.map((p) => (
              <TagPill
                key={p.packId}
                size={tagSize}
                label={getPackTitle(p, t)}
                count={p.cards.length}
                selected={query.packId === p.packId}
                onClick={() => handleSelectPack(query.packId === p.packId ? undefined : p.packId)}
              />
            ))}
          </div>
        </div>
      )}
~~~~~

#### Acts 2: 改造 `PlanEditorView.tsx` 支持移动端单行 Header、更多动作菜单与 Tab 切换

在小屏下引入单行 Header、更多操作浮层以及 Tab 切换条，彻底释放移动端纵向视口。

~~~~~act
write_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~typescript
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Edit3,
  Layers,
  ListOrdered,
  MoreHorizontal,
  Play,
  Save,
  Sparkles,
  Upload,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
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
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'stages' | 'picker'>(
    initialPlan.items.length === 0 ? 'picker' : 'stages',
  );
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const isNewPlan = !storageState.plans.some((p) => p.id === currentPlan.id);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 2500);
  };

  // 点击空白处关闭更多菜单
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
    setMobileTab('picker');
    showToast(t('plan.newPlanModeToast'));
  };

  const handleCloneCurrent = () => {
    const cloned = clonePlan(currentPlan);
    const nextState = loadPlanStorageState();
    setStorageState(nextState);
    setCurrentPlan(cloned);
    setPlanNameInput(cloned.name);
    onPlanListChanged?.();
    setShowMobileMoreMenu(false);
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
    setShowMobileMoreMenu(false);
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
          setShowMobileMoreMenu(false);
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
    setShowMobileMoreMenu(false);
    const saved = sanitizeAndPersist();
    onSaveAndExit(saved);
  };

  const handleSaveAndStart = () => {
    setShowMobileMoreMenu(false);
    const saved = sanitizeAndPersist();
    onStartPlanDirectly(saved);
  };

  const validPlanItems = currentPlan.items.filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col h-[calc(100dvh-2rem)] sm:h-[calc(100vh-4rem)] gap-3 sm:gap-5 animate-in fade-in duration-200">
      {/* 顶部单行主操作栏 */}
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
                  onInput={(e) => setPlanNameInput((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') {
                      setPlanNameInput(currentPlan.name);
                      setIsEditingName(false);
                    }
                  }}
                  maxLength={32}
                  className="w-full px-2.5 py-1 text-xs sm:text-sm font-black text-slate-800 bg-slate-50 border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-sm sm:text-lg font-black text-slate-900 truncate tracking-tight">
                  {currentPlan.name}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
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
              onClick={() => setShowPlanManager(!showPlanManager)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                showPlanManager
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title={t('plan.switchAndManageTitle')}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('plan.planLibraryTitle', { count: storageState.plans.length })}</span>
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

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handleSaveOnly}
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
                    setShowPlanManager(!showPlanManager);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 text-left"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{t('plan.libraryBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloneCurrent}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{t('plan.cloneBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPlan}
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
                  onClick={handleSaveOnly}
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
            onChange={handleImportPlan}
            className="hidden"
          />

          {/* 统一开始训练主 CTA */}
          <button
            type="button"
            onClick={handleSaveAndStart}
            disabled={currentPlan.items.length === 0}
            className="px-3.5 py-2 sm:px-4 sm:py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('plan.startPlan')}</span>
          </button>
        </div>
      </header>

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
            onCreateNewBlankPlan={handleCreateNewBlankPlan}
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
1. **真机与移动端视口调试**：可以在 Chrome DevTools 移动端模拟器（如 iPhone 14 / Pixel 7 视口）中预览编排器的流畅度。
2. **提交封装**：确认各端体验符合预期后，可以发起 `[COMMIT]` 流程正式提交。
