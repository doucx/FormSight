import { Compass } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import { SLIDER_COMMON_SCHEMAS } from '../_shared/schemas';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { EstimationView } from './EstimationView';

export const angleEstimationCard: CardManifest<
  AngleQuestionData,
  AngleHitResult,
  number,
  BaseModuleSettings
> = {
  id: 'angle_estimation',
  groupId: 'angle',
  mode: 'ANGLE_ESTIMATION',
  icon: Compass,
  tags: {
    domain: ['form_and_proportion'],
    path: ['absolute_estimation'],
    interaction: ['continuous_mod'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: SLIDER_COMMON_SCHEMAS,
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  locales: {
    'zh-CN': {
      title: '夹角大小估算',
      desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。',
      instruction: '观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)',
      badge: '夹角大小估算',
      settings: {
        showToleranceBandTitle: '显示容错带范围',
        showToleranceBandDesc: '在滑块轨道上直观展示当前难度下的容错区间色带',
      },
    },
    'en-US': {
      title: 'Angle Estimation',
      desc: 'Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).',
      instruction: 'Observe the two rays and adjust the slider to match the true angle (0°~180°).',
      badge: 'Angle Estimation',
      settings: {
        showToleranceBandTitle: 'Show Tolerance Band',
        showToleranceBandDesc: 'Visually highlight the accepted tolerance window on the slider track.',
      },
    },
  },
  training: {
    generateQuestion: (level) => generateAngleQuestion('ANGLE_ESTIMATION', level),
    evaluateAnswer: (userVal, q) => checkAngleHit(userVal, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal, mode) => ({
      mode,
      userAnswer: userVal,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <EstimationView
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
  },
};

export default angleEstimationCard;