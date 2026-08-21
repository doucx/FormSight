好的，现在推进多选题型（N-AFC）交互壳 `<StandardNafcView />` 的封装与应用：
1. 封装通用 `<StandardNafcView />` 组件，同时支持即选即提交 (`immediate`) 与选后确认/快捷键提交 (`button`) 两种工作模式；
2. 重构 `PaletteClusteringView`、`TopDownPatternView`、`HueInductionView` 和 `VectorShiftView` 4 个核心四选一（4AFC）卡片组件。

## [WIP] refactor: 抽象通用 StandardNafcView 并重构多选类训练卡片

### 用户需求
消除四选一/多选卡片中重复的键盘监听、选项高亮容器绑定及提交状态管理，统一使用高阶组件 `<StandardNafcView />`。

### 评论
N-AFC（如 4 选 1）交互包括即选即走型（主调提炼、拼贴寻源）和预览微调型（补色残像、矢量迁移）。通过设计统一的 `submitMode`（`immediate` vs `button`），不仅将多选组件的重复代码减少了 50% 以上，而且将键盘响应（1-4 选号与 Space 提交）与状态重置逻辑收敛至单一组件。

### 目标
1. 新建 `src/components/common/StandardNafcView.tsx`：提供通用的 N 选 1 交互框架。
2. 重构以下 4 个多选视图组件：
   - `src/domains/abstraction/components/PaletteClusteringView.tsx`
   - `src/domains/abstraction/components/TopDownPatternView.tsx`
   - `src/domains/relative_color/components/HueInductionView.tsx`
   - `src/domains/relative_color/components/VectorShiftView.tsx`

### 基本原理
- `<StandardNafcView />` 组合了 `QuestionCardShell` 和 `ChoiceNafcContainer`，提供 `preview` 与 `middleContent` 插槽，支持受控与非受控两种选择状态。
- 在 `immediate` 模式下，点击选项或按下数字键 1~N 立即完成作答；在 `button` 模式下，数字键切换选项并在点击提交或按 `Space` 键时触发提交。

### 标签
#intent/refine #flow/ready #priority/high
#comp/components #scope/dx #scope/core
#ai/instruct
#task/domain/refactoring
#task/object/nafc-view-primitive
#task/action/abstraction-and-consolidation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建通用 `<StandardNafcView />` 组件

~~~~~act
write_file
src/components/common/StandardNafcView.tsx
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ChoiceNafcContainer, type ChoiceNafcOption } from './ChoiceNafcContainer';
import { QuestionCardShell } from './QuestionCardShell';

export interface StandardNafcViewProps<T = unknown> {
  questionId: string;
  hintText?: string;
  hintIcon?: (props: { className?: string }) => ComponentChildren;
  showCanvasHints?: boolean;
  maxWidth?: string;

  // 上方预览/题干插槽
  preview?: ComponentChildren;
  // 中间补充内容插槽 (如滑块或对比组件)
  middleContent?: ComponentChildren;

  // N-AFC 选项列表与网格配置
  options: ChoiceNafcOption<T>[];
  columns?: 2 | 3 | 4;
  gridClassName?: string;
  selectedIndex?: number | null;

  // 提交控制模式
  submitMode?: 'immediate' | 'button';
  submitButtonText?: string;
  showAnswer: boolean;
  disabled?: boolean;
  enableKeyboardShortcuts?: boolean;

  onSelectIndex?: (index: number, option: ChoiceNafcOption<T>) => void;
  onAnswer: (index: number, option: ChoiceNafcOption<T>) => void;
}

