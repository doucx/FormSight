我将基于重构提案，对 FormSight 的标签体系、倒排索引注册中心、筛选发现引擎及所有扩展包定义进行正交化改造。

## [WIP] refactor: 全面重构正交化卡片标签系统与多维筛选发现引擎

### 用户需求
基于重构提案，将原本历史遗留的、模糊重叠的卡片 Tag 系统（`target` 与 `skill`）全面重构成符合 MECE 原则的四大正交维度（`Visual Domain` 视觉域、`Cognitive Path` 认知路径、`Mental Challenge` 心智抗性、`Interaction` 交互形态），并同步更新注册中心倒排索引、路由哈希参数、大盘筛选器、全局统计雷达与全部 7 大扩展包卡片定义。

### 评论
这是一次从根本上理清系统认知架构的关键重构。重构后，不仅彻底解决了形式与抽象模块中“自底向上提炼”与“自顶向下寻源”的筛选互斥问题，更让心智抗性（如错觉剥离、图底反转）成为可度量、可聚合的一等公民维度。

### 目标
1. **类型层 (`src/types/card.ts`)**：定义 `VisualDomainTag`、`CognitivePathTag`、`MentalChallengeTag`、`InteractionTag` 与全新的 `CardTags` / `CardQueryOptions`。
2. **注册中心 (`src/core/registry.ts`)**：重构 `InvertedCardIndex` 与 `queryCards`，支持按域、路径、抗性、交互、状态多维倒排求交集。
3. **发现引擎 (`src/components/discovery/FilterEngine.tsx`)**：更新四维筛选标签矩阵与中文语义映射。
4. **路由与选择面板 (`useHashRoute.ts`, `CardPickerPanel.tsx`, `GlobalStatsModal.tsx`, `TrainingShell.tsx`)**：适配全新标签字段与统计维度。
5. **卡片定义 (`src/packs/*/index.ts`)**：重构 Star、Color、Relative Color、Negative Space、Abstraction、Angle、Perspective 全部 7 个扩展包的卡片 Tag 声明。

### 基本原理
通过将“看什么 (Domain)”、“怎么推导 (Path)”、“克服什么障碍 (Challenge)”、“怎么操作 (Interaction)”正交分离，彻底解耦原本缠绕在一起的语义，实现高内聚、低耦合的多维查询与生涯能力建模。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #comp/cli #concept/ui #scope/core #scope/ux #ai/delegate #task/domain/ui #task/object/tag-system #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新核心卡片类型定义 (`src/types/card.ts`)

~~~~~act
write_file
src/types/card.ts
~~~~~
~~~~~ts
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';

/**
 * 维度 1: 视觉域 (Visual Domain) - 观察的基础视觉原材料
 */
export type VisualDomainTag =
  | 'form_and_proportion' // 形体与比例
  | 'spatial_structure' // 空间与结构
  | 'color_and_value' // 色彩与明度
  | 'rhythm_and_notan'; // 动态与图底

/**
 * 维度 2: 认知路径 (Cognitive Path) - 大脑信息处理与推演方向
 */
export type CognitivePathTag =
  | 'extraction' // 自底向上：提炼概括
  | 'concretization' // 自顶向下：具象寻源
  | 'absolute_estimation' // 绝对估测度量
  | 'relational_mapping'; // 相对推移映射

/**
 * 维度 3: 心智抗性 (Mental Challenge) - 刻意克服的人类生理/感知本能短板
 */
export type MentalChallengeTag =
  | 'illusion_piercing' // 错觉剥离 (抗环境色同化/抗连续错觉)
  | 'figure_ground_reversal' // 图底反转 (关注负空间留白)
  | 'working_memory' // 瞬时记忆 (抗视觉遗忘)
  | 'dimensional_translation'; // 维次转译 (3D/2D投影与视角旋转)

/**
 * 维度 4: 交互形态 (Interaction Mode)
 */
export type InteractionTag =
  | 'continuous_mod' // 连续调制 (滑块)
  | 'spatial_locate' // 空间定位 (点阵点击/盲打)
  | 'binary_choice' // 二分对抗 (2AFC)
  | 'multi_choice'; // 多维检索 (N-AFC)

export type CardStatusTag = 'stable' | 'experimental' | 'deprecated';

export interface CardTags {
  domain: VisualDomainTag[];
  path: CognitivePathTag[];
  challenge?: MentalChallengeTag[];
  interaction: InteractionTag[];
  status?: CardStatusTag;
}

export interface CardDefinition {
  id: string;
  packId: string;
  mode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
}

export interface PackMeta {
  id: string;
  title: string;
  subTitle?: string;
  desc: string;
  version?: string;
  author?: string;
  themeColor?: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon?: (props: { className?: string }) => ComponentChildren;
}

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

#### Acts 2: 更新注册中心多维倒排索引 (`src/core/registry.ts`)

~~~~~act
write_file
src/core/registry.ts
~~~~~
~~~~~ts
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  PackMeta,
  VisualDomainTag,
} from '../types/card';
import type { CardAnalyticsPlugin, PackManifest } from './contracts';

class InvertedCardIndex {
  private domainMap = new Map<VisualDomainTag, Set<string>>();
  private pathMap = new Map<CognitivePathTag, Set<string>>();
  private challengeMap = new Map<MentalChallengeTag, Set<string>>();
  private interactionMap = new Map<InteractionTag, Set<string>>();
  private statusMap = new Map<CardStatusTag, Set<string>>();
  private packMap = new Map<string, Set<string>>();

  public clear(): void {
    this.domainMap.clear();
    this.pathMap.clear();
    this.challengeMap.clear();
    this.interactionMap.clear();
    this.statusMap.clear();
    this.packMap.clear();
  }

