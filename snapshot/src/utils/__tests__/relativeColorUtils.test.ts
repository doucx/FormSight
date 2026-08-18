import { describe, expect, it } from 'vitest';
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  getDistractorDistanceForLevel,
  okLabToHsv,
} from '../relativeColorUtils';

describe('relativeColorUtils with deterministic orthogonal distractors & Albers modes', () => {
  // === 1. 基础工具函数测试 ===
  it('getDistractorDistanceForLevel - should decrease distractor radius as level increases', () => {
    const rL1 = getDistractorDistanceForLevel(1);
    const rL35 = getDistractorDistanceForLevel(35);
    expect(rL1).toBeCloseTo(0.14, 2);
    expect(rL35).toBeCloseTo(0.015, 2);
    expect(rL1).toBeGreaterThan(rL35);
  });

  it('okLabToHsv - should convert OKLab bounds back to valid HSV tuple', () => {
    const hsv = okLabToHsv([0.7, 0, 0]);
    expect(hsv[0]).toBeGreaterThanOrEqual(0);
    expect(hsv[0]).toBeLessThanOrEqual(360);
    expect(hsv[1]).toBeGreaterThanOrEqual(0);
    expect(hsv[2]).toBeGreaterThanOrEqual(0);
  });

  // === 2. VECTOR_SHIFT 模式测试 ===
  it('VECTOR_SHIFT - should generate valid question with distinct candidate options', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    expect(q.mode).toBe('VECTOR_SHIFT');
    expect(q.options).toBeDefined();
    expect(q.options!.length).toBe(4);
    expect(q.correctIndex).toBeDefined();
    expect(q.correctIndex!).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex!).toBeLessThanOrEqual(3);
  });

  it('VECTOR_SHIFT - should detect target choice correctly', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    expect(q.options).toBeDefined();
    expect(q.correctIndex).toBeDefined();
    const correctOption = q.options![q.correctIndex!];
    const result = checkRelativeColorHit('VECTOR_SHIFT', correctOption, q);
    expect(result.isHit).toBe(true);
  });

  it('VECTOR_SHIFT - should generate C closer to A at lower difficulty levels', () => {
    const qEasy = generateRelativeColorQuestion('VECTOR_SHIFT', 1);
    const hueDiffEasy = Math.min(
      Math.abs(qEasy.colorA[0] - qEasy.colorC[0]),
      360 - Math.abs(qEasy.colorA[0] - qEasy.colorC[0]),
    );
    expect(hueDiffEasy).toBeLessThanOrEqual(10.5);

    let maxHueDiffHard = 0;
    for (let i = 0; i < 20; i++) {
      const qHard = generateRelativeColorQuestion('VECTOR_SHIFT', 35);
      const diff = Math.min(
        Math.abs(qHard.colorA[0] - qHard.colorC[0]),
        360 - Math.abs(qHard.colorA[0] - qHard.colorC[0]),
      );
      if (diff > maxHueDiffHard) maxHueDiffHard = diff;
    }
    expect(maxHueDiffHard).toBeGreaterThan(40);
  });

  // === 3. 阿尔伯斯 LIGHTNESS_INDUCTION 测试 ===
  it('LIGHTNESS_INDUCTION - should generate dual background with contrast and ideal center', () => {
    const q = generateRelativeColorQuestion('LIGHTNESS_INDUCTION', 5);
    expect(q.mode).toBe('LIGHTNESS_INDUCTION');
    expect(q.bgLeft).toBeDefined();
    expect(q.bgRight).toBeDefined();
    expect(q.targetLeftCenter).toBeDefined();
    expect(q.idealRightCenter).toBeDefined();

    // 提交理想补偿值应当判定为 Hit
    const hitRes = checkRelativeColorHit('LIGHTNESS_INDUCTION', q.idealRightCenter!, q);
    expect(hitRes.isHit).toBe(true);
  });

  // === 4. 阿尔伯斯 HUE_INDUCTION 测试 ===
  it('HUE_INDUCTION - should generate hue induction question with ideal right color', () => {
    const q = generateRelativeColorQuestion('HUE_INDUCTION', 10);
    expect(q.mode).toBe('HUE_INDUCTION');
    expect(q.bgLeft).toBeDefined();
    expect(q.bgRight).toBeDefined();
    expect(q.targetLeftCenter).toBeDefined();
    expect(q.idealRightCenter).toBeDefined();

    const hitRes = checkRelativeColorHit('HUE_INDUCTION', q.idealRightCenter!, q);
    expect(hitRes.isHit).toBe(true);
  });

  // === 5. 阿尔伯斯 DECONTEXTUAL_2AFC 测试 ===
  it('DECONTEXTUAL_2AFC - should evaluate binary choice correctly and have decoupled backgrounds', () => {
    const q = generateRelativeColorQuestion('DECONTEXTUAL_2AFC', 5);
    expect(q.mode).toBe('DECONTEXTUAL_2AFC');
    expect(q.largerPhysicalSide).toMatch(/^(A|B)$/);
    expect(q.physicalValueDiff).toBeGreaterThan(0);

    const correctChoice = q.largerPhysicalSide!;
    const wrongChoice: 'A' | 'B' = correctChoice === 'A' ? 'B' : 'A';

    const hitRes = checkRelativeColorHit('DECONTEXTUAL_2AFC', correctChoice, q);
    expect(hitRes.isHit).toBe(true);

    const missRes = checkRelativeColorHit('DECONTEXTUAL_2AFC', wrongChoice, q);
    expect(missRes.isHit).toBe(false);
  });
});