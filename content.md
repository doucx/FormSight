测试应当**伴随卡片业务逻辑下沉（Feature Co-location）**，同时将纯粹的底层色彩空间数学运算抽离至 `core/color/__tests__` 中。

这样做的核心收益是：
1. **彻底消除测试中的防御性断言**：旧测试因为依赖拥有 10+ 可选字段的胖接口，必须写满 `if (!q.options) throw ...` 等类型断言；下沉后直接享受各卡片非空强类型定义的完整约束。
2. **职责边界正交隔离**：各卡片生成与评估逻辑在卡片目录内自成闭环（测试即文档），卡片的改动不再跨模块影响其他测试。

以下为执行测试下沉重构的实施计划。

## [WIP] test(cards): 下沉相对色彩测试至各独立卡片模块并建立 oklch 核心算法测试

### 用户需求
修复因删除 `src/core/color/relativeColor.ts` 导致的旧测试文件 `src/utils/__tests__/relativeColorUtils.test.ts` 载入失败问题，将单元测试下沉到各个独立卡片，并为核心色彩算法建立专用测试。

### 评论
旧的集中式测试文件本身就是该坏味道的直接衍生品——当多个不相关业务共用同一个 DTO 与测试用例时，测试代码也会随之退化为充满防御性判断和强转的脆弱代码。将测试与领域代码就近放置（Co-location），是现代微前端/微组件架构的最佳实践。

### 目标
1. 删除旧的集中式测试 `src/utils/__tests__/relativeColorUtils.test.ts`。
2. 在 `src/core/color/__tests__/oklchUtils.test.ts` 中建立底层色彩空间数学（距离计算、色彩映射）的标准单测。
3. 分别在 4 个相对色彩卡片的 `utils/__tests__/generator.test.ts` 中建立高内聚、纯净强类型的测试，消除所有 `if (!q.field) throw` 兜底。

### 基本原理
- **高内聚单元测试（Co-located Unit Testing）**：测试文件与它所测试的模块放置在同一目录层级中，便于随时重构与维护。
- **静态类型红利（Static Contract Dividend）**：由于新卡片的 `QuestionData` 与 `HitResult` 已彻底消除可选字段（Optional Fields），测试可以直接对确定存在的属性进行断言，保证测试代码的干净与健壮。

### 标签
#intent/refine #flow/ready #priority/high #comp/tests #concept/state #scope/dx #ai/instruct #task/domain/testing #task/object/test-co-location #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 移除已失效的旧测试文件

删除原有的集中式 `relativeColorUtils.test.ts`。

~~~~~act
delete_file
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~

#### Acts 2: 建立 `oklchUtils` 核心算法单元测试

在 `src/core/color/__tests__` 中建立底层 OKLab / OKLCH 色彩算法测试。

~~~~~act
write_file
src/core/color/__tests__/oklchUtils.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { getDistractorDistanceForLevel, okLabToHsv } from '../oklchUtils';

describe('oklchUtils core algorithm tests', () => {
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
});
~~~~~

#### Acts 3: 下沉 `rel_vector_shift` 模块测试

编写该卡片生成与判定的专属测试，无需任何类型断言或判空抛错。

~~~~~act
write_file
src/cards/rel_vector_shift/utils/__tests__/generator.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { checkHit, generateQuestion } from '../generator';

