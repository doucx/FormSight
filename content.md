我们已经分析了原生 `<select>` 在展开时样式与周围现代卡片不协调的问题，并为你设计了一套风格高度统一的自定义下拉弹窗菜单。

## [WIP] refactor: 重构训练计划切换菜单为应用原生卡片风格下拉组件

### 用户需求
主页卡片中的训练计划切换组件目前使用了原生 `<select>` 标签，点击展开后弹出的选项列表样式由操作系统原生渲染，与 FormSight 整体的圆角卡片、Slate/Indigo 现代视觉风格割裂，需要进行统一样式重构。

### 评论
原生 `<select>` 弹层无法自定义圆角、阴影、微动画和丰富的副标题信息。将其重构为统一风格的 Custom Dropdown，不仅能实现视觉上的无缝融合，还能在下拉菜单中直接呈现每个计划的阶段数量与总题量，大幅提升主页的操作与信息感知体验。

### 目标
1. 将 `PlanHeroCard.tsx` 中原生的 `<select>` 替换为自定义下拉菜单组件。
2. 增加点击展开/收起浮层，并在浮层中展示计划名称、阶段数、总题量及当前选中高亮标记。
3. 增加点击外部（Click Outside）及 `Escape` 键自动关闭监听，确保交互体验顺畅自然。

### 基本原理
利用 Preact `useState` 与 `useRef` 实现浮层状态管理，结合 `pointerdown` 事件监听实现精确的点击外部收起逻辑。下拉菜单项使用语义化的 `<button type="button">`，沿用项目标准的 `bg-white`, `border-slate-200`, `shadow-xl`, `bg-indigo-50` 等设计语言与入场动画，确保与卡片设计规范完全一致。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/plan-dropdown #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 `PlanHeroCard.tsx` 中的训练流下拉切换菜单

~~~~~act
patch_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~tsx
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
~~~~~
~~~~~tsx
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
  const [isOpenDropdown, setIsOpenDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const hasItems = plan.items && plan.items.length > 0;
  const totalTrials = (plan.items || []).reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  // 仅列出收藏的计划供主页一键快速切换
  const favoritePlans = allPlans.filter((p) => p.isFavorite ?? true);

  // 点击外部与按 Esc 键自动收起下拉浮层
  useEffect(() => {
    if (!isOpenDropdown) return;

    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpenDropdown(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpenDropdown(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpenDropdown]);
~~~~~

~~~~~act
patch_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~tsx
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
~~~~~
~~~~~tsx
            <div className="flex items-center gap-2 flex-wrap">
              {favoritePlans.length > 1 && onSelectPlan ? (
                <div ref={dropdownRef} className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setIsOpenDropdown((prev) => !prev)}
                    className="group/select flex items-center gap-1.5 text-lg font-black text-slate-900 tracking-tight hover:text-indigo-600 transition-colors py-0.5 rounded-lg text-left cursor-pointer focus:outline-none"
                    aria-expanded={isOpenDropdown}
                    aria-haspopup="listbox"
                  >
                    <span>{plan.name}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 group-hover/select:text-indigo-600 transition-transform duration-200 ${
                        isOpenDropdown ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>

                  {isOpenDropdown && (
                    <div className="absolute left-0 top-full mt-2 z-30 min-w-[240px] max-w-xs bg-white rounded-2xl border border-slate-200/90 shadow-xl p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        切换已收藏训练流
                      </div>
                      {favoritePlans.map((p) => {
                        const isSelected = p.id === plan.id;
                        const stageCount = (p.items || []).length;
                        const trialCount = (p.items || []).reduce(
                          (acc, c) => acc + c.targetTrials,
                          0,
                        );

                        return (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              onSelectPlan(p.id);
                              setIsOpenDropdown(false);
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl text-left transition-all flex items-center justify-between gap-2 text-xs cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-700 font-bold'
                                : 'text-slate-700 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                {stageCount} 阶段 · {trialCount} 题
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
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
~~~~~

### 下一步建议

1. 打开应用主页，点击训练流标题测试自定义下拉菜单的展开、切换、阶段题量信息展示以及点击外部自动收起效果。
2. 运行 `npm run check` 确保代码格式和语法检查全部通过。
