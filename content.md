我们现在开始执行“阶段 0: 基础设施升级 (Core Foundation)”，建立卡片一等公民（Card-Centric Architecture）的底层支持设施，实现新老双轨热插拔与相对作用域自动补全机制。

## [WIP] feat: 实现卡片一等公民基础设施升级 (阶段 0: Contracts, i18n & Registry)

### 用户需求
根据《FormSight 核心架构白皮书》，实施阶段 0 基础设施升级任务：
1. 创建 `src/core/cardContract.ts`，定义原子卡片标准契约 `CardManifest`。
2. 升级 `src/core/i18n.ts`，增加 `registerCardLocales`、`useCardTranslation` 相对作用域解析并优化回退链。
3. 升级 `src/core/registry.ts`，实现 `qualifySchemas`/`qualifyAnalyticsViews` 相对 Key 补全器、`registerCard` 适配器及 `autoDiscover` 双轨自动扫描。

### 评论
阶段 0 是整个卡片化平铺重构的基石。通过在注册中心和多语言层引入相对路径前缀补全与双轨发现机制（绞杀者模式），可以在完全不破坏现有 `src/packs/` 运作的前提下，支持 `src/cards/` 目录下的卡片逐一自治接入并即时生效。

### 目标
1. 建立 `src/core/cardContract.ts` 契约定义。
2. 在 `src/core/i18n.ts` 中注册 `cards.<cardId>` 命名空间并提供 `useCardTranslation` 辅助 Hook。
3. 在 `src/core/registry.ts` 中支持扫描 `../cards/*/index.{ts,tsx}` 并将其自动转译为统一系统卡片及训练适配器。

### 基本原理
1. **契约解耦**：`CardManifest` 包含元数据、多语言词典、设置 Schema、训练引擎闭环与专属分析视图。
2. **相对 Key 自动前缀补全**：卡片内部声明如 `settings.gridSizeTitle`，注册中心在加载时自动通过 `qualifyCardKey` 转换为 `cards.<cardId>.settings.gridSizeTitle`，实现真正的零 ID 硬编码。
3. **双轨运行时兼容**：`autoDiscover` 同时扫描旧 `packs/*/index.ts` 和新 `cards/*/index.{ts,tsx}`，新卡片同名自动覆盖旧实现。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #scope/api #ai/instruct #task/domain/architecture #task/object/card-first-citizen #task/action/infrastructure-upgrade #task/state/begin #task/status/active

---

### Script

#### Acts 1: 新建 `src/core/cardContract.ts` 核心契约文件

新建卡片契约定义文件，导出 `CardCanvasProps`、`CardAnalyticsView` 和 `CardManifest` 接口。

~~~~~act
write_file
src/core/cardContract.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { UnifiedTrialRecord } from '../storage/db/schema';
import type { BaseModuleSettings } from '../storage/settings';
import type { CardTags, VisualDomainTag } from '../types/card';

export interface CardCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
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

export interface CardManifest<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  /** 1. 全局唯一标识与分类标签 */
  id: string;
  domain: VisualDomainTag;
  tags: CardTags;
  icon: (props: { className?: string }) => ComponentChildren;

  /** 2. 个性化设置项定义与默认值 */
  settingSchemas?: SettingFieldSchema[];
  defaultSettings?: Partial<TSettings>;

  /** 3. 自包含多语言词典 */
  locales?: {
    'zh-CN': Record<string, unknown>;
    'en-US': Record<string, unknown>;
  };

  /** 4. 训练引擎核心逻辑闭环 */
  training: {
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
      props: CardCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
    ) => ComponentChildren;
  };

  /** 5. 专属能力分析视图 (可选) */
  analytics?: {
    views: CardAnalyticsView[];
    fetchRecords?: (cardId: string) => Promise<UnifiedTrialRecord[]>;
  };
}
~~~~~

#### Acts 2: 升级 `src/core/i18n.ts` 支持卡片作用域及相对解析

在 `I18nManager` 中新增 `registerCardLocales`，优化 `getCardTitle` 和 `getCardDesc` 查询回退，并导出 `useCardTranslation`。

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript.old
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

  /** 核心翻译查表方法，支持深层路径解析、数组透传与模板插值 */
~~~~~
~~~~~typescript.new
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

  /** 核心翻译查表方法，支持深层路径解析、数组透传与模板插值 */
~~~~~

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript.old
/**
 * 通用：解析卡片标题多语言回退
 */
export function getCardTitle(
  card: { id: string; packId?: string; title?: string },
  t = i18n.t,
): string {
  const packId = card.packId || 'core';
  const key = `packs.${packId}.cards.${card.id}.title`;
  const translated = t(key);
  return translated !== key ? translated : card.title || card.id;
}

