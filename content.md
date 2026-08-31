Biome Linter 抛出了 5 处关于 `noExplicitAny` 的警告/错误（不允许使用 `any` 类型）。我们需要为 `geometry.test.ts` 中的测试辅助函数提供正确的强类型签名（如 `Point`）。

我们生成修复计划来更新测试文件。

## [WIP] fix: 消除 geometry.test.ts 中的 noExplicitAny 强类型违规

### 错误分析
Biome 检测到 `geometry.test.ts` 中的测试辅助函数 `checkHit` 和 `findNearestGridPoint` 使用了 `any` 类型参数，违反了项目的代码质量规范 (`noExplicitAny`)。

### 用户需求
为测试函数明确指定精确的类型签名（`Point` 和 `Point[]`），以完全通过 Biome 检查。

### 评论
严格的 Linter 规则有助于保持代码库长期的高质量和类型健壮性。

### 目标
重构 `src/utils/__tests__/geometry.test.ts`，用具名类型替代 `any`。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #scope/dx #ai/instruct #task/domain/testing #task/object/geometry-test #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 重构 `geometry.test.ts` 消除 `any` 类型

~~~~~act
write_file
src/utils/__tests__/geometry.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { getDynamicCrosshairMetrics, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { getGridMinSpacing } from '../../core/canvas/drawPointGrid';
import { evaluatePointGridHit, findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { generateSingleAnchorQuestion as generateQuestion } from '../../modules/star/SingleAnchorCard/generator';
import {
  generateBipolarGridPoints,
  generatePolarGridPoints,
} from '../../modules/star/_shared/gridGenerators';
import { calcDistance, rotatePoint } from '../../modules/star/_shared/pointMath';
import type { Point } from '../../types';

const checkHit = (click: Point, target: Point, grid: Point[]) => evaluatePointGridHit(click, target, grid);
const findNearestGridPoint = (click: Point, grid: Point[]) => findNearestPointInGrid(click, grid);

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

  it('findNearestGridPoint - should find closest grid point and range check', () => {
    const grid = [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
    ];
    const click = { x: 11, y: 11 };
    const res = findNearestGridPoint(click, grid);
    expect(res.nearestPoint).toEqual({ x: 10, y: 10 });
    expect(res.minDistance).toBeCloseTo(1.41, 1);
    expect(res.isWithinRange).toBe(true);
  });

  it('checkHit - should detect hit when click is very close to target', () => {
    const targetB = { x: 10, y: 10 };
    const grid = [
      { x: 10, y: 10 },
      { x: 30, y: 30 },
    ];
    const hitResult = checkHit({ x: 10.1, y: 10.1 }, targetB, grid);
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

    // 密集点阵下的准星尺寸应显著小于稀疏点阵
    expect(metricsDense.size).toBeLessThan(metricsSparse.size);
    expect(metricsDense.size).toBeLessThanOrEqual(4); // 4 * 0.42 ≈ 1.68 -> clamp to 3.5
    expect(metricsDense.lineWidth).toBeLessThanOrEqual(metricsSparse.lineWidth);
  });

  it('generateQuestion - should generate valid question data for single, double_h and double_r', () => {
    const qSingle = generateQuestion(1, { gridSize: 3, targetingMode: 'off' });
    expect(qSingle.anchorA).toBeDefined();
    expect(qSingle.targetB).toBeDefined();
    expect(qSingle.distractorPoints.length).toBeGreaterThan(0);

    const qDoubleH = generateQuestion(10, { gridSize: 3, targetingMode: 'off' });
    expect(qDoubleH.anchorC).toBeDefined();

    const qDoubleR = generateQuestion(15, { gridSize: 3, targetingMode: 'off' });
    expect(qDoubleR).toBeDefined();
  });

  it('generateQuestion with manual targeting - should generate targeted angles with higher probability', () => {
    // 锁定扇区 0 (对应 0° 正东，允许加权抖动 ±20°)
    const options = {
      targetingMode: 'manual' as const,
      targetSectors: [0],
      gridSize: 3,
    };

    let targetedCount = 0;
    const totalRuns = 200;

    for (let i = 0; i < totalRuns; i++) {
      const q = generateQuestion(5, options);
      // 0° ± 25° 范围 (0~25° 或 335~360°)
      if (q.angleDegree <= 25 || q.angleDegree >= 335) {
        targetedCount++;
      }
    }

    const ratio = targetedCount / totalRuns;
    expect(ratio).toBeGreaterThan(0.4);
  });
});
~~~~~
