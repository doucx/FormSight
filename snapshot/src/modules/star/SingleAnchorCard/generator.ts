import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { generatePolarGridPoints } from '../_shared/gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM } from '../_shared/types';

export interface SingleAnchorQuestion {
  id: string;
  anchorA: Point;
  targetB: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
}

export function generateSingleAnchorQuestion(
  level: number,
  settings: StarSettings,
): SingleAnchorQuestion {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = settings.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const anchorA: Point = { x: CX, y: CY };

  let angle = Math.floor(Math.random() * 360);
  if (
    settings.targetingMode === 'manual' &&
    settings.manualTargetSectors &&
    settings.manualTargetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        settings.manualTargetSectors[
          Math.floor(Math.random() * settings.manualTargetSectors.length)
        ];
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
    anchorA,
    targetB,
    difficultyLevel: level,
    gridDim,
    distractorPoints,
    angleDegree: angle,
    distanceRatio: dist,
  };
}
