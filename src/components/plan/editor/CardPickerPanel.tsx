import { Plus, Search, Sparkles, X } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { registry } from '../../../core/registry';
import type { CardQueryOptions, CognitiveSkillTag } from '../../../types/card';
import { SKILL_TAG_LABELS } from '../../discovery/FilterEngine';

interface CardPickerPanelProps {
  isAddingCard: boolean;
  onToggleAdding: (val: boolean) => void;
  onAddItem: (cardId: string) => void;
}

export function CardPickerPanel({ isAddingCard, onToggleAdding, onAddItem }: CardPickerPanelProps) {
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<CognitiveSkillTag | 'all'>('all');
  const [selectedPackId, setSelectedPackId] = useState<string>('all');

  const packs = registry.getAllPacks();

  const queryOptions: CardQueryOptions = useMemo(() => {
    return {
      searchKeyword: searchKeyword || undefined,
      skills: selectedSkill !== 'all' ? [selectedSkill] : undefined,
      packId: selectedPackId !== 'all' ? selectedPackId : undefined,
    };
  }, [searchKeyword, selectedSkill, selectedPackId]);

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
        添加训练阶段
      </button>
    );
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">挑选需要加入训练流的模块：</span>
        </div>
        <button
          type="button"
          onClick={() => onToggleAdding(false)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          收起
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchKeyword}
          onInput={(e) => setSearchKeyword((e.target as HTMLInputElement).value)}
          placeholder="搜索模块名称或要领..."
          className="w-full pl-8 pr-8 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {searchKeyword && (
          <button
            type="button"
            onClick={() => setSearchKeyword('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Pack 与认知技能快速筛选行 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setSelectedSkill('all');
            setSelectedPackId('all');
          }}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
            selectedSkill === 'all' && selectedPackId === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          全部 ({registry.getAllCards().length})
        </button>

        {packs.map((p) => (
          <button
            type="button"
            key={p.packId}
            onClick={() => {
              setSelectedPackId(selectedPackId === p.packId ? 'all' : p.packId);
              setSelectedSkill('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
              selectedPackId === p.packId
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {p.meta.title}
          </button>
        ))}

        {(Object.keys(SKILL_TAG_LABELS) as CognitiveSkillTag[]).map((skill) => (
          <button
            type="button"
            key={skill}
            onClick={() => {
              setSelectedSkill(selectedSkill === skill ? 'all' : skill);
              setSelectedPackId('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
              selectedSkill === skill
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {SKILL_TAG_LABELS[skill]}
          </button>
        ))}
      </div>

      {/* 模块列表 */}
      {availableCards.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
          未搜索到匹配的训练模块
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
          {availableCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                type="button"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className="p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 rounded-xl text-left transition-all flex items-center justify-between gap-2 group active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{card.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{card.desc}</div>
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