  public indexCard(card: CardDefinition): void {
    const id = card.id;

    if (card.packId) {
      let set = this.packMap.get(card.packId);
      if (!set) {
        set = new Set();
        this.packMap.set(card.packId, set);
      }
      set.add(id);
    }

    if (card.tags) {
      for (const d of card.tags.domain || []) {
        let set = this.domainMap.get(d);
        if (!set) {
          set = new Set();
          this.domainMap.set(d, set);
        }
        set.add(id);
      }

      for (const p of card.tags.path || []) {
        let set = this.pathMap.get(p);
        if (!set) {
          set = new Set();
          this.pathMap.set(p, set);
        }
        set.add(id);
      }

      for (const c of card.tags.challenge || []) {
        let set = this.challengeMap.get(c);
        if (!set) {
          set = new Set();
          this.challengeMap.set(c, set);
        }
        set.add(id);
      }

      for (const i of card.tags.interaction || []) {
        let set = this.interactionMap.get(i);
        if (!set) {
          set = new Set();
          this.interactionMap.set(i, set);
        }
        set.add(id);
      }

      const status: CardStatusTag = card.tags.status || 'stable';
      let stSet = this.statusMap.get(status);
      if (!stSet) {
        stSet = new Set();
        this.statusMap.set(status, stSet);
      }
      stSet.add(id);
    }
  }

  public getCardIdsByDomain(domain: VisualDomainTag): Set<string> {
    return this.domainMap.get(domain) || new Set();
  }

  public getCardIdsByPath(path: CognitivePathTag): Set<string> {
    return this.pathMap.get(path) || new Set();
  }

  public getCardIdsByChallenge(challenge: MentalChallengeTag): Set<string> {
    return this.challengeMap.get(challenge) || new Set();
  }

  public getCardIdsByInteraction(interaction: InteractionTag): Set<string> {
    return this.interactionMap.get(interaction) || new Set();
  }

  public getCardIdsByStatus(status: CardStatusTag): Set<string> {
    return this.statusMap.get(status) || new Set();
  }

  public getCardIdsByPack(packId: string): Set<string> {
    return this.packMap.get(packId) || new Set();
  }
}

class SystemDomainRegistry {
  private packs = new Map<string, PackManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描 src/packs/*\/index.ts 零配置注册
   */
  private autoDiscover(): void {
    const packModules = import.meta.glob<{ default: PackManifest }>('../packs/*/index.ts', {
      eager: true,
    });

    for (const path in packModules) {
      const manifest = packModules[path]?.default;
      if (manifest) this.register(manifest);
    }
  }

  public register(manifest: PackManifest): void {
    this.packs.set(manifest.packId, manifest);

    for (const card of manifest.cards) {
      const normalizedCard: CardDefinition = {
        ...card,
        packId: manifest.packId,
      };

      this.cardMap.set(card.id, normalizedCard);
      this.cardPluginMap.set(card.id, manifest.trainingPlugin);
      this.invertedIndex.indexCard(normalizedCard);
    }

    if (manifest.analyticsPlugins) {
      for (const [cardId, plugin] of Object.entries(manifest.analyticsPlugins)) {
        this.cardAnalyticsMap.set(cardId, plugin);
      }
    }
  }

  /**
   * 基于倒排索引的高性能多维条件卡片查询
   */
  public queryCards(options: CardQueryOptions = {}): CardDefinition[] {
    let candidateIds: Set<string> | null = null;

    const intersect = (set: Set<string>) => {
      if (candidateIds === null) {
        candidateIds = new Set(set);
      } else {
        const next = new Set<string>();
        for (const id of candidateIds) {
          if (set.has(id)) next.add(id);
        }
        candidateIds = next;
      }
    };

    if (options.packId) {
      intersect(this.invertedIndex.getCardIdsByPack(options.packId));
    }

    if (options.domains && options.domains.length > 0) {
      const domainUnion = new Set<string>();
      for (const d of options.domains) {
        for (const id of this.invertedIndex.getCardIdsByDomain(d)) {
          domainUnion.add(id);
        }
      }
      intersect(domainUnion);
    }

    if (options.paths && options.paths.length > 0) {
      const pathUnion = new Set<string>();
      for (const p of options.paths) {
        for (const id of this.invertedIndex.getCardIdsByPath(p)) {
          pathUnion.add(id);
        }
      }
      intersect(pathUnion);
    }

    if (options.challenges && options.challenges.length > 0) {
      const challengeUnion = new Set<string>();
      for (const c of options.challenges) {
        for (const id of this.invertedIndex.getCardIdsByChallenge(c)) {
          challengeUnion.add(id);
        }
      }
      intersect(challengeUnion);
    }

    if (options.interactions && options.interactions.length > 0) {
      const interactionUnion = new Set<string>();
      for (const i of options.interactions) {
        for (const id of this.invertedIndex.getCardIdsByInteraction(i)) {
          interactionUnion.add(id);
        }
      }
      intersect(interactionUnion);
    }

    if (options.statuses && options.statuses.length > 0) {
      const statusUnion = new Set<string>();
      for (const st of options.statuses) {
        for (const id of this.invertedIndex.getCardIdsByStatus(st)) {
          statusUnion.add(id);
        }
      }
      intersect(statusUnion);
    }

    const idsToFilter: string[] =
      candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));

    if (options.searchKeyword) {
      const kw = options.searchKeyword.trim().toLowerCase();
      if (kw) {
        results = results.filter(
          (c) =>
            c.title.toLowerCase().includes(kw) ||
            c.desc.toLowerCase().includes(kw) ||
            c.id.toLowerCase().includes(kw),
        );
      }
    }

    return results;
  }

  // === Pack 访问接口 ===
  public getAllPacks(): PackManifest[] {
    return Array.from(this.packs.values());
  }

  public getPack(packId: string): PackManifest | undefined {
    return this.packs.get(packId);
  }

  public getAllPackMetas(): PackMeta[] {
    return Array.from(this.packs.values()).map((p) => p.meta);
  }

  // === 卡片直查接口 ===
  public getAllCards(): CardDefinition[] {
    return Array.from(this.cardMap.values());
  }

  public getCardById(cardId: string): CardDefinition | undefined {
    return this.cardMap.get(cardId);
  }

  public getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
    return this.cardPluginMap.get(cardId);
  }

  public getAnalyticsPluginByCardId(cardId: string): CardAnalyticsPlugin | undefined {
    return this.cardAnalyticsMap.get(cardId);
  }
}

