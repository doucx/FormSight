import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { project3DTo2D } from './perspectiveCanvas';
import {
  PERSPECTIVE_2AFC_SIZE,
  PERSPECTIVE_CANVAS_SIZE,
  PerspectiveHitResult,
  PerspectiveMode,
  PerspectiveQuestionData,
  Point3D,
  ProportionTarget,
} from './perspectiveTypes';

const PROPORTION_PRESETS: ProportionTarget[] = [
  { name: '1/2', ratio: 0.5 },
  { name: '1/3', ratio: 1 / 3 },
  { name: '2/3', ratio: 2 / 3 },
  { name: '1/4', ratio: 0.25 },
  { name: '0.618', ratio: 0.618 },
];

export function generatePerspectiveQuestion(
  mode: PerspectiveMode,
  level: number,
): PerspectiveQuestionData {
  const id = `psp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  if (mode === 'VP_CONVERGENCE') {
    const vpDist = expDecayInterpolate(400, 1800, clampedLevel);
    const vpAngle = (Math.floor(Math.random() * 360) * Math.PI) / 180;
    const center = PERSPECTIVE_CANVAS_SIZE / 2;

    const dirX = Math.cos(vpAngle);
    const dirY = Math.sin(vpAngle);
    const perpX = -dirY;
    const perpY = dirX;

    const vpPoint: Point = {
      x: center + vpDist * dirX,
      y: center + vpDist * dirY,
    };

    const lineLength = 95;

    const getCenteredRay = (perpOffset: number, length = lineLength) => {
      const anchorX = center - dirX * (length * 0.5) + perpX * perpOffset;
      const anchorY = center - dirY * (length * 0.5) + perpY * perpOffset;
      const ang = Math.atan2(vpPoint.y - anchorY, vpPoint.x - anchorX);

      return {
        p1: { x: Math.round(anchorX * 10) / 10, y: Math.round(anchorY * 10) / 10 },
        p2: {
          x: Math.round((anchorX + length * Math.cos(ang)) * 10) / 10,
          y: Math.round((anchorY + length * Math.sin(ang)) * 10) / 10,
        },
      };
    };

    const refLine1 = getCenteredRay(-55);
    const refLine2 = getCenteredRay(55);
    const testRay = getCenteredRay(0);

    const testAnchor = testRay.p1;
    const targetRad = Math.atan2(vpPoint.y - testAnchor.y, vpPoint.x - testAnchor.x);
    const targetAngleDeg = Math.round((((targetRad * 180) / Math.PI + 360) % 360) * 10) / 10;
    const tolerance = Math.round(expDecayInterpolate(8.0, 0.6, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      vpPoint,
      referenceLines: [refLine1, refLine2],
      testLineAnchor: testAnchor,
      testLineLength: lineLength,
      targetAngleDeg,
      tolerance,
    };
  }

  if (mode === 'PROPORTION_DIVISION' || mode === 'PROPORTION_MIGRATION') {
    const isMigration = mode === 'PROPORTION_MIGRATION';

    let ratio: number;
    let ratioName: string | undefined;

    if (isMigration) {
      ratio = Math.round((Math.random() * 0.84 + 0.08) * 1000) / 1000;
      ratioName = `${(ratio * 100).toFixed(1)}%`;
    } else {
      const preset = PROPORTION_PRESETS[Math.floor(Math.random() * PROPORTION_PRESETS.length)];
      ratio = preset.ratio;
      ratioName = preset.name;
    }

    const angleRad = Math.random() * Math.PI * 2;
    const lineLen = 220;
    const center = PERSPECTIVE_CANVAS_SIZE / 2;

    const halfX = (lineLen / 2) * Math.cos(angleRad);
    const halfY = (lineLen / 2) * Math.sin(angleRad);

    const p1: Point = {
      x: Math.round(center - halfX),
      y: Math.round(center - halfY),
    };
    const p2: Point = {
      x: Math.round(center + halfX),
      y: Math.round(center + halfY),
    };

    const targetDivisionPoint: Point = {
      x: Math.round(p1.x + (p2.x - p1.x) * ratio),
      y: Math.round(p1.y + (p2.y - p1.y) * ratio),
    };

    const tolerance = Math.round(expDecayInterpolate(0.08, 0.015, clampedLevel) * 1000) / 1000;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      divisionLine: { p1, p2 },
      targetRatio: ratio,
      targetRatioName: ratioName,
      targetDivisionPoint,
      tolerance,
    };
  }

  if (mode === 'GESTALT_CONTINUATION_2AFC') {
    const center = PERSPECTIVE_2AFC_SIZE / 2;
    const obstacleType = Math.random() < 0.5 ? 'circle' : 'rect';
    const obstacleSize = 65;

    const obstacle = {
      type: obstacleType as 'circle' | 'rect',
      cx: center,
      cy: center,
      size: obstacleSize,
    };

    const lineAngle = (Math.random() * 80 + 10) * (Math.PI / 180);
    const dirX = Math.cos(lineAngle);
    const dirY = Math.sin(lineAngle);

    const inStart: Point = { x: center - 90 * dirX, y: center - 90 * dirY };
    const inEnd: Point = { x: center - 35 * dirX, y: center - 35 * dirY };
    const outStart: Point = { x: center + 35 * dirX, y: center + 35 * dirY };
    const outEnd: Point = { x: center + 90 * dirX, y: center + 90 * dirY };

    const parallelOffset = Math.round(expDecayInterpolate(20, 2.5, clampedLevel) * 10) / 10;
    const perpX = -dirY * parallelOffset;
    const perpY = dirX * parallelOffset;

    const distractorStart: Point = { x: outStart.x + perpX, y: outStart.y + perpY };
    const distractorEnd: Point = { x: outEnd.x + perpX, y: outEnd.y + perpY };

    const isACorrect = Math.random() < 0.5;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      obstacle,
      incomingLine: { p1: inStart, p2: inEnd },
      lineOptionA: isACorrect
        ? { p1: outStart, p2: outEnd }
        : { p1: distractorStart, p2: distractorEnd },
      lineOptionB: isACorrect
        ? { p1: distractorStart, p2: distractorEnd }
        : { p1: outStart, p2: outEnd },
      correctChoice: isACorrect ? 'A' : 'B',
      parallelOffset,
      tolerance: parallelOffset,
    };
  }

  // 4. STRUCTURE_PROJECTION_3D
  const gridDim3D = clampedLevel > 15 ? 4 : 3;
  const targetPoint3D: Point3D = {
    x: Math.floor(Math.random() * gridDim3D),
    y: Math.floor(Math.random() * gridDim3D),
    z: Math.floor(Math.random() * gridDim3D),
  };

  const center: Point = {
    x: PERSPECTIVE_CANVAS_SIZE / 2,
    y: PERSPECTIVE_CANVAS_SIZE / 2 + 10,
  };
  const scale = gridDim3D === 4 ? 42 : 55;

  const projectedGridPoints: Point[] = [];
  for (let x = 0; x < gridDim3D; x++) {
    for (let y = 0; y < gridDim3D; y++) {
      for (let z = 0; z < gridDim3D; z++) {
        projectedGridPoints.push(project3DTo2D({ x, y, z }, center, scale));
      }
    }
  }

  const targetProjectedPoint = project3DTo2D(targetPoint3D, center, scale);

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    gridDim3D,
    targetPoint3D,
    projectedGridPoints,
    targetProjectedPoint,
    tolerance: 0.5,
  };
}

export function checkPerspectiveHit(
  userVal: number | 'A' | 'B' | Point,
  question: PerspectiveQuestionData,
): PerspectiveHitResult {
  const { mode } = question;

  if (mode === 'VP_CONVERGENCE') {
    const userAngle = typeof userVal === 'number' ? userVal : 0;
    const targetAngle = question.targetAngleDeg ?? 0;
    const diff = Math.abs(userAngle - targetAngle);
    const errorVal = Math.min(diff, 360 - diff);
    const isHit = errorVal <= question.tolerance;

    return {
      isHit,
      userValue: userAngle,
      targetValue: targetAngle,
      errorValue: Math.round(errorVal * 10) / 10,
      tolerance: question.tolerance,
    };
  }

  if (mode === 'PROPORTION_DIVISION' || mode === 'PROPORTION_MIGRATION') {
    const clickPoint = userVal as Point;
    const line = question.divisionLine;
    if (!line) {
      return { isHit: false, errorValue: 1, tolerance: question.tolerance };
    }

    const dx = line.p2.x - line.p1.x;
    const dy = line.p2.y - line.p1.y;
    const lenSq = dx * dx + dy * dy;
    const t = ((clickPoint.x - line.p1.x) * dx + (clickPoint.y - line.p1.y) * dy) / lenSq;
    const clampedT = Math.max(0, Math.min(1, t));

    const targetT = question.targetRatio ?? 0.5;
    const errorT = Math.abs(clampedT - targetT);
    const isHit = errorT <= question.tolerance;

    return {
      isHit,
      userValue: clickPoint,
      targetValue: question.targetDivisionPoint,
      errorValue: Math.round(errorT * 1000) / 1000,
      tolerance: question.tolerance,
      ratioProgress: Math.round(clampedT * 1000) / 1000,
    };
  }

  if (mode === 'GESTALT_CONTINUATION_2AFC') {
    const choice = userVal as 'A' | 'B';
    const isHit = choice === question.correctChoice;

    return {
      isHit,
      userValue: choice,
      targetValue: question.correctChoice,
      errorValue: isHit ? 0 : 1,
      tolerance: question.tolerance,
    };
  }

  // STRUCTURE_PROJECTION_3D
  const clickPoint = userVal as Point;
  const target = question.targetProjectedPoint;
  const dist = target
    ? Math.sqrt((clickPoint.x - target.x) ** 2 + (clickPoint.y - target.y) ** 2)
    : 999;
  const isHit = dist <= 12;

  return {
    isHit,
    userValue: clickPoint,
    targetValue: target,
    errorValue: Math.round(dist * 10) / 10,
    tolerance: question.tolerance,
  };
}