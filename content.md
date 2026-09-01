我们将彻底清理项目中所有与 `packs` 相关的遗留架构和冗余代码，完全统一为现代的 Flat Cards（独立卡片）架构。

## [WIP] refactor: 全面清理与 packs 相关的遗留代码与类型定义

### 用户需求

彻底移除 `src/` 目录下所有遗留的 `packs` 扫描、类型定义、筛选选择器、多语言解析及回退逻辑，使全工程统一使用 Flat Cards 架构。

### 评论

在架构全面迁移到独立单卡清单（`CardManifest`）后，保留双轨的 `packs` 兼容代码不仅增加了维护成本，还容易导致多语言 key 查找分叉和配置解析 bug。清理后架构将更加纯粹、类型更加精确，运行时性能也因减少无用扫描和正则匹配而进一步提升。

### 目标

1. 清理 `src/types/card.ts` 和 `src/core/contracts.ts` 中的 `PackMeta`、`PackManifest`、`card.packId` 与 `CardQueryOptions.packId`。
2. 清理 `src/core/registry.ts` 中的旧 pack 扫描、倒排索引与查询接口。
3. 清理 `src/core/i18n.ts` 中 `registerPackLocales`、`getPackTitle` 与 `packs.*` 多语言路径回退。
4. 清理 `FilterEngine.tsx`、`GlobalStatsView.tsx`、`CardAnalyticsView.tsx`、`TrainingShell.tsx`、`GenericTrainingView.tsx` 以及相关 hooks 中对 packs 的依赖与 UI 渲染。

### 基本原理

1. `CardDefinition` 中的 `packId` 统一替换为单卡所属的一级视觉域 `domain: VisualDomainTag`。
2. 过滤检索与数据统计直接基于四维标签体系（Domain、Path、Challenge、Interaction），不再挂载中间层的 Pack。
3. 多语言查表直接通过 `cards.<cardId>.*` 寻址，简化 I18nManager。

### 标签

#intent/refine #flow/ready #priority/medium #comp/core #comp/interfaces #concept/config #concept/parser #scope/core #scope/api #scope/dx #ai/instruct #task/domain/architecture #task/object/packs-cleanup #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 清理核心类型定义 (`src/types/card.ts` & `src/core/contracts.ts`)

将 `CardDefinition` 的 `packId` 替换为 `domain`，并移除 `PackMeta`、`PackManifest` 等接口。

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  packId: string;
  mode: string;
  title?: string;
  desc?: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  defaultSettings?: Record<string, unknown>;
}

