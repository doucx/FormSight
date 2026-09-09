我们将为筛选器自动引入“功能完备度 (Capabilities)”维度，涵盖专属设置与专属分析的正反双向标签，由卡片清单（Manifest）在加载时全自动推导，不修改各卡片源码。

## [WIP] feat: 为筛选器引入卡片独特设置与专属分析的自动感知与过滤支持

### 用户需求
在卡片筛选器（FilterEngine / AdvancedTagMatrix）中加入可自动生成的特性标签：
1. **独特设置 / 仅通用设置**
2. **独特分析 / 仅通用分析**

使开发者和用户能一键检索出缺少专属配置面板或专属分析图表的卡片，方便查漏补缺和识别卡片完备度。

### 评论
该需求极具工程与实用价值。通过在系统运行时（Registry）对 Manifest 的 `renderSettings` 与 `analytics.views` 进行接口存在性判定，能完全免去在各个独立卡片中手工硬编码标签的开销，保持了开放封闭原则（OCP），同时使探索大盘和计划挑选面板具备更精细的过滤能力。

### 目标
1. 扩展 `CardDefinition`、`CardFeatureTag` 与 `CardQueryOptions` 类型定义与 SDK 导出。
2. 配置 `FEATURE_TAGS` 及其 i18n 多语言文案（中/英）。
3. 升级 `SystemDomainRegistry` 与 `InvertedCardIndex`，在注册卡片时自动探测 `hasCustomSettings` 与 `hasDedicatedAnalytics` 并建立倒排索引。
4. 在 `AdvancedTagMatrix`、`FilterEngine`、`useCardFilter` 和路由序列化中接入新维度的筛选与联动。

### 基本原理
- 在卡片注册时，`hasCustomSettings = Boolean(card.ui?.renderSettings)`，`hasDedicatedAnalytics = Boolean(card.analytics?.views?.length)`。
- 倒排索引将每张卡片分别自动归类到 `has_settings` / `no_settings` 与 `has_analytics` / `no_analytics` 集合中。
- 前端筛选矩阵将其作为独立的第 6 个分类渲染，无缝兼容现有的 TagPill、交集检索与 URL Hash 参数存储。

### 标签
#intent/build #flow/ready #priority/high
#comp/cli #concept/ui #scope/ux
#ai/instruct
#task/domain/ui #task/object/filter-capability-tags #task/action/build #task/state/begin

---

### Script

#### Acts 1: 扩展类型定义与 SDK 导出

更新 `src/types/card.ts` 与 `src/card-sdk/index.ts`，定义 `CardFeatureTag` 并注入卡片模型。

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript.old
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
  domain: VisualDomainTag;
  title?: string;
  desc?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  defaultSettings?: Record<string, unknown>;
}

export interface CardQueryOptions {
  domains?: VisualDomainTag[];
  paths?: CognitivePathTag[];
  challenges?: MentalChallengeTag[];
  interactions?: InteractionTag[];
  statuses?: CardStatusTag[];
  searchKeyword?: string;
  showAdvanced?: boolean;
}
~~~~~
~~~~~typescript.new
export type CardStatusTag = 'stable' | 'experimental' | 'deprecated';

export type CardFeatureTag =
  | 'has_settings'
  | 'no_settings'
  | 'has_analytics'
  | 'no_analytics';

export interface CardTags {
  domain: VisualDomainTag[];
  path: CognitivePathTag[];
  challenge?: MentalChallengeTag[];
  interaction: InteractionTag[];
  status?: CardStatusTag;
}

export interface CardDefinition {
  id: string;
  domain: VisualDomainTag;
  title?: string;
  desc?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  hasCustomSettings?: boolean;
  hasDedicatedAnalytics?: boolean;
  defaultSettings?: Record<string, unknown>;
}

export interface CardQueryOptions {
  domains?: VisualDomainTag[];
  paths?: CognitivePathTag[];
  challenges?: MentalChallengeTag[];
  interactions?: InteractionTag[];
  statuses?: CardStatusTag[];
  features?: CardFeatureTag[];
  searchKeyword?: string;
  showAdvanced?: boolean;
}
~~~~~

