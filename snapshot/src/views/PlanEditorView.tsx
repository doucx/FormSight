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