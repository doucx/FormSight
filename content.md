现在开始实施滑块量程自适应特性。我们将在设置中提供“自适应滑块刻度”开关（默认启用），当用户选择特定角度区间（例如纯锐角 0°~90° 或特定扇区）时，滑块的最小值与最大值将自动贴合所选区间，从而让滑块的有效行程集中在目标角度内，提供双倍乃至更高的微调分辨率。

## [WIP] feat: 增加自适应滑块刻度支持以提升细分区间的估算微调精度

### 用户需求
当用户在设置中筛选特定角度范围（例如纯锐角 0°~90°、特定扇区）时，滑块能够自适应收缩其最大/最小量程（如 0°~90°），从而提高连续滑动的空间微调分辨率；同时允许通过设置开关保持标准的 0°~180° 全量程，兼顾绝对心理标尺需求。

### 评论
固定 0°~180° 量程在全角训练中能够建立直观的绝对夹角认知，但当用户专门聚焦在 0°~45° 或 0°~90° 等窄范围进行高精训练时，滑块有超过一半的区域闲置。通过引入自适应缩放并辅以配置开关，既满足了高灵敏度微调需求，又保留了全局模式下的统一度量感知。

### 目标
1. **工具函数扩展** (`generator.ts`)：增加 `getAngleRangeBounds` 计算选中区间组合的最小与最大边界值（如 `0°~90°`）。
2. **视图组件更新** (`AngleEstimationView.tsx`)：接收 `sliderMin` / `sliderMax`，将 `useTrackPointer` 与 `SliderTrack` 的动态范围绑定至计算边界，刻度标签自适应渲染，并在题目切换或量程变动时平滑复位初始值。
3. **设置面板与卡片注册** (`index.tsx`)：在 `AngleEstimationSettings` 中新增 `adaptiveSliderScale` 开关（默认 `true`），并在设置界面提供切换支持。
4. **国际化文本补充** (`locales/zh-CN.json`, `locales/en-US.json`)：补充自适应滑块刻度配置的中英文说明。

### 基本原理
根据当前启用的 `angleRanges` 集合，计算其在 0°~180° 坐标系下的外包围界限：
- 纯锐角预设（`['0_45', '45_90']`）的边界为 `[0, 90]`；
- 纯钝角预设（`['90_135', '135_180']`）的边界为 `[90, 180]`；
- 全范围或未启用自适应时，保持标准 `[0, 180]`。
将边界传递给 `useTrackPointer({ min, max })` 与 `SliderTrack min={min} max={max}`，滑块的百分比映射将完全适配新量程，同时刻度两端数值精确反映当前上下界。

### 标签
#intent/build #flow/ready #priority/high #comp/cards #concept/ui #concept/config #scope/ux #ai/delegate #task/domain/card #task/object/angle-estimation-slider-scaling #task/action/feature-addition #task/state/continue

---

### Script

#### Acts 1: 增加区间外包围界限计算函数

在 `generator.ts` 中新增 `getAngleRangeBounds`，用于从用户选择的区间组合计算滑块的标尺上下界。

~~~~~act
patch_file
src/cards/angle_estimation/utils/generator.ts
~~~~~
~~~~~typescript
const RANGE_BOUNDS: Record<AngleRangePreset, [number, number]> = {
  '0_45': [5, 45],
  '45_90': [45, 90],
  '90_135': [90, 135],
  '135_180': [135, 175],
};

const ALL_RANGES: AngleRangePreset[] = ['0_45', '45_90', '90_135', '135_180'];
~~~~~
~~~~~typescript
const RANGE_BOUNDS: Record<AngleRangePreset, [number, number]> = {
  '0_45': [5, 45],
  '45_90': [45, 90],
  '90_135': [90, 135],
  '135_180': [135, 175],
};

const RANGE_SCALE_BOUNDS: Record<AngleRangePreset, [number, number]> = {
  '0_45': [0, 45],
  '45_90': [45, 90],
  '90_135': [90, 135],
  '135_180': [135, 180],
};

