我将为你生成一个 `[WIP]` 计划，通过抽取统一的卡片筛选状态管理与为 `FilterEngine` 引入自适应紧凑模式，将大盘的五维标签与检索体系完整接入 `CardPickerPanel`。

## [WIP] feat: 在训练计划编排器中集成多维卡片筛选引擎

### 用户需求
在 `plan-editor`（训练计划编排器）的“挑选训练模块”面板中，引入与主页大盘完全一致的多维筛选逻辑（搜索关键字、扩展包 Pack、基础视觉域、认知推演路径、核心心智抗性、交互形态与发布状态等），同时通过逻辑抽象与组件变体设计避免代码重复（DRY）。

### 评论
这是一个关键的体验一致性改进。随着 FormSight 训练模块与 Pack 的不断丰富，在定制日常训练流时，单纯依赖色相或 Pack 过滤已无法满足用户按心智抗性（如错觉剥离、图底反转）或认知路径（自底向上提炼、具象寻源）精准挑选模块的诉求。通过抽取通用的筛选逻辑并为 `FilterEngine` 赋予紧凑变体模式，可以在零重复代码的前提下大幅提升计划编排效率。

### 目标
1. 抽离通用的卡片筛选状态更新逻辑（可由 `useCardFilter` 或纯工具函数统一管理），收敛各维度的 toggle 与重置操作。
2. 增强 `FilterEngine` 组件，支持 `variant="compact"` 紧凑展示模式（适配侧边栏/编辑器等空间受限场景，调整内边距、Tag 尺寸与紧凑排版）。
3. 重构 `CardPickerPanel`，移除旧版私有的单选过滤状态，全面接入 `FilterEngine` 并保证纵向滚动与视口弹性适配。

### 基本原理
1. **状态与纯函数收敛**：通过统一的查询更新器管理 `CardQueryOptions` 的各维度状态流转，避免在不同页面重复编写数组过滤与 Set 操作。
2. **展现层参数化（Variant Pattern）**：`FilterEngine` 通过 `variant` 属性区分主页宽屏大卡片模式与侧边栏嵌入模式，复用同一套五维标签配置矩阵（`DOMAIN_TAGS`, `PATH_TAGS` 等）和多语言标签绑定。
3. **弹性视口约束**：在 `CardPickerPanel` 中保持 `flex flex-col min-h-0` 约束，确保高级筛选展开或折叠时，下方卡片列表自适应滚动，杜绝容器溢出。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/plan-editor-filter #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 抽取通用的卡片查询过滤 Hook `useCardFilter`

创建 `src/hooks/useCardFilter.ts`，收敛关键字、Pack 以及五维标签的增删切变、重置判断与匹配结果推导。

~~~~~act
write_file
src/hooks/useCardFilter.ts
~~~~~
~~~~~typescript
import { useMemo, useState } from 'preact/hooks';
import { registry } from '../core/registry';
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';

export interface UseCardFilterOptions {
  initialQuery?: CardQueryOptions;
  onQueryChange?: (query: CardQueryOptions) => void;
}

