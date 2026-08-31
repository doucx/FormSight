import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsViews } from '../_shared/analytics';
import { STAR_SCHEMAS } from '../_shared/schemas';
import type { StarHitResult } from '../_shared/types';
import { HorizontalDoubleView } from './HorizontalDoubleView';
import { type HorizontalDoubleQuestion, generateHorizontalDoubleQuestion } from './generator';

export const starDoubleHCard: CardManifest<
  HorizontalDoubleQuestion,
  StarHitResult,
  { clickPoint: Point; hitResult: StarHitResult },
  StarSettings
> = {
  id: 'star_double_h',
  groupId: 'star',
  icon: Crosshair,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    interaction: ['spatial_locate'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: STAR_SCHEMAS,
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  locales: {
    'zh-CN': {
      title: '水平双锚点',
      desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
      instruction: '观察左侧水平双锚点几何关系，在右侧点阵中盲打定位',
      badge: '水平双锚点',
    },
    'en-US': {
      title: 'Horizontal Double Anchors',
      desc: 'Horizontal dual anchors to train proportion and orthogonal projection intuition.',
      instruction:
        'Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.',
      badge: 'Horizontal Dual',
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateHorizontalDoubleQuestion(level, settings),
    evaluateAnswer: (userVal, q) =>
      evaluatePointGridHit(userVal.clickPoint, q.targetB, q.distractorPoints),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      anchorC: [q.anchorC.x, q.anchorC.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <HorizontalDoubleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarAnalyticsViews(),
  },
};

export default starDoubleHCard;
