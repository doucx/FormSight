我已经准备好开始实施。我将生成一个 Quipu 计划，移除卡片契约（`CardManifest`）中的所有向后兼容字段（如 `training`、根级 `icon` 和根级 `renderSettings`），并将 `src/core/registry.ts` 和 `src/views/GenericTrainingView.tsx` 中的消费逻辑收敛至纯净的 `engine` / `ui` 架构。

---

移除卡片契约向后兼容层并强制规范纯净的 `engine/ui` 架构。

## [WIP] refactor(core): 移除卡片契约的向后兼容层并收敛至纯净的 engine/ui 架构

### 错误分析

不涉及错误修复，这是一次根据既定架构原则进行的重构演进。

### 用户需求

彻底清理 FormSight 项目中所有卡片清单（CardManifest）的过渡期向后兼容字段（`training`, 根级 `icon`, 根级 `renderSettings`），收敛类型定义，并在宿主消费端强制实行 `engine`（纯计算）与 `ui`（渲染绑定）的明确契约隔离。

### 评论

随着所有卡片已平滑升级到新规范，移除兼容层能够大幅精简类型定义，杜绝未来架构回退的可能，提升代码库的长期可维护性和类型安全性。

### 目标

1. 更新 `src/core/cardContract.ts`，从 `CardManifest` 接口中移除 `training`、根级 `icon` 和根级 `renderSettings` 字段，并将 `engine` 与 `ui` 设为标准属性。
2. 更新 `src/core/registry.ts`，直接从 `card.ui.icon` 获取图标。
3. 更新 `src/views/GenericTrainingView.tsx`，移除对 `manifest.training` 的回退兼容，直接读取 `manifest.engine` 与 `manifest.ui.renderCanvas`。

### 基本原理

通过类型系统硬编码约束卡片结构，防止混淆领域逻辑与视图表现，为后续的无头算法测试和更清晰的边界划分奠定坚实基础。

### 标签

#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #concept/config #scope/core #ai/instruct #task/domain/architecture #task/object/card-manifest #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新 `CardManifest` 契约定义

~~~~~act
write_file
src/core/cardContract.ts
~~~~~
~~~~~
import type { ComponentChildren } from 'preact';
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

import type { ScopedTranslator } from './i18n';

export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[], t: ScopedTranslator) => void;
  renderDiagnostics: (records: TRecord[], t: ScopedTranslator) => ComponentChildren;
  getOverallStats?: (
    records: TRecord[],
    t: ScopedTranslator,
  ) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}

/**
 * 纯领域计算与规则契约 (0 UI 依赖理念，仅负责出题、判分与数据提取)
 */
export interface CardEngineContract<
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
}

/**
 * 表现层绑定契约 (声明 Web 视图渲染、图标与设置弹窗组件注入)
 */
export interface CardUIContract<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  icon: (props: { className?: string }) => ComponentChildren;
  renderCanvas: (
    props: CardCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
  renderSettings?: (props: {
    settings: TSettings;
    updateSettings: (patch: Partial<TSettings>) => void;
  }) => ComponentChildren;
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
  defaultSettings?: Partial<TSettings>;

  /** 2. 自包含多语言词典 */
  locales?: {
    'zh-CN': Record<string, unknown>;
    'en-US': Record<string, unknown>;
  };

  /** 3. 核心领域逻辑 */
  engine: CardEngineContract<TQuestion, THitResult, TAnswerVal, TSettings>;

  /** 4. 表现层绑定 */
  ui: CardUIContract<TQuestion, THitResult, TAnswerVal, TSettings>;

  /** 5. 专属能力分析视图 (可选) */
  analytics?: {
    views: CardAnalyticsView[];
    fetchRecords?: (cardId: string) => Promise<UnifiedTrialRecord[]>;
  };
}
~~~~~

#### Acts 2: 更新 `registry.ts` 与 `GenericTrainingView.tsx` 去除兼容回退逻辑

~~~~~act
write_file
src/core/registry.ts
~~~~~
~~~~~
import { getTrialRecordsByCard } from '../storage/db/queries';
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import type { CardManifest, CardAnalyticsView as FlatCardAnalyticsView } from './cardContract';
import type { CardAnalyticsPlugin } from './contracts';
import { getCardDesc, getCardTitle, i18n } from './i18n';

/**
 * 递归补全卡片相对多语言 Key
 */