export const registry = new SystemDomainRegistry();
~~~~~

#### Acts 3: 更新多维筛选发现引擎 (`src/components/discovery/FilterEngine.tsx`)

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
  Crosshair,
  Eye,
  Filter,
  FlaskConical,
  MousePointer,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import { registry } from '../../core/registry';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';

export const DOMAIN_TAG_LABELS: Record<VisualDomainTag, string> = {
  form_and_proportion: '形体与比例',
  spatial_structure: '空间与结构',
  color_and_value: '色彩与明度',
  rhythm_and_notan: '动态与图底',
};

export const PATH_TAG_LABELS: Record<CognitivePathTag, string> = {
  extraction: '自底向上：提炼概括',
  concretization: '自顶向下：具象寻源',
  absolute_estimation: '绝对估测度量',
  relational_mapping: '相对推移映射',
};

export const CHALLENGE_TAG_LABELS: Record<MentalChallengeTag, string> = {
  illusion_piercing: '错觉剥离 (抗同化/环境光)',
  figure_ground_reversal: '图底反转 (关注负空间)',
  working_memory: '瞬时记忆 (抗视觉遗忘)',
  dimensional_translation: '维次转译 (3D/2D展开)',
};

export const INTERACTION_TAG_LABELS: Record<InteractionTag, string> = {
  continuous_mod: '连续调制 (滑块)',
  spatial_locate: '空间定位 (点阵点击)',
  binary_choice: '二分对抗 (2AFC)',
  multi_choice: '多维检索 (N-AFC)',
};

