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