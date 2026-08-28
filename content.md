好的，我将为你重构首页的 `FilterEngine.tsx`，将默认展示降维为直观的场景与视觉域主 Tab，并将学术化的五维正交矩阵收纳至清晰的“高级认知维度”抽屉中。

## [WIP] refactor(discovery): 重构首页筛选引擎为直观场景 Tab 与折叠式专家维度

### 用户需求
将首页原本过载的“五维学术化正交筛选（视觉域/认知路径/心智抗性/交互模式/状态）”降维，默认提供直观的训练大类 Tab（形体比例、空间结构、色彩明度、动态图底等），使普通用户能够一键定位训练目标，同时保留可按需展开的专家级多维筛选。

### 评论
首页是用户进入软件的第一个决策窗口。此前直接铺开 5 个高密度学术维度（如“自底向上提炼概括”、“图底反转”等），会导致普通用户产生严重的认知过载和决策疲劳。将其重构为“直观主分类 Tab + 扩展包快速切换 + 高级认知维度按需展开”的三层递进结构，既保证了 0 门槛的易用性，又保留了专业探索能力。

### 目标
1. **直观主 Tab 化**：在顶层直观展示“全部模块”、“形体与比例”、“空间与结构”、“色彩与明度”、“动态与图底”等视觉大类 Tab，支持单选/多选聚焦。
2. **轻量化扩展包 (Pack) 切换**：以胶囊标签形式呈现扩展包选择与数量角标。
3. **收敛高级维度**：将“认知路径”、“心智抗性”、“交互形态”等学术维度折叠入“高级维度 / 专家筛选”中，并在按钮上动态展示已激活的过滤项计数。
4. **完善国际化文案**：补充相关辅助文案（如 `advancedFilter`、`activeFiltersBadge` 等）。

### 基本原理
- 采用**渐进式呈现（Progressive Disclosure）**设计原则：80% 的用户通过搜索栏和 4 个直观视觉域 Tab 即可在 1 秒内找到目标；20% 探索型用户可通过“高级维度”展开精细的多维交叉检索。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/discovery #task/object/filter-engine #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 更新国际化词条

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "matchedModules": "已匹配 {{count}} 个训练模块",
    "expandFilter": "多维筛选",
    "collapseFilter": "收起筛选",
    "searchPlaceholder": "搜索训练卡片名称、编号或认知要领...",
    "noMatchTitle": "未找到符合条件的训练模块",
    "noMatchDesc": "尝试调整或清空当前的多维筛选标签、搜索关键字，以探索更多训练模块。",
    "resetFilter": "重置所有筛选条件",
    "allPacks": "全部 Packs",
    "domainSection": "1. 基础视觉域 (Visual Domain)",
    "pathSection": "2. 认知推演路径 (Cognitive Path)",
    "challengeSection": "3. 核心心智抗性 (Mental Challenge)",
    "interactionSection": "4. 交互评估形态 (Interaction Mode)",
    "statusSection": "5. 特性与发布状态 (Status)"
~~~~~
~~~~~json.new
    "matchedModules": "已匹配 {{count}} 个训练模块",
    "allModules": "全部训练模块",
    "expandFilter": "高级认知维度",
    "collapseFilter": "收起高级维度",
    "activeFiltersCount": "{{count}} 项已选",
    "searchPlaceholder": "搜索卡片名称、编号或视觉要领...",
    "noMatchTitle": "未找到符合条件的训练模块",
    "noMatchDesc": "尝试调整或清空当前的多维筛选标签、搜索关键字，以探索更多训练模块。",
    "resetFilter": "重置所有筛选条件",
    "allPacks": "全部扩展包",
    "domainSection": "视觉域大类",
    "pathSection": "认知推演路径 (Cognitive Path)",
    "challengeSection": "核心心智抗性 (Mental Challenge)",
    "interactionSection": "交互评估形态 (Interaction Mode)",
    "statusSection": "特性与发布状态 (Status)"
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "matchedModules": "Matched {{count}} training modules",
    "expandFilter": "Multi-Filter",
    "collapseFilter": "Collapse Filter",
    "searchPlaceholder": "Search by module name, ID, or visual concept...",
    "noMatchTitle": "No matching modules found",
    "noMatchDesc": "Try clearing or tweaking your filter tags or search keyword to discover more modules.",
    "resetFilter": "Reset All Filters",
    "allPacks": "All Packs",
    "domainSection": "1. Visual Domain",
    "pathSection": "2. Cognitive Path",
    "challengeSection": "3. Mental Challenge",
    "interactionSection": "4. Interaction Mode",
    "statusSection": "5. Feature & Status"
~~~~~
~~~~~json.new
    "matchedModules": "Matched {{count}} modules",
    "allModules": "All Modules",
    "expandFilter": "Advanced Dimensions",
    "collapseFilter": "Collapse Dimensions",
    "activeFiltersCount": "{{count}} active",
    "searchPlaceholder": "Search by module name, ID, or visual concept...",
    "noMatchTitle": "No matching modules found",
    "noMatchDesc": "Try clearing or tweaking your filter tags or search keyword to discover more modules.",
    "resetFilter": "Reset All Filters",
    "allPacks": "All Packs",
    "domainSection": "Visual Domains",
    "pathSection": "Cognitive Paths",
    "challengeSection": "Mental Challenges",
    "interactionSection": "Interaction Modes",
    "statusSection": "Feature & Status"
~~~~~

#### Acts 2: 重构 `FilterEngine.tsx` 实现直观 Tab + 渐进式折叠抽屉

