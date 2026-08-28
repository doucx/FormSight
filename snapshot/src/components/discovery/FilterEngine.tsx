import {
  Boxes,
  Brain,
  Check,
  Compass,
  Crosshair,
  Eye,
  Filter,
  FlaskConical,
  MousePointer,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import { registry } from '../../core/registry';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';

export const DOMAIN_TAG_LABELS: Record<VisualDomainTag, string> = {
  form_and_proportion: '形体与比例',
  spatial_structure: '空间与结构',
  color_and_value: '色彩与明度',
  rhythm_and_notan: '动态与图底',
};

export const PATH_TAG_LABELS: Record<CognitivePathTag, string> = {
  extraction: '自底向上：提炼概括',
  concretization: '自顶向下：具象寻源',
  absolute_estimation: '绝对估测度量',
  relational_mapping: '相对推移映射',
};

export const CHALLENGE_TAG_LABELS: Record<MentalChallengeTag, string> = {
  illusion_piercing: '错觉剥离 (抗同化/环境光)',
  figure_ground_reversal: '图底反转 (关注负空间)',
  working_memory: '瞬时记忆 (抗视觉遗忘)',
  dimensional_translation: '维次转译 (3D/2D展开)',
};

export const INTERACTION_TAG_LABELS: Record<InteractionTag, string> = {
  continuous_mod: '连续调制 (滑块)',
  spatial_locate: '空间定位 (点阵点击)',
  binary_choice: '二分对抗 (2AFC)',
  multi_choice: '多维检索 (N-AFC)',
};

export const STATUS_TAG_LABELS: Record<CardStatusTag, string> = {
  stable: '稳定模块',
  experimental: '实验性模块',
  deprecated: '已废弃',
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

  const toggleDomain = (domain: VisualDomainTag) => {
    const current = query.domains || [];
    const next = current.includes(domain)
      ? current.filter((d) => d !== domain)
      : [...current, domain];
    onChange({ ...query, domains: next.length > 0 ? next : undefined });
  };

  const togglePath = (path: CognitivePathTag) => {
    const current = query.paths || [];
    const next = current.includes(path) ? current.filter((p) => p !== path) : [...current, path];
    onChange({ ...query, paths: next.length > 0 ? next : undefined });
  };

  const toggleChallenge = (challenge: MentalChallengeTag) => {
    const current = query.challenges || [];
    const next = current.includes(challenge)
      ? current.filter((c) => c !== challenge)
      : [...current, challenge];
    onChange({ ...query, challenges: next.length > 0 ? next : undefined });
  };

  const toggleInteraction = (interaction: InteractionTag) => {
    const current = query.interactions || [];
    const next = current.includes(interaction)
      ? current.filter((i) => i !== interaction)
      : [...current, interaction];
    onChange({ ...query, interactions: next.length > 0 ? next : undefined });
  };

  const toggleStatus = (status: CardStatusTag) => {
    const current = query.statuses || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onChange({ ...query, statuses: next.length > 0 ? next : undefined });
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
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
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

      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            扩展包 (Packs)
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectPack(undefined)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                !query.packId
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
              }`}
            >
              {!query.packId && <Check className="w-3 h-3" />}
              <span>全部 Packs</span>
            </button>
            {packs.map((p) => {
              const isSelected = query.packId === p.packId;
              return (
                <button
                  type="button"
                  key={p.packId}
                  onClick={() => handleSelectPack(isSelected ? undefined : p.packId)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
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
        </div>
      )}

      {/* 正交四维标签矩阵折叠区 */}
      {showAdvanced && (
        <div className="space-y-3.5 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
          {/* 1. 视觉域维度 (Visual Domain) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3 text-indigo-500" />
              1. 基础视觉域 (Visual Domain)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(DOMAIN_TAG_LABELS) as VisualDomainTag[]).map((d) => {
                const isSelected = query.domains?.includes(d) ?? false;
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDomain(d)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                        : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{DOMAIN_TAG_LABELS[d]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 认知路径维度 (Cognitive Path) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-500" />
              2. 认知推演路径 (Cognitive Path)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PATH_TAG_LABELS) as CognitivePathTag[]).map((p) => {
                const isSelected = query.paths?.includes(p) ?? false;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePath(p)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                        : 'bg-slate-50 hover:bg-emerald-50/60 text-slate-600 border border-slate-200/80 hover:border-emerald-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{PATH_TAG_LABELS[p]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 心智抗性维度 (Mental Challenge) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3 text-rose-500" />
              3. 核心心智抗性 (Mental Challenge)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHALLENGE_TAG_LABELS) as MentalChallengeTag[]).map((c) => {
                const isSelected = query.challenges?.includes(c) ?? false;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleChallenge(c)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-200'
                        : 'bg-slate-50 hover:bg-rose-50/60 text-slate-600 border border-slate-200/80 hover:border-rose-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{CHALLENGE_TAG_LABELS[c]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 交互形态维度 (Interaction Mode) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-amber-500" />
              4. 交互评估形态 (Interaction Mode)
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

          {/* 5. 特性与发布状态 (Status Tag) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-purple-500" />
              特性与状态 (Status)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['stable', 'experimental'] as CardStatusTag[]).map((st) => {
                const isSelected = query.statuses?.includes(st) ?? false;
                return (
                  <button
                    type="button"
                    key={st}
                    onClick={() => toggleStatus(st)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? st === 'stable'
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                          : 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {st === 'stable' ? (
                      <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <FlaskConical className="w-3 h-3 text-amber-500" />
                    )}
                    <span>{STATUS_TAG_LABELS[st]}</span>
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
