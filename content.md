开始实施第一阶段：构建 `CardManifest` 一等公民核心契约、升级全局注册中心 `SystemDomainRegistry` 与国际化引擎 `i18n`，并以 `star`（寻星）与 `angle`（角度）两个核心领域作为试点，完成第一批卡片的自内聚化拆分与目录收纳。

## [WIP] refactor: 构建 CardManifest 核心契约并迁移 Star 与 Angle 领域卡片

### 用户需求
将 FormSight 的核心架构从原先粗粒度的 `PackManifest` 彻底下沉重构为以单张卡片为核心的 `CardManifest` 契约，使每张卡片实现出题算法、判定逻辑、专属视图、本地多语言、设置 Schema 与统计分析的完全内聚与热插拔。

### 评论
这是系统演进的关键转折点。将卡片作为一等公民后，每张卡片成为独立的领域模型，消除了集中式大 `switch(mode)` 分发，使得后续新增与删除卡片极为轻量且互不影响。同时采用 `modules/<domain>/_shared/` 物理结构，有效防止了 IDE 目录爆炸并保护了领域内公共几何运算资产。

### 目标
1. 在 `src/core/contracts.ts` 中定义通用的 `CardManifest` 核心契约。
2. 升级 `src/core/registry.ts` 与 `src/core/i18n.ts`，支持自动扫描 `src/modules/**/index.ts` 并自动挂载多语言。
3. 迁移 `star`（寻星）领域：拆分为 `SingleAnchorCard`、`HorizontalDoubleCard`、`RotatedDoubleCard` 3 个独立自闭合模块，将公共点阵与几何运算抽取至 `modules/star/_shared/`。
4. 迁移 `angle`（角度）领域：拆分为 `AngleEstimationCard`、`AngleComparisonCard`、`AngleParallelCard` 3 个独立模块。

### 基本原理
1. 通过定义泛型约束的 `CardManifest`，将 `CardDefinition`（元数据）、`TrainingPlugin`（训练引擎）、`CardAnalyticsPlugin`（统计图表）与私有多语言字典融为一体。
2. 在 `SystemDomainRegistry` 中利用 Vite 的 `import.meta.glob` 扫描所有模块目录下的 `index.ts`，自动装配并建立多维倒排索引。
3. 对 `star` 和 `angle` 领域完成解构，消除原先在 `generateQuestion` 和 `checkHit` 中的模式匹配分支。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/interfaces #concept/executor #concept/ui #scope/core #scope/api #scope/dx #ai/delegate #task/domain/architecture #task/object/card-manifest #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构核心契约 `contracts.ts`，定义 `CardManifest`

我们将升级核心契约层，引入内聚的 `CardManifest` 定义，同时保持类型兼容。

~~~~~act
write_file
src/core/contracts.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { UnifiedTrialRecord } from '../storage/db/schema';
import type { BaseModuleSettings } from '../storage/settings';
import type { CardDefinition, CardTags, VisualDomainTag } from '../types/card';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

export interface CardTrainingContract<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  isTargeting?: (settings: TSettings) => boolean;
  generateQuestion: (level: number, settings: TSettings) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel?: (question: TQuestion) => number;
  extractRecordDetails?: (
    question: TQuestion,
    hitResult: THitResult,
    userVal: TAnswerVal,
  ) => Record<string, unknown>;
  renderCanvas: (
    props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
}

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

export interface CardAnalyticsContract<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  views: CardAnalyticsView<TRecord>[];
  fetchRecords?: (cardId: string) => Promise<TRecord[]>;
}

/**
 * 卡片独立清单 (CardManifest) - 系统的真正一等公民
 */
export interface CardManifest<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  id: string;
  domain: VisualDomainTag;
  groupId?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;

  // 1. 设置项定义与默认值
  settingSchemas?: SettingFieldSchema[];
  defaultSettings?: Partial<TSettings>;

  // 2. 本地私有多语言
  locales?: {
    'zh-CN'?: Record<string, unknown>;
    'en-US'?: Record<string, unknown>;
  };

  // 3. 训练引擎核心行为
  training: CardTrainingContract<TQuestion, THitResult, TAnswerVal, TSettings>;

  // 4. 卡片专属统计分析扩展
  analytics?: CardAnalyticsContract;
}

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic card manifest registry
export type AnyCardManifest = CardManifest<any, any, any, any>;

/**
 * 遗留兼容契约（在全量迁移过渡期间保留）
 */
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

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic training plugin registry
export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  views: CardAnalyticsView<TRecord>[];
}

export interface PackManifest {
  packId: string;
  meta: {
    id: string;
    title?: string;
    subTitle?: string;
    desc?: string;
    themeColor?: 'indigo' | 'amber' | 'purple' | 'emerald';
    icon?: (props: { className?: string }) => ComponentChildren;
  };
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
  locales?: Record<string, Record<string, unknown>>;
}

export function calculateBasicOverallStats<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord>(
  records: TRecord[],
): { accuracy: number; total: number } {
  const total = records.length;
  const hits = records.filter((r) => r.isHit).length;
  const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
  return { accuracy, total };
}
~~~~~

#### Acts 2: 升级 `i18n.ts` 与 `registry.ts`，原生支持 `CardManifest` 自动扫描与注册

~~~~~act
write_file
src/core/i18n.ts
~~~~~
~~~~~typescript
import { useEffect, useState } from 'preact/hooks';
import enUSGlobal from '../locales/en-US.json';
import zhCNGlobal from '../locales/zh-CN.json';

export type LocaleDictionary = Record<string, unknown>;

function getSavedLocale(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'zh-CN';
  }
  try {
    const raw = localStorage.getItem('formsight_user_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.global?.locale) {
        return parsed.global.locale;
      }
    }
  } catch {}
  return 'zh-CN';
}

class I18nManager {
  private currentLocale = 'zh-CN';
  private fallbackLocale = 'zh-CN';
  private dictionaries: Record<string, LocaleDictionary> = {};
  private listeners = new Set<(locale: string) => void>();

  constructor() {
    this.currentLocale = getSavedLocale();
    this.registerGlobalLocales({
      'zh-CN': zhCNGlobal as LocaleDictionary,
      'en-US': enUSGlobal as LocaleDictionary,
    });
  }

  public init(initialLocale?: string): void {
    if (initialLocale) {
      this.setLocale(initialLocale);
    } else {
      const saved = getSavedLocale();
      if (saved && saved !== this.currentLocale) {
        this.setLocale(saved);
      }
    }
  }

  public setLocale(locale: string): void {
    if (this.currentLocale !== locale) {
      this.currentLocale = locale;
      for (const listener of this.listeners) {
        listener(locale);
      }
    }
  }

  public getLocale(): string {
    return this.currentLocale;
  }

