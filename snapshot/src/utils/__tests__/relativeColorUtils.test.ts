import { describe, expect, it } from 'vitest';
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  getDistractorDistanceForLevel,
  okLabToHsv,
} from '../relativeColorUtils';

describe('relativeColorUtils with deterministic orthogonal distractors', () => {
  it('getDistractorDistanceForLevel - should decrease distractor radius as level increases', () => {
    const rL1 = getDistractorDistanceForLevel(1);
    const rL35 = getDistractorDistanceForLevel(35);
    expect(rL1).toBeCloseTo(0.14, 2);
    expect(rL35).toBeCloseTo(0.015, 2);
    expect(rL1).toBeGreaterThan(rL35);
  });

  it('generateRelativeColorQuestion - should generate valid question with distinct candidate options', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    expect(q.mode).toBe('VECTOR_SHIFT');
    expect(q.options.length).toBe(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThanOrEqual(3);
  });

  it('checkRelativeColorHit - should detect target choice correctly', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    const correctOption = q.options[q.correctIndex];
    const result = checkRelativeColorHit('VECTOR_SHIFT', correctOption, q);
    expect(result.isHit).toBe(true);
  });

  it('okLabToHsv - should convert OKLab bounds back to valid HSV tuple', () => {
    const hsv = okLabToHsv([0.7, 0, 0]);
    expect(hsv[0]).toBeGreaterThanOrEqual(0);
    expect(hsv[0]).toBeLessThanOrEqual(360);
    expect(hsv[1]).toBeGreaterThanOrEqual(0);
    expect(hsv[2]).toBeGreaterThanOrEqual(0);
  });
});