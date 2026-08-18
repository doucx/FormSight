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
  evaluateAnswer: (userD, q, mode) => checkRelativeColorHit(mode as RelativeColorMode, userD, q),
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
  number | 'A' | 'B',
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) => (mode === 'AREA_COMPARISON_2AFC' ? '负形面积二分判别' : '负形占比估算'),
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
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
    />
  ),
};

// biome-ignore lint/suspicious/noExplicitAny: Plugin map holds heterogeneous plugin instances
export const TRAINING_PLUGINS: Record<TrainingDomain, TrainingPlugin<any, any, any, any>> = {
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};