  public subscribe(listener: (locale: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 注册全局系统级词典 */
  public registerGlobalLocales(locales: Record<string, LocaleDictionary>): void {
    for (const [lang, dict] of Object.entries(locales)) {
      if (!this.dictionaries[lang]) {
        this.dictionaries[lang] = {};
      }
      Object.assign(this.dictionaries[lang], dict);
    }
  }

  /** 注册卡片私有词典至 `cards.<cardId>` 命名空间 */
  public registerCardLocales(cardId: string, locales: Record<string, LocaleDictionary>): void {
    for (const [lang, dict] of Object.entries(locales)) {
      if (!this.dictionaries[lang]) {
        this.dictionaries[lang] = {};
      }
      const root = this.dictionaries[lang];
      if (!root.cards || typeof root.cards !== 'object') {
        root.cards = {};
      }
      (root.cards as Record<string, unknown>)[cardId] = dict;
    }
  }

  /** 遗留兼容：注册 Pack 私有词典 */
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

  /** 核心翻译查表方法，支持深层路径解析、数组透传与模板插值 */
  public t = <T = string>(key: string, params?: Record<string, string | number>): T => {
    const activeDict =
      this.dictionaries[this.currentLocale] || this.dictionaries[this.fallbackLocale] || {};
    const result =
      this.resolvePath(activeDict, key) ??
      this.resolvePath(this.dictionaries[this.fallbackLocale], key);

    if (Array.isArray(result)) {
      if (!params) return result as unknown as T;
      return result.map((item) =>
        typeof item === 'string'
          ? item.replace(/\{\{(\w+)\}\}/g, (_, match) => String(params[match] ?? `{{${match}}}`))
          : item,
      ) as unknown as T;
    }

    if (typeof result !== 'string') {
      return key as unknown as T;
    }

    if (!params) return result as unknown as T;
    return result.replace(/\{\{(\w+)\}\}/g, (_, match) =>
      String(params[match] ?? `{{${match}}}`),
    ) as unknown as T;
  };

  private resolvePath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }
}

export const i18n = new I18nManager();

export function useTranslation() {
  const [currentLocale, setCurrentLocale] = useState<string>(() => i18n.getLocale());

  useEffect(() => {
    return i18n.subscribe((newLocale) => {
      setCurrentLocale(newLocale);
    });
  }, []);

  return {
    t: i18n.t,
    locale: currentLocale,
    setLocale: (locale: string) => i18n.setLocale(locale),
  };
}

/**
 * 通用：解析卡片标题多语言回退 (优先查 cards.<id>.title，再查 packs.<packId>.cards.<id>.title)
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
 * 通用：解析卡片描述多语言回退
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
 * 遗留兼容：解析扩展包标题多语言回退
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

~~~~~act
write_file
src/core/registry.ts
~~~~~
~~~~~typescript
import type { AnyCardManifest, AnyTrainingPlugin, CardAnalyticsPlugin, PackManifest } from '../core/contracts';
import { getTrialRecordsByCard } from '../storage/db/queries';
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
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import { i18n } from './i18n';

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
  private cards = new Map<string, AnyCardManifest>();
  private packs = new Map<string, PackManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描：支持新版 `src/modules/**\/index.ts` (CardManifest) 与遗留 `src/packs/*\/index.ts`
   */
  private autoDiscover(): void {
    // 1. 扫描新架构单卡片 Manifest
    const cardModules = import.meta.glob<{ default?: AnyCardManifest | PackManifest }>(
      '../modules/**/index.ts',
      { eager: true },
    );

    for (const path in cardModules) {
      const manifest = cardModules[path]?.default;
      if (manifest && 'training' in manifest && 'id' in manifest) {
        this.registerCard(manifest as AnyCardManifest);
      }
    }

    // 2. 扫描遗留 PackManifest (过渡兼容)
    const packModules = import.meta.glob<{ default?: PackManifest }>(
      '../packs/*/index.ts',
      { eager: true },
    );

    for (const path in packModules) {
      const manifest = packModules[path]?.default;
      if (manifest && manifest.packId && manifest.cards) {
        this.register(manifest);
      }
    }
  }

  /**
   * 注册独立卡片 (一等公民架构)
   */
  public registerCard(manifest: AnyCardManifest): void {
    this.cards.set(manifest.id, manifest);

    // 挂载卡片私有字典
    if (manifest.locales) {
      i18n.registerCardLocales(manifest.id, manifest.locales);
    }

    const normalizedCard: CardDefinition = {
      id: manifest.id,
      packId: manifest.groupId || manifest.domain,
      mode: manifest.id,
      icon: manifest.icon,
      tags: manifest.tags,
      hasWeaknessAnalytics: Boolean(manifest.analytics && manifest.analytics.views.length > 0),
      settingSchemas: manifest.settingSchemas,
    };

    this.cardMap.set(manifest.id, normalizedCard);

    // 适配旧 TrainingPlugin 调用代理
    const trainingAdapter: AnyTrainingPlugin = {
      title: manifest.id,
      getModeBadge: () => manifest.id,
      isTargeting: (_mode, settings) =>
        manifest.training.isTargeting ? manifest.training.isTargeting(settings) : false,
      generateQuestion: (_mode, level, settings) =>
        manifest.training.generateQuestion(level, settings),
      evaluateAnswer: (userVal, q) => manifest.training.evaluateAnswer(userVal, q),
      isHit: (res) => manifest.training.isHit(res),
      getQuestionLevel: (q) =>
        manifest.training.getQuestionLevel ? manifest.training.getQuestionLevel(q) : 5,
      extractRecordDetails: (q, hitResult, userVal) =>
        manifest.training.extractRecordDetails
          ? manifest.training.extractRecordDetails(q, hitResult, userVal)
          : {},
      renderCanvas: (props) => manifest.training.renderCanvas(props),
    };

    this.cardPluginMap.set(manifest.id, trainingAdapter);

    if (manifest.analytics) {
      this.cardAnalyticsMap.set(manifest.id, {
        cardId: manifest.id,
        fetchRecords: manifest.analytics.fetchRecords ?? ((id) => getTrialRecordsByCard(id)),
        views: manifest.analytics.views,
      });
    }

    this.invertedIndex.indexCard(normalizedCard);
  }

  /**
   * 遗留兼容：注册整包 (PackManifest)
   */
  public register(manifest: PackManifest): void {
    this.packs.set(manifest.packId, manifest);

    if (manifest.locales) {
      i18n.registerPackLocales(manifest.packId, manifest.locales);
    }

    for (const card of manifest.cards) {
      // 若单卡已经独立注册过，则跳过旧包内重复注册
      if (this.cards.has(card.id)) continue;

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
        if (!this.cardAnalyticsMap.has(cardId)) {
          this.cardAnalyticsMap.set(cardId, plugin);
        }
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
            c.title?.toLowerCase().includes(kw) ||
            c.desc?.toLowerCase().includes(kw) ||
            c.id.toLowerCase().includes(kw),
        );
      }
    }

    return results;
  }

  // === 卡片访问接口 ===
  public getCardManifest(cardId: string): AnyCardManifest | undefined {
    return this.cards.get(cardId);
  }

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
    const card = this.cardMap.get(cardId);
    if (!card) return undefined;

    const domainPlugin = this.cardAnalyticsMap.get(cardId);
    const domainViews = domainPlugin?.views ?? [];

    return {
      cardId,
      fetchRecords: domainPlugin?.fetchRecords ?? ((id) => getTrialRecordsByCard(id)),
      views: [...domainViews, ...UNIVERSAL_ANALYTICS_VIEWS],
    };
  }

  // === 遗留 Pack 兼容接口 ===
  public getAllPacks(): PackManifest[] {
    return Array.from(this.packs.values());
  }

  public getPack(packId: string): PackManifest | undefined {
    return this.packs.get(packId);
  }

  public getAllPackMetas(): PackMeta[] {
    return Array.from(this.packs.values()).map((p) => p.meta);
  }
}

