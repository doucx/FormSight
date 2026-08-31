import { Boxes, Filter, RotateCcw, Search, Sparkles, X } from 'lucide-preact';
import { getPackTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { CardQueryOptions } from '../../types/card';
import { TagPill } from '../common/TagPill';
import { AdvancedTagMatrix, FilterSectionHeader } from './AdvancedTagMatrix';

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
  const packs = registry.getAllPacks();

  const toggleDimension = <T extends string>(key: keyof CardQueryOptions, value: T) => {
    const current = (query[key] as T[] | undefined) || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...query, [key]: next.length > 0 ? next : undefined });
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
    ? `w-full bg-muted/80 border border-border rounded-2xl p-3 space-y-2.5 flex-shrink-0 ${className}`
    : `w-full bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${className}`;

  const tagSize = isCompact ? 'sm' : 'md';

  return (
    <div className={containerClasses}>
      {/* 顶栏：搜索框与操作控制 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search
            className={`${
              isCompact ? 'w-3.5 h-3.5 left-3' : 'w-4 h-4 left-3.5'
            } text-muted-foreground absolute top-1/2 -translate-y-1/2 pointer-events-none`}
          />
          <input
            type="text"
            value={query.searchKeyword || ''}
            onInput={(e) =>
              onChange({
                ...query,
                searchKeyword: (e.target as HTMLInputElement).value || undefined,
              })
            }
            placeholder={t('home.searchPlaceholder')}
            className={`w-full ${
              isCompact
                ? 'pl-8 pr-8 py-1.5 text-xs rounded-xl'
                : 'pl-10 pr-10 py-2.5 text-xs rounded-2xl'
            } bg-white dark:bg-muted hover:bg-muted/60 dark:hover:bg-muted/80 focus:bg-white dark:focus:bg-muted font-bold text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-muted-foreground placeholder:font-normal`}
          />
          {query.searchKeyword && (
            <button
              type="button"
              onClick={() => onChange({ ...query, searchKeyword: undefined })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0">
          {!isCompact && (
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 px-3 py-2 bg-muted border border-border/60 rounded-xl text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{t('home.matchedModules', { count: totalMatches })}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onChange({ ...query, showAdvanced: !isAdvancedOpen })}
            className={`${
              isCompact ? 'px-2.5 py-1.5 text-[11px] rounded-lg' : 'px-3 py-2 text-xs rounded-xl'
            } font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isAdvancedOpen
                ? 'bg-accent text-primary border-border dark:border-border shadow-xs'
                : 'bg-white dark:bg-muted text-muted-foreground border-border hover:bg-accent/60'
            }`}
          >
            <Filter className="w-3 h-3 text-primary" />
            <span>
              {isAdvancedOpen ? t('home.collapseAdvancedFilter') : t('home.advancedFilter')}
            </span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onChange(isAdvancedOpen ? { showAdvanced: true } : {})}
              className={`${
                isCompact ? 'px-2 py-1.5 text-[11px] rounded-lg' : 'px-2.5 py-2 text-xs rounded-xl'
              } font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 dark:border-rose-900/60 transition-all flex items-center gap-1 cursor-pointer`}
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
        <div
          className={`space-y-1 border-t border-border/60 dark:border-border ${isCompact ? 'pt-1.5' : 'pt-3'}`}
        >
          <FilterSectionHeader icon={Boxes} title={t('home.allPacks')} />
          <div
            className={`flex gap-1 items-center ${
              isCompact ? 'flex-nowrap overflow-x-auto pb-1.5 scrollbar-none' : 'flex-wrap'
            }`}
          >
            <TagPill
              size={tagSize}
              label={t('home.allPacks')}
              selected={!query.packId}
              onClick={() => onChange({ ...query, packId: undefined })}
            />
            {packs.map((p) => (
              <TagPill
                key={p.packId}
                size={tagSize}
                label={getPackTitle(p, t)}
                count={p.cards.length}
                selected={query.packId === p.packId}
                onClick={() =>
                  onChange({ ...query, packId: query.packId === p.packId ? undefined : p.packId })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* 高级五维标签矩阵折叠区 */}
      {isAdvancedOpen && (
        <AdvancedTagMatrix
          query={query}
          tagSize={tagSize}
          isCompact={isCompact}
          onToggleDomain={(d) => toggleDimension('domains', d)}
          onTogglePath={(p) => toggleDimension('paths', p)}
          onToggleChallenge={(c) => toggleDimension('challenges', c)}
          onToggleInteraction={(i) => toggleDimension('interactions', i)}
          onToggleStatus={(st) => toggleDimension('statuses', st)}
        />
      )}
    </div>
  );
}
