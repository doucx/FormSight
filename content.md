你的需求非常清晰合理。在训练流模式下，单卡片级别的退出容易引发两层分析弹窗竞争（单卡片总结与训练流大盘总结）。

我将生成一个实现方案：
1. **隐藏单卡片退出按钮**：为 `TrainingShell` 和 `GenericTrainingView` 增加 `showExitButton` 控制属性，并在 `PlanTrainingView` 中将其置为 `false`，移除内层单卡片的退出按钮；
2. **在训练流顶部状态栏最左侧新增统一退出入口**：点击直接呼出全局训练流成果大盘总结（`PlanSummaryModal`），让训练流的退出与总结流程更加纯粹、一致。

## [WIP] feat(plan): 统一训练流退出入口并隐藏单模块退出按钮

### 用户需求

1. 在训练流模式（`PlanTrainingView`）中隐藏单题模块顶部的「退出训练 (Esc)」按钮，避免在训练流进行时误触发单卡片结算弹窗。
2. 在训练流顶部的全局进度栏最左侧新增统一的「退出训练」按钮，点击后直接弹出本次训练流的大盘总结分析（或在无做答时安全退出）。

### 评论

统一训练流的退出层级能够彻底消除子模块与训练流双层结算弹窗的歧义和遮罩冲突，显著提升多阶段连续训练的沉浸感与交互清晰度。

### 目标

1. 在 `TrainingShell.tsx` 中增加 `showExitButton` 属性（默认为 `true`），支持隐藏左上角退出按钮。
2. 在 `GenericTrainingView.tsx` 中增加 `showExitButton` 属性并透传至 `TrainingShell`。
3. 在 `PlanTrainingView.tsx` 中将 `showExitButton` 设为 `false`，并在顶部流水线状态栏的最左侧放置「退出训练流」按钮，触发训练流大盘分析。

### 基本原理

通过自顶向下传递 `showExitButton={false}`，让 `GenericTrainingView` 仅作为纯内容与交互算子运行，将流程控制（跳过阶段、全局退出与结算）统一收拢至 `PlanTrainingView` 顶层栏，保证整个训练流的控制流单一可控。

### 标签

#intent/build #flow/ready #priority/medium #comp/ui #concept/navigation #scope/ux #ai/instruct #task/domain/ui #task/object/plan-exit-control #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 在 `TrainingShell.tsx` 中支持隐藏退出按钮

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}

export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  children,
}: TrainingShellProps) {
~~~~~
~~~~~typescript.new
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
~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
      {/* 统一 Header 状态栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <div className="relative flex items-center">
~~~~~
~~~~~typescript.new
      {/* 统一 Header 状态栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showExitButton && (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              退出训练 (Esc)
            </button>
          )}
          <div className="relative flex items-center">
~~~~~

#### Acts 2: 在 `GenericTrainingView.tsx` 中透传 `showExitButton`

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
export interface GenericTrainingViewProps {
  card: CardDefinition;
  plugin: AnyTrainingPlugin;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: BaseModuleSettings;
  globalSettings?: GlobalSettings;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  onExit: () => void;
}

export function GenericTrainingView({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  targetLimitTrials,
  onTargetLimitReached,
  onExit,
}: GenericTrainingViewProps) {
~~~~~
~~~~~typescript.new
export interface GenericTrainingViewProps {
  card: CardDefinition;
  plugin: AnyTrainingPlugin;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: BaseModuleSettings;
  globalSettings?: GlobalSettings;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  showExitButton?: boolean;
  onExit: () => void;
}

export function GenericTrainingView({
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
}: GenericTrainingViewProps) {
~~~~~
~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={session.question ? adapter.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      showExitButton={showExitButton}
      onExit={onExit}
    >
~~~~~

#### Acts 3: 在 `PlanTrainingView.tsx` 顶部导航栏最左侧添加退出按钮并隐藏子模块退出

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
import { FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript.new
import { ArrowLeft, FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
      {/* 顶部流水线全局进度与操作栏 */}
      <div className="max-w-5xl mx-auto mb-4 bg-white border border-slate-200/80 px-4 sm:px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-xl">
            阶段 {currentStepIndex + 1} / {validItems.length}
          </span>
          <span className="text-xs font-bold text-slate-800 tracking-tight">{plan.name}</span>
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
~~~~~
~~~~~typescript.new
      {/* 顶部流水线全局进度与操作栏 */}
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
          onExit={handleRequestExit}
        />
~~~~~
~~~~~typescript.new
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
~~~~~

### 下一步建议

- **界面验证**: 进入「今日训练流」界面，观察画布顶部的单题卡片内已不再显示退出按钮；
- **交互验证**: 练习若干题后，点击最顶部进度栏左侧的「退出训练流」按钮，验证是否直接唤起整场训练流的大盘综合分析弹窗（`PlanSummaryModal`）。
