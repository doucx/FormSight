## [WIP] 将 `src/config/trainingPlugins.tsx` 巨石文件拆分重构到 `src/config/plugins/` 目录下

~~~~~act
run_command
~~~~~
~~~~~
mkdir -p src/config/plugins
touch src/config/plugins/starPlugin.tsx src/config/plugins/colorPlugin.tsx src/config/plugins/relativeColorPlugin.tsx src/config/plugins/negativeSpacePlugin.tsx src/config/plugins/abstractionPlugin.tsx src/config/plugins/index.ts
~~~~~

~~~~~act
write_file
src/config/plugins/starPlugin.tsx
~~~~~
~~~~~tsx
import type { HitResult, Point, QuestionData } from '../../types';
import type { StarSettings } from '../../utils/settings';
import { StarCanvas } from '../../components/StarCanvas';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../../utils/geometry';
import type { TrainingPlugin } from '../trainingPlugins';

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
    return generateQuestion(mode as any, level, opts);
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
      userAnswer={
        userAnswer ? { clickPoint: userAnswer.nearestGridPoint, hitResult: userAnswer } : null
      }
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
~~~~~

~~~~~act
write_file
src/config/plugins/colorPlugin.tsx
~~~~~
~~~~~tsx
import { ColorCanvas } from '../../components/ColorCanvas';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../../utils/colorUtils';
import type { ColorSenseSettings } from '../../utils/settings';
import type { TrainingPlugin } from '../trainingPlugins';

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
~~~~~

~~~~~act
write_file
src/config/plugins/relativeColorPlugin.tsx
~~~~~
~~~~~tsx
import { RelativeColorCanvas } from '../../components/RelativeColorCanvas';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../../utils/relativeColorUtils';
import type { RelativeColorSettings } from '../../utils/settings';
import type { TrainingPlugin } from '../trainingPlugins';

export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  domain: 'relative_color',
  title: '相对色感',
  getModeBadge: (mode) =>
    mode === 'LIGHTNESS_INDUCTION'
      ? '明度反差补偿'
      : mode === 'HUE_INDUCTION'
        ? '补色残像调和'
        : mode === 'DECONTEXTUAL_2AFC'
          ? '环境穿透判别'
          : '色彩矢量迁移',
  generateQuestion: (mode, level) =>
    generateRelativeColorQuestion(mode as RelativeColorMode, level),
  evaluateAnswer: (userVal, q, mode) =>
    checkRelativeColorHit(mode as RelativeColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'DECONTEXTUAL_2AFC') {
      return {
        mode,
        userChoice: userVal,
        correctChoice: q.largerPhysicalSide,
        physicalValueDiff: q.physicalValueDiff,
      };
    }
    if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        deltaEError: hitResult.deltaEError,
      };
    }
    return {
      mode: 'VECTOR_SHIFT',
      colorA: q.colorA,
      colorB: q.colorB,
      colorC: q.colorC,
      targetD: q.targetD,
      userD: userVal,
      deltaEError: hitResult.deltaEError,
    };
  },
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
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
~~~~~

~~~~~act
write_file
src/config/plugins/negativeSpacePlugin.tsx
~~~~~
~~~~~tsx
import { NegativeSpaceCanvas } from '../../components/NegativeSpaceCanvas';
import type { Point } from '../../types';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
} from '../../utils/negativeSpaceUtils';
import type { NegativeSpaceSettings } from '../../utils/settings';
import type { TrainingPlugin } from '../trainingPlugins';

