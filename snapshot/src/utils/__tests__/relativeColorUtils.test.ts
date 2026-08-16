import { describe, expect, it } from 'vitest';
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  okLabToHsv,
} from '../relativeColorUtils';

describe('relativeColorUtils', () => {
  it('okLabToHsv - should convert OKLab back to valid HSV tuple within gamut', () => {
    // Red OKLab approx
    const labRed: [number, number, number] = [0.627, 0.224, 0.125];
    const hsv = okLabToHsv(labRed);
    expect(hsv).not.toBeNull();
    if (hsv) {
      expect(hsv[0]).toBeGreaterThanOrEqual(0);
      expect(hsv[0]).toBeLessThanOrEqual(360);
    }
  });

  it('generateRelativeColorQuestion - should generate valid 4-color question for VECTOR_SHIFT', () => {
    const question = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    expect(question.mode).toBe('VECTOR_SHIFT');
    expect(question.colorA.length).toBe(3);
    expect(question.colorB.length).toBe(3);
    expect(question.colorC.length).toBe(3);
    expect(question.targetD.length).toBe(3);
    expect(question.tolerance).toBeGreaterThan(0);
  });

  it('checkRelativeColorHit - exact target match should produce near zero delta E error', () => {
    const question = generateRelativeColorQuestion('VECTOR_SHIFT', 10);
    const hitResult = checkRelativeColorHit(question.targetD, question);

    expect(hitResult.isHit).toBe(true);
    expect(hitResult.deltaEError).toBeLessThan(0.01);
    expect(hitResult.magnitudeError).toBeLessThan(0.02);
    expect(hitResult.angleErrorDeg).toBeLessThan(5);
  });

  it('checkRelativeColorHit - large deviation in user answer should fail hit test', () => {
    const question = generateRelativeColorQuestion('VECTOR_SHIFT', 35);
    // User submits opposite hue / inverted color
    const userInverted: [number, number, number] = [
      (question.targetD[0] + 180) % 360,
      100 - question.targetD[1],
      100 - question.targetD[2],
    ];

    const hitResult = checkRelativeColorHit(userInverted, question);
    expect(hitResult.isHit).toBe(false);
    expect(hitResult.deltaEError).toBeGreaterThan(0.1);
  });
});