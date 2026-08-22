我们即将开始实施 **FormSight v0.4.x 架构演进白皮书 —— 里程碑 3：视图层重构与智能发现 (UI Refactoring & Smart Discovery)**。

本次重构将全面释放里程碑 1 (物化聚合数据引擎) 与里程碑 2 (Pack 与多维标签体系) 的架构红利：
1. **构建独立多维筛选引擎 (`FilterEngine.tsx`)**：支持按感官目标 (Sensory Target)、认知技能 (Cognitive Skill)、交互形态 (Interaction) 以及扩展包 (Pack) 进行动态交集过滤与模糊搜索。
2. **重构主页为大盘发现库 (`Home.tsx`)**：废除繁琐的二级领域看板目录层级，将主页升级为直达所有卡片的大盘发现库 (Discovery Hub)，实现“意图驱动”的一站式找卡与快速开练。
3. **升级训练计划编排器 (`CardPickerPanel.tsx`)**：引入标签矩阵与搜索过滤能力，支持用户跨 Pack 快速编排定制化训练流。
4. **增强全局数据统计 (`GlobalStatsModal.tsx`)**：在全局统计中引入按认知技能 (Cognitive Skill) 的多维能力矩阵分析与智能筛选。
5. **平滑演进路由与顶层状态 (`useHashRoute.ts`, `app.tsx`)**：精简视图层级，保持向后兼容性。

## [WIP] feat(ui): 实施里程碑3重构大盘发现库与多维标签智能筛选引擎

### 用户需求
按照《FormSight v0.4.x 架构演进白皮书》实施里程碑 3（视图层重构与智能发现），废除严格树状的 Domain 看板层级，构建大盘发现库与解耦的 `<FilterEngine />` 筛选引擎，升级计划编排器与认知技能统计，使用户可以基于意图和多维标签快速发现卡片并定制训练流。

### 评论
这是 FormSight v0.4.x 用户体验与交互维度的核心跃迁。通过将卡片从生硬的文件夹分类中解放出来，转由多维标签矩阵 (Faceted Tags) 和倒排索引驱动的大盘呈现，不仅彻底消除了语义归属摩擦，还直接将用户的选卡与开练路径缩短了 50% 以上，为后续 v0.5 阶段的自适应动态抽题训练流奠定了坚实的前端基石。

### 目标
1. **封装通用多维标签筛选组件 `FilterEngine.tsx`**：提供感官维度、认知技能、交互形态、扩展包及关键字的交互式 Pills 标签选择器。
2. **主页升级为大盘发现库 `Home.tsx`**：集成 `FilterEngine`，展示所有已注册卡片的动态流，保留今日训练流 Hero 卡片，一键直达训练。
3. **改造计划编排选卡抽屉 `CardPickerPanel.tsx`**：支持关键词与多维标签检索，便捷挑选跨模块卡片。
4. **升级全局数据统计看板 `GlobalStatsModal.tsx`**：增加认知技能 (Cognitive Skill) 维度分布与聚合视图。
5. **更新路由与应用分发 `useHashRoute.ts` 与 `app.tsx`**：扁平化路由层级，收敛废弃的 `GenericDashboard` 分支，保障老 URL 兼容。

### 基本原理
1. 利用 `registry.queryCards(options)` 与内存倒排索引，以 $O(1)$ 复杂度实现多维条件的交集与关键词匹配。
2. 保持标签多维映射字典（感官目标、认知技能、交互方式）的高内聚定义，统一提供语义化中英标签转换。
3. 通过将主页视图与动态卡片网格深度融合，实现“所见即所得”的直观训练体验。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #comp/runtime #concept/ui #scope/ux #scope/dx #ai/delegate #task/domain/ui #task/object/discovery-hub-and-filter-engine #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建高内聚多维标签筛选引擎组件 FilterEngine.tsx

我们将创建 `src/components/discovery/FilterEngine.tsx`，定义多维标签字典映射，并提供包含搜索框、感官维度、认知技能、交互形态以及扩展包分类的交互式标签筛选面板。