export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'SHAPE_MATCH_2AFC'
          ? '负形轮廓记忆匹配'
          : '负形占比估算',
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
      return {
        mode: 'NEGATIVE_VERTEX_FITTING',
        targetVertexIndex: q.targetVertexIndex,
        targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
        userClick: hitResult.nearestGridPoint
          ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
          : undefined,
        errorPixelDistance: hitResult.errorValue,
      };
    }
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    if (mode === 'SHAPE_MATCH_2AFC') {
      return {
        mode: 'SHAPE_MATCH_2AFC',
        userChoice: userVal === 0 || userVal === 'A' ? 'A' : 'B',
        correctChoice: q.correctChoice,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
~~~~~

~~~~~act
write_file
src/config/plugins/abstractionPlugin.tsx
~~~~~
~~~~~tsx
import { AbstractionCanvas } from '../../components/AbstractionCanvas';
import {
  type AbstractionHitResult,
  type AbstractionMode,
  type AbstractionQuestionData,
  checkAbstractionHit,
  generateAbstractionQuestion,
} from '../../utils/abstractionUtils';
import type { BaseModuleSettings } from '../../utils/settings';
import type { TrainingPlugin } from '../trainingPlugins';

export const abstractionPlugin: TrainingPlugin<
  AbstractionQuestionData,
  AbstractionHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  domain: 'abstraction',
  title: '视知觉概括',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      GESTURE_AXIS: '动态势线提取',
      POLYGON_DECIMATION: '折线低模大形',
      NOTAN_THRESHOLD: '黑白素描归组',
      PALETTE_CLUSTERING: '主调色群提炼',
      TD_GESTURE_2AFC: '动态势线寻源',
      TD_HULL_2AFC: '几何大模寻形',
      TD_NOTAN_2AFC: '黑白素描骨架',
      TD_PALETTE_2AFC: '调性基底归位',
    };
    return map[mode] || mode;
  },
  generateQuestion: (mode, level) => generateAbstractionQuestion(mode as AbstractionMode, level),
  evaluateAnswer: (userVal, q) => checkAbstractionHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <AbstractionCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={(settings.sliderHitMargin as number) ?? 12}
      showToleranceBand={(settings.showToleranceBand as boolean) ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
~~~~~

~~~~~act
write_file
src/config/plugins/index.ts
~~~~~
~~~~~tsx
import type { TrainingDomain } from '../../utils/db';
import type { AnyTrainingPlugin } from '../trainingPlugins';
import { abstractionPlugin } from './abstractionPlugin';
import { colorPlugin } from './colorPlugin';
import { negativeSpacePlugin } from './negativeSpacePlugin';
import { relativeColorPlugin } from './relativeColorPlugin';
import { starPlugin } from './starPlugin';

export { starPlugin } from './starPlugin';
export { colorPlugin } from './colorPlugin';
export { relativeColorPlugin } from './relativeColorPlugin';
export { negativeSpacePlugin } from './negativeSpacePlugin';
export { abstractionPlugin } from './abstractionPlugin';

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

export function getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
  return CARD_PLUGINS[cardId];
}
~~~~~

~~~~~act
write_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~tsx
import type { ComponentChildren } from 'preact';
import type { TrainingDomain } from '../utils/db';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

export interface TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings> {
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

export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;

export * from './plugins';
~~~~~
我已成功将 `src/config/trainingPlugins.tsx` 巨石文件拆分重构到 `src/config/plugins/` 目录下，实现了各领域训练插件的完全解耦：

### 重构详情：
1. **插件目录新建 (`src/config/plugins/`)**：
   - `starPlugin.tsx`: 寻星练习（Star-Hopping）训练插件。
   - `colorPlugin.tsx`: 绝对色感（Color Recognition）训练插件。
   - `relativeColorPlugin.tsx`: 相对色感（Relative Color）训练插件。
   - `negativeSpacePlugin.tsx`: 正负形空间感知（Negative Space）训练插件。
   - `abstractionPlugin.tsx`: 视知觉概括（Visual Abstraction）训练插件。
   - `index.ts`: 统一注册并导出 `TRAINING_PLUGINS`、`CARD_PLUGINS` 以及 `getPluginByCardId` 查找函数。
2. **精简 `trainingPlugins.tsx`**：
   - 仅保留通用的 TypeScript 接口定义 (`TrainingCanvasProps`, `TrainingPlugin`) 与 `AnyTrainingPlugin` 类型，并通过 `export * from './plugins'` 向下兼容所有上层引用。
