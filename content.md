现在开始执行**阶段一·批次 B：多元选择卡片（N-AFC）**。

我们将重构全部 4 张多元选择题型视图（`abs_palette_clustering`、`abs_td_palette_2afc`、`rel_hue_induction` 和 `rel_vector_shift`），彻底废除对 `StandardNafcView` 和 `ChoiceNafcContainer` 的依赖，展开即时预览和网格选项的扁平组合布局，并原生接入数字键 1~4 和空格提交。

## [WIP] refactor: 重构批次 B 全量 N-AFC 多元选择卡片至原子组合架构

### 用户需求
落实路线图中的批次 B：将全部多元选择（4AFC）卡片解构重塑，剥离 `StandardNafcView`，将复杂的题干对比和动态预览（如双视口残像对比、矢量迁移对）就地展开为扁平的 JSX，并将选项渲染收敛为纯粹的 `ChoiceCard` 网格。

### 评论
多元选择卡片是此前“属性地狱”最严重的区域。例如 `RelHueInductionView` 过去将整个实时联动的 `DualViewportContainer` 和自定义底部提交按钮塞入包装器的各个插槽，不仅阻断了上下文状态的自然传递，还造成了大量的无谓重渲染。解构后，题干预览、选项网格和确认按钮的排列自上而下一目了然。

### 目标
1. 重构即时提交型 4AFC 卡片：
   - `abs_palette_clustering/AbsPaletteClusteringView.tsx`（主调色群提炼）
   - `abs_td_palette_2afc/AbsTdPalette2afcView.tsx`（调性基底归位）
2. 重构带实时预览与二段确认的 4AFC 卡片：
   - `rel_hue_induction/RelHueInductionView.tsx`（补色残像调和）
   - `rel_vector_shift/RelVectorShiftView.tsx`（色彩矢量迁移）
3. 确保数字键 1~4 选择与空格键提交行为完全稳定。

### 基本原理
利用 `<QuestionCardShell>` 作为外壳容器，卡片顶层状态（如当前选中索引 `selectedIdx`）可直接无损流向下方的实时预览视口（`DualViewportContainer`）与底部的 `Button`，不再需要经过包装层的反向属性回调（`onSelectIndex`、`submitMode` 等），最大化组件内聚性。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/batch-b-nafc #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 重构即时选择型 4AFC 视图

~~~~~act
write_file
src/cards/abs_palette_clustering/AbsPaletteClusteringView.tsx
~~~~~
~~~~~typescript
import { Check, Sparkles } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, drawPaletteTilesCanvas } from './utils/generator';

