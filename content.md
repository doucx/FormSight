好的，我将为你重构 `FilterEngine.tsx`：将多维筛选改名为“高级筛选”并默认折叠隐藏，同时在 URL Hash 参数中持久化其展开/收起状态。

## [WIP] feat(home): 将五维筛选重构为可由 URL 记忆状态的“高级筛选”并默认隐藏

### 用户需求
1. **重命名与默认折叠**：将多维筛选命名为“高级筛选”（Advanced Filters），默认保持折叠隐藏，优先呈现清晰直观的 Pack 扩展包分类标签与搜索栏。
2. **URL 状态保持**：当用户展开或收起高级筛选时，通过 URL Hash 参数（`adv=1`）同步记忆状态，使刷新或分享链接时能恢复展开/折叠视图。

### 目标
1. 在 `src/types/card.ts` 的 `CardQueryOptions` 中扩展 `showAdvanced?: boolean` 字段。
2. 在 `src/hooks/useHashRoute.ts` 中支持对 `adv` 参数的双向解析与序列化。
3. 更新 `zh-CN.json` 与 `en-US.json` 翻译词条，统一为“高级筛选”与“收起高级筛选”。
4. 改造 `src/components/discovery/FilterEngine.tsx`，默认隐藏五维面板，展开/收起时实时同步至 URL。

### 基本原理
- 默认隐藏高阶认知维度的选择器，避免新用户面临学术名词造成的认知负荷。
- 通过单向数据流将 `showAdvanced` 状态存入 URL Query Params，如果检测到 URL 中带有高阶筛选标签（如 `domains`, `paths`, `challenges` 等）或显式 `adv=1`，则自动展开，保障深度用户的工作流连续性。

### 标签
#intent/build #flow/ready #priority/high #comp/discovery #concept/navigation #scope/ux #ai/instruct #task/domain/discovery #task/object/filter-engine #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 扩展 `CardQueryOptions` 类型支持 `showAdvanced`

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~ts.old
export interface CardQueryOptions {
  packId?: string;
  domains?: VisualDomainTag[];
  paths?: CognitivePathTag[];
  challenges?: MentalChallengeTag[];
  interactions?: InteractionTag[];
  statuses?: CardStatusTag[];
  searchKeyword?: string;
}
~~~~~
~~~~~ts.new
export interface CardQueryOptions {
  packId?: string;
  domains?: VisualDomainTag[];
  paths?: CognitivePathTag[];
  challenges?: MentalChallengeTag[];
  interactions?: InteractionTag[];
  statuses?: CardStatusTag[];
  searchKeyword?: string;
  showAdvanced?: boolean;
}
~~~~~

#### Acts 2: 在路由管理器中支持 `adv` 参数序列化与解析

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~ts.old
  const searchKeyword = params.get('q') || params.get('search') || undefined;

  if (
    !packId &&
    (!domains || domains.length === 0) &&
    (!paths || paths.length === 0) &&
    (!challenges || challenges.length === 0) &&
    (!interactions || interactions.length === 0) &&
    (!statuses || statuses.length === 0) &&
    !searchKeyword
  ) {
    return undefined;
  }

  return {
    packId,
    domains: domains && domains.length > 0 ? domains : undefined,
    paths: paths && paths.length > 0 ? paths : undefined,
    challenges: challenges && challenges.length > 0 ? challenges : undefined,
    interactions: interactions && interactions.length > 0 ? interactions : undefined,
    statuses,
    searchKeyword,
  };
