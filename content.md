修复 TypeScript 编译错误：删除未使用的导入，并解决 `src/config/plugins/index.ts` 中的 `isTargeting` 类型不兼容问题。

## [WIP] fix(build): 修复 TypeScript 编译错误与插件类型不兼容问题

### 用户需求
修复 `npm run build` 时遇到的 31 个 TypeScript 错误（包含未使用的导入及插件 `isTargeting` 的类型参数不匹配）。

### 评论
这些错误导致了 `tsc && vite build` 失败。我们需要清理未使用的导入，并对插件注册表中的类型进行调整或统一，使其满足 `AnyTrainingPlugin` 的类型约束。

### 目标
1. 移除 `src/components/abstraction/TopDown2AfcView.tsx` 中未使用的 `drawNotanNoiseField` 导入。
2. 移除 `src/utils/relativeColor/inductionMath.ts` 中未使用的 `hsvToOkLab` 导入。
3. 调整 `src/config/plugins/index.ts`（或相关的插件定义类型）以消除 `isTargeting` 参数类型的 `unknown` 赋值不兼容错误。

### 基本原理
- 未使用的导入直接删除。
- 对于 `src/config/plugins/index.ts` 的类型冲突，由于 `AnyTrainingPlugin` 期望接受 `unknown` 作为 settings 参数，而各个具体插件的 `isTargeting` 接收特定的 settings 类型（如 `BaseModuleSettings`, `StarSettings` 等），可以通过将 `TRAINING_PLUGINS` 和 `CARD_PLUGINS` 显式断言为 `Record<string, AnyTrainingPlugin>` 或调整 `AnyTrainingPlugin` 的定义来解决。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #scope/core #ai/instruct #task/domain/testing #task/object/typescript-errors #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 清理未使用的导入并调整插件类型映射

我们使用 `patch_file` 依次修复这三个文件。

~~~~~act
patch_file
src/components/abstraction/TopDown2AfcView.tsx
~~~~~
~~~~~typescript.old
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawNotanNoiseField, drawRawGrayscaleNoiseField } from '../../utils/canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../../utils/canvas/drawParticles';
~~~~~
~~~~~typescript.new
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawRawGrayscaleNoiseField } from '../../utils/canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../../utils/canvas/drawParticles';
~~~~~

~~~~~act
patch_file
src/utils/relativeColor/inductionMath.ts
~~~~~
~~~~~typescript.old
import { hsvToOkLab } from '../oklchUtils';

/**
 * 根据难度等级 (Level 1..35) 计算干扰项的绝对 OKLab 距离 Radius R
 */
~~~~~
~~~~~typescript.new
/**
 * 根据难度等级 (Level 1..35) 计算干扰项的绝对 OKLab 距离 Radius R
 */
~~~~~

~~~~~act
patch_file
src/config/plugins/index.ts
~~~~~
~~~~~typescript.old
export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  abstraction: abstractionPlugin,
  concretization: abstractionPlugin,
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};

export const CARD_PLUGINS: Record<string, AnyTrainingPlugin> = {
  star_single: starPlugin,
  star_double_h: starPlugin,
  star_double_r: starPlugin,
  color_hue: colorPlugin,
  color_val: colorPlugin,
  color_sat: colorPlugin,
  color_all: colorPlugin,
  rel_vector_shift: relativeColorPlugin,
  rel_lightness_induction: relativeColorPlugin,
  rel_hue_induction: relativeColorPlugin,
  rel_decontextual_2afc: relativeColorPlugin,
  neg_ratio_estimation: negativeSpacePlugin,
  neg_area_comparison_2afc: negativeSpacePlugin,
  neg_vertex_fitting: negativeSpacePlugin,
  neg_shape_match_2afc: negativeSpacePlugin,
  abs_gesture_axis: abstractionPlugin,
  abs_polygon_decimation: abstractionPlugin,
  abs_notan_threshold: abstractionPlugin,
  abs_palette_clustering: abstractionPlugin,
  abs_td_gesture_2afc: abstractionPlugin,
  abs_td_hull_2afc: abstractionPlugin,
  abs_td_notan_2afc: abstractionPlugin,
  abs_td_palette_2afc: abstractionPlugin,
};
~~~~~
~~~~~typescript.new
export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  abstraction: abstractionPlugin as unknown as AnyTrainingPlugin,
  concretization: abstractionPlugin as unknown as AnyTrainingPlugin,
  star: starPlugin as unknown as AnyTrainingPlugin,
  color: colorPlugin as unknown as AnyTrainingPlugin,
  relative_color: relativeColorPlugin as unknown as AnyTrainingPlugin,
  negative_space: negativeSpacePlugin as unknown as AnyTrainingPlugin,
};

export const CARD_PLUGINS: Record<string, AnyTrainingPlugin> = {
  star_single: starPlugin as unknown as AnyTrainingPlugin,
  star_double_h: starPlugin as unknown as AnyTrainingPlugin,
  star_double_r: starPlugin as unknown as AnyTrainingPlugin,
  color_hue: colorPlugin as unknown as AnyTrainingPlugin,
  color_val: colorPlugin as unknown as AnyTrainingPlugin,
  color_sat: colorPlugin as unknown as AnyTrainingPlugin,
  color_all: colorPlugin as unknown as AnyTrainingPlugin,
  rel_vector_shift: relativeColorPlugin as unknown as AnyTrainingPlugin,
  rel_lightness_induction: relativeColorPlugin as unknown as AnyTrainingPlugin,
  rel_hue_induction: relativeColorPlugin as unknown as AnyTrainingPlugin,
  rel_decontextual_2afc: relativeColorPlugin as unknown as AnyTrainingPlugin,
  neg_ratio_estimation: negativeSpacePlugin as unknown as AnyTrainingPlugin,
  neg_area_comparison_2afc: negativeSpacePlugin as unknown as AnyTrainingPlugin,
  neg_vertex_fitting: negativeSpacePlugin as unknown as AnyTrainingPlugin,
  neg_shape_match_2afc: negativeSpacePlugin as unknown as AnyTrainingPlugin,
  abs_gesture_axis: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_polygon_decimation: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_notan_threshold: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_palette_clustering: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_td_gesture_2afc: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_td_hull_2afc: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_td_notan_2afc: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_td_palette_2afc: abstractionPlugin as unknown as AnyTrainingPlugin,
};
~~~~~