export interface PackMeta {
  id: string;
  title?: string;
  subTitle?: string;
  desc?: string;
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
  showAdvanced?: boolean;
}
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  domain: VisualDomainTag;
  mode: string;
  title?: string;
  desc?: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
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

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript
export interface TrainingPlugin<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  packId?: string;
  title: string;
  getModeBadge: (mode: string) => string;
  isTargeting?: (mode: string, settings: TSettings) => boolean;
  generateQuestion: (mode: string, level: number, settings: TSettings) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion, mode: string) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  extractRecordDetails: (
    question: TQuestion,
    hitResult: THitResult,
    userVal: TAnswerVal,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (
    props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
}
~~~~~
~~~~~typescript
export interface TrainingPlugin<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  title: string;
  getModeBadge: (mode: string) => string;
  isTargeting?: (mode: string, settings: TSettings) => boolean;
  generateQuestion: (mode: string, level: number, settings: TSettings) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion, mode: string) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  extractRecordDetails: (
    question: TQuestion,
    hitResult: THitResult,
    userVal: TAnswerVal,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (
    props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
}
~~~~~

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript
/**
 * 扩展包清单 (Pack Manifest)
 * v0.4.x 核心插件规范：任何独立内容扩展包（Pack）均遵循此清单
 */
export interface PackManifest {
  packId: string;
  meta: PackMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
  locales?: Record<string, Record<string, unknown>>;
}

export type AnyManifest = PackManifest;
~~~~~
~~~~~typescript
~~~~~

#### Acts 2: 清理国际化层 (`src/core/i18n.ts`)

移除 `registerPackLocales`、`getPackTitle` 以及所有 `packs.<packId>` 路径回退。

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript
  /** 注册全局系统级词典 */
  public registerGlobalLocales(locales: Record<string, LocaleDictionary>): void {
    for (const [lang, dict] of Object.entries(locales)) {
      if (!this.dictionaries[lang]) {
        this.dictionaries[lang] = {};
      }
      Object.assign(this.dictionaries[lang], dict);
    }
  }

  /** 由 Registry 在自动扫描 Pack 时调用，将 Pack 私有词典挂载至 `packs.<packId>` 命名空间 */
  public registerPackLocales(packId: string, locales: Record<string, LocaleDictionary>): void {
    for (const [lang, dict] of Object.entries(locales)) {
      if (!this.dictionaries[lang]) {
        this.dictionaries[lang] = {};
      }
      const root = this.dictionaries[lang];
      if (!root.packs || typeof root.packs !== 'object') {
        root.packs = {};
      }
      (root.packs as Record<string, unknown>)[packId] = dict;
    }
  }

  /** 由 Registry 在自动扫描独立 Card 时调用，将 Card 私有词典挂载至 `cards.<cardId>` 命名空间 */
~~~~~
~~~~~typescript
  /** 注册全局系统级词典 */
  public registerGlobalLocales(locales: Record<string, LocaleDictionary>): void {
    for (const [lang, dict] of Object.entries(locales)) {
      if (!this.dictionaries[lang]) {
        this.dictionaries[lang] = {};
      }
      Object.assign(this.dictionaries[lang], dict);
    }
  }

  /** 由 Registry 在自动扫描独立 Card 时调用，将 Card 私有词典挂载至 `cards.<cardId>` 命名空间 */
~~~~~

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript
/**
 * 通用：解析卡片标题多语言回退 (优先 cards.<cardId>.title，向下回退 packs.<packId>.cards.<cardId>.title)
 */
export function getCardTitle(
  card: { id: string; packId?: string; title?: string },
  t = i18n.t,
): string {
  const cardKey = `cards.${card.id}.title`;
  const translatedCard = t(cardKey);
  if (translatedCard !== cardKey) return translatedCard;

  const packId = card.packId || 'core';
  const packKey = `packs.${packId}.cards.${card.id}.title`;
  const translatedPack = t(packKey);
  return translatedPack !== packKey ? translatedPack : card.title || card.id;
}

/**
 * 通用：解析卡片描述多语言回退 (优先 cards.<cardId>.desc，向下回退 packs.<packId>.cards.<cardId>.desc)
 */
export function getCardDesc(
  card: { id: string; packId?: string; desc?: string },
  t = i18n.t,
): string {
  const cardKey = `cards.${card.id}.desc`;
  const translatedCard = t(cardKey);
  if (translatedCard !== cardKey) return translatedCard;

  const packId = card.packId || 'core';
  const packKey = `packs.${packId}.cards.${card.id}.desc`;
  const translatedPack = t(packKey);
  return translatedPack !== packKey ? translatedPack : card.desc || '';
}

/**
 * 卡片局部翻译 Hook，支持纯相对 key 自动补全为 `cards.<cardId>.<key>`
 */
export function useCardTranslation(cardId: string) {
  const { t: baseT, locale, setLocale } = useTranslation();

  const cardT = (key: string, params?: Record<string, string | number>) => {
    const isGlobal =
      key.startsWith('cards.') || key.startsWith('global.') || key.startsWith('packs.');
    const fullKey = isGlobal ? key : `cards.${cardId}.${key.replace(/^\./, '')}`;
    return baseT(fullKey, params);
  };

  return { t: cardT, locale, setLocale };
}

/**
 * 通用：解析扩展包标题多语言回退
 */
export function getPackTitle(
  pack: { packId: string; meta?: { title?: string } },
  t = i18n.t,
): string {
  const key = `packs.${pack.packId}.meta.title`;
  const translated = t(key);
  return translated !== key ? translated : pack.meta?.title || pack.packId;
}
~~~~~
~~~~~typescript
/**
 * 通用：解析卡片标题多语言 (优先 cards.<cardId>.title)
 */
export function getCardTitle(
  card: { id: string; title?: string },
  t = i18n.t,
): string {
  const cardKey = `cards.${card.id}.title`;
  const translatedCard = t(cardKey);
  return translatedCard !== cardKey ? translatedCard : card.title || card.id;
}

/**
 * 通用：解析卡片描述多语言 (优先 cards.<cardId>.desc)
 */
export function getCardDesc(
  card: { id: string; desc?: string },
  t = i18n.t,
): string {
  const cardKey = `cards.${card.id}.desc`;
  const translatedCard = t(cardKey);
  return translatedCard !== cardKey ? translatedCard : card.desc || '';
}

/**
 * 卡片局部翻译 Hook，支持纯相对 key 自动补全为 `cards.<cardId>.<key>`
 */
export function useCardTranslation(cardId: string) {
  const { t: baseT, locale, setLocale } = useTranslation();

  const cardT = (key: string, params?: Record<string, string | number>) => {
    const isGlobal = key.startsWith('cards.') || key.startsWith('global.');
    const fullKey = isGlobal ? key : `cards.${cardId}.${key.replace(/^\./, '')}`;
    return baseT(fullKey, params);
  };

  return { t: cardT, locale, setLocale };
}
~~~~~

#### Acts 3: 清理注册中心 (`src/core/registry.ts`)

移除 `SystemDomainRegistry` 中所有 Pack 管理机制与旧版 glob 扫描。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
export function qualifyCardKey(key: string | undefined, cardId: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('cards.') || key.startsWith('global.') || key.startsWith('packs.')) {
    return key;
  }
  return `cards.${cardId}.${key.replace(/^\./, '')}`;
}
~~~~~
~~~~~typescript
export function qualifyCardKey(key: string | undefined, cardId: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('cards.') || key.startsWith('global.')) {
    return key;
  }
  return `cards.${cardId}.${key.replace(/^\./, '')}`;
}
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';
~~~~~
~~~~~typescript
import type { CardAnalyticsPlugin } from './contracts';
import { i18n } from './i18n';
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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

  public indexCard(card: CardDefinition): void {
    const id = card.id;

    if (card.tags) {
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
  public getCardIdsByStatus(status: CardStatusTag): Set<string> {
    return this.statusMap.get(status) || new Set();
  }

  public getCardIdsByPack(packId: string): Set<string> {
    return this.packMap.get(packId) || new Set();
  }
}

class SystemDomainRegistry {
  private packs = new Map<string, PackManifest>();
  private cardManifestMap = new Map<string, CardManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描：双轨兼容旧 packs 与新 flat cards
   */
  private autoDiscover(): void {
    // 1. 扫描旧版 packs (绞杀期兼容)
    const packModules = import.meta.glob<{ default: PackManifest }>('../packs/*/index.ts', {
      eager: true,
    });

    for (const path in packModules) {
      const manifest = packModules[path]?.default;
      if (manifest) this.register(manifest);
    }

    // 2. 扫描新版 flat cards (具有更高覆盖优先级)
    const cardModules = import.meta.glob<{ default: CardManifest }>(
      ['../cards/*/index.ts', '../cards/*/index.tsx'],
      { eager: true },
    );

    for (const path in cardModules) {
      const manifest = cardModules[path]?.default;
      if (manifest?.id) this.registerCard(manifest);
    }
  }

  public registerCard(card: CardManifest): void {
    this.cardManifestMap.set(card.id, card);

    // 1. 挂载卡片专属语言包
    if (card.locales) {
      i18n.registerCardLocales(card.id, card.locales);
    }

    // 2. 自动修饰并注册 SettingSchemas 相对 key
    const normalizedSchemas = qualifySchemas(card.settingSchemas, card.id);

    // 3. 构建标准 CardDefinition
    const cardDef: CardDefinition = {
      id: card.id,
      packId: card.domain,
      mode: card.id,
      icon: card.icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      settingSchemas: normalizedSchemas,
      defaultSettings: card.defaultSettings,
    };
~~~~~
~~~~~typescript
  public getCardIdsByStatus(status: CardStatusTag): Set<string> {
    return this.statusMap.get(status) || new Set();
  }
}

class SystemDomainRegistry {
  private cardManifestMap = new Map<string, CardManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描所有独立 Flat Cards 清单
   */
  private autoDiscover(): void {
    const cardModules = import.meta.glob<{ default: CardManifest }>(
      ['../cards/*/index.ts', '../cards/*/index.tsx'],
      { eager: true },
    );

    for (const path in cardModules) {
      const manifest = cardModules[path]?.default;
      if (manifest?.id) this.registerCard(manifest);
    }
  }

  public registerCard(card: CardManifest): void {
    this.cardManifestMap.set(card.id, card);

    // 1. 挂载卡片专属语言包
    if (card.locales) {
      i18n.registerCardLocales(card.id, card.locales);
    }

    // 2. 自动修饰并注册 SettingSchemas 相对 key
    const normalizedSchemas = qualifySchemas(card.settingSchemas, card.id);

    // 3. 构建标准 CardDefinition
    const cardDef: CardDefinition = {
      id: card.id,
      domain: card.domain,
      mode: card.id,
      icon: card.icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      settingSchemas: normalizedSchemas,
      defaultSettings: card.defaultSettings,
    };
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
    // 5. 注册卡片专属分析插件
    if (card.analytics?.views) {
      this.cardAnalyticsMap.set(card.id, {
        cardId: card.id,
        fetchRecords: card.analytics.fetchRecords ?? ((id) => getTrialRecordsByCard(id)),
        views: qualifyAnalyticsViews(card.analytics.views, card.id),
      });
    }
  }

  public register(manifest: PackManifest): void {
    this.packs.set(manifest.packId, manifest);

    // 自动挂载 Pack 私有语言包至 `packs.<packId>` 命名空间
    if (manifest.locales) {
      i18n.registerPackLocales(manifest.packId, manifest.locales);
    }

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
~~~~~
~~~~~typescript
    // 5. 注册卡片专属分析插件
    if (card.analytics?.views) {
      this.cardAnalyticsMap.set(card.id, {
        cardId: card.id,
        fetchRecords: card.analytics.fetchRecords ?? ((id) => getTrialRecordsByCard(id)),
        views: qualifyAnalyticsViews(card.analytics.views, card.id),
      });
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

    if (options.domains && options.domains.length > 0) {
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
  // === 卡片直查接口 ===
  public getAllCards(): CardDefinition[] {
    return Array.from(this.cardMap.values());
  }
~~~~~

#### Acts 4: 清理配置与存储层中对 Pack 的调用 (`src/storage/settings.ts`)

移除 `buildDefaultCardSettings` 中对 `getPack` 的无效依赖。

~~~~~act
patch_file
src/storage/settings.ts
~~~~~
~~~~~typescript
  for (const card of allCards) {
    const manifest = registry.getCardManifest?.(card.id);
    const pack = registry.getPack(card.packId);
    const cardDefaults =
      manifest?.defaultSettings ||
      card.defaultSettings ||
      pack?.defaultCardSettings?.[card.id] ||
      {};

    const cardConfig: BaseModuleSettings = {
      ...DEFAULT_BASE_SETTINGS,
      ...cardDefaults,
    };
~~~~~
~~~~~typescript
  for (const card of allCards) {
    const manifest = registry.getCardManifest?.(card.id);
    const cardDefaults = manifest?.defaultSettings || card.defaultSettings || {};

    const cardConfig: BaseModuleSettings = {
      ...DEFAULT_BASE_SETTINGS,
      ...cardDefaults,
    };
~~~~~

#### Acts 5: 清理业务视图与组件 (`TrainingShell.tsx`, `FilterEngine.tsx`, `GlobalStatsView.tsx`, `CardAnalyticsView.tsx`, `GenericTrainingView.tsx`, `HomeView.tsx`)

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  autoNext,
  session,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
  const { t } = useTranslation();
  const cardTitle = getCardTitle(card, t);
  const instruction =
    t(`packs.${card.packId}.cards.${card.id}.instruction`) || card.instruction || '';
  const desc = getCardDesc(card, t);
~~~~~
~~~~~typescript
export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  autoNext,
  session,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
  const { t } = useTranslation();
  const cardTitle = getCardTitle(card, t);
  const instruction = t(`cards.${card.id}.instruction`) || card.instruction || '';
  const desc = getCardDesc(card, t);
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript
import { Boxes, Filter, RotateCcw, Search, Sparkles, X } from 'lucide-preact';
import { getPackTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { CardQueryOptions } from '../../types/card';
import { TagPill } from '../common/TagPill';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AdvancedTagMatrix, FilterSectionHeader } from './AdvancedTagMatrix';

interface FilterEngineProps {
  query: CardQueryOptions;
  totalMatches: number;
  variant?: 'default' | 'compact';
  className?: string;
  onChange: (newQuery: CardQueryOptions) => void;
}

export function FilterEngine({
  query,
  totalMatches,
  variant = 'default',
  className = '',
  onChange,
}: FilterEngineProps) {
  const { t } = useTranslation();
  const isCompact = variant === 'compact';
  const isAdvancedOpen = Boolean(query.showAdvanced);
  const packs = registry.getAllPacks();

  const toggleDimension = <T extends string>(key: keyof CardQueryOptions, value: T) => {
    const current = (query[key] as T[] | undefined) || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...query, [key]: next.length > 0 ? next : undefined });
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
~~~~~
~~~~~typescript
import { Filter, RotateCcw, Search, Sparkles, X } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { CardQueryOptions } from '../../types/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AdvancedTagMatrix } from './AdvancedTagMatrix';

interface FilterEngineProps {
  query: CardQueryOptions;
  totalMatches: number;
  variant?: 'default' | 'compact';
  className?: string;
  onChange: (newQuery: CardQueryOptions) => void;
}

export function FilterEngine({
  query,
  totalMatches,
  variant = 'default',
  className = '',
  onChange,
}: FilterEngineProps) {
  const { t } = useTranslation();
  const isCompact = variant === 'compact';
  const isAdvancedOpen = Boolean(query.showAdvanced);

  const toggleDimension = <T extends string>(key: keyof CardQueryOptions, value: T) => {
    const current = (query[key] as T[] | undefined) || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...query, [key]: next.length > 0 ? next : undefined });
  };

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript
        </div>
      </div>

      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div
          className={`space-y-1 border-t border-border/60 dark:border-border ${isCompact ? 'pt-1.5' : 'pt-3'}`}
        >
          <FilterSectionHeader icon={Boxes} title={t('home.allPacks')} />
          <div
            className={`flex gap-1 items-center ${
              isCompact ? 'flex-nowrap overflow-x-auto pb-1.5 scrollbar-none' : 'flex-wrap'
            }`}
          >
            <TagPill
              size={tagSize}
              label={t('home.allPacks')}
              selected={!query.packId}
              onClick={() => onChange({ ...query, packId: undefined })}
            />
            {packs.map((p) => (
              <TagPill
                key={p.packId}
                size={tagSize}
                label={getPackTitle(p, t)}
                count={p.cards.length}
                selected={query.packId === p.packId}
                onClick={() =>
                  onChange({ ...query, packId: query.packId === p.packId ? undefined : p.packId })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* 高级五维标签矩阵折叠区 */}
      {isAdvancedOpen && (
~~~~~
~~~~~typescript
        </div>
      </div>

      {/* 高级五维标签矩阵折叠区 */}
      {isAdvancedOpen && (
~~~~~

~~~~~act
patch_file
src/views/GlobalStatsView.tsx
~~~~~
~~~~~typescript
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { renderTrendChartCanvas } from '../core/canvas/charts/drawTrendChart';
import { getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { useGlobalStatsData } from '../hooks/useGlobalStatsData';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';

interface GlobalStatsViewProps {
  onExit?: () => void;
}

export function GlobalStatsView(_props: GlobalStatsViewProps = {}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    loading,
    selectedFilter,
    setSelectedFilter,
    getCurrentFilterLabel,
    stats,
    dailyData,
    heatmapData,
    pathMasteryList,
    challengeMasteryList,
  } = useGlobalStatsData();

  const packs = registry.getAllPacks();
  const allCards = registry.getAllCards();
~~~~~
~~~~~typescript
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { renderTrendChartCanvas } from '../core/canvas/charts/drawTrendChart';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { useGlobalStatsData } from '../hooks/useGlobalStatsData';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';

interface GlobalStatsViewProps {
  onExit?: () => void;
}

export function GlobalStatsView(_props: GlobalStatsViewProps = {}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    loading,
    selectedFilter,
    setSelectedFilter,
    getCurrentFilterLabel,
    stats,
    dailyData,
    heatmapData,
    pathMasteryList,
    challengeMasteryList,
  } = useGlobalStatsData();

  const allCards = registry.getAllCards();
~~~~~

~~~~~act
patch_file
src/views/GlobalStatsView.tsx
~~~~~
~~~~~typescript
            <option value="all">{t('stats.allModules')}</option>

            <optgroup label={t('stats.optgroupPacks')}>
              {packs.map((p) => (
                <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                  {getPackTitle(p, t)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupDomains')}>
~~~~~
~~~~~typescript
            <option value="all">{t('stats.allModules')}</option>

            <optgroup label={t('stats.optgroupDomains')}>
~~~~~

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript
import { getCognitiveOverviewInsights } from '../core/analytics/universalViews';
import type { CardAnalyticsView as CardAnalyticsViewContract } from '../core/contracts';
import { getCardDesc, getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedTrialRecord } from '../storage/index';

interface CardAnalyticsViewProps {
  cardId: string;
  initialTab?: string;
  onExit: () => void;
  onStartTraining: (cardId: string) => void;
  onStartBenchmark: (cardId: string) => void;
  onOpenSettings: (cardId: string) => void;
}

export function CardAnalyticsView({
  cardId,
  initialTab,
  onExit,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
}: CardAnalyticsViewProps) {
  const { t } = useTranslation();
  const card = registry.getCardById(cardId);
  const plugin = useMemo(
    () => (card ? registry.getAnalyticsPluginByCardId(card.id) : null),
    [card],
  );
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTabId, setActiveTabId] = useState<string>(initialTab || 'overview');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pack = card ? registry.getPack(card.packId) : null;
  const cardTitle = card ? getCardTitle(card, t) : cardId;
  const cardDesc = card ? getCardDesc(card, t) : '';
  const packTitle = pack ? getPackTitle(pack, t) : '';

  const views = plugin?.views ?? [];
~~~~~
~~~~~typescript
import { DOMAIN_TAGS } from '../config/tags';
import { getCognitiveOverviewInsights } from '../core/analytics/universalViews';
import type { CardAnalyticsView as CardAnalyticsViewContract } from '../core/contracts';
import { getCardDesc, getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedTrialRecord } from '../storage/index';

interface CardAnalyticsViewProps {
  cardId: string;
  initialTab?: string;
  onExit: () => void;
  onStartTraining: (cardId: string) => void;
  onStartBenchmark: (cardId: string) => void;
  onOpenSettings: (cardId: string) => void;
}

export function CardAnalyticsView({
  cardId,
  initialTab,
  onExit,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
}: CardAnalyticsViewProps) {
  const { t } = useTranslation();
  const card = registry.getCardById(cardId);
  const plugin = useMemo(
    () => (card ? registry.getAnalyticsPluginByCardId(card.id) : null),
    [card],
  );
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTabId, setActiveTabId] = useState<string>(initialTab || 'overview');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = card ? getCardTitle(card, t) : cardId;
  const cardDesc = card ? getCardDesc(card, t) : '';
  const domainTitle = card?.domain && DOMAIN_TAGS[card.domain] ? t(DOMAIN_TAGS[card.domain].i18nKey) : '';

  const views = plugin?.views ?? [];
~~~~~

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-foreground truncate tracking-tight">
                  {cardTitle}
                </h1>
                {packTitle && (
                  <Badge variant="secondary" size="sm">
                    {packTitle}
                  </Badge>
                )}
                {card.tags.status === 'experimental' && (
~~~~~
~~~~~typescript
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-foreground truncate tracking-tight">
                  {cardTitle}
                </h1>
                {domainTitle && (
                  <Badge variant="secondary" size="sm">
                    {domainTitle}
                  </Badge>
                )}
                {card.tags.status === 'experimental' && (
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
export function GenericTrainingView<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
>({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  targetLimitTrials,
  onTargetLimitReached,
  onIdleChange,
  onIdleResume,
  showExitButton = true,
  showTimer = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
  const packId = card.packId;
  const mode = card.mode;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain: packId,
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    onIdleChange,
    onIdleResume,
    generateQuestion: (level) => plugin.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => plugin.evaluateAnswer(userVal, q, mode),
    isHit: (hitResult) => plugin.isHit(hitResult),
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain: packId,
          mode,
          timestamp: Date.now(),
          difficultyLevel: plugin.getQuestionLevel(q),
          isHit: plugin.isHit(hitResult),
          responseTimeMs,
          details: plugin.extractRecordDetails(q, hitResult, userVal, mode),
        },
        currentProfileLevel,
      );
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain: packId,
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });
~~~~~
~~~~~typescript
export function GenericTrainingView<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
>({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  targetLimitTrials,
  onTargetLimitReached,
  onIdleChange,
  onIdleResume,
  showExitButton = true,
  showTimer = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
  const domain = card.domain;
  const mode = card.mode;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain,
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    onIdleChange,
    onIdleResume,
    generateQuestion: (level) => plugin.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => plugin.evaluateAnswer(userVal, q, mode),
    isHit: (hitResult) => plugin.isHit(hitResult),
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          mode,
          timestamp: Date.now(),
          difficultyLevel: plugin.getQuestionLevel(q),
          isHit: plugin.isHit(hitResult),
          responseTimeMs,
          details: plugin.extractRecordDetails(q, hitResult, userVal, mode),
        },
        currentProfileLevel,
      );
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });
~~~~~

~~~~~act
patch_file
src/views/HomeView.tsx
~~~~~
~~~~~typescript
          <div className="mt-2">
            <div className="text-sm font-black text-foreground">{t('home.allPacks')}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('home.matchedModules', { count: registry.getAllCards().length })}
            </p>
          </div>
~~~~~
~~~~~typescript
          <div className="mt-2">
            <div className="text-sm font-black text-foreground">{t('nav.discovery')}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('home.matchedModules', { count: registry.getAllCards().length })}
            </p>
          </div>
~~~~~

#### Acts 6: 清理相关 Hooks (`useGlobalStatsData.ts`, `useHashRoute.ts`, `useCardFilter.ts`)

~~~~~act
patch_file
src/hooks/useGlobalStatsData.ts
~~~~~
~~~~~typescript
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { type DailySummaryData, getDailySummaries, getLocalDateString } from '../storage/index';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';

export function useGlobalStatsData() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummaryData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

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
~~~~~
~~~~~typescript
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { type DailySummaryData, getDailySummaries, getLocalDateString } from '../storage/index';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';

export function useGlobalStatsData() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummaryData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

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

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (selectedFilter === 'all') return true;

      if (selectedFilter.startsWith('domain:')) {
~~~~~

~~~~~act
patch_file
src/hooks/useGlobalStatsData.ts
~~~~~
~~~~~typescript
  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return t('stats.allModules');
    if (selectedFilter.startsWith('pack:')) {
      const pId = selectedFilter.replace('pack:', '');
      const pack = registry.getPack(pId);
      const pTitle = pack ? getPackTitle(pack, t) : pId;
      return `${t('home.allPacks')} • ${pTitle}`;
    }
    if (selectedFilter.startsWith('domain:')) {
      const d = selectedFilter.replace('domain:', '') as VisualDomainTag;
      return `Domain • ${t(DOMAIN_TAGS[d]?.i18nKey || d)}`;
    }
~~~~~
~~~~~typescript
  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return t('stats.allModules');
    if (selectedFilter.startsWith('domain:')) {
      const d = selectedFilter.replace('domain:', '') as VisualDomainTag;
      return `Domain • ${t(DOMAIN_TAGS[d]?.i18nKey || d)}`;
    }
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
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
}
~~~~~
~~~~~typescript
function parseHomeQuery(params: URLSearchParams): CardQueryOptions | undefined {
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

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
  if (route.type === 'discovery') {
    if (!route.query) return '#/discovery';
    const params = new URLSearchParams();
    if (route.query.packId && route.query.packId !== 'all') {
      params.set('pack', route.query.packId);
    }
    if (route.query.domains && route.query.domains.length > 0) {
~~~~~
~~~~~typescript
  if (route.type === 'discovery') {
    if (!route.query) return '#/discovery';
    const params = new URLSearchParams();
    if (route.query.domains && route.query.domains.length > 0) {
~~~~~

~~~~~act
patch_file
src/hooks/useCardFilter.ts
~~~~~
~~~~~typescript
  const toggleStatus = (status: CardStatusTag) => {
    const current = query.statuses || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateQuery({ ...query, statuses: next.length > 0 ? next : undefined });
  };

  const handleSelectPack = (packId?: string) => {
    updateQuery({
      ...query,
      packId: packId || undefined,
    });
  };

  const toggleAdvancedOpen = () => {
    updateQuery({
      ...query,
      showAdvanced: !query.showAdvanced,
    });
  };

  const handleResetFilters = () => {
    updateQuery(query.showAdvanced ? { showAdvanced: true } : {});
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
~~~~~
~~~~~typescript
  const toggleStatus = (status: CardStatusTag) => {
    const current = query.statuses || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateQuery({ ...query, statuses: next.length > 0 ? next : undefined });
  };

  const toggleAdvancedOpen = () => {
    updateQuery({
      ...query,
      showAdvanced: !query.showAdvanced,
    });
  };

  const handleResetFilters = () => {
    updateQuery(query.showAdvanced ? { showAdvanced: true } : {});
  };

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );
~~~~~

~~~~~act
patch_file
src/hooks/useCardFilter.ts
~~~~~
~~~~~typescript
    toggleInteraction,
    toggleStatus,
    handleSelectPack,
    toggleAdvancedOpen,
    handleResetFilters,
  };
}
~~~~~
~~~~~typescript
    toggleInteraction,
    toggleStatus,
    toggleAdvancedOpen,
    handleResetFilters,
  };
}
~~~~~

### 下一步建议

- 再次运行 `rg packs src/` 确认已无遗留的业务逻辑引用。
- 执行 `vitest run` 验证所有单元测试及集成测试通过。