export const registry = new SystemDomainRegistry();
~~~~~

#### Acts 3: 试点迁移 `star`（寻星）领域为独立 Card 模块

我们在 `src/modules/star/` 下建立 `_shared/` 公共运算模块与 3 个独立的自闭合卡片文件夹。

~~~~~act
write_file
src/modules/star/_shared/pointMath.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2; // 250
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 3;

/**
 * 将点绕指定中心旋转指定角度 (角度制)
 */
export function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;

  return {
    x: Math.round((center.x + dx * cos - dy * sin) * 100) / 100,
    y: Math.round((center.y + dx * sin + dy * cos) * 100) / 100,
  };
}

/**
 * 计算两点间的欧氏距离
 */
export function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}
~~~~~

~~~~~act
write_file
src/modules/star/_shared/gridGenerators.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';
import { calcDistance, DEFAULT_GRID_DIM } from './pointMath';

/**
 * 极坐标扇形网格生成器 (单锚点)
 */
export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  const S_MAX = 25;
  const S_MIN = 3.5;
  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34;
  const S = S_MAX - t * (S_MAX - S_MIN);

  const maxAngleStepRad = (15 * Math.PI) / 180;
  const angleStepRad = Math.min(S / R, maxAngleStepRad);
  const rStep = S;

  const points: Point[] = [];
  for (let rIdx = 0; rIdx < gridDim; rIdx++) {
    for (let aIdx = 0; aIdx < gridDim; aIdx++) {
      const curR = R + (rIdx - targetRow) * rStep;
      const curTheta = theta + (aIdx - targetCol) * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}

/**
 * 双极透视网格生成器 (双锚点)
 */
export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  const Ra = calcDistance(anchorA, targetB);
  const Rc = calcDistance(anchorC, targetB);

  const S_MAX = 20;
  const S_MIN = 3.5;
  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34;
  const S = S_MAX - t * (S_MAX - S_MIN);

  const maxAngleStepRad = (15 * Math.PI) / 180;
  const alphaStepRad = Math.min(S / Ra, maxAngleStepRad);
  const betaStepRad = Math.min(S / Rc, maxAngleStepRad);

  const points: Point[] = [];

  for (let aIdx = 0; aIdx < gridDim; aIdx++) {
    for (let cIdx = 0; cIdx < gridDim; cIdx++) {
      const alphaI = alpha + (aIdx - targetRow) * alphaStepRad;
      const betaJ = beta + (cIdx - targetCol) * betaStepRad;

      const v1x = Math.cos(alphaI);
      const v1y = Math.sin(alphaI);
      const v2x = Math.cos(betaJ);
      const v2y = Math.sin(betaJ);

      const dx = anchorC.x - anchorA.x;
      const dy = anchorC.y - anchorA.y;
      const det = v1x * v2y - v1y * v2x;

      if (Math.abs(det) < 1e-5) {
        points.push({
          x: Math.round((targetB.x + (aIdx - targetRow) * S) * 100) / 100,
          y: Math.round((targetB.y + (cIdx - targetCol) * S) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100;
        const y = Math.round((anchorA.y + t1 * v1y) * 100) / 100;
        points.push({ x, y });
      }
    }
  }
  return points;
}
~~~~~

~~~~~act
write_file
src/modules/star/_shared/schemas.ts
~~~~~
~~~~~typescript
import type { SettingFieldSchema } from '../../../components/settings/DynamicDomainSettings';

export const STAR_SECTORS = [
  'packs.star.sectors.e',
  'packs.star.sectors.ne',
  'packs.star.sectors.n',
  'packs.star.sectors.nw',
  'packs.star.sectors.w',
  'packs.star.sectors.sw',
  'packs.star.sectors.s',
  'packs.star.sectors.se',
];

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: 'packs.star.settings.gridSizeTitle',
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
    title: 'packs.star.settings.targetingTitle',
    subTitle: 'packs.star.settings.targetingSubTitle',
    sectors: STAR_SECTORS,
    gridCols: 'grid-cols-4',
  },
];
~~~~~

~~~~~act
write_file
src/modules/star/_shared/StarCanvasView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import { CANVAS_SIZE } from './pointMath';

export interface StarQuestionPayload {
  id: string;
  anchorA: Point;
  anchorC?: Point | null;
  targetB: Point;
  distractorPoints: Point[];
  difficultyLevel: number;
  angleDegree?: number;
  distanceRatio?: number;
}

export interface StarCanvasViewProps {
  question: StarQuestionPayload;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; nearestGridPoint: Point; isHit: boolean } | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
}