~~~~~
~~~~~ts.new
  const searchKeyword = params.get('q') || params.get('search') || undefined;
  const showAdvancedParam = params.get('adv');
  const showAdvanced =
    showAdvancedParam === '1' || showAdvancedParam === 'true'
      ? true
      : showAdvancedParam === '0' || showAdvancedParam === 'false'
        ? false
        : undefined;

  if (
    !packId &&
    (!domains || domains.length === 0) &&
    (!paths || paths.length === 0) &&
    (!challenges || challenges.length === 0) &&
    (!interactions || interactions.length === 0) &&
    (!statuses || statuses.length === 0) &&
    !searchKeyword &&
    showAdvanced === undefined
  ) {
    return undefined;
  }

  return {
    packId,
    domains: domains && domains.length > 0 ? domains : undefined,
    paths: paths && paths.length > 0 ? paths : undefined,
    challenges: challenges && challenges.length > 0 ? challenges : undefined,
    interactions: interactions && interactions.length > 0 ? interactions : undefined,
    statuses,
    searchKeyword,
    showAdvanced,
  };
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~ts.old
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    const qs = params.toString();
    return qs ? `#/?${qs}` : '#/';
~~~~~
~~~~~ts.new
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    if (route.query.showAdvanced) {
      params.set('adv', '1');
    }
    const qs = params.toString();
    return qs ? `#/?${qs}` : '#/';
~~~~~

#### Acts 3: 更新国际化词条

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "matchedModules": "已匹配 {{count}} 个训练模块",
    "expandFilter": "多维筛选",
    "collapseFilter": "收起筛选",
    "searchPlaceholder": "搜索训练卡片名称、编号或认知要领...",
~~~~~
~~~~~json.new
    "matchedModules": "已匹配 {{count}} 个训练模块",
    "expandFilter": "高级筛选",
    "collapseFilter": "收起高级筛选",
    "advancedFilter": "高级筛选",
    "collapseAdvancedFilter": "收起高级筛选",
    "searchPlaceholder": "搜索训练卡片名称、编号或认知要领...",
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
~~~~~
~~~~~json.new
    "matchedModules": "Matched {{count}} training modules",
    "expandFilter": "Advanced Filters",
    "collapseFilter": "Hide Advanced Filters",
    "advancedFilter": "Advanced Filters",
    "collapseAdvancedFilter": "Hide Advanced Filters",
    "searchPlaceholder": "Search by module name, ID, or visual concept...",
~~~~~

#### Acts 4: 重构 `FilterEngine.tsx` 逻辑与视图

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx.old
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
~~~~~
~~~~~tsx.new
interface FilterEngineProps {
  query: CardQueryOptions;
  totalMatches: number;
  onChange: (newQuery: CardQueryOptions) => void;
}

export function FilterEngine({
  query,
  totalMatches,
  onChange,
}: FilterEngineProps) {
  const { t } = useTranslation();

  // 若 query 中明确声明，或已勾选了任意高级五维标签，则保持展开状态；否则默认收起
  const hasActiveAdvancedDimensions = Boolean(
    (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );

  const isAdvancedOpen = query.showAdvanced ?? hasActiveAdvancedDimensions;

  const toggleAdvancedOpen = () => {
    onChange({
      ...query,
      showAdvanced: !isAdvancedOpen,
    });
  };

  const packs = registry.getAllPacks();
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx.old
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
              showAdvanced
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showAdvanced ? t('home.collapseFilter') : t('home.expandFilter')}</span>
          </button>
~~~~~
~~~~~tsx.new
          <button
            type="button"
            onClick={toggleAdvancedOpen}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              isAdvancedOpen
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isAdvancedOpen ? t('home.collapseAdvancedFilter') : t('home.advancedFilter')}</span>
          </button>
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx.old
      {/* 正交四维标签矩阵折叠区 */}
      {showAdvanced && (
        <div className="space-y-3.5 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
~~~~~
~~~~~tsx.new
      {/* 高级五维标签矩阵折叠区 */}
      {isAdvancedOpen && (
        <div className="space-y-3.5 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
~~~~~

### 下一步建议
1. **测试验收**：在首页点击“高级筛选”，观察 URL 是否自动追加 `#/?adv=1`，刷新页面或在各页面跳转后返回首页时，均能保持原有的筛选与展开状态。
2. **继续实施后续体验改进**：如优化 `TrainingShell` 在窄屏移动端的紧凑度排版与说明文案初次引导。
