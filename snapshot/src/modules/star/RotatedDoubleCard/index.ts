import { RotateCw } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsContract } from '../_shared/analytics';
import { generateBipolarGridPoints } from '../_shared/gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM, rotatePoint } from '../_shared/pointMath';
import { STAR_SCHEMAS } from '../_shared/schemas';
import { StarCanvasView, type StarQuestionPayload } from '../_shared/StarCanvasView';

export interface RotatedDoubleQuestion extends StarQuestionPayload {
  mode: 'double_r';
  rotationAngle: number;
}

export function generateRotatedDoubleQuestion(
  level: number,
  settings: StarSettings,
): RotatedDoubleQuestion {
  const id = `star_double_r_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
  const rotAngle = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];

  const center: Point = { x: 0, y: 0 };
  const rotatedA = rotatePoint({ x: baseAx, y: baseAy }, center, rotAngle);
  const rotatedC = rotatePoint({ x: baseCx, y: baseCy }, center, rotAngle);
  const rotatedB = rotatePoint({ x: px, y: py }, center, rotAngle);

  const anchorA: Point = {
    x: Math.round((rotatedA.x + CX) * 100) / 100,
    y: Math.round((rotatedA.y + CY) * 100) / 100,
  };
  const anchorC: Point = {
    x: Math.round((rotatedC.x + CX) * 100) / 100,
    y: Math.round((rotatedC.y + CY) * 100) / 100,
  };
  const targetB: Point = {
    x: Math.round((rotatedB.x + CX) * 100) / 100,
    y: Math.round((rotatedB.y + CY) * 100) / 100,
  };

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
    mode: 'double_r',
    anchorA,
    anchorC,
    targetB,
    difficultyLevel: level,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
}

export const RotatedDoubleCard: CardManifest<
  RotatedDoubleQuestion,
  { isHit: boolean; nearestGridPoint: Point; errorDistance: number; clickPoint: Point },
  Point,
  StarSettings
> = {
  id: 'star_double_r',
  domain: 'spatial_structure',
  groupId: 'star',
  icon: RotateCw,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    challenge: ['dimensional_translation'],
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
      title: '旋转双锚点',
      desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
      instruction: '观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位',
    },
    'en-US': {
      title: 'Rotated Double Anchors',
      desc: 'Tilted dual anchors to master complex rotated coordinate mapping.',
      instruction: 'Observe the rotated dual anchors on the left, then locate the target on the right.',
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateRotatedDoubleQuestion(level, settings),
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
  analytics: createStarAnalyticsContract('star_double_r'),
};

export default RotatedDoubleCard;