export function StarCanvasView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(ctx, question.anchorA.x, question.anchorA.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);

        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
        }

        drawDot(ctx, question.targetB.x, question.targetB.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitRes = evaluatePointGridHit(clickPoint, question.targetB, question.distractorPoints);
    if (!hitRes.isWithinRange) return;
    onAnswer(clickPoint);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/modules/star/_shared/analytics.ts
~~~~~
~~~~~typescript
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../../components/ui/callout';
import { renderCompassCanvas, type SectorStat } from '../../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../../core/canvas/charts/drawHeatmap';
import { calculateBasicOverallStats, type CardAnalyticsContract } from '../../../core/contracts';
import { i18n } from '../../../core/i18n';
import { getTrialRecordsByCard } from '../../../storage/db/queries';

const STAR_SECTOR_KEYS = [
  'packs.star.sectors.e',
  'packs.star.sectors.ne',
  'packs.star.sectors.n',
  'packs.star.sectors.nw',
  'packs.star.sectors.w',
  'packs.star.sectors.sw',
  'packs.star.sectors.s',
  'packs.star.sectors.se',
];

export function createStarAnalyticsContract(cardId: string): CardAnalyticsContract {
  return {
    fetchRecords: async (id) => getTrialRecordsByCard(id || cardId),
    views: [
      {
        id: 'spatial_bias',
        tabLabel: 'packs.star.analytics.spatialBias.tabLabel',
        title: 'packs.star.analytics.spatialBias.title',
        subTitle: 'packs.star.analytics.spatialBias.subTitle',
        icon: Target,
        renderVisualizer: (canvas, records) => {
          const totalCount = records.length;
          let sumDx = 0;
          let sumDy = 0;
          for (const r of records) {
            const uClick = (r.userClick as [number, number]) || [0, 0];
            const tB = (r.targetB as [number, number]) || [0, 0];
            sumDx += uClick[0] - tB[0];
            sumDy += uClick[1] - tB[1];
          }
          const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
          const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
          renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
        },
        renderDiagnostics: (records) => {
          const totalCount = records.length;
          if (totalCount === 0) return null;

          let sumDx = 0;
          let sumDy = 0;
          let sumDist = 0;
          for (const r of records) {
            const uClick = (r.userClick as [number, number]) || [0, 0];
            const tB = (r.targetB as [number, number]) || [0, 0];
            sumDx += uClick[0] - tB[0];
            sumDy += uClick[1] - tB[1];
            sumDist += (r.errorPixelDistance as number) || 0;
          }
          const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
          const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
          const avgDist = Math.round((sumDist / totalCount) * 10) / 10;

          const dxText =
            avgDx > 0
              ? i18n.t('packs.star.analytics.spatialBias.right', { val: avgDx })
              : avgDx < 0
                ? i18n.t('packs.star.analytics.spatialBias.left', { val: avgDx })
                : '0';

          const dyText =
            avgDy > 0
              ? i18n.t('packs.star.analytics.spatialBias.down', { val: avgDy })
              : avgDy < 0
                ? i18n.t('packs.star.analytics.spatialBias.up', { val: avgDy })
                : '0';

          return (
            <Callout
              variant="info"
              icon={Target}
              title={i18n.t('packs.star.analytics.spatialBias.cardTitle')}
            >
              <p className="text-muted-foreground leading-relaxed text-xs">
                {i18n.t('packs.star.analytics.spatialBias.desc')}
              </p>
              <div className="pt-1.5 space-y-1 font-mono text-foreground">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {i18n.t('packs.star.analytics.spatialBias.avgDx')}
                  </span>
                  <span className="font-bold">{dxText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {i18n.t('packs.star.analytics.spatialBias.avgDy')}
                  </span>
                  <span className="font-bold">{dyText}</span>
                </div>
                <div className="flex justify-between text-primary font-bold border-t border-border/60 pt-1">
                  <span>{i18n.t('packs.star.analytics.spatialBias.avgDist')}</span>
                  <span>{avgDist}px</span>
                </div>
              </div>
            </Callout>
          );
        },
        getOverallStats: (records) => calculateBasicOverallStats(records),
      },
      {
        id: 'directional_compass',
        tabLabel: 'packs.star.analytics.directionalCompass.tabLabel',
        title: 'packs.star.analytics.directionalCompass.title',
        subTitle: 'packs.star.analytics.directionalCompass.subTitle',
        icon: Compass,
        renderVisualizer: (canvas, records) => {
          const sectorBuckets = Array.from({ length: 8 }, () => ({
            total: 0,
            hits: 0,
            sumDist: 0,
          }));
          for (const r of records) {
            const angle = Number(r.angleDegree ?? 0);
            const normAngle = ((angle % 360) + 360) % 360;
            const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
            sectorBuckets[sectorIdx].total += 1;
            if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
            sectorBuckets[sectorIdx].sumDist += Number(r.errorPixelDistance || 0);
          }

          const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
            sectorIdx: i,
            label: i18n.t(STAR_SECTOR_KEYS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
          }));

          renderCompassCanvas(canvas, sectorStats);
        },
        renderDiagnostics: (records) => {
          const totalCount = records.length;
          if (totalCount === 0) return null;

          const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
          for (const r of records) {
            const angle = Number(r.angleDegree ?? 0);
            const normAngle = ((angle % 360) + 360) % 360;
            const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
            sectorBuckets[sectorIdx].total += 1;
            if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
          }

          const validSectors = sectorBuckets
            .map((b, i) => ({
              label: i18n.t(STAR_SECTOR_KEYS[i]),
              total: b.total,
              accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            }))
            .filter((s) => s.total >= 3);

          const weakest =
            validSectors.length > 0
              ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
              : null;

          return (
            <Callout
              variant="info"
              icon={Compass}
              title={i18n.t('packs.star.analytics.directionalCompass.cardTitle')}
            >
              {weakest ? (
                <div className="space-y-1.5 text-xs text-foreground pt-1">
                  <p>
                    {i18n.t('packs.star.analytics.directionalCompass.weakestHint', {
                      sector: weakest.label,
                    })}
                  </p>
                  <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                    <span>{weakest.label}</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {i18n.t('packs.star.analytics.directionalCompass.accuracyRate', {
                        accuracy: weakest.accuracy,
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {i18n.t('packs.star.analytics.directionalCompass.needMoreTrials')}
                </p>
              )}
            </Callout>
          );
        },
        getOverallStats: (records) => calculateBasicOverallStats(records),
      },
    ],
  };
}
~~~~~

~~~~~act
write_file
src/modules/star/SingleAnchorCard/index.ts
~~~~~
~~~~~typescript
import { Target } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsContract } from '../_shared/analytics';
import { generatePolarGridPoints } from '../_shared/gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM } from '../_shared/pointMath';
import { STAR_SCHEMAS } from '../_shared/schemas';
import { StarCanvasView, type StarQuestionPayload } from '../_shared/StarCanvasView';

export interface SingleStarQuestion extends StarQuestionPayload {
  mode: 'single';
}

export function generateSingleStarQuestion(
  level: number,
  settings: StarSettings,
): SingleStarQuestion {
  const id = `star_single_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = settings?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const anchorA: Point = { x: CX, y: CY };

  let angle = Math.floor(Math.random() * 360);
  if (settings.targetingMode === 'manual' && settings.manualTargetSectors?.length) {
    if (Math.random() < 0.7) {
      const chosenSector =
        settings.manualTargetSectors[Math.floor(Math.random() * settings.manualTargetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40;
      angle = Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }

  const distChoices = [60, 90, 120, 150, 180];
  const dist = distChoices[Math.floor(Math.random() * distChoices.length)];
  const rad = (angle * Math.PI) / 180;
  const targetB: Point = {
    x: Math.round((CX + dist * Math.cos(rad)) * 100) / 100,
    y: Math.round((CY + dist * Math.sin(rad)) * 100) / 100,
  };

  const distractorPoints = generatePolarGridPoints(
    anchorA,
    targetB,
    level,
    gridDim,
    randomRow,
    randomCol,
  );

  return {
    id,
    mode: 'single',
    anchorA,
    anchorC: null,
    targetB,
    difficultyLevel: level,
    distractorPoints,
    angleDegree: angle,
    distanceRatio: dist,
  };
}

export const SingleAnchorCard: CardManifest<
  SingleStarQuestion,
  { isHit: boolean; nearestGridPoint: Point; errorDistance: number; clickPoint: Point },
  Point,
  StarSettings
> = {
  id: 'star_single',
  domain: 'spatial_structure',
  groupId: 'star',
  icon: Target,
  tags: {
    domain: ['spatial_structure'],
    path: ['absolute_estimation'],
    interaction: ['spatial_locate'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: STAR_SCHEMAS,
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  locales: {
    'zh-CN': {
      title: '单锚点模式',
      desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
      instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
    },
    'en-US': {
      title: 'Single Anchor',
      desc: 'Single central anchor to evaluate polar angle and distance estimation.',
      instruction: 'Observe the target relative to the central anchor on the left, then locate it in the grid on the right.',
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateSingleStarQuestion(level, settings),
    evaluateAnswer: (clickPoint, q) => {
      const hitRes = evaluatePointGridHit(clickPoint, q.targetB, q.distractorPoints);
      return {
        isHit: hitRes.isHit,
        nearestGridPoint: hitRes.nearestGridPoint,
        errorDistance: hitRes.errorDistance,
        clickPoint,
      };
    },
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) =>
      StarCanvasView({
        question,
        showAnswer,
        userAnswer,
        onAnswer,
        disabled,
      }),
  },
  analytics: createStarAnalyticsContract('star_single'),
};

export default SingleAnchorCard;
~~~~~

~~~~~act
write_file
src/modules/star/HorizontalDoubleCard/index.ts
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsContract } from '../_shared/analytics';
import { generateBipolarGridPoints } from '../_shared/gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM } from '../_shared/pointMath';
import { STAR_SCHEMAS } from '../_shared/schemas';
import { StarCanvasView, type StarQuestionPayload } from '../_shared/StarCanvasView';

export interface HorizontalDoubleQuestion extends StarQuestionPayload {
  mode: 'double_h';
}

export function generateHorizontalDoubleQuestion(
  level: number,
  settings: StarSettings,
): HorizontalDoubleQuestion {
  const id = `star_double_h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = settings?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];
  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];
  if (settings.targetingMode === 'manual' && settings.manualTargetSectors?.length) {
    if (Math.random() < 0.7) {
      const chosenSector =
        settings.manualTargetSectors[Math.floor(Math.random() * settings.manualTargetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        return Math.min(diff, 360 - diff) <= 22.5;
      });
      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;

  const anchorA: Point = { x: baseAx + CX, y: baseAy + CY };
  const anchorC: Point = { x: baseCx + CX, y: baseCy + CY };
  const targetB: Point = { x: px + CX, y: py + CY };

  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    level,
    gridDim,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    mode: 'double_h',
    anchorA,
    anchorC,
    targetB,
    difficultyLevel: level,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
  };
}

export const HorizontalDoubleCard: CardManifest<
  HorizontalDoubleQuestion,
  { isHit: boolean; nearestGridPoint: Point; errorDistance: number; clickPoint: Point },
  Point,
  StarSettings
> = {
  id: 'star_double_h',
  domain: 'spatial_structure',
  groupId: 'star',
  icon: Crosshair,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    interaction: ['spatial_locate'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: STAR_SCHEMAS,
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  locales: {
    'zh-CN': {
      title: '水平双锚点',
      desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
      instruction: '观察左侧水平双锚点几何关系，在右侧点阵中盲打定位',
    },
    'en-US': {
      title: 'Horizontal Double Anchors',
      desc: 'Horizontal dual anchors to train proportion and orthogonal projection intuition.',
      instruction: 'Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.',
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateHorizontalDoubleQuestion(level, settings),
    evaluateAnswer: (clickPoint, q) => {
      const hitRes = evaluatePointGridHit(clickPoint, q.targetB, q.distractorPoints);
      return {
        isHit: hitRes.isHit,
        nearestGridPoint: hitRes.nearestGridPoint,
        errorDistance: hitRes.errorDistance,
        clickPoint,
      };
    },
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      anchorC: q.anchorC ? [q.anchorC.x, q.anchorC.y] : undefined,
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) =>
      StarCanvasView({
        question,
        showAnswer,
        userAnswer,
        onAnswer,
        disabled,
      }),
  },
  analytics: createStarAnalyticsContract('star_double_h'),
};

export default HorizontalDoubleCard;
~~~~~

~~~~~act
write_file
src/modules/star/RotatedDoubleCard/index.ts
~~~~~
~~~~~typescript
import { RotateCw } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsContract } from '../_shared/analytics';
import { generateBipolarGridPoints } from '../_shared/gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM, rotatePoint } from '../_shared/pointMath';
import { STAR_SCHEMAS } from '../_shared/schemas';
import { StarCanvasView, type StarQuestionPayload } from '../_shared/StarCanvasView';

export interface RotatedDoubleQuestion extends StarQuestionPayload {
  mode: 'double_r';
  rotationAngle: number;
}

export function generateRotatedDoubleQuestion(
  level: number,
  settings: StarSettings,
): RotatedDoubleQuestion {
  const id = `star_double_r_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = settings?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];
  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];
  if (settings.targetingMode === 'manual' && settings.manualTargetSectors?.length) {
    if (Math.random() < 0.7) {
      const chosenSector =
        settings.manualTargetSectors[Math.floor(Math.random() * settings.manualTargetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        return Math.min(diff, 360 - diff) <= 22.5;
      });
      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;
  const rotAngle = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];

  const center: Point = { x: 0, y: 0 };
  const rotatedA = rotatePoint({ x: baseAx, y: baseAy }, center, rotAngle);
  const rotatedC = rotatePoint({ x: baseCx, y: baseCy }, center, rotAngle);
  const rotatedB = rotatePoint({ x: px, y: py }, center, rotAngle);

  const anchorA: Point = {
    x: Math.round((rotatedA.x + CX) * 100) / 100,
    y: Math.round((rotatedA.y + CY) * 100) / 100,
  };
  const anchorC: Point = {
    x: Math.round((rotatedC.x + CX) * 100) / 100,
    y: Math.round((rotatedC.y + CY) * 100) / 100,
  };
  const targetB: Point = {
    x: Math.round((rotatedB.x + CX) * 100) / 100,
    y: Math.round((rotatedB.y + CY) * 100) / 100,
  };

  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    level,
    gridDim,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    mode: 'double_r',
    anchorA,
    anchorC,
    targetB,
    difficultyLevel: level,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
}

export const RotatedDoubleCard: CardManifest<
  RotatedDoubleQuestion,
  { isHit: boolean; nearestGridPoint: Point; errorDistance: number; clickPoint: Point },
  Point,
  StarSettings
> = {
  id: 'star_double_r',
  domain: 'spatial_structure',
  groupId: 'star',
  icon: RotateCw,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    challenge: ['dimensional_translation'],
    interaction: ['spatial_locate'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: STAR_SCHEMAS,
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  locales: {
    'zh-CN': {
      title: '旋转双锚点',
      desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
      instruction: '观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位',
    },
    'en-US': {
      title: 'Rotated Double Anchors',
      desc: 'Tilted dual anchors to master complex rotated coordinate mapping.',
      instruction: 'Observe the rotated dual anchors on the left, then locate the target on the right.',
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateRotatedDoubleQuestion(level, settings),
    evaluateAnswer: (clickPoint, q) => {
      const hitRes = evaluatePointGridHit(clickPoint, q.targetB, q.distractorPoints);
      return {
        isHit: hitRes.isHit,
        nearestGridPoint: hitRes.nearestGridPoint,
        errorDistance: hitRes.errorDistance,
        clickPoint,
      };
    },
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      anchorC: q.anchorC ? [q.anchorC.x, q.anchorC.y] : undefined,
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) =>
      StarCanvasView({
        question,
        showAnswer,
        userAnswer,
        onAnswer,
        disabled,
      }),
  },
  analytics: createStarAnalyticsContract('star_double_r'),
};

export default RotatedDoubleCard;
~~~~~

#### Acts 4: 试点迁移 `angle`（角度）领域为独立 Card 模块

我们在 `src/modules/angle/` 下建立 `_shared/` 与 3 个自闭合卡片：`AngleEstimationCard`、`AngleComparisonCard`、`AngleParallelCard`。

~~~~~act
write_file
src/modules/angle/_shared/angleCanvas.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';

export const ANGLE_CANVAS_SIZE = 340;
export const ANGLE_2AFC_SIZE = 240;
export const ANGLE_PROMPT_SIZE = 140;

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export function drawAngleCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_CANVAS_SIZE,
  strokeColor: string = CANVAS_THEME.shape.fill,
  lineWidth = 2.5,
): void {
  if (!lines) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }
}

export function drawSingleLineCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  size = ANGLE_2AFC_SIZE,
  strokeColor: string = CANVAS_THEME.shape.fill,
  lineWidth = 2.5,
): void {
  if (!line) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();
}

export function createCenteredLine(center: Point, angleDeg: number, length: number): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  const halfL = length / 2;
  return {
    p1: {
      x: Math.round((center.x - halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y + halfL * Math.sin(rad)) * 10) / 10,
    },
    p2: {
      x: Math.round((center.x + halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - halfL * Math.sin(rad)) * 10) / 10,
    },
  };
}

export function createRadialLine(center: Point, angleDeg: number, length: number): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    p1: { x: center.x, y: center.y },
    p2: {
      x: Math.round((center.x + length * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - length * Math.sin(rad)) * 10) / 10,
    },
  };
}
~~~~~

~~~~~act
write_file
src/modules/angle/AngleEstimationCard/index.ts
~~~~~
~~~~~typescript
import { Compass, Eye } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import type { CardManifest } from '../../../core/contracts';
import { useTranslation } from '../../../core/i18n';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { BaseModuleSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import {
  ANGLE_CANVAS_SIZE,
  createRadialLine,
  drawAngleCanvas,
  type LineSegment,
} from '../_shared/angleCanvas';

export interface AngleEstimationQuestion {
  id: string;
  targetAngleDeg: number;
  startAngleDeg: number;
  lineA: LineSegment;
  lineB: LineSegment;
  difficultyLevel: number;
  tolerance: number;
}

export interface AngleEstimationHit {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number;
  tolerance: number;
}

export function generateAngleEstimationQuestion(level: number): AngleEstimationQuestion {
  const id = `ang_est_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const targetAngleDeg = Math.floor(Math.random() * 150) + 15;
  const startAngleDeg = Math.floor(Math.random() * 360);
  const endAngleDeg = (startAngleDeg + targetAngleDeg) % 360;

  const center: Point = { x: ANGLE_CANVAS_SIZE / 2, y: ANGLE_CANVAS_SIZE / 2 };
  const armLength = ANGLE_CANVAS_SIZE * 0.38;

  const lineA = createRadialLine(center, startAngleDeg, armLength);
  const lineB = createRadialLine(center, endAngleDeg, armLength);
  const tolerance = Math.round(expDecayInterpolate(12.0, 1.5, clampedLevel) * 10) / 10;

  return {
    id,
    targetAngleDeg,
    startAngleDeg,
    lineA,
    lineB,
    difficultyLevel: clampedLevel,
    tolerance,
  };
}

function AngleEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: {
  question: AngleEstimationQuestion;
  showAnswer: boolean;
  userAnswer: AngleEstimationHit | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}) {
  const { t } = useTranslation();
  const targetVal = question.targetAngleDeg ?? 90;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('cards.angle_estimation.instruction')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('packs.angle.views.estimationLabel')}
      max={180}
      step={0.5}
      initialValue={90}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onAnswer={onAnswer}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={ANGLE_CANVAS_SIZE}
            height={ANGLE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
              if (question.lineA && question.lineB) {
                drawAngleCanvas(canvas, [question.lineA, question.lineB], ANGLE_CANVAS_SIZE);
              }
            }}
            deps={[question.lineA, question.lineB]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('packs.angle.views.trueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('packs.angle.views.errorInfo', {
                error: Math.round(Math.abs(userVal - targetVal) * 10) / 10,
                tolerance,
              })}
            </span>
          </div>
        ) : null
      }
    />
  );
}