/**
 * 通用：解析卡片描述多语言回退
 */
export function getCardDesc(
  card: { id: string; packId?: string; desc?: string },
  t = i18n.t,
): string {
  const packId = card.packId || 'core';
  const key = `packs.${packId}.cards.${card.id}.desc`;
  const translated = t(key);
  return translated !== key ? translated : card.desc || '';
}

/**
 * 通用：解析扩展包标题多语言回退
 */
~~~~~
~~~~~typescript.new
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
~~~~~

#### Acts 3: 升级 `src/core/registry.ts` 实现双轨自动发现与前缀补全

增加 `qualifyCardKey`、`qualifySchemas`、`qualifyAnalyticsViews` 转换器，并实现 `registerCard` 适配器与 `autoDiscover` 多源扫描。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
import type { AnyTrainingPlugin } from '../core/contracts';
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
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';
~~~~~
~~~~~typescript.new
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { AnyTrainingPlugin } from '../core/contracts';
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
import type { CardAnalyticsView as FlatCardAnalyticsView, CardManifest } from './cardContract';
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';

/**
 * 递归补全卡片相对多语言 Key
 */
export function qualifyCardKey(key: string | undefined, cardId: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('cards.') || key.startsWith('global.') || key.startsWith('packs.')) {
    return key;
  }
  return `cards.${cardId}.${key.replace(/^\./, '')}`;
}

export function qualifySchemas(
  schemas: SettingFieldSchema[] | undefined,
  cardId: string,
): SettingFieldSchema[] | undefined {
  if (!schemas) return undefined;
  return schemas.map((schema) => {
    const s = { ...schema };
    if (s.title) s.title = qualifyCardKey(s.title, cardId)!;
    if (s.subTitle) s.subTitle = qualifyCardKey(s.subTitle, cardId);
    if (s.type === 'targeting' && Array.isArray(s.sectors)) {
      s.sectors = s.sectors.map((sec) => qualifyCardKey(sec, cardId)!);
    }
    if (s.options) {
      s.options = s.options.map((opt) => ({
        ...opt,
        label: qualifyCardKey(opt.label, cardId)!,
      }));
    }
    return s;
  });
}

export function qualifyAnalyticsViews(
  views: FlatCardAnalyticsView[] | undefined,
  cardId: string,
): FlatCardAnalyticsView[] {
  if (!views) return [];
  return views.map((v) => ({
    ...v,
    tabLabel: qualifyCardKey(v.tabLabel, cardId)!,
    title: qualifyCardKey(v.title, cardId)!,
    subTitle: qualifyCardKey(v.subTitle, cardId)!,
  }));
}
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
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
    };

    // 4. 适配 AnyTrainingPlugin 运行时
    const pluginAdapter: AnyTrainingPlugin = {
      title: card.id,
      getModeBadge: () => card.id,
      isTargeting: (_m, s) => card.training.isTargeting?.(s) ?? false,
      generateQuestion: (_m, lvl, s) => card.training.generateQuestion(lvl, s),
      evaluateAnswer: (u, q) => card.training.evaluateAnswer(u, q),
      isHit: (res) => card.training.isHit(res),
      getQuestionLevel: (q) =>
        card.training.getQuestionLevel?.(q) ??
        (q as { difficultyLevel?: number })?.difficultyLevel ??
        5,
      extractRecordDetails: (q, h, u) =>
        card.training.extractRecordDetails?.(q, h, u) ?? {},
      renderCanvas: (props) => card.training.renderCanvas(props),
    };

    this.cardMap.set(card.id, cardDef);
    this.cardPluginMap.set(card.id, pluginAdapter);
    this.invertedIndex.indexCard(cardDef);

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
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
  public getCardById(cardId: string): CardDefinition | undefined {
    return this.cardMap.get(cardId);
  }

  public getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
    return this.cardPluginMap.get(cardId);
  }
~~~~~
~~~~~typescript.new
  public getCardById(cardId: string): CardDefinition | undefined {
    return this.cardMap.get(cardId);
  }

  public getCardManifest(cardId: string): CardManifest | undefined {
    return this.cardManifestMap.get(cardId);
  }

  public getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
    return this.cardPluginMap.get(cardId);
  }
~~~~~

### 下一步建议
阶段 0 的基础设施已构建完成，接下来建议进入**阶段 1: 试点试验 (Pilot: Star 寻星模块)**：
1. 新建 `src/cards/star_single/`、`src/cards/star_double_h/` 和 `src/cards/star_double_r/` 目录。
2. 提取出题几何算法至各自 `utils/`，编写纯相对 key 的 `locales/{zh-CN,en-US}.json`。
3. 建立 `index.tsx` 并导出 `CardManifest`。
4. 验证通过后安全移除 `src/packs/star/`。
