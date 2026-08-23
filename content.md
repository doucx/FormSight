这是一个合理的界面信息层级优化。在多阶段训练计划（Plan）中，各卡片的单阶段用时分散了注意力，而整体流的累计总用时才是核心指标。

我将为 `TrainingShell` 与 `GenericTrainingView` 增加 `showTimer` 开关配置，并在 `PlanTrainingView` 中隐藏单阶段用时、将总用时置于计划顶栏中。

## [WIP] feat: 在训练计划流中隐藏单卡计时并在顶栏展示总用时

### 用户需求
1. 在多阶段训练计划执行时，隐藏单个卡片右上角的计时器徽标。
2. 将训练计划自启动以来的全局总累计用时显示在顶层导航状态栏上。

### 评论
在单卡独立训练模式下，单卡用时能够反映个体模块的作答节奏；但在组合训练流中，过多的局部计时信息会增加认知负荷，用户更关注整体训练流的推进节奏与总用时消耗。将单卡计时隐藏并上浮训练流总用时至顶栏，符合宏观与微观信息架构的设计原则。

### 目标
1. 在 `TrainingShellProps` 和 `GenericTrainingViewProps` 中新增可选属性 `showTimer`（默认 `true`），按需控制单卡计时组件的渲染。
2. 在 `PlanTrainingView` 中调用 `GenericTrainingView` 时显式传入 `showTimer={false}`。
3. 在 `PlanTrainingView` 顶部状态栏中新增总用时（`totalElapsedSeconds`）徽标组件展示。

### 基本原理
通过参数下发（Props Passing）实现轻量解耦，在保证单卡独立训练模式（`GenericTrainingView` 直接调用）行为不变的前提下，使宿主容器 `PlanTrainingView` 可以灵活隐藏子视图的局部计时器，并将自身维护的 `totalElapsedSeconds` 格式化后直接渲染在统一的计划顶栏中。

### 标签
#intent/build #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/plan-timer #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 在 `TrainingShell` 中支持 `showTimer` 控制开关

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  showExitButton?: boolean;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}
~~~~~
~~~~~typescript
interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  showExitButton = true,
  children,
}: TrainingShellProps) {
~~~~~
~~~~~typescript
export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {currentLevel}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>
~~~~~
~~~~~typescript
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {currentLevel}</span>
          </div>

          {showTimer && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
            </div>
          )}
        </div>
      </header>
~~~~~

#### Acts 2: 在 `GenericTrainingView` 中透传 `showTimer` 属性

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
export interface GenericTrainingViewProps<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  card: CardDefinition;
  plugin: TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  globalSettings?: GlobalSettings;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  showExitButton?: boolean;
  onExit: () => void;
}
~~~~~
~~~~~typescript
export interface GenericTrainingViewProps<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  card: CardDefinition;
  plugin: TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  globalSettings?: GlobalSettings;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
}
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
  showExitButton = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
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
  showExitButton = true,
  showTimer = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={session.question ? plugin.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      showExitButton={showExitButton}
      onExit={onExit}
    >
~~~~~
~~~~~typescript
  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={session.question ? plugin.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      showExitButton={showExitButton}
      showTimer={showTimer}
      onExit={onExit}
    >
~~~~~

#### Acts 3: 在 `PlanTrainingView` 顶栏渲染总用时并关闭单卡计时器

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { ArrowLeft, Clock, FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
  const plugin = registry.getPluginByCardId(currentCard.id);
  if (!plugin) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto mb-4 bg-white border border-slate-200/80 px-4 sm:px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestExit}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="结束并查看训练流总结"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练流
          </button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-xl">
              阶段 {currentStepIndex + 1} / {validItems.length}
            </span>
            <span className="text-xs font-bold text-slate-800 tracking-tight">{plan.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-xs text-slate-400 font-mono font-semibold hidden sm:block">
            本阶段目标: <strong className="text-slate-700">{currentStep.targetTrials}</strong> 题
          </div>
          <button
            type="button"
            onClick={handleSkipCurrentStage}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="跳过当前阶段进入下一阶段"
          >
            <FastForward className="w-3.5 h-3.5 text-indigo-500" />
            跳过此阶段
          </button>
        </div>
      </div>

      {!isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          正在加载【{currentCard.title}】的生涯能力层阶...
        </div>
      ) : (
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
          showExitButton={false}
          onExit={handleRequestExit}
        />
      )}
~~~~~
~~~~~typescript
  const plugin = registry.getPluginByCardId(currentCard.id);
  if (!plugin) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto mb-4 bg-white border border-slate-200/80 px-4 sm:px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestExit}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="结束并查看训练流总结"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练流
          </button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-xl">
              阶段 {currentStepIndex + 1} / {validItems.length}
            </span>
            <span className="text-xs font-bold text-slate-800 tracking-tight">{plan.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-xs text-slate-400 font-mono font-semibold hidden sm:block">
            本阶段目标: <strong className="text-slate-700">{currentStep.targetTrials}</strong> 题
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-xs font-bold text-slate-700">
              {formatTime(totalElapsedSeconds)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSkipCurrentStage}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="跳过当前阶段进入下一阶段"
          >
            <FastForward className="w-3.5 h-3.5 text-indigo-500" />
            跳过此阶段
          </button>
        </div>
      </div>

      {!isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          正在加载【{currentCard.title}】的生涯能力层阶...
        </div>
      ) : (
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
          showExitButton={false}
          showTimer={false}
          onExit={handleRequestExit}
        />
      )}
~~~~~

### 下一步建议
1. 启动本地开发服务并在浏览器中启动任意一个「今日训练计划」，确认顶栏计时器正常递增，且下方卡片状态栏已无重复的单卡计时器。
2. 确认在独立单卡训练页面中，单卡计时器仍然正常显示并工作。
