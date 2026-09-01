import { describe, expect, it } from 'vitest';
import {
  generatePolarGridPoints,
  generateQuestion as generateSingleQuestion,
} from '../../cards/star_single/utils/generator';
import {
  generateBipolarGridPoints,
  generateQuestion as generateDoubleHQuestion,
} from '../../cards/star_double_h/utils/generator';
import {
  generateQuestion as generateDoubleRQuestion,
} from '../../cards/star_double_r/utils/generator';
import {
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
  getGridMinSpacing,
} from '../../core/canvas/drawPointGrid';
import {
  evaluatePointGridHit,
  findNearestPointInGrid,
} from '../../core/geometry/pointGrid';
import type { Point } from '../../types';

function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;

  return {
    x: Math.round((center.x + dx * cos - dy * sin) * 100) / 100,
    y: Math.round((center.y + dx * sin + dy * cos) * 100) / 100,
  };
}

function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

describe('geometry utils', () => {
  it('rotatePoint - should correctly rotate a point around center', () => {
    const center = { x: 0, y: 0 };
    const p = { x: 10, y: 0 };
    const rotated90 = rotatePoint(p, center, 90);
    expect(rotated90.x).toBeCloseTo(0);
    expect(rotated90.y).toBeCloseTo(10);

    const rotated180 = rotatePoint(p, center, 180);
    expect(rotated180.x).toBeCloseTo(-10);
    expect(rotated180.y).toBeCloseTo(0);
  });

  it('calcDistance - should calculate Euclidean distance correctly', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    expect(calcDistance(p1, p2)).toBe(5);
  });

  it('generatePolarGridPoints - should generate polar grid points', () => {
    const anchorA = { x: 250, y: 250 };
    const targetB = { x: 300, y: 250 };
    const points = generatePolarGridPoints(anchorA, targetB, 5, 3, 1, 1);
    expect(points.length).toBe(9); // 3x3
  });

  it('generateBipolarGridPoints - should generate bipolar grid points', () => {
    const anchorA = { x: 180, y: 250 };
    const anchorC = { x: 320, y: 250 };
    const targetB = { x: 250, y: 200 };
    const points = generateBipolarGridPoints(anchorA, anchorC, targetB, 5, 3, 1, 1);
    expect(points.length).toBe(9);
  });

  it('findNearestPointInGrid - should find closest grid point and range check', () => {
    const grid = [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
    ];
    const click = { x: 11, y: 11 };
    const res = findNearestPointInGrid(click, grid);
    expect(res.nearestPoint).toEqual({ x: 10, y: 10 });
    expect(res.minDistance).toBeCloseTo(1.41, 1);
    expect(res.isWithinRange).toBe(true);
  });

  it('evaluatePointGridHit - should detect hit when click is very close to target', () => {
    const targetB = { x: 10, y: 10 };
    const grid = [
      { x: 10, y: 10 },
      { x: 30, y: 30 },
    ];
    const hitResult = evaluatePointGridHit({ x: 10.1, y: 10.1 }, targetB, grid);
    expect(hitResult.isHit).toBe(true);
    expect(hitResult.errorDistance).toBeLessThan(0.5);
  });

  it('getDynamicDotRadius & getDynamicCrosshairMetrics - should dynamically scale based on grid spacing', () => {
    const gridDense = [
      { x: 10, y: 10 },
      { x: 14, y: 10 },
    ];
    const gridSparse = [
      { x: 10, y: 10 },
      { x: 100, y: 100 },
    ];
    expect(getGridMinSpacing(gridDense)).toBe(4);
    expect(getDynamicDotRadius(gridDense)).toBeLessThan(getDynamicDotRadius(gridSparse));

    const metricsDense = getDynamicCrosshairMetrics(gridDense);
    const metricsSparse = getDynamicCrosshairMetrics(gridSparse);

    expect(metricsDense.size).toBeLessThan(metricsSparse.size);
    expect(metricsDense.size).toBeLessThanOrEqual(4);
    expect(metricsDense.lineWidth).toBeLessThanOrEqual(metricsSparse.lineWidth);
  });

  it('generateQuestion - should generate valid question data for single, double_h and double_r', () => {
    const qSingle = generateSingleQuestion(1);
    expect(qSingle.anchorA).toBeDefined();
    expect(qSingle.targetB).toBeDefined();
    expect(qSingle.distractorPoints.length).toBeGreaterThan(0);

    const qDoubleH = generateDoubleHQuestion(10);
    expect(qDoubleH.anchorC).toBeDefined();

    const qDoubleR = generateDoubleRQuestion(15);
    expect(qDoubleR.rotationAngle).toBeDefined();
  });

  it('generateQuestion with manual targeting - should generate targeted angles with higher probability', () => {
    const options = {
      targetingMode: 'manual' as const,
      targetSectors: [0],
    };

    let targetedCount = 0;
    const totalRuns = 200;

    for (let i = 0; i < totalRuns; i++) {
      const q = generateSingleQuestion(5, options);
      if (q.angleDegree <= 25 || q.angleDegree >= 335) {
        targetedCount++;
      }
    }

    const ratio = targetedCount / totalRuns;
    expect(ratio).toBeGreaterThan(0.4);
  });
});
