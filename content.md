好的，针对 TypeScript 编译器报告的两个问题（`NegVertexFittingView` 中未使用的 `useCallback`，以及单测文件 `colorUtils.test.ts` 仍在使用已解耦移除的 `'ALL'` 参数），我将生成修复计划同步更新代码与测试用例。

## [WIP] fix: 清理未使用的 import 并同步单测至独立 color_all 生成器

### 错误分析
1. **TS6133**: 在 `NegVertexFittingView.tsx` 中，由于提取并直接声明了事件处理函数，导致顶部导入的 `useCallback` 从未被使用，触发了 `noUnusedLocals` / `TS6133` 错误。
2. **TS2345**: 在此前重构中，我们已成功将 `color_all` 的 3D 色彩拾取生成与命中检测从 `colorUtils.ts` 剥离至 `cards/color_all/utils/generator.ts`，并将 `ColorMode` 严格限定为纯标量 `'H' | 'S' | 'V'`。而 `colorUtils.test.ts` 中的一条历史单元测试依然在向 `generateColorQuestion` 和 `checkColorHit` 传递已废弃的 `'ALL'` 控制标记，导致类型检查报错。

### 用户需求
1. 清理 `NegVertexFittingView.tsx` 顶部未使用的 `useCallback` 导入。
2. 将 `colorUtils.test.ts` 中针对综合拾色（ALL 模式）的测试逻辑，同步更新为调用新的独立生成模块 `cards/color_all/utils/generator.ts`。

### 评论
单元测试与被测契约保持 100% 同步是保证重构不发生回退的关键。将测试用例直接对准解耦后的 `cards/color_all/utils/generator`，能精准验证独立出来的 3D 拾色算法逻辑。

### 目标
1. 在 `NegVertexFittingView.tsx` 移除 `useCallback`。
2. 在 `src/utils/__tests__/colorUtils.test.ts` 中引入 `generateColorAllQuestion` 与 `checkColorAllHit`，并更新测试断言。

### 基本原理
对于已被解耦的正交业务逻辑，单测应当随之对应更新为测试新的自治模块。解耦后的 `ColorAllHitResult` 返回明确的 `deltaEError`，单测据此进行精确断言即可。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #scope/dx #ai/instruct #task/domain/testing #task/object/test-sync #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 清理 `NegVertexFittingView.tsx` 中未使用的 `useCallback`

~~~~~act
patch_file
src/cards/neg_vertex_fitting/NegVertexFittingView.tsx
~~~~~
~~~~~typescript.old
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
~~~~~
~~~~~typescript.new
import { useEffect, useRef, useState } from 'preact/hooks';
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
~~~~~

#### Acts 2: 更新 `colorUtils.test.ts` 中的 `color_all` 测试用例

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript.old
import { describe, expect, it } from 'vitest';
import { checkColorHit, generateColorQuestion, hsvToHex } from '../../core/color/colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../../core/color/oklchUtils';
import { PALETTE } from '../theme';
~~~~~
~~~~~typescript.new
import { describe, expect, it } from 'vitest';
import {
  checkHit as checkColorAllHit,
  generateQuestion as generateColorAllQuestion,
} from '../../cards/color_all/utils/generator';
import { checkColorHit, generateColorQuestion, hsvToHex } from '../../core/color/colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../../core/color/oklchUtils';
import { PALETTE } from '../theme';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
  it('color_all checkHit - should evaluate full color matching using OKLab delta E with full user HSV tuple', () => {
    const questionALL = generateColorAllQuestion(1);
    questionALL.targetH = 0;
    questionALL.targetS = 100;
    questionALL.targetV = 100;

    // Exact match in ALL mode
    const hitExact = checkColorAllHit([0, 100, 100], questionALL);
    expect(hitExact.isHit).toBe(true);
    expect(hitExact.deltaEError).toBe(0);

    // Large deviation in ALL mode
    const hitFar = checkColorAllHit([180, 20, 20], questionALL);
    expect(hitFar.isHit).toBe(false);
    expect(hitFar.deltaEError).toBeGreaterThan(0.2);
  });
~~~~~

### 下一步建议
1. **重新执行类型检查与测试**：在终端运行 `npm run build` 或 `npx vitest run`，验证全部测试与类型编译均通过。
2. **发起提交**：验证无误后可进行代码提交。
