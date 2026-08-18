import { describe, expect, it } from 'vitest';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  calcPolygonArea,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
  generateRandomPolygon,
  getNegativeSpaceToleranceForLevel,
} from '../negativeSpaceUtils';

describe('negativeSpaceUtils', () => {
  it('calcPolygonArea - should calculate rectangle and triangle area accurately via Shoelace formula', () => {
    // 100x100 正方形 -> 面积 10000
    const rect = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(calcPolygonArea(rect)).toBe(10000);

    // 直角三角形 (底 60, 高 80) -> 面积 2400
    const triangle = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 0, y: 80 },
    ];
    expect(calcPolygonArea(triangle)).toBe(2400);

    // 顶点少于 3 个应返回 0
    expect(
      calcPolygonArea([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBe(0);
  });

  it('getNegativeSpaceToleranceForLevel - should provide decreasing tolerance curve', () => {
    const tolL1 = getNegativeSpaceToleranceForLevel(1);
    const tolL35 = getNegativeSpaceToleranceForLevel(35);

    expect(tolL1).toBe(10.0);
    expect(tolL35).toBe(1.2);
    expect(tolL1).toBeGreaterThan(tolL35);

    const tolL18 = getNegativeSpaceToleranceForLevel(18);
    expect(tolL18).toBeLessThan(tolL1);
    expect(tolL18).toBeGreaterThan(tolL35);
  });

  it('generateRandomPolygon - should generate valid vertex sequences bounded within canvas', () => {
    for (let l = 1; l <= 35; l += 10) {
      const poly = generateRandomPolygon(l);
      expect(poly.length).toBeGreaterThanOrEqual(3);
      for (const p of poly) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(NEGATIVE_SPACE_CANVAS_SIZE);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(NEGATIVE_SPACE_CANVAS_SIZE);
      }
    }
  });

  it('generateNegativeSpaceQuestion - should create question with consistent areas and ratio', () => {
    const q = generateNegativeSpaceQuestion('RATIO_ESTIMATION', 10);
    expect(q.mode).toBe('RATIO_ESTIMATION');
    expect(q.canvasArea).toBe(NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE);
    expect(q.positiveArea! + q.negativeArea!).toBeCloseTo(q.canvasArea, -1);
    expect(q.targetNegativeRatio).toBeGreaterThan(15);
    expect(q.targetNegativeRatio).toBeLessThan(85);
  });

  it('checkNegativeSpaceHit - should validate hit within dynamic tolerance threshold', () => {
    const q = generateNegativeSpaceQuestion('RATIO_ESTIMATION', 1);
    q.targetNegativeRatio = 60.0;
    q.tolerance = 10.0;

    // 命中
    const hitRes = checkNegativeSpaceHit(65.0, q);
    expect(hitRes.isHit).toBe(true);
    expect(hitRes.errorValue).toBe(5.0);

    // 未命中
    const missRes = checkNegativeSpaceHit(75.0, q);
    expect(missRes.isHit).toBe(false);
    expect(missRes.errorValue).toBe(15.0);
  });
});
