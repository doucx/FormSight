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