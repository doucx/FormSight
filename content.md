好的，我们消除测试代码中的 `!` (non-null assertion)，采用条件守卫替代，以完全符合 Biome 的代码规范。

## [WIP] fix(tests): 消除测试用例中的非空断言以符合 Biome 规则

### 错误分析
Biome 的 linter 规则 `lint/style/noNonNullAssertion` 禁止在 TypeScript 代码中使用 `!` 非空断言。此前测试用例中使用了 `q.correctIndex!`、`q.idealRightCenter!` 等语法，导致 `npm run checkf` 检查不通过。

### 用户需求
移除所有的非空断言 `!`，改用标准的条件判断和类型收窄守卫，确保 Biome 检查与 TypeScript 编译零错误。

### 评论
通过标准守卫结构（`if (!property) throw new Error(...)`）进行类型收窄是符合现代 TypeScript 与前端工程化规范的最佳实践，既保障了运行时的类型安全，也杜绝了潜在的未定义异常。

### 目标
在 `src/utils/__tests__/relativeColorUtils.test.ts` 中：
1. 移除所有的 `!` 非空断言。
2. 添加显式的守卫断言进行类型收窄。

### 基本原理
使用 `write_file` 重新写入无 `!` 断言的测试代码。

### 标签
#intent/fix #flow/ready #priority/medium #comp/tests #concept/parser #scope/core #ai/instruct #task/domain/testing #task/object/biome-lint-fix #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 重构 `relativeColorUtils.test.ts` 消除非空断言

~~~~~act
write_file
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~
~~~~~typescript
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
    expect(q.correctIndex).toBeDefined();

    if (!q.options || q.correctIndex === undefined) {
      throw new Error('options or correctIndex is undefined');
    }

    expect(q.options.length).toBe(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThanOrEqual(3);
  });

  it('VECTOR_SHIFT - should detect target choice correctly', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    expect(q.options).toBeDefined();
    expect(q.correctIndex).toBeDefined();

    if (!q.options || q.correctIndex === undefined) {
      throw new Error('options or correctIndex is undefined');
    }

    const correctOption = q.options[q.correctIndex];
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

    if (!q.idealRightCenter) {
      throw new Error('idealRightCenter is undefined');
    }

    const hitRes = checkRelativeColorHit('LIGHTNESS_INDUCTION', q.idealRightCenter, q);
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

    if (!q.idealRightCenter) {
      throw new Error('idealRightCenter is undefined');
    }

    const hitRes = checkRelativeColorHit('HUE_INDUCTION', q.idealRightCenter, q);
    expect(hitRes.isHit).toBe(true);
  });

  // === 5. 阿尔伯斯 DECONTEXTUAL_2AFC 测试 ===
  it('DECONTEXTUAL_2AFC - should evaluate binary choice correctly and have decoupled backgrounds', () => {
    const q = generateRelativeColorQuestion('DECONTEXTUAL_2AFC', 5);
    expect(q.mode).toBe('DECONTEXTUAL_2AFC');
    expect(q.largerPhysicalSide).toMatch(/^(A|B)$/);
    expect(q.physicalValueDiff).toBeGreaterThan(0);

    if (!q.largerPhysicalSide) {
      throw new Error('largerPhysicalSide is undefined');
    }

    const correctChoice = q.largerPhysicalSide;
    const wrongChoice: 'A' | 'B' = correctChoice === 'A' ? 'B' : 'A';

    const hitRes = checkRelativeColorHit('DECONTEXTUAL_2AFC', correctChoice, q);
    expect(hitRes.isHit).toBe(true);

    const missRes = checkRelativeColorHit('DECONTEXTUAL_2AFC', wrongChoice, q);
    expect(missRes.isHit).toBe(false);
  });
});
~~~~~

### 下一步建议
1. 运行 `npm run checkf` 和 `npm run build`，验证 Biome 检查与 TypeScript 编译是否已全面恢复绿灯。
2. 运行 `npm run test` 确保所有 6 个单元测试用例全部通过。