~~~~~act
patch_file
src/card-sdk/index.ts
~~~~~
~~~~~typescript.old
export type {
  CardDefinition,
  CardTags,
  VisualDomainTag,
  CognitivePathTag,
  MentalChallengeTag,
  InteractionTag,
  CardStatusTag,
} from '../types/card';
~~~~~
~~~~~typescript.new
export type {
  CardDefinition,
  CardTags,
  VisualDomainTag,
  CognitivePathTag,
  MentalChallengeTag,
  InteractionTag,
  CardStatusTag,
  CardFeatureTag,
} from '../types/card';
~~~~~

#### Acts 2: 添加标签元数据定义与多语言词典

在 `src/config/tags.ts` 中配置主题色与 i18nKey，并在 `zh-CN.json` 和 `en-US.json` 中补齐词条。

~~~~~act
patch_file
src/config/tags.ts
~~~~~
~~~~~typescript.old
import type {
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
~~~~~
~~~~~typescript.new
import type {
  CardFeatureTag,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
~~~~~

~~~~~act
patch_file
src/config/tags.ts
~~~~~
~~~~~typescript.old
export const STATUS_TAGS: Record<CardStatusTag, TagMeta<CardStatusTag>> = {
  stable: {
    id: 'stable',
    i18nKey: 'tags.statuses.stable',
    themeColor: 'indigo',
  },
  experimental: {
    id: 'experimental',
    i18nKey: 'tags.statuses.experimental',
    themeColor: 'amber',
  },
  deprecated: {
    id: 'deprecated',
    i18nKey: 'tags.statuses.deprecated',
    themeColor: 'rose',
  },
};
~~~~~
~~~~~typescript.new
export const STATUS_TAGS: Record<CardStatusTag, TagMeta<CardStatusTag>> = {
  stable: {
    id: 'stable',
    i18nKey: 'tags.statuses.stable',
    themeColor: 'indigo',
  },
  experimental: {
    id: 'experimental',
    i18nKey: 'tags.statuses.experimental',
    themeColor: 'amber',
  },
  deprecated: {
    id: 'deprecated',
    i18nKey: 'tags.statuses.deprecated',
    themeColor: 'rose',
  },
};

export const FEATURE_TAGS: Record<CardFeatureTag, TagMeta<CardFeatureTag>> = {
  has_settings: {
    id: 'has_settings',
    i18nKey: 'tags.features.has_settings',
    themeColor: 'indigo',
  },
  no_settings: {
    id: 'no_settings',
    i18nKey: 'tags.features.no_settings',
    themeColor: 'amber',
  },
  has_analytics: {
    id: 'has_analytics',
    i18nKey: 'tags.features.has_analytics',
    themeColor: 'emerald',
  },
  no_analytics: {
    id: 'no_analytics',
    i18nKey: 'tags.features.no_analytics',
    themeColor: 'rose',
  },
};
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "statuses": {
      "stable": "稳定模块",
      "experimental": "实验性模块",
      "deprecated": "已废弃"
    }
  },
  "home": {
~~~~~
~~~~~json.new
    "statuses": {
      "stable": "稳定模块",
      "experimental": "实验性模块",
      "deprecated": "已废弃"
    },
    "features": {
      "has_settings": "独特设置",
      "no_settings": "通用设置",
      "has_analytics": "独特分析",
      "no_analytics": "通用分析"
    }
  },
  "home": {
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "interactionSection": "4. 交互评估形态 (Interaction Mode)",
    "statusSection": "5. 特性与发布状态 (Status)"
  },
~~~~~
~~~~~json.new
    "interactionSection": "4. 交互评估形态 (Interaction Mode)",
    "statusSection": "5. 特性与发布状态 (Status)",
    "featureSection": "6. 模块完备度 (Capabilities)"
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "statuses": {
      "stable": "Stable Module",
      "experimental": "Experimental",
      "deprecated": "Deprecated"
    }
  },
  "home": {
~~~~~
~~~~~json.new
    "statuses": {
      "stable": "Stable Module",
      "experimental": "Experimental",
      "deprecated": "Deprecated"
    },
    "features": {
      "has_settings": "Dedicated Settings",
      "no_settings": "Default Settings",
      "has_analytics": "Dedicated Analytics",
      "no_analytics": "Basic Analytics"
    }
  },
  "home": {
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "interactionSection": "4. Interaction Mode",
    "statusSection": "5. Feature & Status"
  },
