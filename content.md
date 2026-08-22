收到，我们将开启 **里程碑 2：本体架构解耦与插件化 (Ontology & Plugin Architecture)** 的核心实施。

本阶段我们将完成从单一树状 Domain 到扁平化扩展包（Pack）与多维倒排标签索引引擎（Inverted Index Engine）的系统级演进，并保持对现有存量数据和视图调用的完全向后兼容。

## [WIP] refactor: 重塑卡片契约并构建 Pack 插件化与倒排索引引擎

### 用户需求
按照 FormSight v0.4.0 架构演进白皮书与路线图要求，实施里程碑 2 的核心底层重构：
1. 重构 `CardDefinition`，确立 `packId` 与多维标签体系（`SensoryTarget`, `CognitiveSkill`, `Interaction`）；
2. 抽象并支持 `PackManifest` 插件化清单契约，支持 packs 与 domains 自动化注册；
3. 在 `SystemRegistry` 中建立倒排索引体系（Inverted Index），实现多维标签交叉查询能力与 Pack 分发体系；
4. 保证现有查询 API 与历史数据结构的平稳过渡与向下兼容。

### 评论
这是 FormSight 摆脱分类学枷锁、迈向自适应认知训练引擎的关键一步。通过将卡片本体与物理组织解耦并引入基于内存的倒排索引（Inverted Index），不仅使后续开发扩展包（Pack）如搭积木般容易，更直接为上层的大盘发现流与参数化动态训练计划奠定了高性能的检索基础。

### 目标
1. **类型层演进**：更新 `src/types/card.ts`，定义 `CardQueryOptions`、`PackMeta` 并强化 `CardDefinition` 的标签矩阵契约。
2. **契约层升级**：更新 `src/core/contracts.ts`，引入 `PackManifest` 规范并对 `DomainManifest` 形成兼容桥接。
3. **注册与索引引擎实现**：重构 `src/core/registry.ts`，实现自动发现 `../packs/*/index.ts` 与 `../domains/*/index.ts`，并在系统初始化时构建毫秒级多维倒排索引。
4. **统一导出更新**：更新 `src/core/index.ts`，确保新类型与查询能力对全系统透明暴露。

### 基本原理
- **双向扫描兼容**：注册表通过 `import.meta.glob` 同时支持 `../packs/*/index.ts` 和 `../domains/*/index.ts`，为后续各领域代码物理平移至 packs 目录提供平滑路径。
- **倒排索引（Inverted Index）**：在注册卡片时将每张卡片的 `target`、`skill`、`interaction` 和 `packId` 分别映射到 Set 集合中。多维复合过滤（交集与联合）在内存中通过 Set 的快速查找完成，复杂度为 $O(1) \sim O(K)$，无需遍历全量卡片。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #concept/parser #scope/core #scope/api #ai/instruct #task/domain/architecture #task/object/pack-inverted-index #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构卡片类型与查询契约定义

更新 `src/types/card.ts`，完善 Pack 元数据定义、标签枚举以及多维倒排查询参数 `CardQueryOptions`。

~~~~~act
write_file
src/types/card.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { TrainingDomain } from '../utils/db/index';

export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization'
  | 'angle';

export type CognitiveSkillTag =
  | 'spatial_orientation'
  | 'color_fidelity'
  | 'illusion_invariance'
  | 'proportion'
  | 'visual_memory'
  | 'abstraction'
  | 'gesture_flow'
  | 'notan_grouping';

export type InteractionTag =
  | 'continuous_slider'
  | 'point_click'
  | 'choice_2afc'
  | 'choice_nafc';

export interface CardTags {
  target: SensoryTargetTag[];
  skill: CognitiveSkillTag[];
  interaction: InteractionTag[];
}

export interface CardDefinition {
  id: string;
  packId?: string;
  domain: TrainingDomain;
  mode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  isExperimental?: boolean;
}

export interface PackMeta {
  id: string;
  title: string;
  desc: string;
  version?: string;
  author?: string;
  themeColor?: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon?: (props: { className?: string }) => ComponentChildren;
}

export interface CardQueryOptions {
  packId?: string;
  domain?: TrainingDomain;
  targets?: SensoryTargetTag[];
  skills?: CognitiveSkillTag[];
  interactions?: InteractionTag[];
  includeExperimental?: boolean;
  searchKeyword?: string;
}
~~~~~

#### Acts 2: 扩展核心插件契约支持 PackManifest

更新 `src/core/contracts.ts`，新增 `PackManifest` 规范并对 `DomainManifest` 进行兼容性桥接。

~~~~~act
write_file
src/core/contracts.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition, PackMeta } from '../types/card';
import type { TrainingDomain, UnifiedTrialRecord } from '../utils/db/schema';
import type { BaseModuleSettings } from '../utils/settings';

export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[]) => void;
  renderDiagnostics: (records: TRecord[]) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  views: CardAnalyticsView<TRecord>[];
}

/**
 * 扩展包清单 (Pack Manifest)
 * v0.4.x 核心插件规范：任何独立内容扩展包（Pack）均可提供此清单
 */
export interface PackManifest {
  packId: string;
  meta: PackMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}

/**
 * 领域包清单 (Domain Manifest)
 * 兼容 v0.3.x 存量领域模块定义
 */
export interface DomainManifest {
  domain: TrainingDomain;
  meta: DomainMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}

export type AnyManifest = PackManifest | DomainManifest;
~~~~~

#### Acts 3: 重构系统注册表并接入倒排索引引擎

重写 `src/core/registry.ts`，自动扫描 Pack 与 Domain 清单，并建立基于 Tag 和 Pack 的倒排索引。

