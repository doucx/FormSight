好的，我们首先开始实施重构的第一阶段：**定义 `CardManifest` 契约，并使 `SystemDomainRegistry` 与 `i18n` 引擎同时具备自动发现与装载单卡片（Card）的能力**。

这一步将完全保持向后兼容，现有的所有 Packs 和功能均不受影响。

## [WIP] feat: 定义 CardManifest 契约并升级 Registry 与 i18n

### 用户需求
1. 在 `src/core/contracts.ts` 中定义内聚完备的 `CardManifest` 核心契约。
2. 升级 `src/core/registry.ts`，使其支持自动扫描 `src/modules/**/index.ts` 并自动注册卡片（同时保留对已有 `src/packs/**/index.ts` 的兼容）。
3. 升级 `src/core/i18n.ts`，支持卡片私有多语言词典的自动挂载与自适应回退解析。
4. 保证修改对当前系统用户与既有模块完全无感。

### 评论
将卡片提升为一等公民是系统走向模块化、可扩展和热插拔的关键。通过在注册层和多语言层支持双轨并行（既支持旧 Pack 也支持新 Card），可以确保后续所有领域的逐步迁移过程平滑稳定。

### 目标
1. 声明完整的 `CardManifest` 接口定义，囊括元数据、设置、多语言、训练引擎与分析视图。
2. 在 `i18n.ts` 中支持 `registerCardLocales` 方法，并优化 `getCardTitle` 和 `getCardDesc` 的多级回退策略（`cards.<cardId>` -> `packs.<packId>.cards.<cardId>` -> 静态默认值）。
3. 在 `registry.ts` 中实现 `registerCard` 方法与 Vite Glob 动态扫描逻辑。

### 基本原理
1. **统一门面适配器**：`registerCard` 接收 `CardManifest` 后，自动适配为系统底层的 `CardDefinition` 与针对单卡闭合的 `TrainingPlugin`，使上层的 `GenericTrainingView` 和 `CardAnalyticsView` 无需做任何破坏性修改。
2. **多级命名空间解析**：在多语言查找链中优先命中高内聚的卡片词典 `cards.<cardId>`，未命中时平滑降级至既有的 `packs.<packId>.cards.<cardId>`，实现新旧架构无缝并存。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/interfaces #concept/executor #concept/config #scope/core #scope/api #ai/instruct #task/domain/architecture #task/object/card-manifest #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在 `src/core/contracts.ts` 中定义 `CardManifest` 契约

我们将定义自包含的 `CardManifest` 契约，整合元数据、独立训练逻辑、分析视图、配置 Schema 与多语言。

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript
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

/**
 * 训练卡片独立自包含清单 (Card Manifest)
 * 卡片作为系统一等公民的核心规范：涵盖元数据、设置、多语言、训练引擎逻辑与统计分析
 */
export interface CardManifest<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  /** 卡片全局唯一 ID (如 'star_single', 'color_hue') */
  id: string;
  /** 所属领域分类 / 文件夹分组 (如 'star', 'color', 'perspective')，用于 IDE 收纳与逻辑归类 */
  groupId?: string;
  /** 运行模式标识 (默认与 id 一致) */
  mode?: string;
  /** 卡片主矢量图标 */
  icon: (props: { className?: string }) => ComponentChildren;
  /** 五维本体语义标签 */
  tags: CardTags;

  /** 是否开启弱点专项分析功能 */
  hasWeaknessAnalytics?: boolean;
  /** 动态配置项描述列表 */
  settingSchemas?: SettingFieldSchema[];
  /** 卡片默认个性化设置项 */
  defaultSettings?: Partial<TSettings>;

  /** 卡片自包含的多语言词典 (可直接挂载 title, desc, instruction, hint 等) */
  locales?: {
    'zh-CN'?: Record<string, unknown>;
    'en-US'?: Record<string, unknown>;
    [lang: string]: Record<string, unknown> | undefined;
  };

  /** 卡片自闭环的训练引擎逻辑 */
  training: {
    /** 是否处于靶向弱点强化模式 */
    isTargeting?: (settings: TSettings) => boolean;
    /** 生成单道训练题目 */
    generateQuestion: (level: number, settings: TSettings) => TQuestion;
    /** 评估判定用户作答 */
    evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
    /** 判断该判定结果是否为命中 (Hit) */
    isHit: (hitResult: THitResult) => boolean;
    /** 获取题目的具体难度等级 (默认读取 question.difficultyLevel) */
    getQuestionLevel?: (question: TQuestion) => number;
    /** 提取入库持久化到 IndexedDB 的细节结构 */
    extractRecordDetails?: (
      question: TQuestion,
      hitResult: THitResult,
      userVal: TAnswerVal,
    ) => Record<string, unknown>;
    /** 渲染该卡片的 Canvas/交互视图 */
    renderCanvas: (
      props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
    ) => ComponentChildren;
  };

  /** 卡片专属认知数据分析扩展 (可选) */
  analytics?: {
    views: CardAnalyticsView[];
    fetchRecords?: (cardId: string) => Promise<UnifiedTrialRecord[]>;
  };
}

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic card manifest registry
export type AnyCardManifest = CardManifest<any, any, any, any>;
~~~~~

