## [WIP] fix: 修复 TypeScript 编译错误（移除未使用的导入与测试中断言）

### 用户需求
修复在上一轮重构清理死代码后暴露出的 2 处 TypeScript 编译错误：
1. `src/domains/negative_space/components/ShapeMemory2AfcView.tsx:8:8`：`NegativeSpaceHitResult` 已导入但从未被读取。
2. `src/utils/__tests__/colorUtils.test.ts:5:3`：`getToleranceForLevel` 在上一轮重构中已被判定为死代码并从 `colorUtils.ts` 中移除，但测试文件仍尝试导入并断言它。

### 评论
这两处编译错误是在清理死代码过程中的连锁反应。我们需要移除 `ShapeMemory2AfcView.tsx` 中未使用的 `NegativeSpaceHitResult` 导入，并清理 `colorUtils.test.ts` 中测试 `getToleranceForLevel` 的断言代码（因为其已被等价的 `getTargetDeltaEForLevel` 取代）。

### 目标
1. 移除 `ShapeMemory2AfcView.tsx` 中无用的 `NegativeSpaceHitResult` 导入。
2. 移除 `colorUtils.test.ts` 中对 `getToleranceForLevel` 的导入及相关测试行。
3. 确保执行 `npm run build` / `tsc` 时零错误通过。

### 基本原理
保持测试套件与源代码接口的一致性，彻底清理已废弃函数的遗留测试断言。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #scope/core #scope/dx #ai/refine #task/domain/refactoring #task/object/type-errors #task/action/bug-fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 修复 TypeScript 编译与测试断言错误

~~~~~act
patch_file
src/domains/negative_space/components/ShapeMemory2AfcView.tsx
~~~~~
~~~~~typescript
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';
~~~~~
~~~~~typescript
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  checkColorHit,
  generateColorQuestion,
  getToleranceForLevel,
  hsvToHex,
} from '../../core/color/colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../../core/color/oklchUtils';
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  checkColorHit,
  generateColorQuestion,
  hsvToHex,
} from '../../core/color/colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../../core/color/oklchUtils';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript
    expect(tolL1).toBeCloseTo(0.12, 2);
    expect(tolL35).toBeCloseTo(0.008, 3);
    expect(tolL1).toBeGreaterThan(tolL35);

    expect(getToleranceForLevel('H', 1)).toBe(tolL1);
  });

  it('checkColorHit - should dynamically adjust angular/value tolerance using OKLab delta E', () => {
~~~~~
~~~~~typescript
    expect(tolL1).toBeCloseTo(0.12, 2);
    expect(tolL35).toBeCloseTo(0.008, 3);
    expect(tolL1).toBeGreaterThan(tolL35);
  });

  it('checkColorHit - should dynamically adjust angular/value tolerance using OKLab delta E', () => {
~~~~~

### 下一步建议
- 执行 `npm run build` 验证 TypeScript 编译通过。
- 执行 `npm test` 运行单元测试套件，确认重构后所有行为符合预期。