export const AngleEstimationCard: CardManifest<
  AngleEstimationQuestion,
  AngleEstimationHit,
  number,
  BaseModuleSettings
> = {
  id: 'angle_estimation',
  domain: 'form_and_proportion',
  groupId: 'angle',
  icon: Compass,
  tags: {
    domain: ['form_and_proportion'],
    path: ['absolute_estimation'],
    interaction: ['continuous_mod'],
  },
  hasWeaknessAnalytics: false,
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'packs.angle.settings.showToleranceBandTitle',
      description: 'packs.angle.settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  locales: {
    'zh-CN': {
      title: '夹角大小估算',
      desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)',
      instruction: '观察两射线夹角，调制滑块逼近精准度数 (0°~180°)',
    },
    'en-US': {
      title: 'Angle Estimation',
      desc: 'Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).',
      instruction: 'Observe the two rays and adjust the slider to match the true angle (0°~180°).',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleEstimationQuestion(level),
    evaluateAnswer: (userVal, q) => {
      const targetVal = q.targetAngleDeg ?? 90;
      const errorValue = Math.round(Math.abs(userVal - targetVal) * 10) / 10;
      const isHit = errorValue <= q.tolerance;
      return {
        isHit,
        userValue: userVal,
        targetValue: targetVal,
        errorValue,
        tolerance: q.tolerance,
      };
    },
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal) => ({
      userAnswer: userVal,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) =>
      AngleEstimationView({
        question,
        showAnswer,
        userAnswer,
        onAnswer,
        disabled,
        hitMargin: (settings.sliderHitMargin as number) ?? 12,
        showToleranceBand: (settings.showToleranceBand as boolean) ?? true,
        showCanvasHints: (settings.showCanvasHints as boolean) ?? true,
      }),
  },
};

