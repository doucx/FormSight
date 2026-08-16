import { describe, expect, it } from 'vitest';
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  okLabToHsv,
} from '../relativeColorUtils';

describe('relativeColorUtils', () => {
  it('generateRelativeColorQuestion - should generate valid color vector shift question', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    expect(q.mode).toBe('VECTOR_SHIFT');
    expect(q.colorA).toBeDefined();
    expect(q.colorB).toBeDefined();
    expect(q.colorC).toBeDefined();
    expect(q.targetD).toBeDefined();
    expect(q.tolerance).toBeGreaterThan(0);
  });

  it('checkRelativeColorHit - should detect exact match and yield zero deltaEError', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    const result = checkRelativeColorHit('VECTOR_SHIFT', q.targetD, q);
    expect(result.isHit).toBe(true);
    expect(result.deltaEError).toBeLessThan(0.05);
  });

  it('okLabToHsv - should convert OKLab bounds back to valid HSV tuple', () => {
    const hsv = okLabToHsv([0.7, 0, 0]);
    expect(hsv[0]).toBeGreaterThanOrEqual(0);
    expect(hsv[0]).toBeLessThanOrEqual(360);
    expect(hsv[1]).toBeGreaterThanOrEqual(0);
    expect(hsv[2]).toBeGreaterThanOrEqual(0);
  });
});
