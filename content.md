已经收到需求。我们将移除“显示实验性训练模块”开关及其对应的卡片过滤隐藏逻辑，使所有训练模块（包含实验性模块）默认均在发现库与列表呈现，并保留卡片和训练界面的“实验性”标识胶囊。

## [WIP] refactor: 移除实验性模块开关与过滤逻辑，保留实验性标签展示

### 用户需求
1. 删除全局设置弹窗 (`GlobalSettingsModal`) 中“显示实验性训练模块”的配置选项与开关控件。
2. 彻底清理对实验性训练模块 (`isExperimental`) 的隐藏/过滤逻辑，使其无需开启开关即可默认展示与探索。
3. 保留卡片上的“实验性”胶囊标签与训练界面顶部对应的状态标识。

### 评论
将实验性模块默认可见，有助于提高系统模块的发现效率和统一性，简化全局配置模型与路由查询参数 (`?exp=1`) 的复杂性。

### 目标
1. 从 `src/types/card.ts`、`src/utils/settings.ts` 中移除 `showExperimentalCards` 与 `includeExperimental` 相关类型定义与初始默认值。
2. 从 `src/core/registry.ts` 中移除针对 `isExperimental` 的过滤拦截逻辑。
3. 从 `src/components/GlobalSettingsModal.tsx` 中删除“显示实验性训练模块”开关项。
4. 从 `src/views/Home.tsx`、`src/app.tsx`、`src/hooks/useHashRoute.ts` 和 `src/components/plan/editor/CardPickerPanel.tsx` 中清理相关的属性与查询参数透传。

### 基本原理
通过在卡片检索层 (`SystemDomainRegistry.queryCards`) 移除对 `isExperimental` 的排他式过滤，使大盘发现、训练流编排面板和首页卡片列表统一直接输出所有注册卡片；同时清理全局设置项及相关状态传递链路，减少无效状态管理开销。

### 标签
#intent/refine #flow/ready #priority/medium
#comp/runtime #comp/cli #concept/config #scope/ux
#ai/instruct
#task/domain/ui #task/object/experimental-module-toggle #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 清理类型定义与全局设置默认项

修改 `src/types/card.ts` 与 `src/utils/settings.ts`，移除实验性开关字段。

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript
export interface CardQueryOptions {
  packId?: string;
  targets?: SensoryTargetTag[];
  skills?: CognitiveSkillTag[];
  interactions?: InteractionTag[];
  includeExperimental?: boolean;
  searchKeyword?: string;
}
~~~~~
~~~~~typescript
export interface CardQueryOptions {
  packId?: string;
  targets?: SensoryTargetTag[];
  skills?: CognitiveSkillTag[];
  interactions?: InteractionTag[];
  searchKeyword?: string;
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
  showExperimentalCards?: boolean;
}
~~~~~
~~~~~typescript
export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
    showExperimentalCards: false,
  },
  cards: buildDefaultCardSettings(),
};
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
  },
  cards: buildDefaultCardSettings(),
};
~~~~~