export default AngleEstimationCard;
~~~~~

~~~~~act
write_file
src/modules/angle/AngleComparisonCard/index.ts
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import type { CardManifest } from '../../../core/contracts';
import { useTranslation } from '../../../core/i18n';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { BaseModuleSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import {
  ANGLE_2AFC_SIZE,
  createRadialLine,
  drawAngleCanvas,
  type LineSegment,
} from '../_shared/angleCanvas';

export interface AngleComparisonQuestion {
  id: string;
  angleA: number;
  angleB: number;
  linesA: [LineSegment, LineSegment];
  linesB: [LineSegment, LineSegment];
  largerSide: 'A' | 'B';
  difficultyLevel: number;
  tolerance: number;
}

export interface AngleComparisonHit {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}

export function generateAngleComparisonQuestion(level: number): AngleComparisonQuestion {
  const id = `ang_cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const baseAngle = Math.floor(Math.random() * 110) + 30;
  const deltaAngle = Math.round(expDecayInterpolate(25.0, 1.2, clampedLevel) * 10) / 10;
  const largerAngle = Math.min(170, baseAngle + deltaAngle);
  const smallerAngle = Math.max(10, baseAngle);

  const isALarger = Math.random() < 0.5;
  const angleA = isALarger ? largerAngle : smallerAngle;
  const angleB = isALarger ? smallerAngle : largerAngle;

  const center: Point = { x: ANGLE_2AFC_SIZE / 2, y: ANGLE_2AFC_SIZE / 2 };
  const armLength = ANGLE_2AFC_SIZE * 0.38;

  const startA = Math.floor(Math.random() * 360);
  const startB = Math.floor(Math.random() * 360);

  const linesA: [LineSegment, LineSegment] = [
    createRadialLine(center, startA, armLength),
    createRadialLine(center, (startA + angleA) % 360, armLength),
  ];
  const linesB: [LineSegment, LineSegment] = [
    createRadialLine(center, startB, armLength),
    createRadialLine(center, (startB + angleB) % 360, armLength),
  ];

  return {
    id,
    angleA,
    angleB,
    linesA,
    linesB,
    largerSide: isALarger ? 'A' : 'B',
    difficultyLevel: clampedLevel,
    tolerance: deltaAngle,
  };
}

function AngleComparisonView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: {
  question: AngleComparisonQuestion;
  showAnswer: boolean;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}) {
  const { t } = useTranslation();
  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.angle.views.comparisonHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('common.areaA'),
        isCorrect: isAHit,
        badge: showAnswer ? `${question.angleA}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesA, ANGLE_2AFC_SIZE)}
              deps={[question.linesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: showAnswer ? `${question.angleB}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesB, ANGLE_2AFC_SIZE)}
              deps={[question.linesB]}
            />
          </div>
        ),
      }}
    />
  );
}

export const AngleComparisonCard: CardManifest<
  AngleComparisonQuestion,
  AngleComparisonHit,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_comparison_2afc',
  domain: 'form_and_proportion',
  groupId: 'angle',
  icon: Columns,
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
  },
  hasWeaknessAnalytics: false,
  locales: {
    'zh-CN': {
      title: '角度二分对比',
      desc: '二选一快速判别哪一侧的两射线夹角更大 (2AFC)',
      instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
    },
    'en-US': {
      title: 'Angle 2AFC Comparison',
      desc: 'Quickly identify which side has a larger angle under non-orthogonal orientations (2AFC).',
      instruction: 'Identify which angle is larger (Keys 1 / 2).',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleComparisonQuestion(level),
    evaluateAnswer: (userVal, q) => {
      const isHit = userVal === q.largerSide;
      return {
        isHit,
        userChoice: userVal,
        correctChoice: q.largerSide,
        errorValue: isHit ? 0 : 1,
        tolerance: q.tolerance,
      };
    },
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal) => ({
      userChoice: userVal,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, onAnswer, disabled, settings }) =>
      AngleComparisonView({
        question,
        showAnswer,
        onAnswer,
        disabled,
        showCanvasHints: (settings.showCanvasHints as boolean) ?? true,
      }),
  },
};

export default AngleComparisonCard;
~~~~~

~~~~~act
write_file
src/modules/angle/AngleParallelCard/index.ts
~~~~~
~~~~~typescript
import { Split } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import type { CardManifest } from '../../../core/contracts';
import { useTranslation } from '../../../core/i18n';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { BaseModuleSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  createCenteredLine,
  drawSingleLineCanvas,
  type LineSegment,
} from '../_shared/angleCanvas';

export interface AngleParallelQuestion {
  id: string;
  promptLine: LineSegment;
  lineOptionA: LineSegment;
  lineOptionB: LineSegment;
  parallelSide: 'A' | 'B';
  angularDeviation: number;
  difficultyLevel: number;
  tolerance: number;
}

export interface AngleParallelHit {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}

export function generateAngleParallelQuestion(level: number): AngleParallelQuestion {
  const id = `ang_par_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const baseAngle = Math.floor(Math.random() * 360);
  const angularDeviation = Math.round(expDecayInterpolate(16.0, 1.0, clampedLevel) * 10) / 10;
  const deviationSign = Math.random() < 0.5 ? 1 : -1;
  const distractorAngle = (baseAngle + angularDeviation * deviationSign + 360) % 360;

  const promptCenter: Point = {
    x: ANGLE_PROMPT_SIZE / 2,
    y: ANGLE_PROMPT_SIZE / 2,
  };
  const promptLine = createCenteredLine(promptCenter, baseAngle, ANGLE_PROMPT_SIZE * 0.68);

  const optCenterA: Point = {
    x: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
    y: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
  };
  const optCenterB: Point = {
    x: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
    y: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
  };

  const lineLength = ANGLE_2AFC_SIZE * 0.65;
  const isAParallel = Math.random() < 0.5;

  const lineOptionA = isAParallel
    ? createCenteredLine(optCenterA, baseAngle, lineLength)
    : createCenteredLine(optCenterA, distractorAngle, lineLength);

  const lineOptionB = isAParallel
    ? createCenteredLine(optCenterB, distractorAngle, lineLength)
    : createCenteredLine(optCenterB, baseAngle, lineLength);

  return {
    id,
    promptLine,
    lineOptionA,
    lineOptionB,
    parallelSide: isAParallel ? 'A' : 'B',
    angularDeviation,
    difficultyLevel: clampedLevel,
    tolerance: angularDeviation,
  };
}

function AngleParallelView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: {
  question: AngleParallelQuestion;
  showAnswer: boolean;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}) {
  const { t } = useTranslation();
  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.angle.views.parallelHint')}
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('packs.angle.views.parallelPromptTitle')}
          </span>
          <CanvasView
            width={ANGLE_PROMPT_SIZE}
            height={ANGLE_PROMPT_SIZE}
            className="w-28 h-28 rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) =>
              drawSingleLineCanvas(
                canvas,
                question.promptLine,
                ANGLE_PROMPT_SIZE,
                CANVAS_THEME.status.accent,
                3.0,
              )
            }
            deps={[question.promptLine]}
          />
        </div>
      }
      optionA={{
        title: t('common.optionA'),
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionA,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.optionB'),
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionB,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionB]}
            />
          </div>
        ),
      }}
    />
  );
}

