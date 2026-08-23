import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { Point } from '../../types';
import type { BaseModuleSettings } from '../../utils/settings';
import {
  type PerspectiveHitResult,
  type PerspectiveMode,
  type PerspectiveQuestionData,
  checkPerspectiveHit,
  generatePerspectiveQuestion,
} from './utils/perspectiveUtils';
import { PerspectiveCanvas } from './views/PerspectiveCanvas';

export const perspectivePlugin: TrainingPlugin<
  PerspectiveQuestionData,
  PerspectiveHitResult,
  number | 'A' | 'B' | Point,
  BaseModuleSettings
> = {
  packId: 'perspective',
  title: '透视空间感知',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      VP_CONVERGENCE: '透视灭点汇聚',
      PROPORTION_DIVISION: '比例盲切划分',
      PROPORTION_MIGRATION: '空间比例角度迁移',
      GESTALT_CONTINUATION_2AFC: '格式塔完形断线',
      STRUCTURE_PROJECTION_3D: '3D 结构空间翻转',
    };
    return map[mode] || mode;
  },
  generateQuestion: (mode, level) => generatePerspectiveQuestion(mode as PerspectiveMode, level),
  evaluateAnswer: (userVal, q) => checkPerspectiveHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
    tolerance: hitResult.tolerance,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <PerspectiveCanvas
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