#### Acts 2: 移除注册表中的过滤逻辑与计划编辑器的显式传参

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
    const idsToFilter: string[] =
      candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));

    if (!options.includeExperimental) {
      results = results.filter((c) => !c.isExperimental);
    }

    if (options.searchKeyword) {
~~~~~
~~~~~typescript
    const idsToFilter: string[] =
      candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));

    if (options.searchKeyword) {
~~~~~

~~~~~act
patch_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~typescript
  const queryOptions: CardQueryOptions = useMemo(() => {
    return {
      searchKeyword: searchKeyword || undefined,
      skills: selectedSkill !== 'all' ? [selectedSkill] : undefined,
      packId: selectedPackId !== 'all' ? selectedPackId : undefined,
      includeExperimental: true,
    };
  }, [searchKeyword, selectedSkill, selectedPackId]);
~~~~~
~~~~~typescript
  const queryOptions: CardQueryOptions = useMemo(() => {
    return {
      searchKeyword: searchKeyword || undefined,
      skills: selectedSkill !== 'all' ? [selectedSkill] : undefined,
      packId: selectedPackId !== 'all' ? selectedPackId : undefined,
    };
  }, [searchKeyword, selectedSkill, selectedPackId]);
~~~~~

#### Acts 3: 清理 Hash 路由与 Home / App 组件的关联参数

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
  const searchKeyword = params.get('q') || params.get('search') || undefined;
  const expRaw = params.get('exp');
  const includeExperimental = expRaw !== null ? expRaw === '1' || expRaw === 'true' : undefined;

  if (
    !packId &&
    (!targets || targets.length === 0) &&
    (!skills || skills.length === 0) &&
    (!interactions || interactions.length === 0) &&
    !searchKeyword &&
    includeExperimental === undefined
  ) {
    return undefined;
  }

  return {
    packId,
    targets: targets && targets.length > 0 ? targets : undefined,
    skills: skills && skills.length > 0 ? skills : undefined,
    interactions: interactions && interactions.length > 0 ? interactions : undefined,
    searchKeyword,
    includeExperimental,
  };
~~~~~
~~~~~typescript
  const searchKeyword = params.get('q') || params.get('search') || undefined;

  if (
    !packId &&
    (!targets || targets.length === 0) &&
    (!skills || skills.length === 0) &&
    (!interactions || interactions.length === 0) &&
    !searchKeyword
  ) {
    return undefined;
  }

  return {
    packId,
    targets: targets && targets.length > 0 ? targets : undefined,
    skills: skills && skills.length > 0 ? skills : undefined,
    interactions: interactions && interactions.length > 0 ? interactions : undefined,
    searchKeyword,
  };
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    if (route.query.includeExperimental) {
      params.set('exp', '1');
    }
    const qs = params.toString();
~~~~~
~~~~~typescript
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    const qs = params.toString();
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
interface HomeProps {
  totalTimeMs: number;
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  showExperimental?: boolean;
  query?: CardQueryOptions;
  onQueryChange?: (query: CardQueryOptions) => void;
  onStartCard: (cardId: string, type: 'training' | 'benchmark') => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans = [],
  showExperimental = false,
  query: externalQuery,
  onQueryChange,
  onStartCard,
  onOpenCardSettings,
  onOpenCardAnalytics,
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const [localQuery, setLocalQuery] = useState<CardQueryOptions>({
    includeExperimental: showExperimental,
    ...(externalQuery || {}),
  });

  const activeQuery = externalQuery !== undefined ? externalQuery : localQuery;

  const handleQueryChange = (newQuery: CardQueryOptions) => {
    setLocalQuery(newQuery);
    onQueryChange?.(newQuery);
  };

  // 结合全局设置与查询条件获取过滤后的卡片
  const filteredCards = useMemo(() => {
    return registry.queryCards({
      ...activeQuery,
      includeExperimental: showExperimental || activeQuery.includeExperimental,
    });
  }, [activeQuery, showExperimental]);
~~~~~
~~~~~typescript
interface HomeProps {
  totalTimeMs: number;
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  query?: CardQueryOptions;
  onQueryChange?: (query: CardQueryOptions) => void;
  onStartCard: (cardId: string, type: 'training' | 'benchmark') => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans = [],
  query: externalQuery,
  onQueryChange,
  onStartCard,
  onOpenCardSettings,
  onOpenCardAnalytics,
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const [localQuery, setLocalQuery] = useState<CardQueryOptions>(externalQuery || {});

  const activeQuery = externalQuery !== undefined ? externalQuery : localQuery;

  const handleQueryChange = (newQuery: CardQueryOptions) => {
    setLocalQuery(newQuery);
    onQueryChange?.(newQuery);
  };

  // 结合查询条件获取过滤后的卡片
  const filteredCards = useMemo(() => {
    return registry.queryCards(activeQuery);
  }, [activeQuery]);
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
          <button
            type="button"
            onClick={() => handleQueryChange({ includeExperimental: showExperimental })}
            className="mt-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置所有筛选条件
          </button>
~~~~~
~~~~~typescript
          <button
            type="button"
            onClick={() => handleQueryChange({})}
            className="mt-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置所有筛选条件
          </button>
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          todayStats={todayStats}
          profiles={profiles}
          trainingPlan={trainingPlan}
          allPlans={allPlans}
          showExperimental={settings.global.showExperimentalCards}
          query={route.query}
          onQueryChange={(newQuery) =>
~~~~~
~~~~~typescript
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          todayStats={todayStats}
          profiles={profiles}
          trainingPlan={trainingPlan}
          allPlans={allPlans}
          query={route.query}
          onQueryChange={(newQuery) =>
~~~~~

#### Acts 4: 从全局设置弹窗中删除“显示实验性训练模块”选项

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">显示实验性训练模块</div>
                <div className="text-[11px] text-slate-400">
                  开启后展示正在开发与算法演进中的占位卡片
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleExperimental}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(settings.global.showExperimentalCards ?? false) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>
~~~~~
~~~~~typescript
~~~~~

### 下一步建议
1. 运行项目测试套件 (`pnpm test` 或 `npm test`)，确保所有卡片查询与设置变更相关的单元测试保持通过。
2. 在浏览器中打开首页，确认实验性卡片已直接呈现，且右上角/顶部维持“实验性模块”胶囊展示。
