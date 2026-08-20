import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Play,
  Plus,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const hasItems = plan.items && plan.items.length > 0;
  const totalTrials = (plan.items || []).reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  // 仅列出收藏的计划供主页一键快速切换
  const favoritePlans = allPlans.filter((p) => p.isFavorite ?? true);

  // 点击外部收起下拉菜单与 Escape 键监听
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

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
    <div className="group w-full bg-white border border-indigo-100 hover:border-indigo-300 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 relative z-10">
      {/* 顶部标题与快速切换入口 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shadow-indigo-200">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {favoritePlans.length > 1 && onSelectPlan ? (
                <div ref={dropdownRef} className="relative inline-block text-left">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="group/btn inline-flex items-center gap-1.5 text-lg font-black text-slate-900 tracking-tight hover:text-indigo-600 transition-colors focus:outline-none"
                  >
                    <span>{plan.name}</span>
                    <div
                      className={`p-1 rounded-lg bg-slate-100 group-hover/btn:bg-indigo-50 text-slate-500 group-hover/btn:text-indigo-600 transition-all duration-200 ${
                        isDropdownOpen ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* 风格统一的自定义下拉浮层 */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                        <span>快速切换训练流</span>
                        <span className="font-mono">{favoritePlans.length} 个可用</span>
                      </div>

                      <div className="max-h-60 overflow-y-auto py-1 space-y-1 pr-1">
                        {favoritePlans.map((p) => {
                          const isSelected = p.id === plan.id;
                          const stageCount = (p.items || []).length;
                          const pTrials = (p.items || []).reduce(
                            (acc, c) => acc + c.targetTrials,
                            0,
                          );

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onSelectPlan(p.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 ${
                                isSelected
                                  ? 'bg-indigo-50/80 text-indigo-900 font-bold border border-indigo-200/80 shadow-sm'
                                  : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate">{p.name}</span>
                                  {p.isBuiltin && (
                                    <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">
                                      官方
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {stageCount} 个阶段 • {pTrials} 题
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
