import { Check, Plus, Sparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { CardQueryOptions } from '../../../types/card';
import { FilterEngine } from '../../discovery/FilterEngine';
import { Button } from '../../ui/button';

interface CardPickerPanelProps {
  addedCardIds?: string[];
  onAddItem: (cardId: string) => void;
}

export function CardPickerPanel({ addedCardIds = [], onAddItem }: CardPickerPanelProps) {
  const { t } = useTranslation();
  const [filterQuery, setFilterQuery] = useState<CardQueryOptions>({});

  const availableCards = registry.queryCards(filterQuery);

  // 统计各 cardId 在当前计划中的已添加频次
  const addedCountsMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of addedCardIds) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
  }, [addedCardIds]);

  return (
    <div className="flex flex-col h-full space-y-3 min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-extrabold text-foreground">
            {t('plan.selectCardPrompt')}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
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
        <div className="flex-1 min-h-[160px] flex items-center justify-center p-6 text-center text-xs text-muted-foreground bg-muted/40 rounded-2xl border border-dashed border-border">
          {t('plan.noCardMatched')}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 min-h-0 content-start">
          {availableCards.map((card) => {
            const Icon = card.icon;
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);
            const addedCount = addedCountsMap.get(card.id) || 0;
            const isAdded = addedCount > 0;

            const cardBgStyle = isAdded
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 border-emerald-300 dark:border-emerald-800 hover:border-emerald-400 shadow-xs'
              : 'bg-muted/60 hover:bg-accent/60 border-border hover:border-primary/60';

            const iconBgStyle = isAdded
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-card text-primary shadow-xs group-hover:scale-105';

            return (
              <Button
                variant="ghost"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className={`p-2.5 h-auto rounded-2xl text-left transition-all flex items-center justify-between gap-2 group border ${cardBgStyle}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`p-1.5 rounded-xl transition-transform flex-shrink-0 ${iconBgStyle}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold truncate ${
                          isAdded ? 'text-emerald-800 dark:text-emerald-200' : 'text-foreground'
                        }`}
                      >
                        {cardTitle}
                      </span>
                      {isAdded && (
                        <span className="font-mono text-xs font-black bg-emerald-200/80 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded-md flex-shrink-0 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          {addedCount > 1 ? `x${addedCount}` : ''}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs truncate ${
                        isAdded
                          ? 'text-emerald-700/80 dark:text-emerald-300/80'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {cardDesc}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-1 rounded-lg flex-shrink-0 transition-colors ${
                    isAdded
                      ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60'
                      : 'text-indigo-400 group-hover:text-primary dark:group-hover:text-indigo-400 hover:bg-accent/50 dark:hover:bg-muted'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
