import { Target } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsContract } from '../_shared/analytics';
import { generatePolarGridPoints } from '../_shared/gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM } from '../_shared/pointMath';
import { STAR_SCHEMAS } from '../_shared/schemas';
import { StarCanvasView, type StarQuestionPayload } from '../_shared/StarCanvasView';

export interface SingleStarQuestion extends StarQuestionPayload {
  mode: 'single';
}

export function generateSingleStarQuestion(
  level: number,
  settings: StarSettings,
): SingleStarQuestion {
  const id = `star_single_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = settings?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const anchorA: Point = { x: CX, y: CY };

  let angle = Math.floor(Math.random() * 360);
  if (settings.targetingMode === 'manual' && settings.manualTargetSectors?.length) {
    if (Math.random() < 0.7) {
      const chosenSector =
        settings.manualTargetSectors[Math.floor(Math.random() * settings.manualTargetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40;
      angle = Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }

  const distChoices = [60, 90, 120, 150, 180];
  const dist = distChoices[Math.floor(Math.random() * distChoices.length)];
  const rad = (angle * Math.PI) / 180;
  const targetB: Point = {
    x: Math.round((CX + dist * Math.cos(rad)) * 100) / 100,
    y: Math.round((CY + dist * Math.sin(rad)) * 100) / 100,
  };

  const distractorPoints = generatePolarGridPoints(
    anchorA,
    targetB,
    level,
    gridDim,
    randomRow,
    randomCol,
  );

  return {
    id,
    mode: 'single',
    anchorA,
    anchorC: null,
    targetB,
    difficultyLevel: level,
    distractorPoints,
    angleDegree: angle,
    distanceRatio: dist,
  };
}

export const SingleAnchorCard: CardManifest<
  SingleStarQuestion,
  { isHit: boolean; nearestGridPoint: Point; errorDistance: number; clickPoint: Point },
  Point,
  StarSettings
> = {
  id: 'star_single',
  domain: 'spatial_structure',
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
    'zh-CN': {
      title: '单锚点模式',
      desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
      instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
    },
    'en-US': {
      title: 'Single Anchor',
      desc: 'Single central anchor to evaluate polar angle and distance estimation.',
      instruction: 'Observe the target relative to the central anchor on the left, then locate it in the grid on the right.',
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateSingleStarQuestion(level, settings),
    evaluateAnswer: (clickPoint, q) => {
      const hitRes = evaluatePointGridHit(clickPoint, q.targetB, q.distractorPoints);
      return {
        isHit: hitRes.isHit,
        nearestGridPoint: hitRes.nearestGridPoint,
        errorDistance: hitRes.errorDistance,
        clickPoint,
      };
    },
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) =>
      StarCanvasView({
        question,
        showAnswer,
        userAnswer,
        onAnswer,
        disabled,
      }),
  },
  analytics: createStarAnalyticsContract('star_single'),
};

export default SingleAnchorCard;