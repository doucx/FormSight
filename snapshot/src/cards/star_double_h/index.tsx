import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarDoubleHView } from './StarDoubleHView';
import { createStarDoubleHAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export const starDoubleHCard: CardManifest<QuestionData, HitResult, Point, StarSettings> = {
  id: 'star_double_h',
  domain: 'spatial_structure',
  icon: Crosshair,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: 'settings.gridSizeTitle',
      options: [
        { label: '2x2', value: 2 },
        { label: '3x3', value: 3 },
        { label: '4x4', value: 4 },
        { label: '5x5', value: 5 },
      ],
      gridCols: 'grid-cols-4',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: SECTOR_KEYS,
      gridCols: 'grid-cols-4',
    },
  ],
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) =>
      generateQuestion(level, {
        gridSize: settings.gridSize,
        targetingMode: settings.targetingMode,
        targetSectors: settings.manualTargetSectors,
      }),
    evaluateAnswer: (userPoint, question) => checkHit(userPoint, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      anchorC: [q.anchorC.x, q.anchorC.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [userVal.x, userVal.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <StarDoubleHView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarDoubleHAnalytics(),
  },
};

export default starDoubleHCard;