~~~~~
~~~~~json.new
    "interactionSection": "4. Interaction Mode",
    "statusSection": "5. Feature & Status",
    "featureSection": "6. Capabilities"
  },
~~~~~

#### Acts 3: 注册器自动推导与倒排索引升级

在 `src/core/registry.ts` 中引入 `CardFeatureTag`，自动探测 `hasCustomSettings` 与 `hasDedicatedAnalytics`，并对 `features` 做交集查询。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
~~~~~
~~~~~typescript.new
import type {
  CardDefinition,
  CardFeatureTag,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
class InvertedCardIndex {
  private domainMap = new Map<VisualDomainTag, Set<string>>();
  private pathMap = new Map<CognitivePathTag, Set<string>>();
  private challengeMap = new Map<MentalChallengeTag, Set<string>>();
  private interactionMap = new Map<InteractionTag, Set<string>>();
  private statusMap = new Map<CardStatusTag, Set<string>>();

  public clear(): void {
    this.domainMap.clear();
    this.pathMap.clear();
    this.challengeMap.clear();
    this.interactionMap.clear();
    this.statusMap.clear();
  }
~~~~~
~~~~~typescript.new
class InvertedCardIndex {
  private domainMap = new Map<VisualDomainTag, Set<string>>();
  private pathMap = new Map<CognitivePathTag, Set<string>>();
  private challengeMap = new Map<MentalChallengeTag, Set<string>>();
  private interactionMap = new Map<InteractionTag, Set<string>>();
  private statusMap = new Map<CardStatusTag, Set<string>>();
  private featureMap = new Map<CardFeatureTag, Set<string>>();

  public clear(): void {
    this.domainMap.clear();
    this.pathMap.clear();
    this.challengeMap.clear();
    this.interactionMap.clear();
    this.statusMap.clear();
    this.featureMap.clear();
  }
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
      const status: CardStatusTag = card.tags.status || 'stable';
      let stSet = this.statusMap.get(status);
      if (!stSet) {
        stSet = new Set();
        this.statusMap.set(status, stSet);
      }
      stSet.add(id);
    }

    const addFeature = (feat: CardFeatureTag) => {
      let set = this.featureMap.get(feat);
      if (!set) {
        set = new Set();
        this.featureMap.set(feat, set);
      }
      set.add(id);
    };

    addFeature(card.hasCustomSettings ? 'has_settings' : 'no_settings');
    addFeature(card.hasDedicatedAnalytics ? 'has_analytics' : 'no_analytics');
  }

  public getCardIdsByFeature(feat: CardFeatureTag): Set<string> {
    return this.featureMap.get(feat) || new Set();
  }

  public getCardIdsByDomain(domain: VisualDomainTag): Set<string> {
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
    // 2. 构建标准 CardDefinition
    const icon = card.ui.icon;
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      defaultSettings: card.defaultSettings,
    };
~~~~~
~~~~~typescript.new
    // 2. 构建标准 CardDefinition (自动探查专属设置与专属分析完备度)
    const icon = card.ui.icon;
    const hasCustomSettings = Boolean(card.ui?.renderSettings);
    const hasDedicatedAnalytics = Boolean(card.analytics?.views && card.analytics.views.length > 0);

    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      icon,
      tags: card.tags,
      hasWeaknessAnalytics: hasDedicatedAnalytics,
      hasCustomSettings,
      hasDedicatedAnalytics,
      defaultSettings: card.defaultSettings,
    };
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
    if (options.statuses && options.statuses.length > 0) {
      const statusUnion = new Set<string>();
      for (const st of options.statuses) {
        for (const id of this.invertedIndex.getCardIdsByStatus(st)) {
          statusUnion.add(id);
        }
      }
      intersect(statusUnion);
    }

    if (options.features && options.features.length > 0) {
      const featureUnion = new Set<string>();
      for (const f of options.features) {
        for (const id of this.invertedIndex.getCardIdsByFeature(f)) {
          featureUnion.add(id);
        }
      }
      intersect(featureUnion);
    }

    const idsToFilter: string[] =
