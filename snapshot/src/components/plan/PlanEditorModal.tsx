import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  Zap,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import { ALL_CARDS, getCardById } from '../../config/cards';
import { DOMAINS_CONFIG } from '../../config/domains';
import { DEFAULT_PLAN_TEMPLATES } from '../../config/planTemplates';
import type { PlanItem, PlanTemplate, TrainingPlan } from '../../types/plan';
import { createPlanFromTemplate } from '../../utils/planStorage';
import { ModalShell } from '../common/ModalShell';

interface PlanEditorModalProps {
  initialPlan: TrainingPlan;
  onClose: () => void;
  onSave: (newPlan: TrainingPlan) => void;
}

const TRIAL_PRESETS = [10, 15, 20, 30, 50];

export function PlanEditorModal({ initialPlan, onClose, onSave }: PlanEditorModalProps) {
  const [plan, setPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);

  const handleApplyTemplate = (template: PlanTemplate) => {
    const newPlan = createPlanFromTemplate(template);
    setPlan(newPlan);
  };

  const handleAddItem = (cardId: string) => {
    const newItem: PlanItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      cardId,
      targetTrials: 20,
    };
    setPlan((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setIsAddingCard(false);
  };

  const handleRemoveItem = (id: string) => {
    setPlan((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= plan.items.length) return;

    const newItems = [...plan.items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    setPlan((prev) => ({ ...prev, items: newItems }));
  };

  const handleUpdateTrials = (id: string, trials: number) => {
    setPlan((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, targetTrials: Math.max(5, trials) } : item,
      ),
    }));
  };

  const handleClearAll = () => {
    setPlan((prev) => ({ ...prev, items: [] }));
  };

  const handleSave = () => {
    onSave(plan);
    onClose();
  };

  const totalTrials = plan.items.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  const availableCards = ALL_CARDS.filter((card) => {
    if (selectedDomainFilter === 'all') return true;
    return card.domain === selectedDomainFilter;
  });

  return (
    <ModalShell title="定制日常训练流" icon={Sliders} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* 预设模板一键载入 */}
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
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span>已编排阶段序列 ({plan.items.length})</span>
              <span className="text-slate-400 font-normal">
                • 合计 {totalTrials} 题 · 约 {estimatedMin} 分钟
              </span>
            </div>
            {plan.items.length > 0 && (
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

          {plan.items.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50/50">
              <Zap className="w-6 h-6 text-slate-300" />
              <span>当前计划为空，请点击下方「添加训练阶段」或选用上方模板</span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {plan.items.map((item, idx) => {
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
                          disabled={idx === plan.items.length - 1}
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
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            保存计划
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
