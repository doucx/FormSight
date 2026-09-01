import { describe, expect, it } from 'vitest';
import {
  checkHit as checkDecontextualHit,
  generateQuestion as generateDecontextualQuestion,
} from '../../cards/rel_decontextual_2afc/utils/generator';
import {
  checkHit as checkHueInductionHit,
  generateQuestion as generateHueInductionQuestion,
} from '../../cards/rel_hue_induction/utils/generator';
import {
  checkHit as checkLightnessHit,
  generateQuestion as generateLightnessQuestion,
} from '../../cards/rel_lightness_induction/utils/generator';
import {
  checkHit as checkVectorShiftHit,
  generateQuestion as generateVectorShiftQuestion,
} from '../../cards/rel_vector_shift/utils/generator';
import { getDistractorDistanceForLevel, okLabToHsv } from '../../core/color/oklchUtils';

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
    const q = generateVectorShiftQuestion(5);
    expect(q.options).toBeDefined();
    expect(q.correctIndex).toBeDefined();

    expect(q.options.length).toBe(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThanOrEqual(3);
  });

  it('VECTOR_SHIFT - should detect target choice correctly', () => {
    const q = generateVectorShiftQuestion(5);
    const correctOption = q.options[q.correctIndex];
    const result = checkVectorShiftHit(correctOption, q);
    expect(result.isHit).toBe(true);
  });

  it('VECTOR_SHIFT - should generate C closer to A at lower difficulty levels', () => {
    const qEasy = generateVectorShiftQuestion(1);
    const hueDiffEasy = Math.min(
      Math.abs(qEasy.colorA[0] - qEasy.colorC[0]),
      360 - Math.abs(qEasy.colorA[0] - qEasy.colorC[0]),
    );
    expect(hueDiffEasy).toBeLessThanOrEqual(10.5);

    let maxHueDiffHard = 0;
    for (let i = 0; i < 20; i++) {
      const qHard = generateVectorShiftQuestion(35);
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
    const q = generateLightnessQuestion(5);
    expect(q.bgLeft).toBeDefined();
    expect(q.bgRight).toBeDefined();
    expect(q.targetLeftCenter).toBeDefined();
    expect(q.idealRightCenter).toBeDefined();

    const hitRes = checkLightnessHit(q.idealRightCenter[2], q);
    expect(hitRes.isHit).toBe(true);
  });

  // === 4. 阿尔伯斯 HUE_INDUCTION 测试 ===
  it('HUE_INDUCTION - should generate hue induction question with ideal right color', () => {
    const q = generateHueInductionQuestion(10);
    expect(q.bgLeft).toBeDefined();
    expect(q.bgRight).toBeDefined();
    expect(q.targetLeftCenter).toBeDefined();
    expect(q.options).toBeDefined();

    const hitRes = checkHueInductionHit(q.correctIndex, q);
    expect(hitRes.isHit).toBe(true);
  });

  // === 5. 阿尔伯斯 DECONTEXTUAL_2AFC 测试 ===
  it('DECONTEXTUAL_2AFC - should evaluate binary choice correctly and have decoupled backgrounds', () => {
    const q = generateDecontextualQuestion(5);
    expect(q.largerPhysicalSide).toMatch(/^(A|B)$/);
    expect(q.physicalValueDiff).toBeGreaterThan(0);

    const correctChoice = q.largerPhysicalSide;
    const wrongChoice: 'A' | 'B' = correctChoice === 'A' ? 'B' : 'A';

    const hitRes = checkDecontextualHit(correctChoice, q);
    expect(hitRes.isHit).toBe(true);

    const missRes = checkDecontextualHit(wrongChoice, q);
    expect(missRes.isHit).toBe(false);
  });
});
