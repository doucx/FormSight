这是 Biome Linter 触发的代码质量规则 `lint/style/noNonNullAssertion`，它禁止在 TypeScript 代码中使用非空断言运算符 `!`。

我们将使用前置类型守卫（Type Guard）与显式异常抛出替代 `!`，消除所有的 linter 报错。

## [WIP] fix: 消除测试用例中的非空断言以满足代码规范

### 错误分析
Biome 代码检查器在 `src/utils/__tests__/relativeColorUtils.test.ts` 中报告了 4 处 `lint/style/noNonNullAssertion` 规则错误：
- 第 42 行：`q.correctIndex!`
- 第 75 行：`q.idealRightCenter!`
- 第 87 行：`q.correctIndex!`
- 第 98 行：`q.largerPhysicalSide!`

TypeScript 的可选属性通过 `!` 断言虽然能通过类型推导，但不符合项目的 linter 风格约束。

### 用户需求
移除测试文件中的所有非空断言 `!` 操作符，同时保持类型安全与测试断言的严格性。

### 评论
通过在测试用例中增加运行时守卫判断（如 `if (!q.options || q.correctIndex === undefined) throw new Error(...)`），既能让 TypeScript 编译器自动收窄（Narrowing）可选字段类型，又能完全符合 Biome 的代码规范。

### 目标
1. 移除 `src/utils/__tests__/relativeColorUtils.test.ts` 中所有的 `!` 操作符。
2. 增加前置类型收窄守卫，确保测试在异常时快速失败并提供明确错误信息。

### 基本原理
使用 `write_file` 更新整个测试文件，使用标准的控制流类型收窄替换非空断言，彻底消除 linter 报错。

### 标签
#intent/fix #flow/ready #priority/medium #comp/tests #concept/executor #scope/core #ai/instruct #task/domain/testing #task/object/relative-color-tests #task/action/fix #task/state/continue

---

### Script

#### Acts 1: 重写测试文件消除非空断言

我们将重写 `src/utils/__tests__/relativeColorUtils.test.ts`，为所有可选字段添加显式检查以收窄类型。

~~~~~act
write_file
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { getDistractorDistanceForLevel, okLabToHsv } from '../../core/color/oklchUtils';
import {
  checkRelativeColorHit,
  generateDecontextual2AfcQuestion,
  generateHueInductionQuestion,
  generateLightnessInductionQuestion,
  generateVectorShiftQuestion,
} from '../../core/color/relativeColor';

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

    expect(q.options?.length).toBe(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThanOrEqual(3);
  });

  it('VECTOR_SHIFT - should detect target choice correctly', () => {
    const q = generateVectorShiftQuestion(5);
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
    const q = generateLightnessInductionQuestion(5);
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
    const q = generateHueInductionQuestion(10);
    expect(q.bgLeft).toBeDefined();
    expect(q.bgRight).toBeDefined();
    expect(q.targetLeftCenter).toBeDefined();
    expect(q.options).toBeDefined();
    expect(q.correctIndex).toBeDefined();
    if (!q.options || q.correctIndex === undefined) {
      throw new Error('options or correctIndex is undefined');
    }

    const correctOption = q.options[q.correctIndex];
    const hitRes = checkRelativeColorHit('HUE_INDUCTION', correctOption, q);
    expect(hitRes.isHit).toBe(true);
  });

  // === 5. 阿尔伯斯 DECONTEXTUAL_2AFC 测试 ===
  it('DECONTEXTUAL_2AFC - should evaluate binary choice correctly and have decoupled backgrounds', () => {
    const q = generateDecontextual2AfcQuestion(5);
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
- 重新运行 linter / 格式检查（如 `npm run check` 或 Biome 校验）确认所有规则通过。
- 运行 Vitest 验证测试用例全部执行通过。
