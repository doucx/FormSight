import { describe, expect, it } from 'vitest';
import { checkHit, generateQuestion } from '../generator';

describe('rel_vector_shift generator and hit detection', () => {
  it('should generate valid question with exactly 4 candidate options', () => {
    const q = generateQuestion(5);
    expect(q.options.length).toBe(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThanOrEqual(3);
  });

  it('should detect target choice correctly', () => {
    const q = generateQuestion(5);
    const correctOption = q.options[q.correctIndex];
    const result = checkHit(correctOption, q);
    expect(result.isHit).toBe(true);
    expect(result.selectedIndex).toBe(q.correctIndex);
  });

  it('should generate C closer to A at lower difficulty levels', () => {
    const qEasy = generateQuestion(1);
    const hueDiffEasy = Math.min(
      Math.abs(qEasy.colorA[0] - qEasy.colorC[0]),
      360 - Math.abs(qEasy.colorA[0] - qEasy.colorC[0]),
    );
    expect(hueDiffEasy).toBeLessThanOrEqual(10.5);

    let maxHueDiffHard = 0;
    for (let i = 0; i < 20; i++) {
      const qHard = generateQuestion(35);
      const diff = Math.min(
        Math.abs(qHard.colorA[0] - qHard.colorC[0]),
        360 - Math.abs(qHard.colorA[0] - qHard.colorC[0]),
      );
      if (diff > maxHueDiffHard) maxHueDiffHard = diff;
    }
    expect(maxHueDiffHard).toBeGreaterThan(40);
  });
});
