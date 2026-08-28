import { Plus, Search, Sparkles, X } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { DOMAIN_TAGS } from '../../../config/tags';
import { useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { CardQueryOptions, VisualDomainTag } from '../../../types/card';

interface CardPickerPanelProps {
  isAddingCard: boolean;
  onToggleAdding: (val: boolean) => void;
  onAddItem: (cardId: string) => void;
}

export function CardPickerPanel({ isAddingCard, onToggleAdding, onAddItem }: CardPickerPanelProps) {
  const { t } = useTranslation();
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<VisualDomainTag | 'all'>('all');
  const [selectedPackId, setSelectedPackId] = useState<string>('all');

  const packs = registry.getAllPacks();

  const queryOptions: CardQueryOptions = useMemo(() => {
    return {
      searchKeyword: searchKeyword || undefined,
      domains: selectedDomain !== 'all' ? [selectedDomain] : undefined,
      packId: selectedPackId !== 'all' ? selectedPackId : undefined,
    };
  }, [searchKeyword, selectedDomain, selectedPackId]);

  const availableCards = useMemo(() => {
    return registry.queryCards(queryOptions);
  }, [queryOptions]);

  if (!isAddingCard) {
    return (
      <button
        type="button"
        onClick={() => onToggleAdding(true)}
        className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
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
          <span className="text-xs font-extrabold text-slate-700">{t('plan.selectCardPrompt')}</span>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative flex-shrink-0">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchKeyword}
          onInput={(e) => setSearchKeyword((e.target as HTMLInputElement).value)}
          placeholder={t('home.searchPlaceholder')}
          className="w-full pl-8 pr-8 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {searchKeyword && (
          <button
            type="button"
            onClick={() => setSearchKeyword('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Pack 与视觉域快速筛选行 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setSelectedDomain('all');
            setSelectedPackId('all');
          }}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
            selectedDomain === 'all' && selectedPackId === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          {t('common.all')} ({registry.getAllCards().length})
        </button>

        {packs.map((p) => {
          const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
          return (
            <button
              type="button"
              key={p.packId}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setSelectedPackId(selectedPackId === p.packId ? 'all' : p.packId);
                setSelectedDomain('all');
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                selectedPackId === p.packId
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {packTitle}
            </button>
          );
        })}

        {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
          <button
            type="button"
            key={domain}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              setSelectedDomain(selectedDomain === domain ? 'all' : domain);
              setSelectedPackId('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
              selectedDomain === domain
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {t(DOMAIN_TAGS[domain].i18nKey)}
          </button>
        ))}
      </div>

      {/* 模块列表：自适应拉伸并滚动 */}
      {availableCards.length === 0 ? (
        <div className="flex-1 min-h-[220px] flex items-center justify-center p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          {t('plan.noCardMatched')}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 min-h-0 content-start">
          {availableCards.map((card) => {
            const Icon = card.icon;
            const cardTitle =
              t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';
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