const ALL_RANGES: AngleRangePreset[] = ['0_45', '45_90', '90_135', '135_180'];

export function getAngleRangeBounds(ranges?: AngleRangePreset[]): [number, number] {
  if (!ranges || ranges.length === 0 || ranges.length === 4) {
    return [0, 180];
  }
  let min = 180;
  let max = 0;
  for (const r of ranges) {
    const bounds = RANGE_SCALE_BOUNDS[r];
    if (bounds) {
      min = Math.min(min, bounds[0]);
      max = Math.max(max, bounds[1]);
    }
  }
  return min < max ? [min, max] : [0, 180];
}
~~~~~

#### Acts 2: 补充国际化文本

在配置词条中加入自适应刻度相关的多语言文案。

~~~~~act
patch_file
src/cards/angle_estimation/locales/zh-CN.json
~~~~~
~~~~~json
    "showToleranceBandDesc": "在滑块周围显示当前难度下的容错区间指示线",
    "angleRangesTitle": "目标角度生成范围",
~~~~~
~~~~~json
    "showToleranceBandDesc": "在滑块周围显示当前难度下的容错区间指示线",
    "adaptiveSliderScaleTitle": "自适应滑块刻度",
    "adaptiveSliderScaleDesc": "根据所选角度区间自动收缩滑块量程（如锐角时为 0°~90°），提升微调精度",
    "angleRangesTitle": "目标角度生成范围",
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/locales/en-US.json
~~~~~
~~~~~json
    "showToleranceBandDesc": "Display dynamic tolerance band around current slider position",
    "angleRangesTitle": "Target Angle Ranges",
~~~~~
~~~~~json
    "showToleranceBandDesc": "Display dynamic tolerance band around current slider position",
    "adaptiveSliderScaleTitle": "Adaptive Slider Range",
    "adaptiveSliderScaleDesc": "Scale slider bounds to fit active range (e.g. 0°~90° for acute angles) for higher precision",
    "angleRangesTitle": "Target Angle Ranges",
~~~~~

#### Acts 3: 更新 AngleEstimationView 组件

让 `AngleEstimationView` 接收 `sliderMin` / `sliderMax` 参数，并使 `useTrackPointer`、`SliderTrack` 及刻度文本同步动态缩放。

~~~~~act
patch_file
src/cards/angle_estimation/AngleEstimationView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';

import {
  CanvasView,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
import type { AngleEstimationHitResult, AngleEstimationQuestion } from './types';
import { ANGLE_CANVAS_SIZE, drawAngleCanvas } from './utils/generator';

export interface AngleEstimationViewProps {
  question: AngleEstimationQuestion;
  showAnswer: boolean;
  userAnswer: AngleEstimationHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AngleEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AngleEstimationViewProps) {
  const { t } = useCardTranslation('angle_estimation');
  const [currentVal, setCurrentVal] = useState<number>(90);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  CanvasView,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
import type { AngleEstimationHitResult, AngleEstimationQuestion } from './types';
import { ANGLE_CANVAS_SIZE, drawAngleCanvas } from './utils/generator';

export interface AngleEstimationViewProps {
  question: AngleEstimationQuestion;
  showAnswer: boolean;
  userAnswer: AngleEstimationHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
  sliderMin?: number;
  sliderMax?: number;
}

export function AngleEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
  sliderMin = 0,
  sliderMax = 180,
}: AngleEstimationViewProps) {
  const { t } = useCardTranslation('angle_estimation');
  const initialCenter = Math.round(((sliderMin + sliderMax) / 2) * 2) / 2;
  const [currentVal, setCurrentVal] = useState<number>(initialCenter);

  useEffect(() => {
    setCurrentVal(initialCenter);
  }, [question.id, sliderMin, sliderMax]);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    min: sliderMin,
    max: sliderMax,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/AngleEstimationView.tsx
~~~~~
~~~~~typescript
        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0°</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeVal}
            max={180}
            min={0}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetVal}
            userValue={userVal}
            tolerance={tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">180°</span>
        </div>
~~~~~
~~~~~typescript
        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">{sliderMin}°</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeVal}
            max={sliderMax}
            min={sliderMin}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetVal}
            userValue={userVal}
            tolerance={tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">{sliderMax}°</span>
        </div>
~~~~~

#### Acts 4: 更新卡片配置与自适应刻度设置

在 `index.tsx` 中增加 `adaptiveSliderScale` 设置项和界面开关，并在 `renderCanvas` 中根据设置计算并下发 `sliderMin` / `sliderMax`。

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript
import type {
  AngleEstimationHitResult,
  AngleEstimationQuestion,
  AngleRangePreset,
} from './types';
import { checkHit, generateQuestion } from './utils/generator';

const ALL_ANGLE_RANGES: AngleRangePreset[] = ['0_45', '45_90', '90_135', '135_180'];

export interface AngleEstimationSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  angleRanges?: AngleRangePreset[];
}
~~~~~
~~~~~typescript
import type {
  AngleEstimationHitResult,
  AngleEstimationQuestion,
  AngleRangePreset,
} from './types';
import { checkHit, generateQuestion, getAngleRangeBounds } from './utils/generator';

