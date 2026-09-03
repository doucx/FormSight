import { describe, expect, it } from 'vitest';
import { checkHit, generateQuestion } from '../generator';

describe('rel_lightness_induction generator and hit detection', () => {
  it('should generate dual background with contrast and ideal center', () => {
    const q = generateQuestion(5);
    expect(q.bgLeft).toBeDefined();
    expect(q.bgRight).toBeDefined();
    expect(q.targetLeftCenter).toBeDefined();
    expect(q.idealRightCenter).toBeDefined();

    const hitRes = checkHit(q.idealRightCenter, q);
    expect(hitRes.isHit).toBe(true);
  });

  it('should detect inaccurate lightness value as miss', () => {
    const q = generateQuestion(15);
    const wrongColor: [number, number, number] = [
      q.idealRightCenter[0],
      q.idealRightCenter[1],
      Math.min(100, q.idealRightCenter[2] + 40),
    ];

    const missRes = checkHit(wrongColor, q);
    expect(missRes.isHit).toBe(false);
  });
});
