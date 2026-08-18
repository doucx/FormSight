我现在为你生成重构实施计划，通过引入 **`GenericTrainingView` + 领域插件注册表（`trainingPlugins`）** 架构，将现存 4 个高度冗余的 TrainingView 统一抽象为单个通用视图。

## [WIP] refactor(views): 引入 GenericTrainingView 与领域插件架构

### 用户需求
消除 `TrainingView.tsx`、`ColorTrainingView.tsx`、`RelativeColorTrainingView.tsx`、`NegativeSpaceTrainingView.tsx` 中高度重复的会话管理、IndexedDB 记录序列化与 Shell 包装逻辑，并通过插件化注册表简化 `App.tsx` 中的条件分支。

### 评论
这是一个显著提升代码整洁度与扩展性的架构重构。将“训练流程编排（通用）”与“题目生成/判定/渲染（特定领域）”彻底解耦，后续新增任何训练领域仅需提供一个纯粹的插件定义对象，无需再编写样板式的 View 组件。

### 目标
1. 创建 `src/config/trainingPlugins.tsx`，定义统一的 `TrainingPlugin` 接口并实现寻星、绝对色感、相对色感、正负形 4 个领域的插件。
2. 创建 `src/views/GenericTrainingView.tsx`，统一驱动 `useTrainingSession` 与 `TrainingShell`。
3. 重构 `src/app.tsx`，使用通用视图替换原有各细分 View。
4. 删除 4 个废弃的旧 View 文件。

### 基本原理
利用策略模式（Strategy Pattern）与 Preact 的组件插槽机制，将各模块差异化的：
- 模式徽标获取 (`getModeBadge`)
- 靶向判断 (`isTargeting`)
- 题目生成 (`generateQuestion`)
- 答题判定与击中检测 (`evaluateAnswer`, `isHit`)
- 数据持久化明细抽取 (`extractRecordDetails`)
- 画布渲染 (`renderCanvas`)
收敛在纯配置层，视图层仅负责通用的训练生命周期与用户交互编排。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/training-view-abstraction #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建通用训练插件定义与注册表

我们将领域相关的特定题目生成、判定算子、数据库字段映射与 Canvas 渲染逻辑封装至统一的 Plugin 注册表中。

~~~~~act
write_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~tsx
import type { ComponentChildren } from 'preact';
import { ColorCanvas } from '../components/ColorCanvas';
import { NegativeSpaceCanvas } from '../components/NegativeSpaceCanvas';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { StarCanvas } from '../components/StarCanvas';
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../utils/colorUtils';
import type { TrainingDomain } from '../utils/db';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../utils/geometry';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
} from '../utils/negativeSpaceUtils';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../utils/relativeColorUtils';
import type {
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../utils/settings';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

export interface TrainingPlugin<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings = unknown,
> {
  domain: TrainingDomain;
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

// 1. 寻星练习插件
export const starPlugin: TrainingPlugin<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  domain: 'star',
  title: '寻星练习',
  getModeBadge: (mode) => mode,
  isTargeting: (_mode, settings) => settings.targetingMode === 'manual',
  generateQuestion: (mode, level, settings) => {
    const opts: QuestionGenerateOptions = {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
      gridSize: settings.gridSize,
    };
    return generateQuestion(mode as TrainingMode, level, opts);
  },
  evaluateAnswer: (userVal) => userVal.hitResult,
  isHit: (hitResult) => hitResult.isHit,
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
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
    <StarCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer ? { clickPoint: userAnswer.nearestGridPoint, hitResult: userAnswer } : null}
      onAnswer={(clickPoint) => {
        const hitRes = checkHit(clickPoint, question.targetB, question.distractorPoints);
        if (hitRes.isWithinRange) {
          onAnswer({ clickPoint, hitResult: hitRes });
        }
      }}
      disabled={disabled}
    />
  ),
};

// 2. 绝对色感插件
export const colorPlugin: TrainingPlugin<
  ColorQuestionData,
  ColorHitResult,
  number | [number, number, number],
  ColorSenseSettings
> = {
  domain: 'color',
  title: '色感训练',
  getModeBadge: (mode) =>
    mode === 'H' ? '色相' : mode === 'V' ? '明度' : mode === 'S' ? '饱和度' : '综合拾色',
  isTargeting: (mode, settings) => settings.targetingMode === 'manual' && mode === 'H',
  generateQuestion: (mode, level, settings) =>
    generateColorQuestion(mode as ColorMode, level, {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
    }),
  evaluateAnswer: (userVal, q, mode) => checkColorHit(mode as ColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    const computedUserHSV: [number, number, number] =
      mode === 'ALL' && Array.isArray(userVal)
        ? userVal
        : [
            mode === 'H' ? (userVal as number) : q.targetH,
            mode === 'S' ? (userVal as number) : q.targetS,
            mode === 'V' ? (userVal as number) : q.targetV,
          ];
    return {
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: computedUserHSV,
      errorValue: hitResult.errorValue,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <ColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
    />
  ),
};

// 3. 相对色感插件
export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number],
  RelativeColorSettings
