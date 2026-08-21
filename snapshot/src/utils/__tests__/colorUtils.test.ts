import { describe, expect, it } from 'vitest';
import {
  checkColorHit,
  generateColorQuestion,
  getToleranceForLevel,
  hsvToHex,
} from '../../core/color/colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../../core/color/oklchUtils';

describe('colorUtils & oklchUtils', () => {
  it('hsvToHex - should correctly convert HSV to HEX string including 360 boundary', () => {
    expect(hsvToHex(0, 100, 100)).toBe('#FF0000'); // Red
    expect(hsvToHex(360, 100, 100)).toBe('#FF0000'); // Red 360 boundary
    expect(hsvToHex(120, 100, 100)).toBe('#00FF00'); // Green
    expect(hsvToHex(240, 100, 100)).toBe('#0000FF'); // Blue
    expect(hsvToHex(0, 0, 100)).toBe('#FFFFFF'); // White
    expect(hsvToHex(0, 0, 0)).toBe('#000000'); // Black
  });

  it('oklchUtils - should accurately convert HSV to OKLab and calculate perceptually uniform delta E', () => {
    const redLab = hsvToOkLab(0, 100, 100);
    const whiteLab = hsvToOkLab(0, 0, 100);
    const blackLab = hsvToOkLab(0, 0, 0);

    // Red vs White should have significant delta E
    const dE_RedWhite = calcDeltaEOk(redLab, whiteLab);
    expect(dE_RedWhite).toBeGreaterThan(0.3);

    // Black L should be close to 0, White L close to 1
    expect(blackLab[0]).toBeCloseTo(0, 1);
    expect(whiteLab[0]).toBeCloseTo(1, 1);
  });

  it('getTargetDeltaEForLevel - should return decreasing delta E tolerance as level increases', () => {
    const tolL1 = getTargetDeltaEForLevel(1);
    const tolL35 = getTargetDeltaEForLevel(35);

    expect(tolL1).toBeCloseTo(0.12, 2);
    expect(tolL35).toBeCloseTo(0.008, 3);
    expect(tolL1).toBeGreaterThan(tolL35);

    expect(getToleranceForLevel('H', 1)).toBe(tolL1);
  });

  it('checkColorHit - should dynamically adjust angular/value tolerance using OKLab delta E', () => {
    const questionH = generateColorQuestion('H', 10);
    questionH.targetH = 0;
    questionH.targetS = 100;
    questionH.targetV = 100;

    // Small hue shift at high S/V
    const hitSuccess = checkColorHit('H', 3, questionH);
    expect(hitSuccess.isHit).toBe(true);

    // Large hue shift at high S/V fails
    const hitFail = checkColorHit('H', 40, questionH);
    expect(hitFail.isHit).toBe(false);

    // Linear V mode test
    const questionV = generateColorQuestion('V', 35);
    questionV.targetV = 50;
    const hitVSuccess = checkColorHit('V', 50, questionV);
    expect(hitVSuccess.isHit).toBe(true);
  });

  it('checkColorHit - should evaluate ALL mode using OKLab delta E with full user HSV tuple', () => {
    const questionALL = generateColorQuestion('ALL', 1);
    questionALL.targetH = 0;
    questionALL.targetS = 100;
    questionALL.targetV = 100;

    // Exact match in ALL mode
    const hitExact = checkColorHit('ALL', [0, 100, 100], questionALL);
    expect(hitExact.isHit).toBe(true);
    expect(hitExact.errorValue).toBe(0);

    // Large deviation in ALL mode
    const hitFar = checkColorHit('ALL', [180, 20, 20], questionALL);
    expect(hitFar.isHit).toBe(false);
    expect(hitFar.errorValue).toBeGreaterThan(0.2);
  });

  it('generateColorQuestion with manual targeting - should generate targeted hues with higher probability', () => {
    const options = {
      targetingMode: 'manual' as const,
      targetSectors: [0], // 0°-30°
    };

    let targetedCount = 0;
    const totalRuns = 200;

    for (let i = 0; i < totalRuns; i++) {
      const q = generateColorQuestion('H', 5, options);
      if (q.targetH >= 0 && q.targetH <= 35) {
        targetedCount++;
      }
    }

    const ratio = targetedCount / totalRuns;
    expect(ratio).toBeGreaterThan(0.4);
  });
});
