import { Check, Copy, Download, Edit3, Layers, Sliders, Sparkles, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { registry } from '../../core/registry';
import type { PlanItem, PlanStorageState, TrainingPlan } from '../../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../../utils/planStorage';
import { ModalShell } from '../common/ModalShell';
import { CardPickerPanel } from './editor/CardPickerPanel';
import { PlanLibraryDrawer } from './editor/PlanLibraryDrawer';
import { PlanStageList } from './editor/PlanStageList';

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
    setShowPlanManager(false);
    showToast('已进入新计划创建模式');
  };

  const handleCloneCurrent = () => {
    const cloned = clonePlan(currentPlan);
    const nextState = loadPlanStorageState();
    setStorageState(nextState);
    setCurrentPlan(cloned);
    setPlanNameInput(cloned.name);
    onPlanListChanged?.();
    showToast(`已复制为新计划【${cloned.name}】`);
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
          setShowPlanManager(false);
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

    onSave(sanitizedPlan);
    onPlanListChanged?.();
    onClose();
  };

  const validPlanItems = currentPlan.items.filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  return (
    <ModalShell title="定制日常训练流" icon={Sliders} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5">
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
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
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

                  {isNewPlan ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex-shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      新计划
                    </span>
                  ) : currentPlan.isBuiltin ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 flex-shrink-0">
                      官方预设
                    </span>
                  ) : null}
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
                title="复制为新副本"
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

        <CardPickerPanel
          isAddingCard={isAddingCard}
          onToggleAdding={setIsAddingCard}
          onAddItem={handleAddItem}
        />

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
            {isNewPlan ? '保存为新计划并使用' : '保存修改并使用此计划'}{' '}
            {currentPlan.items.length === 0 && '(至少包含1个阶段)'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