> = {
  domain: 'relative_color',
  title: '相对色感',
  getModeBadge: () => '色彩矢量迁移',
  generateQuestion: (mode, level) =>
    generateRelativeColorQuestion(mode as RelativeColorMode, level),
  evaluateAnswer: (userD, q, mode) =>
    checkRelativeColorHit(mode as RelativeColorMode, userD, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal) => ({
    colorA: q.colorA,
    colorB: q.colorB,
    colorC: q.colorC,
    targetD: q.targetD,
    userD: userVal,
    deltaEError: hitResult.deltaEError,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <RelativeColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
    />
  ),
};

// 4. 正负形感知插件
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: () => '负形占比估算',
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userRatio, q) => checkNegativeSpaceHit(userRatio, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal) => ({
    targetNegativeRatio: q.targetNegativeRatio,
    userRatio: userVal,
    errorValue: hitResult.errorValue,
    positiveArea: q.positiveArea,
    negativeArea: q.negativeArea,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
    />
  ),
};

export const TRAINING_PLUGINS: Record<TrainingDomain, TrainingPlugin<any, any, any, any>> = {
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};
~~~~~

#### Acts 2: 创建通用训练视图组件

创建 `src/views/GenericTrainingView.tsx`，将 `useTrainingSession` 的所有样板逻辑和 `TrainingShell` 渲染集中在单一组件中。

~~~~~act
write_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~tsx
import { TrainingShell } from '../components/training/TrainingShell';
import type { TrainingPlugin } from '../config/trainingPlugins';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../utils/db';
import type { BaseModuleSettings } from '../utils/settings';

interface GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings extends BaseModuleSettings> {
  plugin: TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings>;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  onExit: () => void;
}

export function GenericTrainingView<TQuestion, THitResult, TAnswerVal, TSettings extends BaseModuleSettings>({
  plugin,
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain: plugin.domain,
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
        domain: plugin.domain,
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
        domain: plugin.domain,
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
      title={plugin.title}
      badge={plugin.getModeBadge(mode)}
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

#### Acts 3: 更新 App 入口接入通用视图

重构 `src/app.tsx`，移除对旧视图的导入，改为通过 `TRAINING_PLUGINS[domain]` 统一渲染 `GenericTrainingView`。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
import { ColorTrainingView } from './views/ColorTrainingView';
import { Home } from './views/Home';
import { NegativeSpaceTrainingView } from './views/NegativeSpaceTrainingView';
import { RelativeColorTrainingView } from './views/RelativeColorTrainingView';
import { TrainingView } from './views/TrainingView';
~~~~~
~~~~~tsx.new
import { TRAINING_PLUGINS } from './config/trainingPlugins';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
          if (domain === 'star') {
            return (
              <TrainingView
                mode={activeMode as TrainingMode}
                sessionType={sessionType}
                initialLevel={currentLevel}
                settings={settings.star}
                onExit={handleExitTraining}
              />
            );
          }

          if (domain === 'color') {
            return (
              <ColorTrainingView
                mode={activeMode as ColorMode}
                sessionType={sessionType}
                initialLevel={currentLevel}
                settings={settings.color}
                onExit={handleExitTraining}
              />
            );
          }

          if (domain === 'relative_color') {
            return (
              <RelativeColorTrainingView
                mode={activeMode as RelativeColorMode}
                sessionType={sessionType}
                initialLevel={currentLevel}
                settings={settings.relative_color}
                onExit={handleExitTraining}
              />
            );
          }

          return (
            <NegativeSpaceTrainingView
              mode={activeMode as NegativeSpaceMode}
              sessionType={sessionType}
              initialLevel={currentLevel}
              settings={settings.negative_space}
              onExit={handleExitTraining}
            />
          );
~~~~~
~~~~~tsx.new
          const plugin = TRAINING_PLUGINS[domain];
          return (
            <GenericTrainingView
              key={`${domain}-${activeMode}-${sessionType}`}
              plugin={plugin}
              mode={activeMode}
              sessionType={sessionType}
              initialLevel={currentLevel}
              settings={settings[domain]}
              onExit={handleExitTraining}
            />
          );
~~~~~

#### Acts 4: 清理废弃的特定领域 TrainingView 文件

~~~~~act
delete_file
src/views/TrainingView.tsx
~~~~~

~~~~~act
delete_file
src/views/ColorTrainingView.tsx
~~~~~

~~~~~act
delete_file
src/views/RelativeColorTrainingView.tsx
~~~~~

~~~~~act
delete_file
src/views/NegativeSpaceTrainingView.tsx
~~~~~

### 下一步建议
1. 运行 `npm run check` 或 `npm run test` 验证类型检查与单元测试。
2. 推进下一阶段重构：**弱点分析组件聚合（`AnalyticsModal` 与 `ColorAnalyticsModal` 整合）** 或 **设置表单 Schema 驱动重构**。
