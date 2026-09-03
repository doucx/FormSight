现在开始执行系统重构路线图中的 **Phase 1（契约归一化，消除冗余转译层）**。

我将对系统中的核心契约、服务注册中心与训练调度视图进行重构：彻底清理历史遗留的 `TrainingPlugin` 及冗余的 `mode` 参数，使训练运行时组件直接消费自包含的 `CardManifest`。

## [WIP] refactor(core): 废除旧式 TrainingPlugin 转译层并使调度流直连 CardManifest

### 用户需求
落实 FormSight 训练架构重构路线图第一阶段（Phase 1）：彻底移除具有历史包袱的双重契约与无意义的 `mode` 胶水转译层，让 `GenericTrainingView`、`PlanTrainingView` 与路由直接消费 `CardManifest`。

### 评论
该重构将去除早期按大类 Domain 架构演进留下的 `mode` 幽灵透传与 `pluginAdapter` 映射开销，理顺训练执行层的契约边界，为后续纯计算内核抽离（Phase 2）打好扎实的基础。

### 目标
1. 在 `src/core/contracts.ts` 中废弃并移除 `TrainingPlugin` 及其领域别名。
2. 在 `src/core/registry.ts` 中移除 `cardPluginMap` 及 `pluginAdapter` 胶水包装逻辑，统一对外提供 `getCardManifest`。
3. 重构 `src/views/GenericTrainingView.tsx`，使其直接消费 `CardManifest`，移除所有函数调用中多余的 `mode` 参数。
4. 更新 `src/views/PlanTrainingView.tsx` 和 `src/components/routing/AppRouter.tsx`，适配直连 `CardManifest` 的调用方式。

### 基本原理
在扁平化模块体系确立后，每个训练卡片都是一个独立的原子清单（`CardManifest`）。过去通过适配器将 `CardManifest.training` 重新伪装成 `TrainingPlugin`，不仅强制要求传递无用的 `mode`，还增加了概念层级。直接消费 `manifest.training` 可以实现零运行时适配与更清晰的责任分工。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #scope/core #scope/api #ai/instruct #task/domain/architecture #task/object/training-plugin #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 清理 `src/core/contracts.ts` 中的旧接口定义

移除已经废弃的 `TrainingPlugin` 接口及其别名，仅保留通用的分析与基座类型。

~~~~~act
write_file
src/core/contracts.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../storage/db/schema';

