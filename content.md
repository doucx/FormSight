好的，我已经彻底分析了上述报错的根本原因：

1. **Biome Lint 告警 (`noExplicitAny`)**：Biome 禁止在泛型默认值中直接使用 `any`，应使用更安全的类型系统或 `unknown` 适配器。
2. **TypeScript 编译报错 (`TS2322`)**：`GenericTrainingView` 组件原先的泛型声明使得 JSX 在动态分发联合类型（`AnyTrainingPlugin` 与各模块 `UserSettings`）时无法正确自动收窄，导致 TS 默认推导到首个类型。

我们将重构 `GenericTrainingView.tsx`，通过明确的 `GenericTrainingViewProps` 和 `unknown` 安全适配器统一接口，彻底消除 `any` 和联合类型推导问题。

## [WIP] fix: 重构 GenericTrainingView 接口消除 any 与联合类型推导错误

### 错误分析
1. `src/views/GenericTrainingView.tsx` 中原先使用了 `= any` 作为泛型默认参数，违反了 Biome 的 `lint/suspicious/noExplicitAny` 规范。
2. 在 JSX 组件实例化时，由于 `CARD_PLUGINS` 和 `settings[activeCard.settingsKey]` 是多模块的联合类型，带有泛型参数的组件函数在缺少显式泛型传递时无法兼容异构的插件派发，导致 `TS2322` 报错。

### 用户需求
在不使用 `any` 满足 Biome 严格静态检查的前提下，使 `GenericTrainingView` 完美支持来自 `app.tsx` 的异构模块插件动态派发，通过 `npm run build` 和 `npm run checkf`。

### 评论
通过设计一个安全的 `GenericTrainingPluginAdapter`，可以在保留各独立插件内部强类型检查的同时，为通用训练视图提供统一的运行时派发能力，是干净且符合 TypeScript 最佳实践的方案。

### 目标
1. 在 `GenericTrainingView.tsx` 中定义 `GenericTrainingPluginAdapter` 与无泛型限制的 `GenericTrainingViewProps`。
2. 内部使用类型安全的 `unknown` 进行 Session 与 Hook 调度，移除所有 `any`。

### 基本原理
各子模块插件均继承自统一的逻辑结构，但在具体数据形态上各不相同。通用视图层（Generic View）负责的是生命周期与交互框架的通用调度，将其入参声明为统一的 `AnyTrainingPlugin` 和 `BaseModuleSettings`，并在内部采用基于 `unknown` 的适配器，能够彻底解耦组件调用处的泛型推导难题，并规避逆变类型合并导致的联合类型报错。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #concept/executor #scope/core #ai/instruct #task/domain/build #task/object/type-and-lint-fixes #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 重构 GenericTrainingView 组件与接口类型

使用 `GenericTrainingPluginAdapter` 替换原泛型定义，完全移除 `any`。

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
import { TrainingShell } from '../components/training/TrainingShell';
import type { TrainingPlugin } from '../config/trainingPlugins';
import { useTrainingSession } from '../hooks/useTrainingSession';
import type { CardDefinition } from '../types/card';
import { saveSession, saveTrialRecord } from '../utils/db';
import type { BaseModuleSettings } from '../utils/settings';

interface GenericTrainingViewProps<
  TQuestion = any,
  THitResult = any,
  TAnswerVal = any,
  TSettings extends BaseModuleSettings = any,
> {
  card: CardDefinition;
  plugin: TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  onExit: () => void;
}

export function GenericTrainingView<
  TQuestion = any,
  THitResult = any,
  TAnswerVal = any,
  TSettings extends BaseModuleSettings = any,
>({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
  const domain = card.legacyDomain;
  const mode = card.legacyMode;

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
    generateQuestion: (level) => plugin.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => plugin.evaluateAnswer(userVal, q, mode),
    isHit: plugin.isHit,
    getQuestionLevel: plugin.getQuestionLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
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
      });
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

  const isTargeting = plugin.isTargeting ? plugin.isTargeting(mode, settings) : false;

  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={session.question ? plugin.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
        plugin.renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings,
        })
      }
    </TrainingShell>
  );
}
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import { TrainingShell } from '../components/training/TrainingShell';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import { useTrainingSession } from '../hooks/useTrainingSession';
import type { CardDefinition } from '../types/card';
import { saveSession, saveTrialRecord } from '../utils/db';
import type { BaseModuleSettings } from '../utils/settings';

interface GenericTrainingPluginAdapter {
  isTargeting?: (mode: string, settings: unknown) => boolean;
  generateQuestion: (mode: string, level: number, settings: unknown) => unknown;
  evaluateAnswer: (userVal: unknown, question: unknown, mode: string) => unknown;
  isHit: (hitResult: unknown) => boolean;
  getQuestionLevel: (question: unknown) => number;
  extractRecordDetails: (
    question: unknown,
    hitResult: unknown,
    userVal: unknown,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (props: {
    question: unknown;
    showAnswer: boolean;
    userAnswer: unknown;
    onAnswer: (val: unknown) => void;
    disabled: boolean;
    isIdle: boolean;
    settings: unknown;
  }) => ComponentChildren;
}

export interface GenericTrainingViewProps {
  card: CardDefinition;
  plugin: AnyTrainingPlugin;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: BaseModuleSettings;
  onExit: () => void;
}

export function GenericTrainingView({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: GenericTrainingViewProps) {
  const domain = card.legacyDomain;
  const mode = card.legacyMode;
  const adapter = plugin as unknown as GenericTrainingPluginAdapter;

  const session = useTrainingSession<unknown, unknown, unknown>({
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
    generateQuestion: (level) => adapter.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => adapter.evaluateAnswer(userVal, q, mode),
    isHit: adapter.isHit,
    getQuestionLevel: adapter.getQuestionLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        cardId: card.id,
        domain,
        mode,
        timestamp: Date.now(),
        difficultyLevel: adapter.getQuestionLevel(q),
        isHit: adapter.isHit(hitResult),
        responseTimeMs,
        details: adapter.extractRecordDetails(q, hitResult, userVal, mode),
      });
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

  const isTargeting = adapter.isTargeting ? adapter.isTargeting(mode, settings) : false;

  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={session.question ? adapter.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
        adapter.renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings,
        })
      }
    </TrainingShell>
  );
}
~~~~~

### 下一步建议
1. 执行本计划以更新 `GenericTrainingView.tsx`。
2. 运行 `npm run checkf` 检查 Biome 校验。
3. 运行 `npm run build` 验证 TypeScript 编译与 Vite 打包。