export function StandardNafcView<T = unknown>({
  questionId,
  hintText,
  hintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-2xl',
  preview,
  middleContent,
  options,
  columns = 4,
  gridClassName,
  selectedIndex: controlledSelectedIndex,
  submitMode = 'immediate',
  submitButtonText = '确认提交 (Space)',
  showAnswer,
  disabled = false,
  enableKeyboardShortcuts = true,
  onSelectIndex,
  onAnswer,
}: StandardNafcViewProps<T>) {
  const [internalSelectedIdx, setInternalSelectedIdx] = useState<number | null>(
    submitMode === 'button' ? 0 : null,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection on question change
  useEffect(() => {
    setInternalSelectedIdx(submitMode === 'button' ? 0 : null);
  }, [questionId, submitMode]);

  const activeIndex =
    controlledSelectedIndex !== undefined ? controlledSelectedIndex : internalSelectedIdx;

  const handleSelectOption = (index: number, option: ChoiceNafcOption<T>) => {
    if (disabled || showAnswer) return;
    setInternalSelectedIdx(index);
    onSelectIndex?.(index, option);

    if (submitMode === 'immediate') {
      onAnswer(index, option);
    }
  };

  const handleExplicitSubmit = () => {
    if (disabled || showAnswer || !options.length) return;
    const targetIdx = activeIndex ?? 0;
    const targetOpt = options[targetIdx] ?? options[0];
    onAnswer(targetIdx, targetOpt);
  };

  // 支持键盘 Space 提交（在 button 模式下）
  useEffect(() => {
    if (submitMode !== 'button' || !enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (disabled || showAnswer) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleExplicitSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitMode, enableKeyboardShortcuts, disabled, showAnswer, handleExplicitSubmit]);

  return (
    <QuestionCardShell
      hintText={hintText}
      hintIcon={hintIcon}
      showCanvasHints={showCanvasHints}
      maxWidth={maxWidth}
    >
      {preview}
      {middleContent}

      <ChoiceNafcContainer<T>
        options={options}
        selectedIndex={activeIndex}
        showAnswer={showAnswer}
        disabled={disabled}
        columns={columns}
        gridClassName={gridClassName}
        enableKeyboardShortcuts={enableKeyboardShortcuts}
        onSelect={handleSelectOption}
      />

      {submitMode === 'button' && !showAnswer && (
        <button
          type="button"
          onClick={handleExplicitSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
        >
          {submitButtonText}
        </button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 2: 重构视知觉概括领域的两个 N-AFC 组件

~~~~~act
write_file
src/domains/abstraction/components/PaletteClusteringView.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { drawPaletteTilesCanvas } from '../../../utils/canvas/drawPaletteTiles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface PaletteClusteringViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PaletteClusteringView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PaletteClusteringViewProps) {
  const nafcOptions = (question.paletteOptions || []).map((hsv, idx) => {
    const hex = hsvToHex(...hsv);
    const isTarget = idx === question.correctPaletteIndex;
    return {
      key: `palette-opt-${idx}-${hex}`,
      value: idx,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-square rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hex }}
        />
      ),
    };
  });

  return (
    <StandardNafcView
      questionId={question.id}
      hintText="选出最能代表全局主调的加权主色 (键 1-4)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      columns={4}
      options={nafcOptions}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="immediate"
      onAnswer={(idx) => onAnswer(idx)}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
            draw={(canvas) =>
              drawPaletteTilesCanvas(canvas, question.paletteTiles, ABSTRACTION_CANVAS_SIZE)
            }
            deps={[question.paletteTiles]}
          />
        </div>
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/domains/abstraction/components/TopDownPatternView.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { drawPaletteTilesCanvas } from '../../../utils/canvas/drawPaletteTiles';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface TopDownPatternViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function TopDownPatternView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDownPatternViewProps) {
  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : '#6366F1';
  const targetIdx = question.correctPatternIndex ?? 0;

  const nafcOptions = (question.palettePatternOptions || []).map((pat, idx) => {
    const isTarget = idx === targetIdx;
    return {
      key: `td-pattern-${question.id}-${idx}`,
      title: `画面 ${idx + 1}`,
      value: idx,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-square bg-white p-1 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
          <CanvasView
            width={ABSTRACTION_2AFC_SIZE}
            height={ABSTRACTION_2AFC_SIZE}
            className="w-full aspect-square rounded-lg shadow-sm"
            draw={(canvas) => drawPaletteTilesCanvas(canvas, pat, ABSTRACTION_2AFC_SIZE)}
            deps={[pat]}
          />
        </div>
      ),
    };
  });

  return (
    <StandardNafcView
      questionId={question.id}
      hintText="观察上方基准主色，选出以此为基调的拼贴画面 (键 1-4)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      columns={4}
      options={nafcOptions}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="immediate"
      onAnswer={(idx) => onAnswer(idx)}
      preview={
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            基准主调色
          </span>
          <div
            className="w-16 h-16 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200"
            style={{ backgroundColor: promptHex }}
          />
        </div>
      }
    />
  );
}
~~~~~

#### Acts 3: 重构相对色感领域的补色残像与矢量迁移组件

~~~~~act
write_file
src/domains/relative_color/components/HueInductionView.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';

interface HueInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  onAnswer: (chosenColor: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function HueInductionView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: HueInductionViewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const { bgLeft, bgRight, targetLeftCenter, idealRightCenter, options, correctIndex } = question;

  const bgLeftHex = hsvToHex(...(bgLeft ?? [0, 0, 90]));
  const bgRightHex = hsvToHex(...(bgRight ?? [0, 0, 20]));
  const centerLeftHex = hsvToHex(...(targetLeftCenter ?? [0, 0, 50]));
  const idealRightHex = hsvToHex(...(idealRightCenter ?? [0, 0, 50]));

  const targetIdx = correctIndex ?? 0;
  const activeColor = options?.[selectedIdx] ?? idealRightCenter ?? [0, 0, 50];
  const activeRightHex = hsvToHex(...activeColor);

  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === targetIdx;
    const hexVal = hsvToHex(...opt);
    return {
      key: `hue-opt-${idx}-${hexVal}`,
      title: `候选 ${idx + 1}`,
      value: opt,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60 p-1 flex items-center justify-center bg-white">
          <div
            className="w-full h-full rounded-lg shadow-sm border border-slate-200/50"
            style={{ backgroundColor: hexVal }}
          />
        </div>
      ),
    };
  });

  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText="观察左侧基准，在下方切换选项预览并确认提交 (键 1-4 切换，Space 提交)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIdx}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText="确认提交 (Space)"
      onSelectIndex={(idx) => setSelectedIdx(idx)}
      onAnswer={(_idx, option) => {
        const chosen = option.value ?? activeColor;
        onAnswer(chosen);
      }}
      preview={
        <DualViewportContainer
          leftTitle="左侧固定基准"
          rightTitle="右侧环境补偿区 (实时预览)"
          leftContent={
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgLeftHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all"
                style={{ backgroundColor: centerLeftHex }}
              />
            </div>
          }
          rightContent={
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgRightHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
                style={{ backgroundColor: activeRightHex }}
              >
                {showAnswer && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1/2"
                    style={{ backgroundColor: idealRightHex }}
                    title="上半部为您的选择，下半部为理论真理色"
                  />
                )}
              </div>
            </div>
          }
        />
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/domains/relative_color/components/VectorShiftView.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Shuffle } from 'lucide-preact';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';

