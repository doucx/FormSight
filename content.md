我已查明 `src/utils/__tests__/relativeColorUtils.test.ts` 的具体内容。测试用例中调用的题目生成与判分函数实际上都统一集中在 `src/core/color/relativeColor.ts` 中（即 `generateVectorShiftQuestion`、`generateLightnessInductionQuestion`、`generateHueInductionQuestion`、`generateDecontextual2AfcQuestion` 以及通用的 `checkRelativeColorHit`）。

现在我将生成计划，更新该测试文件中的导入路径及函数调用，彻底解决 4 处 TS2307 编译错误。

## [WIP] fix: 修正 relativeColorUtils.test.ts 模块导入与函数调用

### 错误分析
测试文件 `src/utils/__tests__/relativeColorUtils.test.ts` 原本试图从不存在的 4 个卡片目录（`../../cards/rel_*/utils/generator`）导入 `generateQuestion` 与 `checkHit`。而在当前的架构实现中：
1. 相对色彩相关的 4 种训练模式生成函数位于 `src/core/color/relativeColor.ts`，名称分别为 `generateVectorShiftQuestion`、`generateLightnessInductionQuestion`、`generateHueInductionQuestion` 和 `generateDecontextual2AfcQuestion`；
2. 判分逻辑统一由 `checkRelativeColorHit(mode, userAnswer, question)` 处理。

原测试文件的导入路径与判题调用参数不匹配导致了 TypeScript 编译阻断。

### 用户需求
修正 `src/utils/__tests__/relativeColorUtils.test.ts` 中的导入路径和函数调用，使所有相对色彩单元测试正确通过类型检查。

### 评论
将测试用例直接对齐到 `src/core/color/relativeColor.ts`，消除了对已被集中收敛的虚拟路径的无效依赖，恢复了自动化测试的有效性与健壮性。

### 目标
1. 更新 `src/utils/__tests__/relativeColorUtils.test.ts` 中的模块导入为 `../../core/color/relativeColor`。
2. 将 `check*Hit` 统一适配为 `checkRelativeColorHit` 签名调用。
3. 确保所有 5 个测试场景（基础工具、矢量迁移、明度补偿、残像调和、环境穿透）类型定义完整匹配。

### 基本原理
由于该测试文件的导入区与各测试用例调用均需调整（变更幅度大于 30%），根据文件修改决策树选择使用 `write_file` 完整重写测试文件，确保无残留错误引用。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #concept/executor #scope/core #ai/instruct #task/domain/testing #task/object/relative-color-tests #task/action/fix #task/state/continue

---

### Script

#### Acts 1: 更新测试文件 relativeColorUtils.test.ts

我们将完整重写 `src/utils/__tests__/relativeColorUtils.test.ts`，将所有相对色彩相关的函数导入与调用重定向至 `src/core/color/relativeColor.ts`。

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
    const correctOption = q.options![q.correctIndex!];
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

    const hitRes = checkRelativeColorHit('LIGHTNESS_INDUCTION', q.idealRightCenter!, q);
    expect(hitRes.isHit).toBe(true);
  });

  // === 4. 阿尔伯斯 HUE_INDUCTION 测试 ===
  it('HUE_INDUCTION - should generate hue induction question with ideal right color', () => {
    const q = generateHueInductionQuestion(10);
    expect(q.bgLeft).toBeDefined();
    expect(q.bgRight).toBeDefined();
    expect(q.targetLeftCenter).toBeDefined();
    expect(q.options).toBeDefined();

    const correctOption = q.options![q.correctIndex!];
    const hitRes = checkRelativeColorHit('HUE_INDUCTION', correctOption, q);
    expect(hitRes.isHit).toBe(true);
  });

  // === 5. 阿尔伯斯 DECONTEXTUAL_2AFC 测试 ===
  it('DECONTEXTUAL_2AFC - should evaluate binary choice correctly and have decoupled backgrounds', () => {
    const q = generateDecontextual2AfcQuestion(5);
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
- 执行测试套件命令（例如 `npm run test` 或 `npx vitest run src/utils/__tests__/relativeColorUtils.test.ts`）验证所有用例运行状态。
- 若所有测试通过且无需其他修改，可提交当前任务。
