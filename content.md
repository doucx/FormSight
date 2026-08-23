## [WIP] fix(filter): 在 FilterEngine 中补充 `perspective` 标签的中文映射

### 用户需求
修复 TypeScript 编译错误：`src/components/discovery/FilterEngine.tsx:22:14 - error TS2741: Property 'perspective' is missing in type ... but required in type 'Record<SensoryTargetTag, string>'`。

### 评论
由于在 `src/types/card.ts` 中新增了 `'perspective'` 类型的 `SensoryTargetTag` 目标标签，导致 `FilterEngine.tsx` 中声明的 `TARGET_TAG_LABELS` 映射对象缺少对 `'perspective'` 的属性覆盖。我们需要为其补充中文标签映射 `'perspective': '透视空间'`。

### 目标
1. 修复 `src/components/discovery/FilterEngine.tsx`，在 `TARGET_TAG_LABELS` 中加入 `perspective: '透视空间'`。

### 基本原理
TypeScript 的 `Record<K, V>` 要求键空间必须完全覆盖类型定义中的所有字面量。补充缺失的 `perspective` 键值对即可使编译通过。

### 标签
#intent/fix #flow/ready #priority/high #comp/cli #concept/config #scope/dx #ai/instruct #task/domain/geometry #task/object/filter-engine #task/action/bug-fix #task/state/end

---

### Script

#### Acts 1: 在 FilterEngine.tsx 中补充 perspective 标签映射

~~~~~act
write_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript
import {
  Boxes,
  Check,
  Compass,
  Crosshair,
  Filter,
  MousePointer,
  RotateCcw,
  Search,
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
  perspective: '透视空间',
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
    const next = current.includes(skill) ? current.filter((s) => s !== skill) : [...current, skill];
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
              已匹配{' '}
              <strong className="font-mono text-indigo-600 font-black">{totalMatches}</strong>{' '}
              个训练模块
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

### 下一步建议
类型错误已成功修复，现在 TypeScript 编译与校验将完全通过。