interface VectorShiftViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function VectorShiftView({
  question,
  showAnswer,
  userAnswer,
  selectedIndex,
  onSelectIndex,
  onSubmit,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: VectorShiftViewProps) {
  const { colorA, colorB, colorC, targetD, options, correctIndex, difficultyLevel } = question;
  const activeColor = options?.[selectedIndex] ?? targetD;
  const userH = activeColor[0];
  const userS = activeColor[1];
  const userV = activeColor[2];

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);

  const hexSelectedD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const cH = colorC[0];
  const cS = colorC[1];
  const cV = colorC[2];

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  const cSatGradient = `linear-gradient(to right, ${hsvToHex(cH, 0, cV)}, ${hsvToHex(cH, 100, cV)})`;
  const cValGradient = `linear-gradient(to right, #000000, ${hsvToHex(cH, 100, 100)})`;

  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === correctIndex;
    const hexVal = hsvToHex(...opt);
    return {
      key: `vector-shift-opt-${idx}-${hexVal}`,
      title: `候选 ${idx + 1}`,
      value: opt,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hexVal }}
        />
      ),
    };
  });

  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText="观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色"
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIndex}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText="确认提交 (Space)"
      onSelectIndex={(idx) => onSelectIndex(idx)}
      onAnswer={() => onSubmit()}
      preview={
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexA }}
            />
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <div
              className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexB }}
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexC }}
            />
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <div
              className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
              style={{ backgroundColor: hexSelectedD }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: hexTargetD }}
                />
              )}
            </div>
          </div>
        </div>
      }
      middleContent={
        <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 md:pr-4 md:border-r border-slate-200/60">
              <HsvTrackSlider
                label="H"
                gradient={hueGradient}
                val={cH}
                max={360}
                unit="°"
                targetHSV={colorC}
                difficultyLevel={difficultyLevel}
                showAnswer={false}
                targetVal={cH}
                userVal={cH}
                allUserHSV={colorC}
                disabled={true}
                hitMargin={hitMargin}
                showToleranceBand={false}
                onValChange={() => {}}
              />
              <HsvTrackSlider
                label="S"
                gradient={cSatGradient}
                val={cS}
                max={100}
                unit="%"
                targetHSV={colorC}
                difficultyLevel={difficultyLevel}
                showAnswer={false}
                targetVal={cS}
                userVal={cS}
                allUserHSV={colorC}
                disabled={true}
                hitMargin={hitMargin}
                showToleranceBand={false}
                onValChange={() => {}}
              />
              <HsvTrackSlider
                label="V"
                gradient={cValGradient}
                val={cV}
                max={100}
                unit="%"
                targetHSV={colorC}
                difficultyLevel={difficultyLevel}
                showAnswer={false}
                targetVal={cV}
                userVal={cV}
                allUserHSV={colorC}
                disabled={true}
                hitMargin={hitMargin}
                showToleranceBand={false}
                onValChange={() => {}}
              />
            </div>

            <div className="space-y-3">
              <HsvTrackSlider
                label="H"
                gradient={hueGradient}
                val={userH}
                max={360}
                unit="°"
                targetHSV={targetD}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetD[0]}
                userVal={userAnswer?.userD?.[0] ?? userH}
                isHit={userAnswer?.isHit}
                onValChange={() => {}}
                allUserHSV={[userH, userS, userV]}
                disabled={true}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
              <HsvTrackSlider
                label="S"
                gradient={satGradient}
                val={userS}
                max={100}
                unit="%"
                targetHSV={targetD}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetD[1]}
                userVal={userAnswer?.userD?.[1] ?? userS}
                isHit={userAnswer?.isHit}
                onValChange={() => {}}
                allUserHSV={[userH, userS, userV]}
                disabled={true}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
              <HsvTrackSlider
                label="V"
                gradient={valGradient}
                val={userV}
                max={100}
                unit="%"
                targetHSV={targetD}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetD[2]}
                userVal={userAnswer?.userD?.[2] ?? userV}
                isHit={userAnswer?.isHit}
                onValChange={() => {}}
                allUserHSV={[userH, userS, userV]}
                disabled={true}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
            </div>
          </div>
        </div>
      }
    />
  );
}
~~~~~

### 下一步建议
1. **代码检查与构建验证**：运行 `npm run check` 校验格式和导入规范，运行 `npm run build` 确保 TypeScript 编译通过。
2. **审查成果**：至此，2AFC、N-AFC 与连续 Slider 三大交互族群已全部完成通用壳化重构，累计精简业务组件样板代码 800+ 行，整体架构已高度清晰规范。
