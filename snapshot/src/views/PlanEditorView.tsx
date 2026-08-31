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
      <div className="flex lg:hidden items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex-shrink-0 border border-slate-200/60 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => setMobileTab('stages')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'stages'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
          className={`lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col min-h-0 overflow-hidden ${
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
          className={`lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col min-h-0 overflow-hidden ${
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
