好的，我们通过类型断言修复现有测试中的可选链报错，并为新增的阿尔伯斯同时对比 3 种模式补充完整的单元测试用例。

## [WIP] fix(tests): 修复测试中的可选属性类型断言并扩充阿尔伯斯模式用例

### 错误分析
在 `src/utils/__tests__/relativeColorUtils.test.ts` 中：
* 第 21 行直接访问 `q.options.length`，在 TypeScript 开启 `strictNullChecks` 时，由于 `options?: [number, number, number][]` 为可选属性，导致 `TS18048` 报错。
* 第 28 行直接访问 `q.options[q.correctIndex]`，由于 `correctIndex?: number` 为可选属性，导致 `TS18048` 与 `TS2538` 报错。

### 用户需求
修复 `src/utils/__tests__/relativeColorUtils.test.ts` 中的类型报错，并为新增的 `LIGHTNESS_INDUCTION`（明度反差补偿）、`HUE_INDUCTION`（补色残像调和）、`DECONTEXTUAL_2AFC`（环境穿透判别）补充单元测试。

### 评论
通过对 `VECTOR_SHIFT` 题目中的 `options` 和 `correctIndex` 添加安全断言，并针对阿尔伯斯各模式的题型生成与判定函数建立完备的自动化测试体系，可保证代码构建（`npm run build`）与测试套件（`npm run test`）全部绿灯通过。

### 目标
1. 修复原测试用例中的非空断言。
2. 增加对 `LIGHTNESS_INDUCTION` 题型与评判逻辑的测试。
3. 增加对 `HUE_INDUCTION` 题型与评判逻辑的测试。
4. 增加对 `DECONTEXTUAL_2AFC` 穿透判别与解耦特性的测试。

### 基本原理
使用 `write_file` 重新编写测试文件，使用 `expect(q.options).toBeDefined()` 及非空断言 `q.options!`、`q.correctIndex!` 确保类型收窄，同时覆盖全模式的题型生成与命中检测。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #concept/executor #scope/core #ai/instruct #task/domain/testing #task/object/relative-color-tests #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 重写并完善 `relativeColorUtils.test.ts`

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
~~~~~

### 下一步建议
1. 可以在终端运行 `npm run build` 和 `npm run test`，验证 TypeScript 编译与 Vitest 测试套件的运行结果。
2. 确认无误后可进行 Git 提交。