export interface BaseInteractiveCardProps {
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function calculateBasicOverallStats<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord>(
  records: TRecord[],
): { accuracy: number; total: number } {
  const total = records.length;
  const hits = records.filter((r) => r.isHit).length;
  const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
  return { accuracy, total };
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

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  views: CardAnalyticsView<TRecord>[];
}
~~~~~

#### Acts 2: 清理 `src/core/registry.ts` 中的 Plugin 适配层代码

移除 `cardPluginMap` 以及向后兼容的 `pluginAdapter` 包装，统一维护卡片定义与 `CardManifest`。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
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
  VisualDomainTag,
} from '../types/card';
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import type { CardManifest, CardAnalyticsView as FlatCardAnalyticsView } from './cardContract';
import type { CardAnalyticsPlugin } from './contracts';
import { getCardDesc, getCardTitle, i18n } from './i18n';
~~~~~
~~~~~typescript.new
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
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
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
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
      extractRecordDetails: (q, h, u) => card.training.extractRecordDetails?.(q, h, u) ?? {},
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
~~~~~
~~~~~typescript.new
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
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
  public getCardManifest(cardId: string): CardManifest | undefined {
    return this.cardManifestMap.get(cardId);
  }

  public getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
    return this.cardPluginMap.get(cardId);
  }

  public getAnalyticsPluginByCardId(cardId: string): CardAnalyticsPlugin | undefined {
~~~~~
~~~~~typescript.new
  public getCardManifest(cardId: string): CardManifest | undefined {
    return this.cardManifestMap.get(cardId);
  }

  public getAnalyticsPluginByCardId(cardId: string): CardAnalyticsPlugin | undefined {
~~~~~

#### Acts 3: 重构 `GenericTrainingView.tsx` 直连 `CardManifest`

将 `GenericTrainingView` 的输入改造为 `manifest: CardManifest`，彻底废除函数调用中的 `mode` 参数，并简化入参结构。

~~~~~act
write_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
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
  const training = manifest.training;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain,
    mode: card.id,
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
    generateQuestion: (level) => training.generateQuestion(level, settings),
    evaluateAnswer: (userVal, q) => training.evaluateAnswer(userVal, q),
    isHit: (hitResult) => training.isHit(hitResult),
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      const qLevel =
        training.getQuestionLevel?.(q) ??
        (q as { difficultyLevel?: number })?.difficultyLevel ??
        initialLevel;

      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          mode: card.id,
          timestamp: Date.now(),
          difficultyLevel: qLevel,
          isHit: training.isHit(hitResult),
          responseTimeMs,
          details: training.extractRecordDetails?.(q, hitResult, userVal) ?? {},
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
        mode: card.id,
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

  const isTargeting = training.isTargeting ? training.isTargeting(settings) : false;

  const currentLevel = session.question
    ? (training.getQuestionLevel?.(session.question) ??
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
        training.renderCanvas({
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

#### Acts 4: 适配 `PlanTrainingView.tsx` 与 `AppRouter.tsx`

使多阶段训练调度流和主路由直接查询并传入 `CardManifest`。

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
  if (!currentCard || validItems.length === 0) {
    onExit();
    return null;
  }

  const plugin = registry.getPluginByCardId(currentCard.id);
  if (!plugin) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);
  const cardTitle = getCardTitle(currentCard, t);
~~~~~
~~~~~typescript.new
  if (!currentCard || validItems.length === 0) {
    onExit();
    return null;
  }

  const manifest = registry.getCardManifest(currentCard.id);
  if (!manifest) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);
  const cardTitle = getCardTitle(currentCard, t);
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
        <GenericTrainingView
          key={`plan-stage-${planSessionKey}-${currentStepIndex}-${currentCard.id}`}
          card={currentCard}
          plugin={plugin}
          sessionType="training"
          initialLevel={stageInitialLevel}
          settings={cardConfig}
          globalSettings={settings.global}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          onIdleChange={handleIdleChange}
          onIdleResume={handleIdleResume}
          showExitButton={false}
          showTimer={false}
          onExit={handleRequestExit}
        />
~~~~~
~~~~~typescript.new
        <GenericTrainingView
          key={`plan-stage-${planSessionKey}-${currentStepIndex}-${currentCard.id}`}
          card={currentCard}
          manifest={manifest}
          sessionType="training"
          initialLevel={stageInitialLevel}
          settings={cardConfig}
          globalSettings={settings.global}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          onIdleChange={handleIdleChange}
          onIdleResume={handleIdleResume}
          showExitButton={false}
          showTimer={false}
          onExit={handleRequestExit}
        />
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript.old
    const activeCard = registry.getCardById(route.cardId);
    if (!activeCard) {
      navigate(lastHomeRoute);
      return null;
    }
    const plugin = registry.getPluginByCardId(activeCard.id);
    if (!plugin) {
      navigate(lastHomeRoute);
      return null;
    }
    const activeLevel = currentProfiles[activeCard.id]?.currentLevel || 5;

    return (
      <GenericTrainingView
        key={`${activeCard.id}-${route.sessionType}`}
        card={activeCard}
        plugin={plugin}
        sessionType={route.sessionType}
        initialLevel={activeLevel}
        settings={getCardSettings(currentSettings, activeCard.id)}
        globalSettings={currentSettings.global}
        onExit={async () => {
          await refreshAppData();
          navigate(lastHomeRoute);
        }}
      />
    );
~~~~~
~~~~~typescript.new
    const activeCard = registry.getCardById(route.cardId);
    const manifest = registry.getCardManifest(route.cardId);
    if (!activeCard || !manifest) {
      navigate(lastHomeRoute);
      return null;
    }
    const activeLevel = currentProfiles[activeCard.id]?.currentLevel || 5;

    return (
      <GenericTrainingView
        key={`${activeCard.id}-${route.sessionType}`}
        card={activeCard}
        manifest={manifest}
        sessionType={route.sessionType}
        initialLevel={activeLevel}
        settings={getCardSettings(currentSettings, activeCard.id)}
        globalSettings={currentSettings.global}
        onExit={async () => {
          await refreshAppData();
          navigate(lastHomeRoute);
        }}
      />
    );
~~~~~

---

### 下一步建议

我们已经顺利完成了 **Phase 1**，消除了系统对 `TrainingPlugin` 的旧式依赖，去除了冗余的 `mode` 透传并使调度流直连 `CardManifest`。

接下来建议推进 **Phase 2（计算内核与 Preact 视图解耦）**：
1. 以 `star_single`（单锚点）为标杆范式，将其目录拆解为：
   - `engine.ts`: 负责纯题目生成、距离评估与命中判定的无 DOM / 无 JSX 纯计算内核；
   - `view.tsx`: 专注于点阵交互响应与渲染绑定的视图层；
   - `types.ts` & `analytics.ts`: 维持类型清晰与分析模块解耦。
2. 纠正 `star_single` 交互返回反向透传判题结果的问题，使 `onAnswer` 仅提交真实用户交互坐标 `Point`。

如需开始 Phase 2，可随时通知我继续生成执行计划。
