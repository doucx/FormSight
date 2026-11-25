import { describe, expect, it } from 'vitest';
import { getBipolarAngularStep as getStepH } from '../star_double_h/utils/generator';
import { getBipolarAngularStep as getStepR } from '../star_double_r/utils/generator';

describe('star_double angular spacing', () => {
  it('uses the same level-to-angle mapping for R and H variants', () => {
    for (const level of [1, 10, 20, 35]) {
      expect(getStepR(level)).toBeCloseTo(getStepH(level), 12);
    }
  });

  it('decreases monotonically and stays below the 15° cap', () => {
    let previous = getStepR(1);
    expect(previous).toBeLessThanOrEqual((15 * Math.PI) / 180);
    for (let level = 2; level <= 35; level++) {
      const current = getStepR(level);
      expect(current).toBeLessThan(previous);
      previous = current;
    }
  });
});
