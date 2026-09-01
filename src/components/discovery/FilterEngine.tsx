import { Filter, RotateCcw, Search, Sparkles, X } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { CardQueryOptions } from '../../types/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AdvancedTagMatrix } from './AdvancedTagMatrix';

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

  const toggleDimension = <T extends string>(key: keyof CardQueryOptions, value: T) => {
    const current = (query[key] as T[] | undefined) || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...query, [key]: next.length > 0 ? next : undefined });
  };

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
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
            } text-muted-foreground absolute top-1/2 -translate-y-1/2 pointer-events-none z-10`}
          />
          <Input
            inputSize={isCompact ? 'sm' : 'default'}
            value={query.searchKeyword || ''}
            onInput={(e) =>
              onChange({
                ...query,
                searchKeyword: (e.target as HTMLInputElement).value || undefined,
              })
            }
            placeholder={t('home.searchPlaceholder')}
            className={isCompact ? 'pl-8 pr-8' : 'pl-10 pr-10'}
          />
          {query.searchKeyword && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => onChange({ ...query, searchKeyword: undefined })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-6 w-6 z-10"
              title={t('common.clear')}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0">
          {!isCompact && (
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 px-3 py-2 bg-muted border border-border/60 rounded-xl text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{t('home.matchedModules', { count: totalMatches })}</span>
            </div>
          )}

          <Button
            variant={isAdvancedOpen ? 'accent' : 'outline'}
            size={isCompact ? 'sm' : 'default'}
            onClick={() => onChange({ ...query, showAdvanced: !isAdvancedOpen })}
            className="gap-1.5 h-auto py-2"
          >
            <Filter className="w-3 h-3 text-primary" />
            <span>
              {isAdvancedOpen ? t('home.collapseAdvancedFilter') : t('home.advancedFilter')}
            </span>
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size={isCompact ? 'sm' : 'default'}
              onClick={() => onChange(isAdvancedOpen ? { showAdvanced: true } : {})}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900/60 gap-1 h-auto py-2"
              title={t('common.clear')}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('common.clear')}</span>
            </Button>
          )}
        </div>
      </div>

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