#### Acts 2: 升级 `src/core/i18n.ts` 支持卡片级独立多语言词典

支持通过 `registerCardLocales` 动态挂载卡片词典至 `cards.<cardId>`，并增强标题与描述的解析回退。

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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

  /** 由 Registry 在扫描 CardManifest 时调用，将 Card 私有词典挂载至 `cards.<cardId>` 命名空间 */
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
~~~~~

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
/**
 * 通用：解析卡片标题多语言回退 (优先卡片级词典 -> Pack词典 -> 静态默认值)
 */
export function getCardTitle(
  card: { id: string; packId?: string; title?: string },
  t = i18n.t,
): string {
  // 1. 优先从 Card 命名空间查询
  const cardKey = `cards.${card.id}.title`;
  const cardTitle = t(cardKey);
  if (cardTitle !== cardKey) return cardTitle;

  // 2. 回退从 legacy Pack 命名空间查询
  const packId = card.packId || 'core';
  const legacyPackKey = `packs.${packId}.cards.${card.id}.title`;
  const legacyTitle = t(legacyPackKey);
  if (legacyTitle !== legacyPackKey) return legacyTitle;

  // 3. 最终回退至静态字段或 ID
  return card.title || card.id;
}

/**
 * 通用：解析卡片描述多语言回退 (优先卡片级词典 -> Pack词典 -> 静态默认值)
 */
export function getCardDesc(
  card: { id: string; packId?: string; desc?: string },
  t = i18n.t,
): string {
  // 1. 优先从 Card 命名空间查询
  const cardKey = `cards.${card.id}.desc`;
  const cardDesc = t(cardKey);
  if (cardDesc !== cardKey) return cardDesc;

  // 2. 回退从 legacy Pack 命名空间查询
  const packId = card.packId || 'core';
  const legacyPackKey = `packs.${packId}.cards.${card.id}.desc`;
  const legacyDesc = t(legacyPackKey);
  if (legacyDesc !== legacyPackKey) return legacyDesc;

  // 3. 最终回退至静态字段
  return card.desc || '';
}
~~~~~

#### Acts 3: 升级 `src/core/registry.ts` 支持 `CardManifest` 与 `modules` 目录扫描

