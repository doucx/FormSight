import { Check, Plus, Sparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { CardQueryOptions } from '../../../types/card';
import { FilterEngine } from '../../discovery/FilterEngine';

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
            const addedCount = addedCountsMap.get(card.id) || 0;
            const isAdded = addedCount > 0;

            const cardBgStyle = isAdded
              ? 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-300 hover:border-emerald-400 shadow-xs'
              : 'bg-slate-50 hover:bg-indigo-50/60 border-slate-200/80 hover:border-indigo-300';

            const iconBgStyle = isAdded
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-indigo-600 shadow-xs group-hover:scale-105';

            return (
              <button
                type="button"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className={`p-2.5 rounded-2xl text-left transition-all flex items-center justify-between gap-2 group active:scale-[0.98] border cursor-pointer ${cardBgStyle}`}
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
                          isAdded ? 'text-emerald-950' : 'text-slate-800'
                        }`}
                      >
                        {cardTitle}
                      </span>
                      {isAdded && (
                        <span className="font-mono text-[9px] font-black bg-emerald-200/80 text-emerald-800 px-1.5 py-0.2 rounded-md flex-shrink-0 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          {addedCount > 1 ? `x${addedCount}` : ''}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        isAdded ? 'text-emerald-700/80' : 'text-slate-400'
                      }`}
                    >
                      {cardDesc}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-1 rounded-lg flex-shrink-0 transition-colors ${
                    isAdded
                      ? 'text-emerald-600 hover:bg-emerald-200/60'
                      : 'text-indigo-400 group-hover:text-indigo-600 hover:bg-indigo-100/50'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}