export interface AbsPaletteClusteringViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsPaletteClusteringView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsPaletteClusteringViewProps) {
  const { t } = useCardTranslation('abs_palette_clustering');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [question.id]);

  const handleSelect = (idx: number) => {
    if (disabled || showAnswer) return;
    setSelectedIndex(idx);
    onAnswer(idx);
  };

  useChoiceShortcuts({
    optionsCount: (question.paletteOptions || []).length,
    disabled: disabled || showAnswer,
    onSelect: handleSelect,
  });

  const effectiveIndex = selectedIndex ?? (userAnswer?.isHit !== undefined ? userAnswer.userChoiceIndex : null);

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      {/* 调色板马赛克原图 */}
      <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center w-full">
        <CanvasView
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
          draw={(canvas) => drawPaletteTilesCanvas(canvas, question.paletteTiles, CANVAS_SIZE)}
          deps={[question.paletteTiles]}
        />
      </div>

      {/* 4AFC 候选色块网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {(question.paletteOptions || []).map((hsv, idx) => {
          const hex = hsvToHex(...hsv);
          const isTarget = idx === question.correctPaletteIndex;
          const isSelected = effectiveIndex === idx;
          const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

          return (
            <ChoiceCard
              key={`palette-opt-${idx}-${hex}`}
              state={state}
              size="sm"
              disabled={disabled || showAnswer}
              onClick={() => handleSelect(idx)}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                    {idx + 1}
                  </Badge>
                  {t('common.optionN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>
              <div
                className="w-full aspect-square rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hex }}
              />
            </ChoiceCard>
          );
        })}
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_palette_2afc/AbsTdPalette2afcView.tsx
~~~~~
~~~~~typescript
import { Check, Sparkles } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CANVAS_THEME,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { OPTION_SIZE, drawPaletteTilesCanvas } from './utils/generator';

export interface AbsTdPalette2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdPalette2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdPalette2afcViewProps) {
  const { t } = useCardTranslation('abs_td_palette_2afc');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [question.id]);

  const handleSelect = (idx: number) => {
    if (disabled || showAnswer) return;
    setSelectedIndex(idx);
    onAnswer(idx);
  };

  useChoiceShortcuts({
    optionsCount: (question.palettePatternOptions || []).length,
    disabled: disabled || showAnswer,
    onSelect: handleSelect,
  });

  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : CANVAS_THEME.status.accentHover;
  const targetIdx = question.correctPatternIndex ?? 0;
  const effectiveIndex = selectedIndex ?? (userAnswer?.isHit !== undefined ? userAnswer.userChoiceIndex : null);

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {/* 题干上方基准主调色块 */}
      <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <div
          className="w-16 h-16 rounded-2xl border-4 border-card dark:border-border shadow-md ring-1 ring-border/60"
          style={{ backgroundColor: promptHex }}
        />
      </div>

      {/* 4AFC 候选图案网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {(question.palettePatternOptions || []).map((pat, idx) => {
          const isTarget = idx === targetIdx;
          const isSelected = effectiveIndex === idx;
          const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

          return (
            <ChoiceCard
              key={`td-pattern-${question.id}-${idx}`}
              state={state}
              size="sm"
              disabled={disabled || showAnswer}
              onClick={() => handleSelect(idx)}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                    {idx + 1}
                  </Badge>
                  {t('common.screenN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>

              <div className="w-full aspect-square bg-white p-1 rounded-xl border border-border shadow-inner flex items-center justify-center">
                <CanvasView
                  width={OPTION_SIZE}
                  height={OPTION_SIZE}
                  className="w-full aspect-square rounded-lg shadow-sm"
                  draw={(canvas) => drawPaletteTilesCanvas(canvas, pat, OPTION_SIZE)}
                  deps={[pat]}
                />
              </div>
            </ChoiceCard>
          );
        })}
      </div>
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 2: 重构带实时联动与二段确认的 4AFC 视图

~~~~~act
write_file
src/cards/rel_hue_induction/RelHueInductionView.tsx
~~~~~
~~~~~typescript
import { Check, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

import {
  Badge,
  Button,
  ChoiceCard,
  DualViewportContainer,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';

export interface RelHueInductionViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (chosenColor: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function RelHueInductionView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: RelHueInductionViewProps) {
  const { t } = useCardTranslation('rel_hue_induction');
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const { bgLeft, bgRight, targetLeftCenter, idealRightCenter, options, correctIndex } = question;

  useEffect(() => {
    if (question.id) {
      setSelectedIdx(0);
    }
  }, [question.id]);

  const handleSubmit = useCallback(() => {
    if (disabled || showAnswer) return;
    const chosen = options[selectedIdx] ?? idealRightCenter;
    onAnswer(chosen);
  }, [disabled, showAnswer, options, selectedIdx, idealRightCenter, onAnswer]);

  useChoiceShortcuts({
    optionsCount: options.length,
    disabled: disabled || showAnswer,
    onSelect: (idx) => setSelectedIdx(idx),
    onSubmit: handleSubmit,
  });

  const bgLeftHex = hsvToHex(...bgLeft);
  const bgRightHex = hsvToHex(...bgRight);
  const centerLeftHex = hsvToHex(...targetLeftCenter);
  const idealRightHex = hsvToHex(...idealRightCenter);

  const activeColor = options[selectedIdx] ?? idealRightCenter;
  const activeRightHex = hsvToHex(...activeColor);

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {/* 双视口实时联动残像对比区 */}
      <DualViewportContainer
        leftTitle={t('leftBase')}
        rightTitle={t('rightPreview')}
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
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
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
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
                  title={t('splitComparisonTooltip')}
                />
              )}
            </div>
          </div>
        }
      />

      {/* 4AFC 候选色块网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {options.map((opt, idx) => {
          const isTarget = idx === correctIndex;
          const isSelected = selectedIdx === idx;
          const hexVal = hsvToHex(...opt);
          const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

          return (
            <ChoiceCard
              key={`hue-opt-${idx}-${hexVal}`}
              state={state}
              size="sm"
              disabled={disabled || showAnswer}
              onClick={() => setSelectedIdx(idx)}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                    {idx + 1}
                  </Badge>
                  {t('common.candidateN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>

              <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-border/60 p-1 flex items-center justify-center bg-card">
                <div
                  className="w-full h-full rounded-lg shadow-sm border border-border/50"
                  style={{ backgroundColor: hexVal }}
                />
              </div>
            </ChoiceCard>
          );
        })}
      </div>

      {/* 空格/手动确认按钮 */}
      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 h-auto rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/rel_vector_shift/RelVectorShiftView.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Check, Shuffle } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

