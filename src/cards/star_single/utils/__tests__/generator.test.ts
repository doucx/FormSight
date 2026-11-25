import { describe, expect, it } from 'vitest';
import { generatePolarGridPoints, getPolarAngularStep } from '../generator';

const anchor = { x: 250, y: 250 };

function gridAtDistance(level: number, distance: number) {
  return generatePolarGridPoints(anchor, { x: anchor.x + distance, y: anchor.y }, level, 3, 1, 1);
}

describe('star_single angular spacing', () => {
  it('keeps the angular step independent of target distance', () => {
    for (const level of [1, 10, 20, 35]) {
      const step = getPolarAngularStep(level);
      for (const distance of [60, 120, 180]) {
        const points = gridAtDistance(level, distance);
        const target = points[4];
        const neighbor = points[5];
        const a0 = Math.atan2(target.y - anchor.y, target.x - anchor.x);
        const a1 = Math.atan2(neighbor.y - anchor.y, neighbor.x - anchor.x);
        // Rounding to 0.01 px at large R is fine; compare within ~0.001 rad.
        expect(Math.abs(a1 - a0)).toBeCloseTo(step, 3);
      }
    }
  });

  it('decreases monotonically over the level range', () => {
    let previous = getPolarAngularStep(1);
    for (let level = 2; level <= 35; level++) {
      const current = getPolarAngularStep(level);
      expect(current).toBeLessThan(previous);
      previous = current;
    }
  });
});