export const AngleParallelCard: CardManifest<
  AngleParallelQuestion,
  AngleParallelHit,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_parallel_2afc',
  domain: 'form_and_proportion',
  groupId: 'angle',
  icon: Split,
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
  },
  hasWeaknessAnalytics: false,
  locales: {
    'zh-CN': {
      title: '平行线基准辨识',
      desc: '观察上方斜率基准线，找出下方与其绝对平行的线段 (2AFC)',
      instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
    },
    'en-US': {
      title: 'Parallel Alignment',
      desc: 'Observe prompt orientation and identify strictly parallel line (2AFC).',
      instruction: 'Find the line that is strictly parallel to the prompt line (Keys 1 / 2).',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleParallelQuestion(level),
    evaluateAnswer: (userVal, q) => {
      const isHit = userVal === q.parallelSide;
      return {
        isHit,
        userChoice: userVal,
        correctChoice: q.parallelSide,
        errorValue: isHit ? 0 : 1,
        tolerance: q.tolerance,
      };
    },
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal) => ({
      userChoice: userVal,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, onAnswer, disabled, settings }) =>
      AngleParallelView({
        question,
        showAnswer,
        onAnswer,
        disabled,
        showCanvasHints: (settings.showCanvasHints as boolean) ?? true,
      }),
  },
};

