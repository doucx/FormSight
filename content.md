好的，我们将原本的原生 `<select>` 替换为与全局设计语言高度统一的自定义下拉浮层，并移除卡片外层可能截断弹窗的 `overflow-hidden`。

## [WIP] feat: 将训练计划快速切换器重构为无溢出截断的现代自定义下拉菜单

### 用户需求
1. 将首页 `PlanHeroCard` 中简陋的原生 `<select>` 标签重构为与 FormSight 整体视觉风格一致的自定义下拉菜单（支持毛玻璃、优雅圆角、选中高亮、阶段题量元信息展示等）。
2. 解决自定义下拉弹层可能被外层卡片容器 `overflow-hidden` 或层级截断（被困住）的问题。

### 评论
原生 `<select>` 控件由操作系统原生渲染，在不同浏览器与平台（macOS/Windows/Linux/iOS/Android）上外观迥异，破坏了现代化应用界面的统一感。重构为自定义交互组件不仅视觉风格更和谐，还能在下拉项中直观展示计划的阶段数和题量元信息。

### 目标
1. 在 `PlanHeroCard.tsx` 中实现可控的自定义下拉菜单组件，包含点击展开、选项高亮、选中对勾图标、阶段与题量信息显示。
2. 添加点击外部自动收起（Click Outside）和按 Esc 键关闭的交互逻辑。
3. 移除 `PlanHeroCard` 外部容器的 `overflow-hidden` 并配置合适的 `z-index`，确保浮层完全不受卡片边界裁剪。

### 基本原理
1. 通过 `useRef` 与 `useEffect` 挂载全局 `mousedown` 与 `keydown` 事件监听器，当点击浮层外部或按下 Escape 时自动收起下拉菜单。
2. 移除卡片外层冗余的 `overflow-hidden`，配合浮层的 `absolute` 和 `z-40` 层级，使弹窗脱离卡片流并稳定悬浮于卡片之上，彻底杜绝元素被裁剪被困的问题。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/plan-dropdown #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在 `PlanHeroCard.tsx` 中实现自定义计划切换下拉组件并解决溢出裁剪

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
~~~~~
~~~~~tsx
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

  // 点击外部与按键监听以自动关闭下拉菜单
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
~~~~~
~~~~~tsx
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
~~~~~
~~~~~tsx
  return (
    <div className="group w-full bg-white border border-indigo-100 hover:border-indigo-300 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 relative">
      {/* 顶部标题与快速切换入口 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shadow-indigo-200">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {favoritePlans.length > 1 && onSelectPlan ? (
                <div ref={dropdownRef} className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className="group/btn flex items-center gap-1.5 text-lg font-black text-slate-900 tracking-tight hover:text-indigo-600 transition-colors focus:outline-none"
                    title="切换当前训练计划"
                  >
                    <span>{plan.name}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 group-hover/btn:text-indigo-600 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 z-40 min-w-[260px] max-w-xs bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        切换当前训练流
                      </div>
                      {favoritePlans.map((p) => {
                        const isSelected = p.id === plan.id;
                        const planTotalTrials = (p.items || []).reduce(
                          (acc, curr) => acc + curr.targetTrials,
                          0,
                        );

                        return (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              onSelectPlan(p.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-left transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                                : 'text-slate-700 hover:bg-slate-100 font-medium'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs truncate flex items-center gap-1.5">
                                <span>{p.name}</span>
                                {p.isBuiltin && (
                                  <span className="text-[9px] px-1 bg-slate-200/70 text-slate-600 rounded font-normal">
                                    官方
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                                {(p.items || []).length} 阶段 • {planTotalTrials} 题
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
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
~~~~~

### 下一步建议
1. 运行 `npm run check` 验证代码规范和 TypeScript 类型检查无误。
2. 运行 `npm run dev` 在浏览器中验证自定义下拉切换菜单的交互效果（动画、点击外部关闭、选中对勾以及浮层不被卡片边界裁剪）。
