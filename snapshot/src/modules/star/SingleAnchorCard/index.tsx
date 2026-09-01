import { Target } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsViews } from '../_shared/analytics';
import { STAR_SCHEMAS } from '../_shared/schemas';
import type { StarHitResult } from '../_shared/types';
import { SingleAnchorView } from './SingleAnchorView';
import { type SingleAnchorQuestion, generateSingleAnchorQuestion } from './generator';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const starSingleCard: CardManifest<
  SingleAnchorQuestion,
  StarHitResult,
  { clickPoint: Point; hitResult: StarHitResult },
  StarSettings
> = {
  id: 'star_single',
  groupId: 'star',
  icon: Target,
  tags: {
    domain: ['spatial_structure'],
    path: ['absolute_estimation'],
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
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateSingleAnchorQuestion(level, settings),
    evaluateAnswer: (userVal, q) =>
      evaluatePointGridHit(userVal.clickPoint, q.targetB, q.distractorPoints),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <SingleAnchorView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarAnalyticsViews('star_single'),
  },
};

export default starSingleCard;