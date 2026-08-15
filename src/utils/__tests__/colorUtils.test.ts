import { describe, expect, it } from 'vitest';
import {
  checkColorHit,
  generateColorQuestion,
  getToleranceForLevel,
  hsvToHex,
} from '../colorUtils';

describe('colorUtils', () => {
  it('hsvToHex - should correctly convert HSV to HEX string', () => {
    expect(hsvToHex(0, 100, 100)).toBe('#FF0000'); // Red
    expect(hsvToHex(120, 100, 100)).toBe('#00FF00'); // Green
    expect(hsvToHex(240, 100, 100)).toBe('#0000FF'); // Blue
    expect(hsvToHex(0, 0, 100)).toBe('#FFFFFF'); // White
    expect(hsvToHex(0, 0, 0)).toBe('#000000'); // Black
  });

  it('getToleranceForLevel - should return decreasing tolerance as level increases', () => {
    const tolH1 = getToleranceForLevel('H', 1);
    const tolH35 = getToleranceForLevel('H', 35);
    expect(tolH1).toBe(30);
    expect(tolH35).toBe(4);
    expect(tolH1).toBeGreaterThan(tolH35);

    const tolV1 = getToleranceForLevel('V', 1);
    const tolV35 = getToleranceForLevel('V', 35);
    expect(tolV1).toBe(15);
    expect(tolV35).toBe(2);
  });

  it('generateColorQuestion - should generate valid color question for H, S, V modes', () => {
    const qH = generateColorQuestion('H', 5);
    expect(qH.mode).toBe('H');
    expect(qH.targetH).toBeGreaterThanOrEqual(0);
    expect(qH.targetH).toBeLessThan(360);

    const qS = generateColorQuestion('S', 10);
    expect(qS.mode).toBe('S');
    expect(qS.tolerance).toBeDefined();

    const qV = generateColorQuestion('V', 20);
    expect(qV.mode).toBe('V');
  });

  it('checkColorHit - should correctly calculate error and hit status for cyclic Hue and linear S/V', () => {
    const questionH = generateColorQuestion('H', 1); // tolerance = 30°
    questionH.targetH = 359;

    // Cyclic distance test: 359° and 1° -> 2° difference
    const hitCyclic = checkColorHit('H', 1, questionH);
    expect(hitCyclic.errorValue).toBe(2);
    expect(hitCyclic.isHit).toBe(true);

    // Linear V mode test
    const questionV = generateColorQuestion('V', 35); // tolerance = 2%
    questionV.targetV = 50;
    const hitVSuccess = checkColorHit('V', 51, questionV);
    expect(hitVSuccess.isHit).toBe(true);

    const hitVFail = checkColorHit('V', 55, questionV);
    expect(hitVFail.isHit).toBe(false);
  });

  it('generateColorQuestion with manual targeting - should generate targeted hues with higher probability', () => {
    // 锁定 0 号扇区 (0°-30°，中心 15°，抖动 ±15°)
    const options = {
      targetingMode: 'manual' as const,
      targetSectors: [0],
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