describe('rel_vector_shift generator and hit detection', () => {
  it('should generate valid question with exactly 4 candidate options', () => {
    const q = generateQuestion(5);
    expect(q.options.length).toBe(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThanOrEqual(3);
  });

  it('should detect target choice correctly', () => {
    const q = generateQuestion(5);
    const correctOption = q.options[q.correctIndex];
    const result = checkHit(correctOption, q);
    expect(result.isHit).toBe(true);
    expect(result.selectedIndex).toBe(q.correctIndex);
  });

  it('should generate C closer to A at lower difficulty levels', () => {
    const qEasy = generateQuestion(1);
    const hueDiffEasy = Math.min(
      Math.abs(qEasy.colorA[0] - qEasy.colorC[0]),
      360 - Math.abs(qEasy.colorA[0] - qEasy.colorC[0]),
    );
    expect(hueDiffEasy).toBeLessThanOrEqual(10.5);

    let maxHueDiffHard = 0;
    for (let i = 0; i < 20; i++) {
      const qHard = generateQuestion(35);
      const diff = Math.min(
        Math.abs(qHard.colorA[0] - qHard.colorC[0]),
        360 - Math.abs(qHard.colorA[0] - qHard.colorC[0]),
      );
      if (diff > maxHueDiffHard) maxHueDiffHard = diff;
    }
    expect(maxHueDiffHard).toBeGreaterThan(40);
  });
});
~~~~~

#### Acts 4: 下沉 `rel_lightness_induction` 模块测试

~~~~~act
write_file
src/cards/rel_lightness_induction/utils/__tests__/generator.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { checkHit, generateQuestion } from '../generator';

describe('rel_lightness_induction generator and hit detection', () => {
  it('should generate dual background with contrast and ideal center', () => {
    const q = generateQuestion(5);
    expect(q.bgLeft).toBeDefined();
    expect(q.bgRight).toBeDefined();
    expect(q.targetLeftCenter).toBeDefined();
    expect(q.idealRightCenter).toBeDefined();

    const hitRes = checkHit(q.idealRightCenter, q);
    expect(hitRes.isHit).toBe(true);
  });

  it('should detect inaccurate lightness value as miss', () => {
    const q = generateQuestion(15);
    const wrongColor: [number, number, number] = [
      q.idealRightCenter[0],
      q.idealRightCenter[1],
      Math.min(100, q.idealRightCenter[2] + 40),
    ];

    const missRes = checkHit(wrongColor, q);
    expect(missRes.isHit).toBe(false);
  });
});
~~~~~

#### Acts 5: 下沉 `rel_hue_induction` 模块测试

~~~~~act
write_file
src/cards/rel_hue_induction/utils/__tests__/generator.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { checkHit, generateQuestion } from '../generator';

describe('rel_hue_induction generator and hit detection', () => {
  it('should generate hue induction question with 4 options and valid target', () => {
    const q = generateQuestion(10);
    expect(q.bgLeft).toBeDefined();
    expect(q.bgRight).toBeDefined();
    expect(q.targetLeftCenter).toBeDefined();
    expect(q.options.length).toBe(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThanOrEqual(3);

    const correctOption = q.options[q.correctIndex];
    const hitRes = checkHit(correctOption, q);
    expect(hitRes.isHit).toBe(true);
  });

  it('should reject non-target options', () => {
    const q = generateQuestion(10);
    const wrongIndex = (q.correctIndex + 1) % q.options.length;
    const wrongOption = q.options[wrongIndex];

    const missRes = checkHit(wrongOption, q);
    expect(missRes.isHit).toBe(false);
  });
});
~~~~~

#### Acts 6: 下沉 `rel_decontextual_2afc` 模块测试

~~~~~act
write_file
src/cards/rel_decontextual_2afc/utils/__tests__/generator.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { checkHit, generateQuestion } from '../generator';

describe('rel_decontextual_2afc generator and hit detection', () => {
  it('should evaluate binary choice correctly and have decoupled backgrounds', () => {
    const q = generateQuestion(5);
    expect(q.largerPhysicalSide).toMatch(/^(A|B)$/);
    expect(q.physicalValueDiff).toBeGreaterThan(0);

    const correctChoice = q.largerPhysicalSide;
    const wrongChoice: 'A' | 'B' = correctChoice === 'A' ? 'B' : 'A';

    const hitRes = checkHit(correctChoice, q);
    expect(hitRes.isHit).toBe(true);

    const missRes = checkHit(wrongChoice, q);
    expect(missRes.isHit).toBe(false);
  });
});
~~~~~

### 下一步建议
1. **测试执行**：在终端运行 `npm test`，确认所有下沉测试套件全部通过。
2. **扩展其他卡片下沉测试**：参考相对色彩卡片的成功经验，为 `abs_*`、`star_*` 与 `persp_*` 卡片逐步补齐各自目录内的 `utils/__tests__/generator.test.ts`。