const ALL_ANGLE_RANGES: AngleRangePreset[] = ['0_45', '45_90', '90_135', '135_180'];

export interface AngleEstimationSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  angleRanges?: AngleRangePreset[];
  adaptiveSliderScale?: boolean;
}
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
    angleRanges: ['0_45', '45_90', '90_135', '135_180'],
  },
~~~~~
~~~~~typescript
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
    angleRanges: ['0_45', '45_90', '90_135', '135_180'],
    adaptiveSliderScale: true,
  },
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript
      return (
        <div className="space-y-4">
          <SettingToggleItem
            title={t('settings.showToleranceBandTitle')}
            description={t('settings.showToleranceBandDesc')}
            checked={(settings.showToleranceBand as boolean) ?? true}
            onChange={(val) => updateSettings({ showToleranceBand: val })}
          />

          <div className="space-y-2.5 pt-2 border-t border-border/65">
~~~~~
~~~~~typescript
      return (
        <div className="space-y-4">
          <SettingToggleItem
            title={t('settings.showToleranceBandTitle')}
            description={t('settings.showToleranceBandDesc')}
            checked={(settings.showToleranceBand as boolean) ?? true}
            onChange={(val) => updateSettings({ showToleranceBand: val })}
          />

          <SettingToggleItem
            title={t('settings.adaptiveSliderScaleTitle')}
            description={t('settings.adaptiveSliderScaleDesc')}
            checked={(settings.adaptiveSliderScale as boolean) ?? true}
            onChange={(val) => updateSettings({ adaptiveSliderScale: val })}
          />

          <div className="space-y-2.5 pt-2 border-t border-border/65">
>>>>>>
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AngleEstimationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings?.sliderHitMargin ?? 12}
        showToleranceBand={settings?.showToleranceBand ?? true}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => {
      const isAdaptive = settings.adaptiveSliderScale ?? true;
      const [sliderMin, sliderMax] = isAdaptive
        ? getAngleRangeBounds(settings.angleRanges)
        : [0, 180];

      return (
        <AngleEstimationView
          key={question.id}
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={onAnswer}
          disabled={disabled}
          hitMargin={settings?.sliderHitMargin ?? 12}
          showToleranceBand={settings?.showToleranceBand ?? true}
          showCanvasHints={settings.showCanvasHints as boolean}
          sliderMin={sliderMin}
          sliderMax={sliderMax}
        />
      );
    },
~~~~~

---

### 下一步建议
- **真机/浏览器微调体验验证**：在设置中分别切换为“纯锐角（0°~90°）”与“全角度（0°~180°）”，体验滑块在 0°~90° 量程下的灵敏度与分辨率提升，并核对结算时真实度数与误差计算的准确度。
- **Git 提交准备**：若交互与表现均符合预期，可随时安排提交该变更。