~~~~~

#### Acts 4: 筛选器组件与 Hook 集成

在 `AdvancedTagMatrix.tsx`、`FilterEngine.tsx`、`useCardFilter.ts` 及 `useHashRoute.ts` 中串联新维度的交互与路由持久化。

~~~~~act
patch_file
src/components/discovery/AdvancedTagMatrix.tsx
~~~~~
~~~~~typescript.old
import { Brain, Compass, Eye, FlaskConical, MousePointer } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import {
  CHALLENGE_TAGS,
  DOMAIN_TAGS,
  INTERACTION_TAGS,
  PATH_TAGS,
  STATUS_TAGS,
} from '../../config/tags';
import { useTranslation } from '../../core/i18n';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';
import { TagPill } from '../common/TagPill';
~~~~~
~~~~~typescript.new
import { Brain, Compass, Eye, FlaskConical, MousePointer, Sliders } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import {
  CHALLENGE_TAGS,
  DOMAIN_TAGS,
  FEATURE_TAGS,
  INTERACTION_TAGS,
  PATH_TAGS,
  STATUS_TAGS,
} from '../../config/tags';
import { useTranslation } from '../../core/i18n';
import type {
  CardFeatureTag,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';
import { TagPill } from '../common/TagPill';
~~~~~

~~~~~act
patch_file
src/components/discovery/AdvancedTagMatrix.tsx
~~~~~
~~~~~typescript.old
interface AdvancedTagMatrixProps {
  query: CardQueryOptions;
  tagSize: 'sm' | 'md';
  isCompact?: boolean;
  onToggleDomain: (d: VisualDomainTag) => void;
  onTogglePath: (p: CognitivePathTag) => void;
  onToggleChallenge: (c: MentalChallengeTag) => void;
  onToggleInteraction: (i: InteractionTag) => void;
  onToggleStatus: (st: CardStatusTag) => void;
}

export function AdvancedTagMatrix({
  query,
  tagSize,
  isCompact = false,
  onToggleDomain,
  onTogglePath,
  onToggleChallenge,
  onToggleInteraction,
  onToggleStatus,
}: AdvancedTagMatrixProps) {
~~~~~
~~~~~typescript.new
interface AdvancedTagMatrixProps {
  query: CardQueryOptions;
  tagSize: 'sm' | 'md';
  isCompact?: boolean;
  onToggleDomain: (d: VisualDomainTag) => void;
  onTogglePath: (p: CognitivePathTag) => void;
  onToggleChallenge: (c: MentalChallengeTag) => void;
  onToggleInteraction: (i: InteractionTag) => void;
  onToggleStatus: (st: CardStatusTag) => void;
  onToggleFeature: (f: CardFeatureTag) => void;
}

export function AdvancedTagMatrix({
  query,
  tagSize,
  isCompact = false,
  onToggleDomain,
  onTogglePath,
  onToggleChallenge,
  onToggleInteraction,
  onToggleStatus,
  onToggleFeature,
}: AdvancedTagMatrixProps) {
~~~~~

~~~~~act
patch_file
src/components/discovery/AdvancedTagMatrix.tsx
~~~~~
~~~~~typescript.old
      {/* 5. 特性与发布状态 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={FlaskConical}
          title={t('home.statusSection')}
          iconColorClass="text-amber-500"
        />
        <div className="flex flex-wrap gap-1">
          {(['stable', 'experimental'] as CardStatusTag[]).map((st) => (
            <TagPill
              key={st}
              size={tagSize}
              label={t(STATUS_TAGS[st].i18nKey)}
              themeColor={STATUS_TAGS[st].themeColor || (st === 'stable' ? 'indigo' : 'amber')}
              selected={query.statuses?.includes(st) ?? false}
              onClick={() => onToggleStatus(st)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript.new
      {/* 5. 特性与发布状态 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={FlaskConical}
          title={t('home.statusSection')}
          iconColorClass="text-amber-500"
        />
        <div className="flex flex-wrap gap-1">
          {(['stable', 'experimental'] as CardStatusTag[]).map((st) => (
            <TagPill
              key={st}
              size={tagSize}
              label={t(STATUS_TAGS[st].i18nKey)}
              themeColor={STATUS_TAGS[st].themeColor || (st === 'stable' ? 'indigo' : 'amber')}
              selected={query.statuses?.includes(st) ?? false}
              onClick={() => onToggleStatus(st)}
            />
          ))}
        </div>
      </div>

      {/* 6. 功能完备度 */}
      <div className="space-y-1">
        <FilterSectionHeader
          icon={Sliders}
          title={t('home.featureSection')}
          iconColorClass="text-purple-500"
        />
        <div className="flex flex-wrap gap-1">
          {(Object.keys(FEATURE_TAGS) as CardFeatureTag[]).map((f) => (
            <TagPill
              key={f}
              size={tagSize}
              label={t(FEATURE_TAGS[f].i18nKey)}
              themeColor={FEATURE_TAGS[f].themeColor || 'purple'}
              selected={query.features?.includes(f) ?? false}
              onClick={() => onToggleFeature(f)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript.old
  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );
~~~~~
~~~~~typescript.new
  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0) ||
      (query.features && query.features.length > 0),
  );
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript.old
      {/* 高级五维标签矩阵折叠区 */}
      {isAdvancedOpen && (
        <AdvancedTagMatrix
          query={query}
          tagSize={tagSize}
          isCompact={isCompact}
          onToggleDomain={(d) => toggleDimension('domains', d)}
          onTogglePath={(p) => toggleDimension('paths', p)}
          onToggleChallenge={(c) => toggleDimension('challenges', c)}
          onToggleInteraction={(i) => toggleDimension('interactions', i)}
          onToggleStatus={(st) => toggleDimension('statuses', st)}
        />
      )}
~~~~~
~~~~~typescript.new
      {/* 高级标签矩阵折叠区 */}
      {isAdvancedOpen && (
        <AdvancedTagMatrix
          query={query}
          tagSize={tagSize}
          isCompact={isCompact}
          onToggleDomain={(d) => toggleDimension('domains', d)}
          onTogglePath={(p) => toggleDimension('paths', p)}
          onToggleChallenge={(c) => toggleDimension('challenges', c)}
          onToggleInteraction={(i) => toggleDimension('interactions', i)}
          onToggleStatus={(st) => toggleDimension('statuses', st)}
          onToggleFeature={(f) => toggleDimension('features', f)}
        />
      )}
~~~~~

~~~~~act
patch_file
src/hooks/useCardFilter.ts
~~~~~
~~~~~typescript.old
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
~~~~~
~~~~~typescript.new
import type {
  CardDefinition,
  CardFeatureTag,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
~~~~~

~~~~~act
patch_file
src/hooks/useCardFilter.ts
~~~~~
~~~~~typescript.old
  const toggleStatus = (status: CardStatusTag) => {
    const current = query.statuses || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateQuery({ ...query, statuses: next.length > 0 ? next : undefined });
  };

  const toggleAdvancedOpen = () => {
~~~~~
~~~~~typescript.new
  const toggleStatus = (status: CardStatusTag) => {
    const current = query.statuses || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateQuery({ ...query, statuses: next.length > 0 ? next : undefined });
  };

  const toggleFeature = (feature: CardFeatureTag) => {
    const current = query.features || [];
    const next = current.includes(feature)
      ? current.filter((f) => f !== feature)
      : [...current, feature];
    updateQuery({ ...query, features: next.length > 0 ? next : undefined });
  };

  const toggleAdvancedOpen = () => {
~~~~~

~~~~~act
patch_file
src/hooks/useCardFilter.ts
~~~~~
~~~~~typescript.old
  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );
~~~~~
~~~~~typescript.new
  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0) ||
      (query.features && query.features.length > 0),
  );
~~~~~

~~~~~act
patch_file
src/hooks/useCardFilter.ts
~~~~~
~~~~~typescript.old
    toggleInteraction,
    toggleStatus,
    toggleAdvancedOpen,
    handleResetFilters,
  };
}
~~~~~
~~~~~typescript.new
    toggleInteraction,
    toggleStatus,
    toggleFeature,
    toggleAdvancedOpen,
    handleResetFilters,
  };
}
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
~~~~~
~~~~~typescript.new
import type {
  CardFeatureTag,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
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
  const showAdvancedParam = params.get('adv');
  const showAdvanced =
    showAdvancedParam === '1' || showAdvancedParam === 'true'
      ? true
      : showAdvancedParam === '0' || showAdvancedParam === 'false'
        ? false
        : undefined;

  if (
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
    domains: domains && domains.length > 0 ? domains : undefined,
    paths: paths && paths.length > 0 ? paths : undefined,
    challenges: challenges && challenges.length > 0 ? challenges : undefined,
    interactions: interactions && interactions.length > 0 ? interactions : undefined,
    statuses,
    searchKeyword,
    showAdvanced,
  };
}
~~~~~
~~~~~typescript.new
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
  const features = params.get('features')?.split(',').filter(Boolean) as
    | CardFeatureTag[]
    | undefined;
  const searchKeyword = params.get('q') || params.get('search') || undefined;
  const showAdvancedParam = params.get('adv');
  const showAdvanced =
    showAdvancedParam === '1' || showAdvancedParam === 'true'
      ? true
      : showAdvancedParam === '0' || showAdvancedParam === 'false'
        ? false
        : undefined;

  if (
    (!domains || domains.length === 0) &&
    (!paths || paths.length === 0) &&
    (!challenges || challenges.length === 0) &&
    (!interactions || interactions.length === 0) &&
    (!statuses || statuses.length === 0) &&
    (!features || features.length === 0) &&
    !searchKeyword &&
    showAdvanced === undefined
  ) {
    return undefined;
  }

  return {
    domains: domains && domains.length > 0 ? domains : undefined,
    paths: paths && paths.length > 0 ? paths : undefined,
    challenges: challenges && challenges.length > 0 ? challenges : undefined,
    interactions: interactions && interactions.length > 0 ? interactions : undefined,
    statuses,
    features: features && features.length > 0 ? features : undefined,
    searchKeyword,
    showAdvanced,
  };
}
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
    if (route.query.statuses && route.query.statuses.length > 0) {
      params.set('statuses', route.query.statuses.join(','));
    }
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
~~~~~
~~~~~typescript.new
    if (route.query.statuses && route.query.statuses.length > 0) {
      params.set('statuses', route.query.statuses.join(','));
    }
    if (route.query.features && route.query.features.length > 0) {
      params.set('features', route.query.features.join(','));
    }
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
~~~~~

### 下一步建议
1. **构建与类型验证**：在开发环境中执行 `pnpm check` 或 `pnpm build`，确保 TypeScript 类型与路由解析正常编译。
2. **探索大盘测试**：启动系统并展开高级筛选，测试点击 `独特设置`、`通用设置`、`独特分析`、`通用分析` 标签，核验卡片过滤与 URL `features` 参数的同步。
3. **验证通过后提交**：确认运行无误后，即可生成单独的 Git 提交计划。