~~~~~act
write_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx
import {
  Boxes,
  Brain,
  Check,
  Compass,
  Filter,
  FlaskConical,
  Layers,
  MousePointer,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import {
  CHALLENGE_TAGS,
  DOMAIN_TAGS,
  INTERACTION_TAGS,
  PATH_TAGS,
  STATUS_TAGS,
} from '../../config/tags';
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';

interface FilterEngineProps {
  query: CardQueryOptions;
  totalMatches: number;
  compact?: boolean;
  onChange: (newQuery: CardQueryOptions) => void;
}

export function FilterEngine({
  query,
  totalMatches,
  compact = false,
  onChange,
}: FilterEngineProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState<boolean>(!compact);

  const packs = registry.getAllPacks();
  const allCardsCount = registry.getAllCards().length;

  const handleSearchChange = (val: string) => {
    onChange({
      ...query,
      searchKeyword: val || undefined,
    });
  };

  // 单选/反选主视觉域 Tab
  const handleSelectPrimaryDomain = (domain?: VisualDomainTag) => {
    if (!domain) {
      onChange({ ...query, domains: undefined });
    } else {
      const isCurrentSingle = query.domains?.length === 1 && query.domains[0] === domain;
      onChange({ ...query, domains: isCurrentSingle ? undefined : [domain] });
    }
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
    onChange({});
  };

  // 统计高级维度激活数量（不含主搜索词与 Pack）
  const advancedFiltersCount =
    (query.paths?.length || 0) +
    (query.challenges?.length || 0) +
    (query.interactions?.length || 0) +
    (query.statuses?.length || 0);

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      query.packId ||
      (query.domains && query.domains.length > 0) ||
      advancedFiltersCount > 0,
  );

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* 1. 顶栏：快速搜索条与操作按钮 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query.searchKeyword || ''}
            onInput={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
            placeholder={t('home.searchPlaceholder')}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400 placeholder:font-normal"
          />
          {query.searchKeyword && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t('home.matchedModules', { count: totalMatches })}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showAdvanced || advancedFiltersCount > 0
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showAdvanced ? t('home.collapseFilter') : t('home.expandFilter')}</span>
            {advancedFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-mono">
                {advancedFiltersCount}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title={t('common.clear')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('common.clear')}
            </button>
          )}
        </div>
      </div>

      {/* 2. 直观主 Tab 栏：基础视觉大类快速切换 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => handleSelectPrimaryDomain(undefined)}
          className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
            !query.domains || query.domains.length === 0
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t('home.allModules')}</span>
          <span className="text-[10px] font-mono opacity-80 ml-0.5">{allCardsCount}</span>
        </button>

        {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => {
          const isSelected = query.domains?.includes(domain) ?? false;
          const tagMeta = DOMAIN_TAGS[domain];
          const count = registry.queryCards({ domains: [domain] }).length;

          return (
            <button
              type="button"
              key={domain}
              onClick={() => handleSelectPrimaryDomain(domain)}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-700 border border-slate-200/80 hover:border-indigo-300'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5" />}
              <span>{t(tagMeta.i18nKey)}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200/80 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. 扩展包 (Pack) 胶囊筛选栏 */}
      {packs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0 mr-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            <span>Packs:</span>
          </div>

          <button
            type="button"
            onClick={() => handleSelectPack(undefined)}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer ${
              !query.packId
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-black shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {!query.packId && <Check className="w-3 h-3" />}
            <span>{t('home.allPacks')}</span>
          </button>

          {packs.map((p) => {
            const isSelected = query.packId === p.packId;
            const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
            return (
              <button
                type="button"
                key={p.packId}
                onClick={() => handleSelectPack(isSelected ? undefined : p.packId)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-black shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
                <span>{packTitle}</span>
                <span className="text-[10px] font-mono opacity-70">({p.cards.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. 折叠展开区：高级认知推演维度 (Cognitive Dimensions) */}
      {showAdvanced && (
        <div className="space-y-3.5 pt-3 border-t border-slate-100 animate-in fade-in duration-150">
          {/* 4.1 视觉域多选微调 */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-500" />
              {t('home.domainSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((d) => {
                const isSelected = query.domains?.includes(d) ?? false;
                const tagMeta = DOMAIN_TAGS[d];
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDomain(d)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4.2 认知推演路径 (Cognitive Path) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-500" />
              {t('home.pathSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((p) => {
                const isSelected = query.paths?.includes(p) ?? false;
                const tagMeta = PATH_TAGS[p];
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePath(p)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-emerald-50/60 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4.3 心智抗性与错觉剥离 (Mental Challenge) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3 text-rose-500" />
              {t('home.challengeSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((c) => {
                const isSelected = query.challenges?.includes(c) ?? false;
                const tagMeta = CHALLENGE_TAGS[c];
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleChallenge(c)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-rose-50/60 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4.4 交互形态维度 (Interaction Mode) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-amber-500" />
              {t('home.interactionSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(INTERACTION_TAGS) as InteractionTag[]).map((i) => {
                const isSelected = query.interactions?.includes(i) ?? false;
                const tagMeta = INTERACTION_TAGS[i];
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleInteraction(i)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-amber-50/60 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4.5 模块发布状态 (Status Tag) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-purple-500" />
              {t('home.statusSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['stable', 'experimental'] as CardStatusTag[]).map((st) => {
                const isSelected = query.statuses?.includes(st) ?? false;
                const tagMeta = STATUS_TAGS[st];
                return (
                  <button
                    type="button"
                    key={st}
                    onClick={() => toggleStatus(st)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? st === 'stable'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {st === 'stable' ? (
                      <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <FlaskConical className="w-3 h-3 text-amber-500" />
                    )}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. **代码检查与验收**：运行 `npm run check` 确保所有组件类型与规范无误。
2. **体验检查**：测试首页主视觉域 Tab 与搜索的即时过滤反应，验证折叠/展开高级维度的顺滑度。