我们将使 `SystemDomainRegistry` 支持 `registerCard`，并增加对 `../modules/**/index.ts` 的自动发现扫描。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';
~~~~~
~~~~~typescript
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import type { AnyCardManifest, CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
  private packs = new Map<string, PackManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private cardDefaultsMap = new Map<string, Record<string, unknown>>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描模块：
   * 1. 扫描新架构 src/modules/**\/index.ts 注册单卡片 CardManifest
   * 2. 兼容扫描存量 src/packs/**\/index.ts 注册 PackManifest
   */
  private autoDiscover(): void {
    // 1. 扫描新版独立 CardManifest
    const cardModules = import.meta.glob<{
      default?: AnyCardManifest | AnyCardManifest[];
      [key: string]: unknown;
    }>('../modules/**/index.ts', {
      eager: true,
    });

    for (const path in cardModules) {
      const mod = cardModules[path];
      if (!mod) continue;

      if (mod.default) {
        if (Array.isArray(mod.default)) {
          for (const card of mod.default) {
            if (card && card.id && card.training) this.registerCard(card);
          }
        } else if (typeof mod.default === 'object' && 'id' in mod.default && 'training' in mod.default) {
          this.registerCard(mod.default as AnyCardManifest);
        }
      }

      // 支持具名导出 CardManifest
      for (const [key, value] of Object.entries(mod)) {
        if (key !== 'default' && value && typeof value === 'object' && 'id' in value && 'training' in value) {
          this.registerCard(value as AnyCardManifest);
        }
      }
    }

    // 2. 兼容扫描存量 PackManifest
    const packModules = import.meta.glob<{ default: PackManifest }>('../packs/*/index.ts', {
      eager: true,
    });

    for (const path in packModules) {
      const manifest = packModules[path]?.default;
      if (manifest) this.register(manifest);
    }
  }

  /**
   * 注册独立卡片 (CardManifest 一等公民注册入口)
   */
  public registerCard(manifest: AnyCardManifest): void {
    const groupId = manifest.groupId || 'core';
    const cardMode = manifest.mode || manifest.id;

    // 1. 挂载私有多语言
    if (manifest.locales) {
      i18n.registerCardLocales(manifest.id, manifest.locales);
    }

    // 2. 归一化为 CardDefinition 视图层描述
    const normalizedCard: CardDefinition = {
      id: manifest.id,
      packId: groupId,
      mode: cardMode,
      icon: manifest.icon,
      tags: manifest.tags,
      hasWeaknessAnalytics: manifest.hasWeaknessAnalytics,
      settingSchemas: manifest.settingSchemas,
    };

    this.cardMap.set(manifest.id, normalizedCard);
    this.invertedIndex.indexCard(normalizedCard);

    // 3. 记录卡片默认设置项
    if (manifest.defaultSettings) {
      this.cardDefaultsMap.set(manifest.id, manifest.defaultSettings);
    }

    // 4. 将卡片独立 training 逻辑封装为兼容的 TrainingPlugin
    const cardPlugin: AnyTrainingPlugin = {
      packId: groupId,
      title: manifest.id,
      getModeBadge: (m) => m,
      isTargeting: manifest.training.isTargeting
        ? (_m, settings) => Boolean(manifest.training.isTargeting?.(settings))
        : undefined,
      generateQuestion: (_m, level, settings) =>
        manifest.training.generateQuestion(level, settings),
      evaluateAnswer: (userVal, q) => manifest.training.evaluateAnswer(userVal, q),
      isHit: (hitResult) => manifest.training.isHit(hitResult),
      getQuestionLevel: manifest.training.getQuestionLevel
        ? (q) => manifest.training.getQuestionLevel?.(q) ?? (q as { difficultyLevel: number })?.difficultyLevel ?? 1
        : (q) => (q as { difficultyLevel: number })?.difficultyLevel ?? 1,
      extractRecordDetails: manifest.training.extractRecordDetails
        ? (q, hitResult, userVal, mode) => ({
            mode,
            ...(manifest.training.extractRecordDetails?.(q, hitResult, userVal) || {}),
          })
        : (_q, _hitResult, userVal, mode) => ({ mode, userAnswer: userVal }),
      renderCanvas: manifest.training.renderCanvas,
    };

    this.cardPluginMap.set(manifest.id, cardPlugin);

    // 5. 注册分析视图插件
    if (manifest.analytics) {
      const analyticsPlugin: CardAnalyticsPlugin = {
        cardId: manifest.id,
        fetchRecords: manifest.analytics.fetchRecords || ((id) => getTrialRecordsByCard(id)),
        views: manifest.analytics.views || [],
      };
      this.cardAnalyticsMap.set(manifest.id, analyticsPlugin);
    }
  }

  public register(manifest: PackManifest): void {
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
  public getCardById(cardId: string): CardDefinition | undefined {
    return this.cardMap.get(cardId);
  }

  public getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
    return this.cardPluginMap.get(cardId);
  }
~~~~~
~~~~~typescript
  public getCardById(cardId: string): CardDefinition | undefined {
    return this.cardMap.get(cardId);
  }

  public getCardDefaultSettings(cardId: string): Record<string, unknown> | undefined {
    return this.cardDefaultsMap.get(cardId);
  }

  public getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
    return this.cardPluginMap.get(cardId);
  }
~~~~~

#### Acts 4: 更新 `src/storage/settings.ts` 接入 `CardManifest` 默认配置

在构建默认卡片配置时，同时读取新注册卡片的 `defaultSettings`。

~~~~~act
patch_file
src/storage/settings.ts
~~~~~
~~~~~typescript
  for (const card of allCards) {
    const pack = registry.getPack(card.packId);
    const packCardDefaults = pack?.defaultCardSettings?.[card.id] || {};

    const cardConfig: BaseModuleSettings = {
      ...DEFAULT_BASE_SETTINGS,
      ...packCardDefaults,
    };
~~~~~
~~~~~typescript
  for (const card of allCards) {
    const pack = registry.getPack(card.packId);
    const packCardDefaults = pack?.defaultCardSettings?.[card.id] || {};
    const directCardDefaults = registry.getCardDefaultSettings(card.id) || {};

    const cardConfig: BaseModuleSettings = {
      ...DEFAULT_BASE_SETTINGS,
      ...packCardDefaults,
      ...directCardDefaults,
    };
~~~~~

### 下一步建议
我们已经成功建立了 `CardManifest` 核心契约，并使注册器与多语言系统原生支持单卡片热插拔。接下来建议执行**阶段 2（试点迁移）**：
1. 创建 `src/modules/star/` 目录结构。
2. 提取 `_shared` 通用几何计算库。
3. 将 `star_single`、`star_double_h`、`star_double_r` 分别解构为独立的 `SingleAnchorCard`、`HorizontalDoubleCard`、`RotatedDoubleCard` 目录与 `CardManifest`。
