import { describe, expect, it } from 'vitest';
import { checkHit, generateQuestion } from '../generator';

describe('rel_hue_induction generator and hit detection', () => {
  it('should generate hue induction question with 4 options and valid target', () => {
    const q = generateQuestion(10);
    expect(q.bgLeft).toBeDefined();
    expect(q.bgRight).toBeDefined();
    expect(q.targetLeftCenter).toBeDefined();
    expect(q.options.length).toBe(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThanOrEqual(3);

    const correctOption = q.options[q.correctIndex];
    const hitRes = checkHit(correctOption, q);
    expect(hitRes.isHit).toBe(true);
  });

  it('should reject non-target options', () => {
    const q = generateQuestion(10);
    const wrongIndex = (q.correctIndex + 1) % q.options.length;
    const wrongOption = q.options[wrongIndex];

    const missRes = checkHit(wrongOption, q);
    expect(missRes.isHit).toBe(false);
  });
});