export default AngleParallelCard;
~~~~~

#### Acts 5: 清理旧 `src/packs/star/` 与 `src/packs/angle/` 目录并更新导入

在完成了 `star` 与 `angle` 到 `src/modules/` 的自闭合拆解后，删除旧集中式包文件。

~~~~~act
delete_file
src/packs/star/index.ts
~~~~~
~~~~~act
delete_file
src/packs/star/plugin.tsx
~~~~~
~~~~~act
delete_file
src/packs/star/analytics.tsx
~~~~~
~~~~~act
delete_file
src/packs/star/views/StarCanvas.tsx
~~~~~
~~~~~act
delete_file
src/packs/star/utils/index.ts
~~~~~
~~~~~act
delete_file
src/packs/star/utils/gridGenerators.ts
~~~~~
~~~~~act
delete_file
src/packs/star/utils/hitDetection.ts
~~~~~
~~~~~act
delete_file
src/packs/star/utils/pointMath.ts
~~~~~
~~~~~act
delete_file
src/packs/star/utils/questionGenerator.ts
~~~~~
~~~~~act
delete_file
src/packs/star/utils/types.ts
~~~~~
~~~~~act
delete_file
src/packs/star/locales/en-US.json
~~~~~
~~~~~act
delete_file
src/packs/star/locales/zh-CN.json
~~~~~
~~~~~act
delete_file
src/packs/angle/index.ts
~~~~~
~~~~~act
delete_file
src/packs/angle/plugin.tsx
~~~~~
~~~~~act
delete_file
src/packs/angle/views/AngleCanvas.tsx
~~~~~
~~~~~act
delete_file
src/packs/angle/components/AngleComparison2AfcView.tsx
~~~~~
~~~~~act
delete_file
src/packs/angle/components/AngleEstimationView.tsx
~~~~~
~~~~~act
delete_file
src/packs/angle/components/AngleParallel2AfcView.tsx
~~~~~
~~~~~act
delete_file
src/packs/angle/utils/angleUtils.ts
~~~~~
~~~~~act
delete_file
src/packs/angle/locales/en-US.json
~~~~~
~~~~~act
delete_file
src/packs/angle/locales/zh-CN.json
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { useTranslation } from '../../core/i18n';
import { findNearestGridPoint } from '../../packs/star/utils/hitDetection';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
~~~~~
~~~~~typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { useTranslation } from '../../core/i18n';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript
  // 鼠标悬停与移动
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouching && hoverPoint) setHoverPoint(null);
  };

  // 鼠标普通点击
  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    if (!isWithinRange) return;

    setHoverPoint(null);
    onCommitPoint(nearestPoint);
  };

  // 触控开始
  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0]) return;
    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setIsTouching(true);
    setCurrentCanvasPos(coords.canvasPoint);

    // 放大镜稳定位于手指正上方 75px，不进行翻转
    setLoupePos({
      x: coords.relX,
      y: coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(coords.canvasPoint);
  };

  // 触控移动
  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0] || !isTouching) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setCurrentCanvasPos(coords.canvasPoint);

    // 放大镜稳定位于手指正上方 75px，不进行翻转
    setLoupePos({
      x: coords.relX,
      y: coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(coords.canvasPoint);
  };

  // 触控松手确认提交
  const handleTouchEnd = () => {
    if (disabled || showAnswer || !isTouching) return;
    setIsTouching(false);
    setLoupePos(null);

    if (hoverPoint) {
      const commitPt = hoverPoint;
      setHoverPoint(null);
      onCommitPoint(commitPt);
    } else if (currentCanvasPos) {
      const { nearestPoint, isWithinRange } = findNearestGridPoint(currentCanvasPos, gridPoints);
      if (isWithinRange) {
        setHoverPoint(null);
        onCommitPoint(nearestPoint);
      }
    }
  };
~~~~~
~~~~~typescript
  // 鼠标悬停与移动
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouching && hoverPoint) setHoverPoint(null);
  };

  // 鼠标普通点击
  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);
    if (!isWithinRange) return;

    setHoverPoint(null);
    onCommitPoint(nearestPoint);
  };

  // 触控开始
  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0]) return;
    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setIsTouching(true);
    setCurrentCanvasPos(coords.canvasPoint);

    // 放大镜稳定位于手指正上方 75px，不进行翻转
    setLoupePos({
      x: coords.relX,
      y: coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(coords.canvasPoint);
  };

  // 触控移动
  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0] || !isTouching) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setCurrentCanvasPos(coords.canvasPoint);

    // 放大镜稳定位于手指正上方 75px，不进行翻转
    setLoupePos({
      x: coords.relX,
      y: coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(coords.canvasPoint);
  };

  // 触控松手确认提交
  const handleTouchEnd = () => {
    if (disabled || showAnswer || !isTouching) return;
    setIsTouching(false);
    setLoupePos(null);

    if (hoverPoint) {
      const commitPt = hoverPoint;
      setHoverPoint(null);
      onCommitPoint(commitPt);
    } else if (currentCanvasPos) {
      const { nearestPoint, isWithinRange } = findNearestPointInGrid(currentCanvasPos, gridPoints);
      if (isWithinRange) {
        setHoverPoint(null);
        onCommitPoint(nearestPoint);
      }
    }
  };
~~~~~

### 下一步建议
1. 执行编译与类型检查，确认 `SingleAnchorCard`、`HorizontalDoubleCard`、`RotatedDoubleCard` 以及 `AngleEstimationCard`、`AngleComparisonCard`、`AngleParallelCard` 6 张卡片能被 `SystemDomainRegistry` 正确发现和装配。
2. 随后推进第三阶段：解构 `color`（绝对色感）、`relative_color`（相对色感）、`negative_space`（负空间）、`perspective`（透视）与 `abstraction`（概括提炼）剩余领域。