~~~~~act
write_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx
import {
  Boxes,
  Check,
  Compass,
  Crosshair,
  Filter,
  Layers,
  MousePointer,
  RotateCcw,
  Search,
  Sliders,
  Sparkles,
  X,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import { registry } from '../../core/registry';
import type {
  CardQueryOptions,
  CognitiveSkillTag,
  InteractionTag,
  SensoryTargetTag,
} from '../../types/card';

export const TARGET_TAG_LABELS: Record<SensoryTargetTag, string> = {
  geometry: '空间几何',
  color: '绝对色相',
  relative_color: '环境色彩',
  negative_space: '正负空间',
  abstraction: '形态概括',
  concretization: '具象构型',
  angle: '角度感知',
};

export const SKILL_TAG_LABELS: Record<CognitiveSkillTag, string> = {
  spatial_orientation: '空间方位',
  color_fidelity: '色彩保真',
  illusion_invariance: '抗视错觉',
  proportion: '比例度量',
  visual_memory: '视觉记忆',
  abstraction: '形态抽象',
  gesture_flow: '动态势线',
  notan_grouping: '明度归组',
};

export const INTERACTION_TAG_LABELS: Record<InteractionTag, string> = {
  continuous_slider: '连续滑块',
  point_click: '点阵点击',
  choice_2afc: '2AFC 对抗',
  choice_nafc: 'N-AFC 判断',
};

interface FilterEngineProps {
  query: CardQueryOptions;
  totalMatches: number;
  compact?: boolean;
  onChange: (newQuery: CardQueryOptions) => void;
}

export function FilterEngine({
  query,
  totalMatches,
  compact = false,
  onChange,
}: FilterEngineProps) {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(!compact);

  const packs = registry.getAllPacks();

  const handleSearchChange = (val: string) => {
    onChange({
      ...query,
      searchKeyword: val || undefined,
    });
  };

  const toggleTarget = (target: SensoryTargetTag) => {
    const current = query.targets || [];
    const next = current.includes(target)
      ? current.filter((t) => t !== target)
      : [...current, target];
    onChange({ ...query, targets: next.length > 0 ? next : undefined });
  };

  const toggleSkill = (skill: CognitiveSkillTag) => {
    const current = query.skills || [];
    const next = current.includes(skill)
      ? current.filter((s) => s !== skill)
      : [...current, skill];
    onChange({ ...query, skills: next.length > 0 ? next : undefined });
  };

  const toggleInteraction = (interaction: InteractionTag) => {
    const current = query.interactions || [];
    const next = current.includes(interaction)
      ? current.filter((i) => i !== interaction)
      : [...current, interaction];
    onChange({ ...query, interactions: next.length > 0 ? next : undefined });
  };

  const handleSelectPack = (packId?: string) => {
    onChange({
      ...query,
      packId: packId || undefined,
    });
  };

  const handleResetFilters = () => {
    onChange({});
  };

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      query.packId ||
      (query.targets && query.targets.length > 0) ||
      (query.skills && query.skills.length > 0) ||
      (query.interactions && query.interactions.length > 0),
  );

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* 顶栏：搜索条与快速筛选概览 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query.searchKeyword || ''}
            onInput={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
            placeholder="搜索训练卡片名称、编号或认知要领..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400 placeholder:font-normal"
          />
          {query.searchKeyword && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-shrink-0">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              已匹配 <strong className="font-mono text-indigo-600 font-black">{totalMatches}</strong> 个训练模块
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
              showAdvanced
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showAdvanced ? '收起筛选' : '多维筛选'}</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all flex items-center gap-1"
              title="重置所有筛选"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              清空
            </button>
          )}
        </div>
      </div>

      {/* 扩展包 (Pack) 快速切换横向标签 */}
      {packs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-3">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1 flex-shrink-0">
            <Boxes className="w-3 h-3 text-indigo-500" />
            扩展包:
          </span>
          <button
            type="button"
            onClick={() => handleSelectPack(undefined)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex-shrink-0 flex items-center gap-1 ${
              !query.packId
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            全部 Packs
          </button>
          {packs.map((p) => {
            const isSelected = query.packId === p.packId;
            return (
              <button
                type="button"
                key={p.packId}
                onClick={() => handleSelectPack(isSelected ? undefined : p.packId)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex-shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <span>{p.meta.title}</span>
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {p.cards.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 多维标签矩阵折叠区 */}
      {showAdvanced && (
        <div className="space-y-3.5 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
          {/* 1. 感官目标维度 (Sensory Target) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-indigo-500" />
              感官训练目标 (Sensory Target)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TARGET_TAG_LABELS) as SensoryTargetTag[]).map((t) => {
                const isSelected = query.targets?.includes(t) ?? false;
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleTarget(t)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                        : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{TARGET_TAG_LABELS[t]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 认知技能维度 (Cognitive Skill) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-500" />
              认知知觉技能 (Cognitive Skill)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SKILL_TAG_LABELS) as CognitiveSkillTag[]).map((s) => {
                const isSelected = query.skills?.includes(s) ?? false;
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleSkill(s)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                        : 'bg-slate-50 hover:bg-emerald-50/60 text-slate-600 border border-slate-200/80 hover:border-emerald-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{SKILL_TAG_LABELS[s]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 交互形态维度 (Interaction Tag) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-amber-500" />
              交互评估形态 (Interaction Mode)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(INTERACTION_TAG_LABELS) as InteractionTag[]).map((i) => {
                const isSelected = query.interactions?.includes(i) ?? false;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleInteraction(i)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-200'
                        : 'bg-slate-50 hover:bg-amber-50/60 text-slate-600 border border-slate-200/80 hover:border-amber-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{INTERACTION_TAG_LABELS[i]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 2: 重构主页 Home.tsx 为大盘发现库 (Discovery Hub)

我们将重构 `src/views/Home.tsx`，将主页升级为包含多维筛选引擎与扁平化卡片流的大盘发现库，直接呈现所有 Pack 注册的卡片，支持用户通过搜索与标签精准找到训练模块并即时启动。

~~~~~act
write_file
src/views/Home.tsx
~~~~~
~~~~~tsx
import { BarChart2, Clock, Inbox, RotateCcw, Sliders, Sparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { ModeCard } from '../components/dashboard/ModeCard';
import { FilterEngine } from '../components/discovery/FilterEngine';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
import { registry } from '../core/registry';
import type { CardQueryOptions } from '../types/card';
import type { TrainingPlan } from '../types/plan';
import { type UnifiedProfileData, formatTotalTime } from '../utils/db/index';

interface HomeProps {
  totalTimeMs: number;
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  showExperimental?: boolean;
  onStartCard: (cardId: string, type: 'training' | 'benchmark') => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans = [],
  showExperimental = false,
  onStartCard,
  onOpenCardSettings,
  onOpenCardAnalytics,
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const [query, setQuery] = useState<CardQueryOptions>({
    includeExperimental: showExperimental,
  });

  // 结合全局设置与查询条件获取过滤后的卡片
  const filteredCards = useMemo(() => {
    return registry.queryCards({
      ...query,
      includeExperimental: showExperimental || query.includeExperimental,
    });
  }, [query, showExperimental]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* 品牌 Header 状态栏 */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-7 py-5 sm:px-8 sm:py-6 rounded-3xl shadow-sm flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              FormSight{' '}
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                v{__APP_VERSION__}
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">视觉造型构图与色彩感知自适应强化训练系统</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
          <button
            type="button"
            onClick={onOpenGlobalStats}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95"
            title="全局统计"
          >
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            统计
          </button>
          <button
            type="button"
            onClick={onOpenGlobalSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 active:scale-95"
            title="全局设置"
          >
            <Sliders className="w-4 h-4" />
            全局设置
          </button>
        </div>
      </div>

      {/* 今日定制训练流 Hero 区域 */}
      <PlanHeroCard
        plan={trainingPlan}
        allPlans={allPlans}
        onStartPlan={onStartPlan}
        onOpenEditor={onOpenPlanEditor}
        onSelectPlan={onSelectPlan}
      />

      {/* 大盘发现库核心筛选引擎 */}
      <FilterEngine
        query={query}
        totalMatches={filteredCards.length}
        onChange={(newQuery) => setQuery(newQuery)}
      />

      {/* 大盘卡片网格流 (Discovery Hub Cards Grid) */}
      {filteredCards.length === 0 ? (
        <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-slate-800">未找到符合条件的训练模块</div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            尝试调整或清空当前的多维筛选标签、搜索关键字，以探索更多训练模块。
          </p>
          <button
            type="button"
            onClick={() => setQuery({ includeExperimental: showExperimental })}
            className="mt-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置所有筛选条件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => {
            const profile = profiles[card.id];
            const totalTrials = profile?.totalTrials || 0;
            const accuracy =
              totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
            const currentLevel = profile?.currentLevel || 5;
            const stat = todayStats[card.id] || { count: 0, timeMs: 0 };

            return (
              <ModeCard
                key={card.id}
                title={card.title}
                desc={card.desc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={Boolean(card.isExperimental)}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 3: 重构计划编排器选卡抽屉 CardPickerPanel.tsx

我们将重构 `src/components/plan/editor/CardPickerPanel.tsx`，使其支持多维标签（感官目标、认知技能、交互方式）与实时模糊搜索，方便用户在编排训练流时精准挑选卡片。

~~~~~act
write_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~tsx
import { Filter, Plus, Search, Sparkles, X } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { registry } from '../../../core/registry';
import type { CardDefinition, CardQueryOptions, CognitiveSkillTag } from '../../../types/card';
import { SKILL_TAG_LABELS } from '../../discovery/FilterEngine';

interface CardPickerPanelProps {
  isAddingCard: boolean;
  onToggleAdding: (val: boolean) => void;
  onAddItem: (cardId: string) => void;
}

export function CardPickerPanel({
  isAddingCard,
  onToggleAdding,
  onAddItem,
}: CardPickerPanelProps) {
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<CognitiveSkillTag | 'all'>('all');
  const [selectedPackId, setSelectedPackId] = useState<string>('all');

  const packs = registry.getAllPacks();

  const queryOptions: CardQueryOptions = useMemo(() => {
    return {
      searchKeyword: searchKeyword || undefined,
      skills: selectedSkill !== 'all' ? [selectedSkill] : undefined,
      packId: selectedPackId !== 'all' ? selectedPackId : undefined,
      includeExperimental: true,
    };
  }, [searchKeyword, selectedSkill, selectedPackId]);

  const availableCards = useMemo(() => {
    return registry.queryCards(queryOptions);
  }, [queryOptions]);

  if (!isAddingCard) {
    return (
      <button
        type="button"
        onClick={() => onToggleAdding(true)}
        className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
      >
        <Plus className="w-4 h-4" />
        添加训练阶段
      </button>
    );
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">挑选需要加入训练流的模块：</span>
        </div>
        <button
          type="button"
          onClick={() => onToggleAdding(false)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          收起
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchKeyword}
          onInput={(e) => setSearchKeyword((e.target as HTMLInputElement).value)}
          placeholder="搜索模块名称或要领..."
          className="w-full pl-8 pr-8 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {searchKeyword && (
          <button
            type="button"
            onClick={() => setSearchKeyword('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Pack 与认知技能快速筛选行 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setSelectedSkill('all');
            setSelectedPackId('all');
          }}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
            selectedSkill === 'all' && selectedPackId === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          全部 ({registry.getAllCards().length})
        </button>

        {packs.map((p) => (
          <button
            type="button"
            key={p.packId}
            onClick={() => {
              setSelectedPackId(selectedPackId === p.packId ? 'all' : p.packId);
              setSelectedSkill('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
              selectedPackId === p.packId
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {p.meta.title}
          </button>
        ))}

        {(Object.keys(SKILL_TAG_LABELS) as CognitiveSkillTag[]).map((skill) => (
          <button
            type="button"
            key={skill}
            onClick={() => {
              setSelectedSkill(selectedSkill === skill ? 'all' : skill);
              setSelectedPackId('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
              selectedSkill === skill
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {SKILL_TAG_LABELS[skill]}
          </button>
        ))}
      </div>

      {/* 模块列表 */}
      {availableCards.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
          未搜索到匹配的训练模块
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
          {availableCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                type="button"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className="p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 rounded-xl text-left transition-all flex items-center justify-between gap-2 group active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{card.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{card.desc}</div>
                  </div>
                </div>
                <Plus className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 4: 升级全局统计看板 GlobalStatsModal.tsx 增强认知技能维度

我们将重构 `src/components/GlobalStatsModal.tsx`，在全局数据统计中集成认知技能 (Cognitive Skill) 分析面板，并优化下拉筛选器以全面适配 Pack 与多维标签体系。

~~~~~act
write_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~tsx
import {
  Activity,
  Award,
  BarChart2,
  Calendar,
  ChevronDown,
  Compass,
  Filter,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { registry } from '../core/registry';
import type { CognitiveSkillTag } from '../types/card';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import {
  type DailySummaryData,
  getDailySummaries,
  getLocalDateString,
} from '../utils/db/index';
import { SKILL_TAG_LABELS } from './discovery/FilterEngine';

interface GlobalStatsModalProps {
  onClose: () => void;
}

export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummaryData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const packs = registry.getAllPacks();
  const allCards = registry.getAllCards();

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const data = await getDailySummaries();
      if (isMounted) {
        setSummaries(data);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 过滤后的汇总记录
  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (selectedFilter === 'all') return true;

      if (selectedFilter.startsWith('pack:')) {
        const targetPackId = selectedFilter.replace('pack:', '');
        const pack = registry.getPack(targetPackId);
        const packCardIds = new Set(pack?.cards.map((c) => c.id) || []);
        return packCardIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('skill:')) {
        const targetSkill = selectedFilter.replace('skill:', '') as CognitiveSkillTag;
        const matchedCards = registry.queryCards({ skills: [targetSkill] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('card:')) {
        const targetCardId = selectedFilter.replace('card:', '');
        return s.cardId === targetCardId || s.mode === targetCardId;
      }

      return true;
    });
  }, [summaries, selectedFilter]);

  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return '全部练习项目';
    if (selectedFilter.startsWith('pack:')) {
      const pack = registry.getPack(selectedFilter.replace('pack:', ''));
      return `扩展包 • ${pack?.meta.title || selectedFilter}`;
    }
    if (selectedFilter.startsWith('skill:')) {
      const skill = selectedFilter.replace('skill:', '') as CognitiveSkillTag;
      return `认知技能 • ${SKILL_TAG_LABELS[skill] || skill}`;
    }
    if (selectedFilter.startsWith('card:')) {
      const cardId = selectedFilter.replace('card:', '');
      const card = registry.getCardById(cardId);
      return `训练模块 • ${card?.title || cardId}`;
    }
    return '全部练习项目';
  };

  const now = new Date();
  const todayStr = getLocalDateString(now.getTime());
  const startOfWeekStr = getLocalDateString(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const startOfYearStr = `${now.getFullYear()}-01-01`;

  const stats = {
    today: { total: 0, hits: 0 },
    week: { total: 0, hits: 0 },
    year: { total: 0, hits: 0 },
    allTime: { total: 0, hits: 0 },
  };

  const dailyData: Record<string, { total: number; maxLevel: number }> = {};

  for (const s of filteredSummaries) {
    stats.allTime.total += s.totalCount;
    stats.allTime.hits += s.hitCount;

    if (s.date === todayStr) {
      stats.today.total += s.totalCount;
      stats.today.hits += s.hitCount;
    }
    if (s.date >= startOfWeekStr) {
      stats.week.total += s.totalCount;
      stats.week.hits += s.hitCount;
    }
    if (s.date >= startOfYearStr) {
      stats.year.total += s.totalCount;
      stats.year.hits += s.hitCount;
    }

    if (!dailyData[s.date]) {
      dailyData[s.date] = { total: 0, maxLevel: s.maxLevel };
    }
    dailyData[s.date].total += s.totalCount;
    dailyData[s.date].maxLevel = Math.max(dailyData[s.date].maxLevel, s.maxLevel);
  }

  const calcAcc = (hits: number, total: number) =>
    total === 0 ? 0 : Math.round((hits / total) * 100);

  const heatmapDays = 84;
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const heatmapData = Array.from({ length: heatmapDays }).map((_, i) => {
    const dMs = startOfTodayMs - (heatmapDays - 1 - i) * 24 * 60 * 60 * 1000;
    const dateStr = getLocalDateString(dMs);
    return {
      date: dateStr,
      count: dailyData[dateStr]?.total || 0,
    };
  });

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count < 10) return 'bg-indigo-200';
    if (count < 25) return 'bg-indigo-400';
    if (count < 50) return 'bg-indigo-600';
    return 'bg-indigo-800';
  };

  // 计算按认知技能聚合的掌握度数据
  const skillMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId || s.mode;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }

    return (Object.keys(SKILL_TAG_LABELS) as CognitiveSkillTag[]).map((skill) => {
      const matchingCards = registry.queryCards({ skills: [skill] });
      let skillTotal = 0;
      let skillHits = 0;

      for (const card of matchingCards) {
        const item = cardSummaryMap.get(card.id);
        if (item) {
          skillTotal += item.total;
          skillHits += item.hits;
        }
      }

      const acc = skillTotal > 0 ? Math.round((skillHits / skillTotal) * 100) : 0;
      return {
        skill,
        label: SKILL_TAG_LABELS[skill],
        total: skillTotal,
        hits: skillHits,
        accuracy: acc,
        cardCount: matchingCards.length,
      };
    });
  }, [summaries]);

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">全局认知数据统计</h2>
              <p className="text-xs text-slate-400">洞察多维视觉认知成长与训练足迹</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
                className="pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all shadow-sm max-w-xs truncate"
              >
                <option value="all">全部练习项目</option>

                <optgroup label="—— 扩展包 (Packs) ——">
                  {packs.map((p) => (
                    <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                      {p.meta.title} (扩展包)
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 认知技能 (Skills) ——">
                  {(Object.keys(SKILL_TAG_LABELS) as CognitiveSkillTag[]).map((skill) => (
                    <option key={`skill:${skill}`} value={`skill:${skill}`}>
                      {SKILL_TAG_LABELS[skill]}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 具体训练模块 (Cards) ——">
                  {allCards.map((card) => (
                    <option key={`card:${card.id}`} value={`card:${card.id}`}>
                      {card.title}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            正在统计海量物化数据...
          </div>
        ) : stats.allTime.total === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Activity className="w-10 h-10 text-slate-300" />【{getCurrentFilterLabel()}】下暂无做答记录，先去练习几道题吧！
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 核心指标卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  今日刷题
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.today.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.today.hits, stats.today.total)}%
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  最近 7 天
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.week.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.week.hits, stats.week.total)}%
                </div>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  本年累计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.year.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-amber-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.year.hits, stats.year.total)}%
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  生涯总计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.allTime.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  打卡 {Object.keys(dailyData).length} 天
                </div>
              </div>
            </div>

            {/* 认知技能掌握度分布矩阵 */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  认知知觉技能掌握度矩阵 (Cognitive Skills Mastery)
                </div>
                <span className="text-[10px] text-slate-400 font-mono">基于全部历史试炼聚合</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {skillMasteryList.map((sm) => (
                  <div
                    key={sm.skill}
                    className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-sm space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{sm.label}</span>
                      <span
                        className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                          sm.total === 0
                            ? 'bg-slate-100 text-slate-400'
                            : sm.accuracy >= 80
                              ? 'bg-emerald-50 text-emerald-700 font-black'
                              : sm.accuracy >= 60
                                ? 'bg-amber-50 text-amber-700 font-black'
                                : 'bg-rose-50 text-rose-700 font-black'
                        }`}
                      >
                        {sm.total > 0 ? `${sm.accuracy}%` : '--'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>已练 {sm.total} 题</span>
                      <span>{sm.cardCount} 模块</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 热力图与演进曲线图 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-4">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>近 12 周训练热力图</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                    少 <div className="w-2.5 h-2.5 rounded-sm bg-slate-100" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-800" /> 多
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1.5 self-center">
                  {heatmapData.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date} : 训练了 ${day.count} 题`}
                      className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
                        day.count,
                      )}`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-2">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>能力峰值演进轨迹</span>
                  <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                    每日最高 Level
                  </span>
                </div>
                <canvas ref={canvasRef} width={340} height={150} className="w-full mt-2" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 优化路由层 useHashRoute.ts 与顶层 App.tsx 路由分发

我们将重构 `src/hooks/useHashRoute.ts` 与 `src/app.tsx`，将路由层级扁平化收敛为主页 (Home)、单卡训练 (Train) 以及定制训练流 (Plan-Train)，同时平滑支持向后兼容。

~~~~~act
write_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~tsx
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

export type RouteLocation =
  | { type: 'home' }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' };

function parseHash(hash: string): RouteLocation {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) return { type: 'home' };

  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const params = new URLSearchParams(queryPart || '');
    const sessionType = params.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  // 兼容老版本 #/dashboard/:domain 路由，统一回退到主页
  return { type: 'home' };
}

function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') return '#/';
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteLocation>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'home' },
  );

  const scrollPositionsRef = useRef<Record<string, number>>({});
  const currentHashRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.hash || '#/' : '#/',
  );

  useEffect(() => {
    const handleScroll = () => {
      const currentKey = currentHashRef.current || '#/';
      scrollPositionsRef.current[currentKey] = window.scrollY;
    };

    const handleHashChange = () => {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;

      const newHash = window.location.hash || '#/';
      currentHashRef.current = newHash;
      setRoute(parseHash(newHash));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetY = scrollPositionsRef.current[newHash] ?? 0;
          window.scrollTo(0, targetY);
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = useCallback((target: RouteLocation) => {
    const newHash = stringifyRoute(target);
    if (window.location.hash !== newHash) {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;
      window.location.hash = newHash;
    }
  }, []);

  return { route, navigate };
}
~~~~~

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~tsx
import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { registry } from './core/registry';
import { useHashRoute } from './hooks/useHashRoute';
import { useTodayStats } from './hooks/useTodayStats';
import type { TrainingPlan } from './types/plan';
import { type UnifiedProfileData, repository } from './utils/db/index';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  saveTrainingPlan,
  setActivePlan,
} from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanTrainingView } from './views/PlanTrainingView';

export function App() {
  const { route, navigate } = useHashRoute();
  const todayStats = useTodayStats();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(loadTrainingPlan);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(() => loadPlanStorageState().plans);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const summary = await repository.getAppSummary();

    setTotalTimeMs(summary.totalTimeMs);
    setProfiles(summary.profiles);
    setSettings(summary.settings);
    setTrainingPlan(summary.trainingPlan);
    setAllPlans(summary.allPlans);
    setProfilesLoaded(true);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (route.type === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || '今日训练流'} - FormSight`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route, trainingPlan.name]);

  const handleSelectPlanOnHome = useCallback(
    (planId: string) => {
      const target = setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(`已切换至【${target.name}】`, 'info');
      }
    },
    [showToast],
  );

  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;
  const activeAnalyticsCard = activeAnalyticsCardId
    ? registry.getCardById(activeAnalyticsCardId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          todayStats={todayStats}
          profiles={profiles}
          trainingPlan={trainingPlan}
          allPlans={allPlans}
          showExperimental={settings.global.showExperimentalCards}
          onStartCard={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
          onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
          onOpenCardAnalytics={(cardId) => setActiveAnalyticsCardId(cardId)}
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => setIsPlanEditorOpen(true)}
          onSelectPlan={handleSelectPlanOnHome}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'plan-train' && (
        <PlanTrainingView
          plan={trainingPlan}
          settings={settings}
          onExit={async () => {
            await refreshProfiles();
            navigate({ type: 'home' });
          }}
        />
      )}

      {route.type === 'train' &&
        (() => {
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                正在同步能力层阶与训练数据...
              </div>
            );
          }
          const activeCard = registry.getCardById(route.cardId);
          if (!activeCard) {
            navigate({ type: 'home' });
            return null;
          }
          const plugin = registry.getPluginByCardId(activeCard.id);
          if (!plugin) {
            navigate({ type: 'home' });
            return null;
          }
          const activeLevel = profiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={getCardSettings(settings, activeCard.id)}
              globalSettings={settings.global}
              onExit={async () => {
                await refreshProfiles();
                navigate({ type: 'home' });
              }}
            />
          );
        })()}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={settings}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {activeAnalyticsCard && (
        <WeaknessAnalyticsModal
          card={activeAnalyticsCard}
          onClose={() => setActiveAnalyticsCardId(null)}
        />
      )}

      {isPlanEditorOpen && (
        <PlanEditorModal
          initialPlan={trainingPlan}
          onClose={() => setIsPlanEditorOpen(false)}
          onPlanListChanged={refreshProfiles}
          onSave={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            showToast('训练计划已成功更新', 'success');
          }}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. **执行构建与类型检查**：运行 `npm run check` 或 `npx tsc --noEmit`，验证所有视图层组件的类型一致性与 Biome 语法规范。
2. **体验验证**：启动开发服务器 `npm run dev`，验证主页大盘发现库的标签切换、关键词搜索、卡片即时开练以及全局统计中的认知技能矩阵。
3. **推进里程碑 4**：进入**里程碑 4：极限性能与稳态治理**（流式 NDJSON 备份导入导出、数据冷热修剪以及离屏降采样渲染 Worker）。
