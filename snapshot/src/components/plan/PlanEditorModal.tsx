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