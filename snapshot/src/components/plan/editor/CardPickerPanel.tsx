import { Plus } from 'lucide-preact';
import type { CardDefinition } from '../../../types/card';
import { DOMAINS_CONFIG } from '../../../config/domains';

interface CardPickerPanelProps {
  isAddingCard: boolean;
  selectedDomainFilter: string;
  availableCards: CardDefinition[];
  onToggleAdding: (val: boolean) => void;
  onSelectDomainFilter: (domain: string) => void;
  onAddItem: (cardId: string) => void;
}

export function CardPickerPanel({
  isAddingCard,
  selectedDomainFilter,
  availableCards,
  onToggleAdding,
  onSelectDomainFilter,
  onAddItem,
}: CardPickerPanelProps) {
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
        <span className="text-xs font-bold text-slate-700">挑选需要添加的训练模块：</span>
        <button
          type="button"
          onClick={() => onToggleAdding(false)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          收起
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => onSelectDomainFilter('all')}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
            selectedDomainFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          全部
        </button>
        {Object.values(DOMAINS_CONFIG).map((d) => (
          <button
            type="button"
            key={d.domain}
            onClick={() => onSelectDomainFilter(d.domain)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
              selectedDomainFilter === d.domain
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {d.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
        {availableCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              type="button"
              key={card.id}
              onClick={() => onAddItem(card.id)}
              className="p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 rounded-xl text-left transition-all flex items-center gap-2 group active:scale-95"
            >
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform flex-shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-800 line-clamp-1">{card.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}