export function useCardFilter(options: UseCardFilterOptions = {}) {
  const [query, setQuery] = useState<CardQueryOptions>(options.initialQuery || {});

  const updateQuery = (nextQuery: CardQueryOptions) => {
    setQuery(nextQuery);
    options.onQueryChange?.(nextQuery);
  };

  const handleSearchChange = (val: string) => {
    updateQuery({
      ...query,
      searchKeyword: val || undefined,
    });
  };

  const toggleDomain = (domain: VisualDomainTag) => {
    const current = query.domains || [];
    const next = current.includes(domain)
      ? current.filter((d) => d !== domain)
      : [...current, domain];
    updateQuery({ ...query, domains: next.length > 0 ? next : undefined });
  };

  const togglePath = (path: CognitivePathTag) => {
    const current = query.paths || [];
    const next = current.includes(path) ? current.filter((p) => p !== path) : [...current, path];
    updateQuery({ ...query, paths: next.length > 0 ? next : undefined });
  };

  const toggleChallenge = (challenge: MentalChallengeTag) => {
    const current = query.challenges || [];
    const next = current.includes(challenge)
      ? current.filter((c) => c !== challenge)
      : [...current, challenge];
    updateQuery({ ...query, challenges: next.length > 0 ? next : undefined });
  };

  const toggleInteraction = (interaction: InteractionTag) => {
    const current = query.interactions || [];
    const next = current.includes(interaction)
      ? current.filter((i) => i !== interaction)
      : [...current, interaction];
    updateQuery({ ...query, interactions: next.length > 0 ? next : undefined });
  };

  const toggleStatus = (status: CardStatusTag) => {
    const current = query.statuses || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateQuery({ ...query, statuses: next.length > 0 ? next : undefined });
  };

  const handleSelectPack = (packId?: string) => {
    updateQuery({
      ...query,
      packId: packId || undefined,
    });
  };

  const toggleAdvancedOpen = () => {
    updateQuery({
      ...query,
      showAdvanced: !query.showAdvanced,
    });
  };

  const handleResetFilters = () => {
    updateQuery(query.showAdvanced ? { showAdvanced: true } : {});
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

  const matchedCards: CardDefinition[] = useMemo(() => {
    return registry.queryCards(query);
  }, [query]);

  return {
    query,
    setQuery: updateQuery,
    matchedCards,
    totalMatches: matchedCards.length,
    hasActiveFilters,
    isAdvancedOpen: Boolean(query.showAdvanced),
    handleSearchChange,
    toggleDomain,
    togglePath,
    toggleChallenge,
    toggleInteraction,
    toggleStatus,
    handleSelectPack,
    toggleAdvancedOpen,
    handleResetFilters,
  };
}
~~~~~

#### Acts 2: 升级 `FilterEngine.tsx` 支持紧凑变体与通用驱动

支持 `variant="compact"` 模式，优化狭小容器中的边距、圆角与 Tag 尺寸，并无缝支持受控或非受控数据源。

~~~~~act
write_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript
import {
  Boxes,
  Brain,
  Compass,
  Eye,
  Filter,
  FlaskConical,
  MousePointer,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-preact';
import {
  CHALLENGE_TAGS,
  DOMAIN_TAGS,
  INTERACTION_TAGS,
  PATH_TAGS,
  STATUS_TAGS,
} from '../../config/tags';
import { getPackTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';
import { TagPill } from '../common/TagPill';

interface FilterEngineProps {
  query: CardQueryOptions;
  totalMatches: number;
  variant?: 'default' | 'compact';
  className?: string;
  onChange: (newQuery: CardQueryOptions) => void;
}

export function FilterEngine({
  query,
  totalMatches,
  variant = 'default',
  className = '',
  onChange,
}: FilterEngineProps) {
  const { t } = useTranslation();

  const isCompact = variant === 'compact';
  const isAdvancedOpen = Boolean(query.showAdvanced);

  const toggleAdvancedOpen = () => {
    onChange({
      ...query,
      showAdvanced: !isAdvancedOpen,
    });
  };

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
    onChange(isAdvancedOpen ? { showAdvanced: true } : {});
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

  const containerClasses = isCompact
    ? `w-full bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-2.5 flex-shrink-0 ${className}`
    : `w-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${className}`;

  const tagSize = isCompact ? 'sm' : 'md';

  return (
    <div className={containerClasses}>
      {/* 顶栏：搜索框与操作控制 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search
            className={`${
              isCompact ? 'w-3.5 h-3.5 left-3' : 'w-4 h-4 left-3.5'
            } text-slate-400 absolute top-1/2 -translate-y-1/2 pointer-events-none`}
          />
          <input
            type="text"
            value={query.searchKeyword || ''}
            onInput={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
            placeholder={t('home.searchPlaceholder')}
            className={`w-full ${
              isCompact
                ? 'pl-8 pr-8 py-1.5 text-xs rounded-xl'
                : 'pl-10 pr-10 py-2.5 text-xs rounded-2xl'
            } bg-white hover:bg-slate-100/60 focus:bg-white font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400 placeholder:font-normal`}
          />
          {query.searchKeyword && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0">
          {!isCompact && (
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t('home.matchedModules', { count: totalMatches })}</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleAdvancedOpen}
            className={`${
              isCompact ? 'px-2.5 py-1.5 text-[11px] rounded-lg' : 'px-3 py-2 text-xs rounded-xl'
            } font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isAdvancedOpen
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3 h-3 text-indigo-600" />
            <span>
              {isAdvancedOpen ? t('home.collapseAdvancedFilter') : t('home.advancedFilter')}
            </span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className={`${
                isCompact ? 'px-2 py-1.5 text-[11px] rounded-lg' : 'px-2.5 py-2 text-xs rounded-xl'
              } font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 transition-all flex items-center gap-1 cursor-pointer`}
              title={t('common.clear')}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('common.clear')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className={`space-y-1.5 border-t border-slate-200/60 ${isCompact ? 'pt-2' : 'pt-3'}`}>
          <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            {t('home.allPacks')}
          </div>
          <div className="flex flex-wrap gap-1">
            <TagPill
              size={tagSize}
              label={t('home.allPacks')}
              selected={!query.packId}
              onClick={() => handleSelectPack(undefined)}
            />
            {packs.map((p) => (
              <TagPill
                key={p.packId}
                size={tagSize}
                label={getPackTitle(p, t)}
                count={p.cards.length}
                selected={query.packId === p.packId}
                onClick={() => handleSelectPack(query.packId === p.packId ? undefined : p.packId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 高级五维标签矩阵折叠区 */}
      {isAdvancedOpen && (
        <div
          className={`space-y-2.5 border-t border-slate-200/60 ${
            isCompact ? 'pt-2 max-h-52 overflow-y-auto pr-1' : 'pt-3.5 space-y-3.5'
          } animate-in fade-in duration-150`}
        >
          {/* 1. 视觉域维度 (Visual Domain) */}
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3 text-indigo-500" />
              {t('home.domainSection')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((d) => (
                <TagPill
                  key={d}
                  size={tagSize}
                  label={t(DOMAIN_TAGS[d].i18nKey)}
                  themeColor={DOMAIN_TAGS[d].themeColor || 'indigo'}
                  selected={query.domains?.includes(d) ?? false}
                  onClick={() => toggleDomain(d)}
                />
              ))}
            </div>
          </div>

          {/* 2. 认知路径维度 (Cognitive Path) */}
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-500" />
              {t('home.pathSection')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((p) => (
                <TagPill
                  key={p}
                  size={tagSize}
                  label={t(PATH_TAGS[p].i18nKey)}
                  themeColor={PATH_TAGS[p].themeColor || 'emerald'}
                  selected={query.paths?.includes(p) ?? false}
                  onClick={() => togglePath(p)}
                />
              ))}
            </div>
          </div>

          {/* 3. 心智抗性维度 (Mental Challenge) */}
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3 text-rose-500" />
              {t('home.challengeSection')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((c) => (
                <TagPill
                  key={c}
                  size={tagSize}
                  label={t(CHALLENGE_TAGS[c].i18nKey)}
                  themeColor={CHALLENGE_TAGS[c].themeColor || 'rose'}
                  selected={query.challenges?.includes(c) ?? false}
                  onClick={() => toggleChallenge(c)}
                />
              ))}
            </div>
          </div>

          {/* 4. 交互形态维度 (Interaction Mode) */}
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-amber-500" />
              {t('home.interactionSection')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(INTERACTION_TAGS) as InteractionTag[]).map((i) => (
                <TagPill
                  key={i}
                  size={tagSize}
                  label={t(INTERACTION_TAGS[i].i18nKey)}
                  themeColor={INTERACTION_TAGS[i].themeColor || 'amber'}
                  selected={query.interactions?.includes(i) ?? false}
                  onClick={() => toggleInteraction(i)}
                />
              ))}
            </div>
          </div>

          {/* 5. 特性与发布状态 (Status Tag) */}
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-purple-500" />
              {t('home.statusSection')}
            </div>
            <div className="flex flex-wrap gap-1">
              {(['stable', 'experimental'] as CardStatusTag[]).map((st) => (
                <TagPill
                  key={st}
                  size={tagSize}
                  label={t(STATUS_TAGS[st].i18nKey)}
                  themeColor={
                    STATUS_TAGS[st].themeColor || (st === 'stable' ? 'indigo' : 'purple')
                  }
                  selected={query.statuses?.includes(st) ?? false}
                  onClick={() => toggleStatus(st)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 3: 重构 `CardPickerPanel.tsx` 接入统一筛选器

移除原有的手写单选筛选与搜索逻辑，无缝嵌入 `<FilterEngine variant="compact" />` 并管理纵向滚动与模块增添。

~~~~~act
write_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~typescript
import { Plus, Sparkles } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { CardQueryOptions } from '../../../types/card';
import { FilterEngine } from '../../discovery/FilterEngine';

interface CardPickerPanelProps {
  isAddingCard: boolean;
  onToggleAdding: (val: boolean) => void;
  onAddItem: (cardId: string) => void;
}

export function CardPickerPanel({ isAddingCard, onToggleAdding, onAddItem }: CardPickerPanelProps) {
  const { t } = useTranslation();
  const [filterQuery, setFilterQuery] = useState<CardQueryOptions>({});

  const availableCards = registry.queryCards(filterQuery);

  if (!isAddingCard) {
    return (
      <button
        type="button"
        onClick={() => onToggleAdding(true)}
        className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        {t('plan.addStage')}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3 min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-extrabold text-slate-700">
            {t('plan.selectCardPrompt')}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {t('home.matchedModules', { count: availableCards.length })}
        </span>
      </div>

      {/* 嵌入紧凑变体的完整五维筛选引擎 */}
      <FilterEngine
        variant="compact"
        query={filterQuery}
        totalMatches={availableCards.length}
        onChange={setFilterQuery}
      />

      {/* 模块列表：自适应拉伸并滚动 */}
      {availableCards.length === 0 ? (
        <div className="flex-1 min-h-[160px] flex items-center justify-center p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          {t('plan.noCardMatched')}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 min-h-0 content-start">
          {availableCards.map((card) => {
            const Icon = card.icon;
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);
            return (
              <button
                type="button"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 rounded-2xl text-left transition-all flex items-center justify-between gap-2 group active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1.5 rounded-xl bg-white text-indigo-600 shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cardDesc}</div>
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

### 下一步建议
1. **测试验证**：运行 `npm test` 确认各模块与计划编排逻辑没有引入回归。
2. **提交封装**：确认无误后，可以生成一个独立的 `[COMMIT]` 计划将这部分改动提交至 Git 仓库。