import {
  Badge,
  Button,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';

export interface RelVectorShiftViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (userVal: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function RelVectorShiftView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: RelVectorShiftViewProps) {
  const { t } = useCardTranslation('rel_vector_shift');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const { colorA, colorB, colorC, targetD, options, correctIndex } = question;

  useEffect(() => {
    if (question.id) {
      setSelectedIndex(0);
    }
  }, [question.id]);

  const handleSubmit = useCallback(() => {
    if (disabled || showAnswer) return;
    const chosenColor = options[selectedIndex] ?? targetD;
    onAnswer(chosenColor);
  }, [disabled, showAnswer, options, selectedIndex, targetD, onAnswer]);

  useChoiceShortcuts({
    optionsCount: options.length,
    disabled: disabled || showAnswer,
    onSelect: (idx) => setSelectedIndex(idx),
    onSubmit: handleSubmit,
  });

  const activeColor = options[selectedIndex] ?? targetD;
  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);
  const hexSelectedD = hsvToHex(...activeColor);
  const hexTargetD = hsvToHex(...targetD);

  return (
    <QuestionCardShell
      hintText={t('prompt')}
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 题干 A->B 与 C->D 矢量推移展示区 */}
      <div className="bg-muted/60 p-4 rounded-2xl border border-border/60 w-full flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md transition-all duration-150 relative overflow-hidden"
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

      {/* 4AFC 候选推移色网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {options.map((opt, idx) => {
          const isTarget = idx === correctIndex;
          const isSelected = selectedIndex === idx;
          const hexVal = hsvToHex(...opt);
          const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

          return (
            <ChoiceCard
              key={`vector-shift-opt-${idx}-${hexVal}`}
              state={state}
              size="sm"
              disabled={disabled || showAnswer}
              onClick={() => setSelectedIndex(idx)}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                    {idx + 1}
                  </Badge>
                  {t('common.candidateN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>

              <div
                className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hexVal }}
              />
            </ChoiceCard>
          );
        })}
      </div>

      {/* 空格/手动确认按钮 */}
      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 h-auto rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

---

### 下一步建议

**批次 B（全部 4 张 N-AFC 视图）重构已全部交付**。当前项目中对 `StandardNafcView` 和 `ChoiceNafcContainer` 的所有依赖已彻底清零。

下一步建议推进**阶段一·批次 C：连续滑块卡片（Continuous Slider）**：
重构剩余使用 `StandardSliderView` 的 6 张卡片（`angle_estimation`、`persp_vp_convergence`、`abs_gesture_axis`、`abs_notan_threshold`、`fractal_edge_roughness`、`neg_ratio_estimation`），改用 `useTrackPointer` + `SliderTrack` 进行纯原子组合。