~~~~~act
write_file
src/core/registry.ts
~~~~~
~~~~~typescript
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type {
  CardDefinition,
  CardQueryOptions,
  CognitiveSkillTag,
  InteractionTag,
  PackMeta,
  SensoryTargetTag,
} from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type {
  AnyManifest,
  CardAnalyticsPlugin,
  DomainManifest,
  PackManifest,
} from './contracts';

class InvertedCardIndex {
  private targetMap = new Map<SensoryTargetTag, Set<string>>();
  private skillMap = new Map<CognitiveSkillTag, Set<string>>();
  private interactionMap = new Map<InteractionTag, Set<string>>();
  private packMap = new Map<string, Set<string>>();
  private domainMap = new Map<TrainingDomain, Set<string>>();

  public clear(): void {
    this.targetMap.clear();
    this.skillMap.clear();
    this.interactionMap.clear();
    this.packMap.clear();
    this.domainMap.clear();
  }

  public indexCard(card: CardDefinition): void {
    const id = card.id;

    // 索引 Domain
    if (card.domain) {
      let set = this.domainMap.get(card.domain);
      if (!set) {
        set = new Set();
        this.domainMap.set(card.domain, set);
      }
      set.add(id);
    }

    // 索引 Pack
    if (card.packId) {
      let set = this.packMap.get(card.packId);
      if (!set) {
        set = new Set();
        this.packMap.set(card.packId, set);
      }
      set.add(id);
    }

    // 索引多维标签
    if (card.tags) {
      for (const t of card.tags.target || []) {
        let set = this.targetMap.get(t);
        if (!set) {
          set = new Set();
          this.targetMap.set(t, set);
        }
        set.add(id);
      }

      for (const s of card.tags.skill || []) {
        let set = this.skillMap.get(s);
        if (!set) {
          set = new Set();
          this.skillMap.set(s, set);
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
    }
  }

  public getCardIdsByTarget(target: SensoryTargetTag): Set<string> {
    return this.targetMap.get(target) || new Set();
  }

  public getCardIdsBySkill(skill: CognitiveSkillTag): Set<string> {
    return this.skillMap.get(skill) || new Set();
  }

  public getCardIdsByInteraction(interaction: InteractionTag): Set<string> {
    return this.interactionMap.get(interaction) || new Set();
  }

  public getCardIdsByPack(packId: string): Set<string> {
    return this.packMap.get(packId) || new Set();
  }

  public getCardIdsByDomain(domain: TrainingDomain): Set<string> {
    return this.domainMap.get(domain) || new Set();
  }
}

class SystemDomainRegistry {
  private domains = new Map<TrainingDomain, DomainManifest>();
  private packs = new Map<string, PackManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描 src/packs/*\/index.ts 以及 src/domains/*\/index.ts 零配置注册
   */
  private autoDiscover(): void {
    const packModules = import.meta.glob<{ default: AnyManifest }>('../packs/*/index.ts', {
      eager: true,
    });

    const domainModules = import.meta.glob<{ default: AnyManifest }>('../domains/*/index.ts', {
      eager: true,
    });

    for (const path in packModules) {
      const manifest = packModules[path]?.default;
      if (manifest) this.register(manifest);
    }

    for (const path in domainModules) {
      const manifest = domainModules[path]?.default;
      if (manifest) this.register(manifest);
    }
  }

  public register(manifest: AnyManifest): void {
    if ('packId' in manifest) {
      this.packs.set(manifest.packId, manifest);
    }

    if ('domain' in manifest) {
      this.domains.set(manifest.domain, manifest);
    }

    for (const card of manifest.cards) {
      const normalizedCard: CardDefinition = {
        ...card,
        packId: ('packId' in manifest ? manifest.packId : card.packId) || card.domain,
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

    if (options.domain) {
      intersect(this.invertedIndex.getCardIdsByDomain(options.domain));
    }

    if (options.targets && options.targets.length > 0) {
      const targetUnion = new Set<string>();
      for (const t of options.targets) {
        for (const id of this.invertedIndex.getCardIdsByTarget(t)) {
          targetUnion.add(id);
        }
      }
      intersect(targetUnion);
    }

    if (options.skills && options.skills.length > 0) {
      const skillUnion = new Set<string>();
      for (const s of options.skills) {
        for (const id of this.invertedIndex.getCardIdsBySkill(s)) {
          skillUnion.add(id);
        }
      }
      intersect(skillUnion);
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

    const idsToFilter = candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));

    if (!options.includeExperimental) {
      results = results.filter((c) => !c.isExperimental);
    }

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

  // === Domain 兼容接口 (向后兼容 v0.3.x 视图) ===
  public getAllDomains(): TrainingDomain[] {
    return Array.from(this.domains.keys());
  }

  public getAllDomainMetas(): DomainMeta[] {
    return Array.from(this.domains.values()).map((d) => d.meta);
  }

  public getDomainManifest(domain: TrainingDomain): DomainManifest | undefined {
    return this.domains.get(domain);
  }

  public getDomainMeta(domain: TrainingDomain): DomainMeta | undefined {
    return this.domains.get(domain)?.meta;
  }

  public getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
    return this.domains.get(domain)?.cards || [];
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

  public isRegisteredDomain(domain: string): domain is TrainingDomain {
    return this.domains.has(domain as TrainingDomain);
  }
}

export const registry = new SystemDomainRegistry();
~~~~~

### 下一步建议
1. **执行单元测试校验**：运行 `npm run test` 或 `npx vitest`，验证注册表初始化、卡片映射及倒排索引在各条件组合下的正确性。
2. **推进 Pack 迁移与大盘发现库组件**：开始里程碑 3 中的 `<FilterEngine />` 封装与主页大盘改造，使多维标签筛选直达用户交互层。
