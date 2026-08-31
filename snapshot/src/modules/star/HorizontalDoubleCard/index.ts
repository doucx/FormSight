import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsContract } from '../_shared/analytics';
import { generateBipolarGridPoints } from '../_shared/gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM } from '../_shared/pointMath';
import { STAR_SCHEMAS } from '../_shared/schemas';
import { StarCanvasView, type StarQuestionPayload } from '../_shared/StarCanvasView';

export interface HorizontalDoubleQuestion extends StarQuestionPayload {
  mode: 'double_h';
}

export function generateHorizontalDoubleQuestion(
  level: number,
  settings: StarSettings,
): HorizontalDoubleQuestion {
  const id = `star_double_h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = settings?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];
  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];
  if (settings.targetingMode === 'manual' && settings.manualTargetSectors?.length) {
    if (Math.random() < 0.7) {
      const chosenSector =
        settings.manualTargetSectors[Math.floor(Math.random() * settings.manualTargetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        return Math.min(diff, 360 - diff) <= 22.5;
      });
      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;

  const anchorA: Point = { x: baseAx + CX, y: baseAy + CY };
  const anchorC: Point = { x: baseCx + CX, y: baseCy + CY };
  const targetB: Point = { x: px + CX, y: py + CY };

  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    level,
    gridDim,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    mode: 'double_h',
    anchorA,
    anchorC,
    targetB,
    difficultyLevel: level,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
  };
}

export const HorizontalDoubleCard: CardManifest<
  HorizontalDoubleQuestion,
  { isHit: boolean; nearestGridPoint: Point; errorDistance: number; clickPoint: Point },
  Point,
  StarSettings
> = {
  id: 'star_double_h',
  domain: 'spatial_structure',
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
    },
    'en-US': {
      title: 'Horizontal Double Anchors',
      desc: 'Horizontal dual anchors to train proportion and orthogonal projection intuition.',
      instruction: 'Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.',
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateHorizontalDoubleQuestion(level, settings),
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
      anchorC: q.anchorC ? [q.anchorC.x, q.anchorC.y] : undefined,
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
  analytics: createStarAnalyticsContract('star_double_h'),
};

export default HorizontalDoubleCard;