export const STATUS_TAG_LABELS: Record<CardStatusTag, string> = {
  stable: '稳定模块',
  experimental: '实验性模块',
  deprecated: '已废弃',
};

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
  const [showAdvanced, setShowAdvanced] = useState<boolean>(!compact);

  const packs = registry.getAllPacks();

  const handleSearchChange = (val: string) => {
    onChange({
      ...query,
      searchKeyword: val || undefined,
    });
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

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      query.packId ||
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* 顶栏：搜索条与快速筛选概览 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query.searchKeyword || ''}
            onInput={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
            placeholder="搜索训练卡片名称、编号或认知要领..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400 placeholder:font-normal"
          />
          {query.searchKeyword && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-shrink-0">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              已匹配{' '}
              <strong className="font-mono text-indigo-600 font-black">{totalMatches}</strong>{' '}
              个训练模块
            </span>
          </div>

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
            <span>{showAdvanced ? '收起筛选' : '多维筛选'}</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all flex items-center gap-1"
              title="重置所有筛选"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              清空
            </button>
          )}
        </div>
      </div>

      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            扩展包 (Packs)
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectPack(undefined)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                !query.packId
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
              }`}
            >
              {!query.packId && <Check className="w-3 h-3" />}
              <span>全部 Packs</span>
            </button>
            {packs.map((p) => {
              const isSelected = query.packId === p.packId;
              return (
                <button
                  type="button"
                  key={p.packId}
                  onClick={() => handleSelectPack(isSelected ? undefined : p.packId)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{p.meta.title}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {p.cards.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 正交四维标签矩阵折叠区 */}
      {showAdvanced && (
        <div className="space-y-3.5 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
          {/* 1. 视觉域维度 (Visual Domain) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3 text-indigo-500" />
              1. 基础视觉域 (Visual Domain)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(DOMAIN_TAG_LABELS) as VisualDomainTag[]).map((d) => {
                const isSelected = query.domains?.includes(d) ?? false;
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDomain(d)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                        : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{DOMAIN_TAG_LABELS[d]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 认知路径维度 (Cognitive Path) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-500" />
              2. 认知推演路径 (Cognitive Path)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PATH_TAG_LABELS) as CognitivePathTag[]).map((p) => {
                const isSelected = query.paths?.includes(p) ?? false;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePath(p)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                        : 'bg-slate-50 hover:bg-emerald-50/60 text-slate-600 border border-slate-200/80 hover:border-emerald-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{PATH_TAG_LABELS[p]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 心智抗性维度 (Mental Challenge) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3 text-rose-500" />
              3. 核心心智抗性 (Mental Challenge)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHALLENGE_TAG_LABELS) as MentalChallengeTag[]).map((c) => {
                const isSelected = query.challenges?.includes(c) ?? false;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleChallenge(c)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-200'
                        : 'bg-slate-50 hover:bg-rose-50/60 text-slate-600 border border-slate-200/80 hover:border-rose-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{CHALLENGE_TAG_LABELS[c]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 交互形态维度 (Interaction Mode) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-amber-500" />
              4. 交互评估形态 (Interaction Mode)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(INTERACTION_TAG_LABELS) as InteractionTag[]).map((i) => {
                const isSelected = query.interactions?.includes(i) ?? false;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleInteraction(i)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-200'
                        : 'bg-slate-50 hover:bg-amber-50/60 text-slate-600 border border-slate-200/80 hover:border-amber-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{INTERACTION_TAG_LABELS[i]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. 特性与发布状态 (Status Tag) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-purple-500" />
              特性与状态 (Status)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['stable', 'experimental'] as CardStatusTag[]).map((st) => {
                const isSelected = query.statuses?.includes(st) ?? false;
                return (
                  <button
                    type="button"
                    key={st}
                    onClick={() => toggleStatus(st)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? st === 'stable'
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                          : 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {st === 'stable' ? (
                      <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <FlaskConical className="w-3 h-3 text-amber-500" />
                    )}
                    <span>{STATUS_TAG_LABELS[st]}</span>
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

#### Acts 4: 更新路由解析与序列化 (`src/hooks/useHashRoute.ts`)

~~~~~act
write_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~ts
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';

export type RouteLocation =
  | { type: 'home'; query?: CardQueryOptions }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' };

function parseHomeQuery(params: URLSearchParams): CardQueryOptions | undefined {
  const packId = params.get('pack') || undefined;
  const domains = params.get('domains')?.split(',').filter(Boolean) as
    | VisualDomainTag[]
    | undefined;
  const paths = params.get('paths')?.split(',').filter(Boolean) as CognitivePathTag[] | undefined;
  const challenges = params.get('challenges')?.split(',').filter(Boolean) as
    | MentalChallengeTag[]
    | undefined;
  const interactions = params.get('interactions')?.split(',').filter(Boolean) as
    | InteractionTag[]
    | undefined;
  const statusesParam = params.get('statuses')?.split(',').filter(Boolean) as
    | CardStatusTag[]
    | undefined;
  const legacyExpParam = params.get('experimental');
  const statuses =
    statusesParam && statusesParam.length > 0
      ? statusesParam
      : legacyExpParam === 'true'
        ? (['experimental'] as CardStatusTag[])
        : legacyExpParam === 'false'
          ? (['stable'] as CardStatusTag[])
          : undefined;
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
}

function parseHash(hash: string): RouteLocation {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) return { type: 'home' };

  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const queryParams = new URLSearchParams(queryPart || '');

  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const sessionType = queryParams.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  const homeQuery = parseHomeQuery(queryParams);
  return { type: 'home', query: homeQuery };
}

function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') {
    if (!route.query) return '#/';
    const params = new URLSearchParams();
    if (route.query.packId && route.query.packId !== 'all') {
      params.set('pack', route.query.packId);
    }
    if (route.query.domains && route.query.domains.length > 0) {
      params.set('domains', route.query.domains.join(','));
    }
    if (route.query.paths && route.query.paths.length > 0) {
      params.set('paths', route.query.paths.join(','));
    }
    if (route.query.challenges && route.query.challenges.length > 0) {
      params.set('challenges', route.query.challenges.join(','));
    }
    if (route.query.interactions && route.query.interactions.length > 0) {
      params.set('interactions', route.query.interactions.join(','));
    }
    if (route.query.statuses && route.query.statuses.length > 0) {
      params.set('statuses', route.query.statuses.join(','));
    }
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    const qs = params.toString();
    return qs ? `#/?${qs}` : '#/';
  }
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteLocation>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'home' },
  );

  const scrollPositionsRef = useRef<Record<string, number>>({});
  const currentHashRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.hash || '#/' : '#/',
  );

  useEffect(() => {
    const handleScroll = () => {
      const currentKey = currentHashRef.current || '#/';
      scrollPositionsRef.current[currentKey] = window.scrollY;
    };

    const handleHashChange = () => {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;

      const newHash = window.location.hash || '#/';
      currentHashRef.current = newHash;
      setRoute(parseHash(newHash));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetY = scrollPositionsRef.current[newHash] ?? 0;
          window.scrollTo(0, targetY);
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = useCallback((target: RouteLocation, options?: { replace?: boolean }) => {
    const newHash = stringifyRoute(target);
    if (window.location.hash !== newHash) {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;
      if (options?.replace) {
        const url = new URL(window.location.href);
        url.hash = newHash;
        window.history.replaceState(null, '', url.toString());
        currentHashRef.current = newHash;
        setRoute(parseHash(newHash));
      } else {
        window.location.hash = newHash;
      }
    }
  }, []);

  return { route, navigate };
}
~~~~~

#### Acts 5: 更新计划挑选器 (`src/components/plan/editor/CardPickerPanel.tsx`)

~~~~~act
write_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~tsx
import { Plus, Search, Sparkles, X } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { registry } from '../../../core/registry';
import type { CardQueryOptions, VisualDomainTag } from '../../../types/card';
import { DOMAIN_TAG_LABELS } from '../../discovery/FilterEngine';

interface CardPickerPanelProps {
  isAddingCard: boolean;
  onToggleAdding: (val: boolean) => void;
  onAddItem: (cardId: string) => void;
}

export function CardPickerPanel({ isAddingCard, onToggleAdding, onAddItem }: CardPickerPanelProps) {
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

      {/* Pack 与视觉域快速筛选行 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setSelectedDomain('all');
            setSelectedPackId('all');
          }}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
            selectedDomain === 'all' && selectedPackId === 'all'
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
              setSelectedDomain('all');
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

        {(Object.keys(DOMAIN_TAG_LABELS) as VisualDomainTag[]).map((domain) => (
          <button
            type="button"
            key={domain}
            onClick={() => {
              setSelectedDomain(selectedDomain === domain ? 'all' : domain);
              setSelectedPackId('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
              selectedDomain === domain
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {DOMAIN_TAG_LABELS[domain]}
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
~~~~~

#### Acts 6: 更新全局统计弹窗 (`src/components/GlobalStatsModal.tsx`)

~~~~~act
write_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~tsx
import {
  Activity,
  BarChart2,
  Brain,
  Calendar,
  ChevronDown,
  Compass,
  Eye,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { registry } from '../core/registry';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { type DailySummaryData, getDailySummaries, getLocalDateString } from '../utils/db/index';
import {
  CHALLENGE_TAG_LABELS,
  DOMAIN_TAG_LABELS,
  PATH_TAG_LABELS,
} from './discovery/FilterEngine';

interface GlobalStatsModalProps {
  onClose: () => void;
}

export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummaryData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const packs = registry.getAllPacks();
  const allCards = registry.getAllCards();

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const data = await getDailySummaries();
      if (isMounted) {
        setSummaries(data);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 过滤后的汇总记录
  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (selectedFilter === 'all') return true;

      if (selectedFilter.startsWith('pack:')) {
        const targetPackId = selectedFilter.replace('pack:', '');
        const pack = registry.getPack(targetPackId);
        const packCardIds = new Set(pack?.cards.map((c) => c.id) || []);
        return packCardIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('domain:')) {
        const targetDomain = selectedFilter.replace('domain:', '') as VisualDomainTag;
        const matchedCards = registry.queryCards({ domains: [targetDomain] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('path:')) {
        const targetPath = selectedFilter.replace('path:', '') as CognitivePathTag;
        const matchedCards = registry.queryCards({ paths: [targetPath] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('challenge:')) {
        const targetChallenge = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
        const matchedCards = registry.queryCards({ challenges: [targetChallenge] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('card:')) {
        const targetCardId = selectedFilter.replace('card:', '');
        return s.cardId === targetCardId || s.mode === targetCardId;
      }

      return true;
    });
  }, [summaries, selectedFilter]);

  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return '全部练习项目';
    if (selectedFilter.startsWith('pack:')) {
      const pack = registry.getPack(selectedFilter.replace('pack:', ''));
      return `扩展包 • ${pack?.meta.title || selectedFilter}`;
    }
    if (selectedFilter.startsWith('domain:')) {
      const d = selectedFilter.replace('domain:', '') as VisualDomainTag;
      return `视觉域 • ${DOMAIN_TAG_LABELS[d] || d}`;
    }
    if (selectedFilter.startsWith('path:')) {
      const p = selectedFilter.replace('path:', '') as CognitivePathTag;
      return `认知路径 • ${PATH_TAG_LABELS[p] || p}`;
    }
    if (selectedFilter.startsWith('challenge:')) {
      const c = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
      return `心智抗性 • ${CHALLENGE_TAG_LABELS[c] || c}`;
    }
    if (selectedFilter.startsWith('card:')) {
      const cardId = selectedFilter.replace('card:', '');
      const card = registry.getCardById(cardId);
      return `训练模块 • ${card?.title || cardId}`;
    }
    return '全部练习项目';
  };

  const now = new Date();
  const todayStr = getLocalDateString(now.getTime());
  const startOfWeekStr = getLocalDateString(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const startOfYearStr = `${now.getFullYear()}-01-01`;

  const { stats, dailyData } = useMemo(() => {
    const statsObj = {
      today: { total: 0, hits: 0 },
      week: { total: 0, hits: 0 },
      year: { total: 0, hits: 0 },
      allTime: { total: 0, hits: 0 },
    };

    const data: Record<string, { total: number; maxLevel: number }> = {};

    for (const s of filteredSummaries) {
      statsObj.allTime.total += s.totalCount;
      statsObj.allTime.hits += s.hitCount;

      if (s.date === todayStr) {
        statsObj.today.total += s.totalCount;
        statsObj.today.hits += s.hitCount;
      }
      if (s.date >= startOfWeekStr) {
        statsObj.week.total += s.totalCount;
        statsObj.week.hits += s.hitCount;
      }
      if (s.date >= startOfYearStr) {
        statsObj.year.total += s.totalCount;
        statsObj.year.hits += s.hitCount;
      }

      if (!data[s.date]) {
        data[s.date] = { total: 0, maxLevel: s.maxLevel };
      }
      data[s.date].total += s.totalCount;
      data[s.date].maxLevel = Math.max(data[s.date].maxLevel, s.maxLevel);
    }

    return { stats: statsObj, dailyData: data };
  }, [filteredSummaries, todayStr, startOfWeekStr, startOfYearStr]);

  const calcAcc = (hits: number, total: number) =>
    total === 0 ? 0 : Math.round((hits / total) * 100);

  const heatmapDays = 84;
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const heatmapData = Array.from({ length: heatmapDays }).map((_, i) => {
    const dMs = startOfTodayMs - (heatmapDays - 1 - i) * 24 * 60 * 60 * 1000;
    const dateStr = getLocalDateString(dMs);
    return {
      date: dateStr,
      count: dailyData[dateStr]?.total || 0,
    };
  });

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count < 10) return 'bg-indigo-200';
    if (count < 25) return 'bg-indigo-400';
    if (count < 50) return 'bg-indigo-600';
    return 'bg-indigo-800';
  };

  // 按正交认知路径 (Cognitive Path) 聚合掌握度数据
  const pathMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId || s.mode;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }

    return (Object.keys(PATH_TAG_LABELS) as CognitivePathTag[]).map((path) => {
      const matchingCards = registry.queryCards({ paths: [path] });
      let pathTotal = 0;
      let pathHits = 0;

      for (const card of matchingCards) {
        const item = cardSummaryMap.get(card.id);
        if (item) {
          pathTotal += item.total;
          pathHits += item.hits;
        }
      }

      const acc = pathTotal > 0 ? Math.round((pathHits / pathTotal) * 100) : 0;
      return {
        path,
        label: PATH_TAG_LABELS[path],
        total: pathTotal,
        hits: pathHits,
        accuracy: acc,
        cardCount: matchingCards.length,
      };
    });
  }, [summaries]);

  // 按心智抗性 (Mental Challenge) 聚合掌握度数据
  const challengeMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId || s.mode;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }

    return (Object.keys(CHALLENGE_TAG_LABELS) as MentalChallengeTag[]).map((ch) => {
      const matchingCards = registry.queryCards({ challenges: [ch] });
      let chTotal = 0;
      let chHits = 0;

      for (const card of matchingCards) {
        const item = cardSummaryMap.get(card.id);
        if (item) {
          chTotal += item.total;
          chHits += item.hits;
        }
      }

      const acc = chTotal > 0 ? Math.round((chHits / chTotal) * 100) : 0;
      return {
        challenge: ch,
        label: CHALLENGE_TAG_LABELS[ch],
        total: chTotal,
        hits: chHits,
        accuracy: acc,
        cardCount: matchingCards.length,
      };
    });
  }, [summaries]);

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">全局认知数据统计</h2>
              <p className="text-xs text-slate-400">洞察多维视觉认知成长与训练足迹</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
                className="pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all shadow-sm max-w-xs truncate"
              >
                <option value="all">全部练习项目</option>

                <optgroup label="—— 扩展包 (Packs) ——">
                  {packs.map((p) => (
                    <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                      {p.meta.title} (扩展包)
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 基础视觉域 (Domains) ——">
                  {(Object.keys(DOMAIN_TAG_LABELS) as VisualDomainTag[]).map((domain) => (
                    <option key={`domain:${domain}`} value={`domain:${domain}`}>
                      {DOMAIN_TAG_LABELS[domain]}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 认知推演路径 (Paths) ——">
                  {(Object.keys(PATH_TAG_LABELS) as CognitivePathTag[]).map((path) => (
                    <option key={`path:${path}`} value={`path:${path}`}>
                      {PATH_TAG_LABELS[path]}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 核心心智抗性 (Challenges) ——">
                  {(Object.keys(CHALLENGE_TAG_LABELS) as MentalChallengeTag[]).map((ch) => (
                    <option key={`challenge:${ch}`} value={`challenge:${ch}`}>
                      {CHALLENGE_TAG_LABELS[ch]}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 具体训练模块 (Cards) ——">
                  {allCards.map((card) => (
                    <option key={`card:${card.id}`} value={`card:${card.id}`}>
                      {card.title}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            正在统计海量物化数据...
          </div>
        ) : stats.allTime.total === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Activity className="w-10 h-10 text-slate-300" />【{getCurrentFilterLabel()}
            】下暂无做答记录，先去练习几道题吧！
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 核心指标卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  今日刷题
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.today.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.today.hits, stats.today.total)}%
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  最近 7 天
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.week.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.week.hits, stats.week.total)}%
                </div>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  本年累计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.year.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-amber-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.year.hits, stats.year.total)}%
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  生涯总计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.allTime.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  打卡 {Object.keys(dailyData).length} 天
                </div>
              </div>
            </div>

            {/* 认知路径推演能力矩阵 */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  认知推演路径掌握度 (Cognitive Path Mastery)
                </div>
                <span className="text-[10px] text-slate-400 font-mono">基于全部历史试炼聚合</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {pathMasteryList.map((pm) => (
                  <div
                    key={pm.path}
                    className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-sm space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="truncate">{pm.label}</span>
                      <span
                        className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                          pm.total === 0
                            ? 'bg-slate-100 text-slate-400'
                            : pm.accuracy >= 80
                              ? 'bg-emerald-50 text-emerald-700 font-black'
                              : pm.accuracy >= 60
                                ? 'bg-amber-50 text-amber-700 font-black'
                                : 'bg-rose-50 text-rose-700 font-black'
                        }`}
                      >
                        {pm.total > 0 ? `${pm.accuracy}%` : '--'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>已练 {pm.total} 题</span>
                      <span>{pm.cardCount} 模块</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 核心心智抗性矩阵 */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-rose-500" />
                  核心心智抗性与错觉克服 (Mental Challenge Index)
                </div>
                <span className="text-[10px] text-slate-400 font-mono">抗错觉 / 图底反转得分</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {challengeMasteryList.map((cm) => (
                  <div
                    key={cm.challenge}
                    className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-sm space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="truncate">{cm.label.split(' ')[0]}</span>
                      <span
                        className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                          cm.total === 0
                            ? 'bg-slate-100 text-slate-400'
                            : cm.accuracy >= 80
                              ? 'bg-rose-50 text-rose-700 font-black'
                              : cm.accuracy >= 60
                                ? 'bg-amber-50 text-amber-700 font-black'
                                : 'bg-slate-100 text-slate-600 font-black'
                        }`}
                      >
                        {cm.total > 0 ? `${cm.accuracy}%` : '--'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>已练 {cm.total} 题</span>
                      <span>{cm.cardCount} 模块</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 热力图与演进曲线图 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-4">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>近 12 周训练热力图</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                    少 <div className="w-2.5 h-2.5 rounded-sm bg-slate-100" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-800" /> 多
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1.5 self-center">
                  {heatmapData.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date} : 训练了 ${day.count} 题`}
                      className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
                        day.count,
                      )}`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-2">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>能力峰值演进轨迹</span>
                  <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                    每日最高 Level
                  </span>
                </div>
                <canvas ref={canvasRef} width={340} height={150} className="w-full mt-2" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 7: 更新 TrainingShell 顶部 Badge 渲染 (`src/components/training/TrainingShell.tsx`)

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~old
  const { title, instruction, desc } = card;
  const badge = card.tags.target[0];
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
~~~~~
~~~~~new
  const { title, instruction, desc } = card;
  const badge = card.tags.domain[0];
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
~~~~~

#### Acts 8: 重构 7 大扩展包卡片定义 (`src/packs/*`)

~~~~~act
write_file
src/packs/star/index.ts
~~~~~
~~~~~ts
import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { createStarAnalyticsPlugin } from './analytics';
import { starPlugin } from './plugin';

export const STAR_SECTORS = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: '干扰点网格大小',
    options: [
      { label: '2x2', value: 2 },
      { label: '3x3', value: 3 },
      { label: '4x4', value: 4 },
      { label: '5x5', value: 5 },
    ],
    gridCols: 'grid-cols-4',
  },
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: '弱点专项靶向强化',
    subTitle: '选择需要靶向强化的角度扇区：',
    sectors: STAR_SECTORS,
    gridCols: 'grid-cols-4',
  },
];

export const starCards: CardDefinition[] = [
  {
    id: 'star_single',
    packId: 'star',
    mode: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
    icon: Target,
    tags: {
      domain: ['spatial_structure'],
      path: ['absolute_estimation'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_h',
    packId: 'star',
    mode: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    instruction: '观察左侧水平双锚点几何关系，在右侧点阵中盲打定位',
    icon: Crosshair,
    tags: {
      domain: ['spatial_structure', 'form_and_proportion'],
      path: ['absolute_estimation', 'relational_mapping'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_r',
    packId: 'star',
    mode: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    instruction: '观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位',
    icon: RotateCw,
    tags: {
      domain: ['spatial_structure', 'form_and_proportion'],
      path: ['absolute_estimation', 'relational_mapping'],
      challenge: ['dimensional_translation'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
];

export const starPack: PackManifest = {
  packId: 'star',
  meta: {
    id: 'star',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    desc: '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: starCards,
  trainingPlugin: starPlugin,
  analyticsPlugins: {
    star_single: createStarAnalyticsPlugin('star_single', '单锚点'),
    star_double_h: createStarAnalyticsPlugin('star_double_h', '水平双锚点'),
    star_double_r: createStarAnalyticsPlugin('star_double_r', '旋转双锚点'),
  },
};

export default starPack;
~~~~~

~~~~~act
write_file
src/packs/color/index.ts
~~~~~
~~~~~ts
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { colorHueAnalyticsPlugin } from './analytics';
import { colorPlugin } from './plugin';

export const COLOR_SECTORS = [
  '红 (0°-30°)',
  '橙 (30°-60°)',
  '黄 (60°-90°)',
  '黄绿 (90°-120°)',
  '绿 (120°-150°)',
  '青绿 (150°-180°)',
  '青 (180°-210°)',
  '蓝 (210°-240°)',
  '蓝紫 (240°-270°)',
  '紫 (270°-300°)',
  '品红 (300°-330°)',
  '紫红 (330°-360°)',
];

export const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const HUE_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: '色相弱点专项靶向强化',
    subTitle: '选择需要靶向强化的色相扇区：',
    sectors: COLOR_SECTORS,
    gridCols: 'grid-cols-3',
  },
];

export const COLOR_ALL_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'toggle',
    key: 'enableHoverColorPreview',
    title: '综合拾色悬停颜色实时联动',
    description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
  },
];

export const colorCards: CardDefinition[] = [
  {
    id: 'color_hue',
    packId: 'color',
    mode: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    instruction: '定位上方色块在 360° 色相环上的精准角度',
    icon: RotateCw,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: HUE_SCHEMAS,
  },
  {
    id: 'color_val',
    packId: 'color',
    mode: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    instruction: '评估上方色块的素描明度深浅比例 (0%~100%)',
    icon: Sun,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_sat',
    packId: 'color',
    mode: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    instruction: '评估上方色块的鲜艳纯度比例 (0%~100%)',
    icon: Droplet,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_all',
    packId: 'color',
    mode: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    instruction: '同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: COLOR_ALL_SCHEMAS,
  },
];

export const colorPack: PackManifest = {
  packId: 'color',
  meta: {
    id: 'color',
    title: '绝对色感',
    subTitle: 'Color Recognition',
    desc: '拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。',
    themeColor: 'amber',
    icon: Palette,
  },
  cards: colorCards,
  trainingPlugin: colorPlugin,
  analyticsPlugins: {
    color_hue: colorHueAnalyticsPlugin,
  },
};

export default colorPack;
~~~~~

~~~~~act
write_file
src/packs/relative_color/index.ts
~~~~~
~~~~~ts
import { Columns, Palette, Shuffle, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { relativeColorPlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const relativeColorCards: CardDefinition[] = [
  {
    id: 'rel_vector_shift',
    packId: 'relative_color',
    mode: 'VECTOR_SHIFT',
    title: '色彩矢量迁移',
    desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
    instruction: '观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色',
    icon: Shuffle,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_lightness_induction',
    packId: 'relative_color',
    mode: 'LIGHTNESS_INDUCTION',
    title: '明度反差补偿',
    desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
    instruction: '调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」',
    icon: Sun,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_hue_induction',
    packId: 'relative_color',
    mode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力。',
    instruction: '观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'rel_decontextual_2afc',
    packId: 'relative_color',
    mode: 'DECONTEXTUAL_2AFC',
    title: '环境穿透判别',
    desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
    instruction: '穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」',
    icon: Columns,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const relativeColorPack: PackManifest = {
  packId: 'relative_color',
  meta: {
    id: 'relative_color',
    title: '相对色感',
    subTitle: 'Relative Color Perception',
    desc: '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
  },
  cards: relativeColorCards,
  trainingPlugin: relativeColorPlugin,
};

export default relativeColorPack;
~~~~~

~~~~~act
write_file
src/packs/negative_space/index.ts
~~~~~
~~~~~ts
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { negRatioAnalyticsPlugin } from './analytics';
import { negativeSpacePlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const negativeSpaceCards: CardDefinition[] = [
  {
    id: 'neg_ratio_estimation',
    packId: 'negative_space',
    mode: 'RATIO_ESTIMATION',
    title: '负形占比滑块评估',
    desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
    instruction: '估计黑色主体周围的白色留白（负形）占画面总面积的百分比',
    icon: Maximize2,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      challenge: ['figure_ground_reversal'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'neg_area_comparison_2afc',
    packId: 'negative_space',
    mode: 'AREA_COMPARISON_2AFC',
    title: '负形面积二分判别',
    desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
    instruction: '二选一判别哪一侧画面的白色留白（负形）面积更大',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      challenge: ['figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_vertex_fitting',
    packId: 'negative_space',
    mode: 'NEGATIVE_VERTEX_FITTING',
    title: '负形边界反切定点',
    desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
    instruction: '观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点',
    icon: Crosshair,
    tags: {
      domain: ['form_and_proportion', 'spatial_structure'],
      path: ['absolute_estimation'],
      challenge: ['figure_ground_reversal'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_shape_match_2afc',
    packId: 'negative_space',
    mode: 'SHAPE_MATCH_2AFC',
    title: '负形轮廓记忆匹配',
    desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
    instruction: '瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状',
    icon: Sparkles,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      challenge: ['working_memory', 'figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const negativeSpacePack: PackManifest = {
  packId: 'negative_space',
  meta: {
    id: 'negative_space',
    title: '正负形空间感知',
    subTitle: 'Negative Space',
    desc: '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
  },
  cards: negativeSpaceCards,
  trainingPlugin: negativeSpacePlugin,
  analyticsPlugins: {
    neg_ratio_estimation: negRatioAnalyticsPlugin,
  },
};

export default negativeSpacePack;
~~~~~

~~~~~act
write_file
src/packs/abstraction/index.ts
~~~~~
~~~~~ts
import {
  Columns,
  Droplet,
  Eye,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sparkles,
  Sun,
} from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { abstractionPlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const abstractionCards: CardDefinition[] = [
  // === 自底向上：提炼概括 (Bottom-Up Extraction) ===
  {
    id: 'abs_gesture_axis',
    packId: 'abstraction',
    mode: 'GESTURE_AXIS',
    title: '动态势线提取',
    desc: '从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。',
    instruction: '旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)',
    icon: RotateCw,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_polygon_decimation',
    packId: 'abstraction',
    mode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。',
    instruction: '观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项',
    icon: Maximize2,
    tags: {
      domain: ['form_and_proportion'],
      path: ['extraction'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_notan_threshold',
    packId: 'abstraction',
    mode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      challenge: ['figure_ground_reversal'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_palette_clustering',
    packId: 'abstraction',
    mode: 'PALETTE_CLUSTERING',
    title: '主调色群提炼',
    desc: '穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。',
    instruction: '在下方 4 个候选项中，选出代表画面全局主调的加权主色',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['extraction'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },

  // === 自顶向下：具象寻源 (Top-Down Concretization) ===
  {
    id: 'abs_td_gesture_2afc',
    packId: 'abstraction',
    mode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    instruction: '观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势',
    icon: Shuffle,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['concretization'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    packId: 'abstraction',
    mode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['concretization'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    packId: 'abstraction',
    mode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    instruction: '观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构',
    icon: Droplet,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['concretization'],
      challenge: ['figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    packId: 'abstraction',
    mode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
    instruction: '观察上方基准主调色，选出以此为色彩基底的拼贴画面',
    icon: Sparkles,
    tags: {
      domain: ['color_and_value'],
      path: ['concretization'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const abstractionPack: PackManifest = {
  packId: 'abstraction',
  meta: {
    id: 'abstraction',
    title: '形式与抽象感知',
    subTitle: 'Visual Abstraction & Refinement',
    desc: '贯通「自底向上提炼」与「自顶向下寻源」双向视知觉闭环，训练对动态势线、极简低模、黑白Notan与色彩基调的穿透与具象推演能力。',
    themeColor: 'indigo',
    icon: Eye,
  },
  cards: abstractionCards,
  trainingPlugin: abstractionPlugin,
};

export default abstractionPack;
~~~~~

~~~~~act
write_file
src/packs/angle/index.ts
~~~~~
~~~~~ts
import { Columns, Compass, Split } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { anglePlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const angleCards: CardDefinition[] = [
  {
    id: 'angle_estimation',
    packId: 'angle',
    mode: 'ANGLE_ESTIMATION',
    title: '夹角大小估算',
    desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。',
    instruction: '观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)',
    icon: Compass,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'angle_comparison_2afc',
    packId: 'angle',
    mode: 'ANGLE_COMPARISON_2AFC',
    title: '角度二分对比',
    desc: '在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。',
    instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'angle_parallel_2afc',
    packId: 'angle',
    mode: 'PARALLEL_ALIGNMENT_2AFC',
    title: '平行线基准辨识',
    desc: '观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。',
    instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
    icon: Split,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const anglePack: PackManifest = {
  packId: 'angle',
  meta: {
    id: 'angle',
    title: '角度感知',
    subTitle: 'Angle Perception',
    desc: '以极简白底黑线剥离干扰，通过夹角大小估算、微小角度二分对比与平行线对偶辨识，构建坚实的正负形起形与角度感知直觉。',
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: angleCards,
  trainingPlugin: anglePlugin,
};

export default anglePack;
~~~~~

~~~~~act
write_file
src/packs/perspective/index.ts
~~~~~
~~~~~ts
import { ArrowRightLeft, Box, Eye, Layers, Sliders } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { perspectivePlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const perspectiveCards: CardDefinition[] = [
  {
    id: 'perspective_vp_convergence',
    packId: 'perspective',
    mode: 'VP_CONVERGENCE',
    title: '透视灭点汇聚感',
    desc: '观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。',
    instruction: '观察已有透视线，调制滑块旋转第三条线使其交汇于同一灭点',
    icon: Sliders,
    tags: {
      domain: ['spatial_structure'],
      path: ['relational_mapping'],
      interaction: ['continuous_mod'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'perspective_proportion_division',
    packId: 'perspective',
    mode: 'PROPORTION_DIVISION',
    title: '平面比例与黄金分割盲切',
    desc: '观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。',
    instruction: '观察线段并在指定比例位置单次点击',
    icon: Layers,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_proportion_migration',
    packId: 'perspective',
    mode: 'PROPORTION_MIGRATION',
    title: '空间比例角度迁移',
    desc: '观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。',
    instruction: '观察上方基准线目标点，在下方倾斜线段上点选相同比例位置',
    icon: ArrowRightLeft,
    tags: {
      domain: ['form_and_proportion', 'spatial_structure'],
      path: ['relational_mapping'],
      challenge: ['working_memory', 'dimensional_translation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_gestalt_continuation_2afc',
    packId: 'perspective',
    mode: 'GESTALT_CONTINUATION_2AFC',
    title: '断线完形连续性辨识',
    desc: '基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。',
    instruction: '二选一选出保持绝对连续贯穿的延伸线 (键 1 / 2)',
    icon: Eye,
    tags: {
      domain: ['spatial_structure'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['binary_choice'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_structure_3d',
    packId: 'perspective',
    mode: 'STRUCTURE_PROJECTION_3D',
    title: '3D 结构空间翻转',
    desc: '观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。',
    instruction: '结合三视图坐标，在 3D 立方体点阵中点选对应点',
    icon: Box,
    tags: {
      domain: ['spatial_structure'],
      path: ['absolute_estimation'],
      challenge: ['dimensional_translation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
];

export const perspectivePack: PackManifest = {
  packId: 'perspective',
  meta: {
    id: 'perspective',
    title: '透视空间感知',
    subTitle: 'Perspective & Spatial Perception',
    desc: '涵盖灭点统一感、比例黄金分割盲切、格式塔穿透遮挡完形延续与 3D 轴测结构空间翻转，全方位锤炼硬核空间素描起形直觉。',
    themeColor: 'purple',
    icon: Box,
  },
  cards: perspectiveCards,
  trainingPlugin: perspectivePlugin,
};

export default perspectivePack;
~~~~~

### 下一步建议
1. **测试用例更新与验证**：由于标签系统重构涉及倒排索引、筛选查询和统计聚合，建议运行单元测试套件 (`npm test` / `vitest`) 确保全量断言通过。
2. **UI 视觉微调**：可以在卡片列表（`ModeCard`）右上角引入极简正交 Badge，例如 `[形体与比例 · 提炼概括 ⚡ 图底反转]`，让用户在主页即可一眼领悟卡片训练本质。