export function qualifyCardKey(key: string | undefined, cardId: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('cards.') || key.startsWith('global.')) {
    return key;
  }
  return `cards.${cardId}.${key.replace(/^\./, '')}`;
}

export function qualifyAnalyticsViews(
  views: FlatCardAnalyticsView[] | undefined,
  cardId: string,
): FlatCardAnalyticsView[] {
  if (!views) return [];
  return views.map((v) => ({
    ...v,
    tabLabel: qualifyCardKey(v.tabLabel, cardId) ?? v.tabLabel,
    title: qualifyCardKey(v.title, cardId) ?? v.title,
    subTitle: qualifyCardKey(v.subTitle, cardId) ?? v.subTitle,
  }));
}

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
}

class SystemDomainRegistry {
  private cardManifestMap = new Map<string, CardManifest>();
  private cardMap = new Map<string, CardDefinition>();
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

    this.cardMap.set(card.id, cardDef);
    this.invertedIndex.indexCard(cardDef);

    // 4. 注册卡片专属分析插件
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
        results = results.filter((c) => {
          if (c.id.toLowerCase().includes(kw)) return true;

          const title = getCardTitle(c).toLowerCase();
          if (title.includes(kw)) return true;

          const desc = getCardDesc(c).toLowerCase();
          if (desc.includes(kw)) return true;

          const instructionKey = `cards.${c.id}.instruction`;
          const instruction = i18n.t(instructionKey);
          if (instruction !== instructionKey && instruction.toLowerCase().includes(kw)) {
            return true;
          }

          return false;
        });
      }
    }

    return results;
  }

  // === 卡片直查接口 ===
  public getAllCards(): CardDefinition[] {
    return Array.from(this.cardMap.values());
  }

  public getCardById(cardId: string): CardDefinition | undefined {
    return this.cardMap.get(cardId);
  }

  public getCardManifest(cardId: string): CardManifest | undefined {
    return this.cardManifestMap.get(cardId);
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
}

export const registry = new SystemDomainRegistry();
~~~~~

~~~~~act
write_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~
import type { SessionHistoryItem } from '../components/modals/SessionSummaryModal';
import { TrainingShell } from '../components/training/TrainingShell';
import type { CardManifest } from '../core/cardContract';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../storage/index';
import type { BaseModuleSettings, GlobalSettings } from '../storage/settings';
import type { CardDefinition } from '../types/card';

export interface GenericTrainingViewProps<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  card: CardDefinition;
  manifest: CardManifest<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  globalSettings?: GlobalSettings;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  onIdleChange?: (isIdle: boolean) => void;
  onIdleResume?: (idleDurationMs: number) => void;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
}

export function GenericTrainingView<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
>({
  card,
  manifest,
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
  const engine = manifest.engine;
  const renderCanvas = manifest.ui.renderCanvas;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain,
    cardId: card.id,
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
    generateQuestion: (level) => engine.generateQuestion(level, settings),
    evaluateAnswer: (userVal, q) => engine.evaluateAnswer(userVal, q),
    isHit: (hitResult) => engine.isHit(hitResult),
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      const qLevel =
        engine.getQuestionLevel?.(q) ??
        (q as { difficultyLevel?: number })?.difficultyLevel ??
        initialLevel;

      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          timestamp: Date.now(),
          difficultyLevel: qLevel,
          isHit: engine.isHit(hitResult),
          responseTimeMs,
          details: engine.extractRecordDetails?.(q, hitResult, userVal) ?? {},
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

  const isTargeting = engine.isTargeting ? engine.isTargeting(settings) : false;

  const currentLevel = session.question
    ? (engine.getQuestionLevel?.(session.question) ??
      (session.question as { difficultyLevel?: number })?.difficultyLevel ??
      initialLevel)
    : initialLevel;

  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={currentLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      showExitButton={showExitButton}
      showTimer={showTimer}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
        renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings: {
            ...settings,
            sliderHitMargin:
              globalSettings?.sliderHitMargin ??
              (settings.sliderHitMargin as number | undefined) ??
              12,
            showCanvasHints:
              globalSettings?.showCanvasHints ??
              (settings.showCanvasHints as boolean | undefined) ??
              true,
          },
        })
      }
    </TrainingShell>
  );
}
~~~~~

### 下一步建议

建议运行类型检查（如 `npm run tsc` 或 `npx tsc --noEmit`）以确保所有卡片在移除兼容层后，TypeScript 类型校验全部通过。
