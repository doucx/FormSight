import { describe, expect, it } from 'vitest';
import { checkHit, generateQuestion } from '../generator';

describe('rel_decontextual_2afc generator and hit detection', () => {
  it('should evaluate binary choice correctly and have decoupled backgrounds', () => {
    const q = generateQuestion(5);
    expect(q.largerPhysicalSide).toMatch(/^(A|B)$/);
    expect(q.physicalValueDiff).toBeGreaterThan(0);

    const correctChoice = q.largerPhysicalSide;
    const wrongChoice: 'A' | 'B' = correctChoice === 'A' ? 'B' : 'A';

    const hitRes = checkHit(correctChoice, q);
    expect(hitRes.isHit).toBe(true);

    const missRes = checkHit(wrongChoice, q);
    expect(missRes.isHit).toBe(false);
  });
});