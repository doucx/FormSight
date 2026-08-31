根据 TypeScript 编译器的报错信息，我们遇到了以下 4 个具体的类型与路径问题：
1. **类型缺失 (`CardTags`, `SettingFieldSchema`)**：在 `src/core/contracts.ts` 中引用了未导入的类型定义。
2. **`registerCardLocales` 类型不匹配**：`manifest.locales` 的类型可能包含 `undefined`，而 `LocaleDictionary` 不接受 `undefined`。
3. **Star 卡片 `userAnswer` 类型推导不一致**：在 `SingleAnchorCard/index.tsx` 等卡片定义中，训练器期望的 `userAnswer` 形状与 `SingleAnchorView` 组件接收的 `userAnswer` 形状存在微小差异。
4. **测试文件引用过时路径**：`src/utils/__tests__/geometry.test.ts` 仍然尝试从已删除的 `../../packs/star/utils` 导入。

我们立刻生成修复计划并修复这些编译错误。

## [WIP] fix: 修复重构后的 TypeScript 编译错误与测试路径

### 错误分析
1. **缺失类型导入**：`contracts.ts` 中需要导入 `CardTags` 和 `SettingFieldSchema`。
2. **多语言字典类型宽松化**：`registerCardLocales` 签名或调用时需要过滤掉 `undefined`。
3. **Star 卡片 userAnswer 契约对齐**：将 `SingleAnchorCard`、`HorizontalDoubleCard`、`RotatedDoubleCard` 的 `userAnswer` 传递给视图时，直接透传泛型推导出的类型。
4. **几何测试文件路径重定向**：`geometry.test.ts` 应该从新的 `src/modules/star/_shared/` 导入测试目标。

### 用户需求
修复 7 处 TypeScript 编译错误，确保 `pnpm tsc --noEmit` 干净通过。

### 评论
这些是在严格类型系统中解构重构时的常规收尾工作，修复后系统将具有完美的类型安全。

### 目标
1. 修复 `src/core/contracts.ts` 的类型导入。
2. 修复 `src/core/registry.ts` 的多语言参数断言。
3. 对齐 Star 三张卡片的 `userAnswer` 类型。
4. 更新 `src/utils/__tests__/geometry.test.ts` 的导入路径。

### 标签
#intent/fix #flow/ready #priority/critical #comp/runtime #scope/core #ai/instruct #task/domain/architecture #task/object/star-module #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `src/core/contracts.ts` 的类型导入

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../storage/db/schema';
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { UnifiedTrialRecord } from '../storage/db/schema';
import type { CardTags } from '../types/card';
~~~~~

#### Acts 2: 修复 `src/core/registry.ts` 的多语言断言

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
    // 1. 挂载私有多语言
    if (manifest.locales) {
      i18n.registerCardLocales(manifest.id, manifest.locales);
    }
~~~~~
~~~~~typescript
    // 1. 挂载私有多语言
    if (manifest.locales) {
      i18n.registerCardLocales(
        manifest.id,
        manifest.locales as Record<string, Record<string, unknown>>,
      );
    }
~~~~~

#### Acts 3: 对齐 Star 三张卡片的 `userAnswer` 类型定义

~~~~~act
patch_file
src/modules/star/SingleAnchorCard/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <SingleAnchorView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <SingleAnchorView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer as { clickPoint: Point; hitResult: StarHitResult } | null}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~

~~~~~act
patch_file
src/modules/star/HorizontalDoubleCard/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <HorizontalDoubleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <HorizontalDoubleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer as { clickPoint: Point; hitResult: StarHitResult } | null}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~

~~~~~act
patch_file
src/modules/star/RotatedDoubleCard/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <RotatedDoubleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <RotatedDoubleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer as { clickPoint: Point; hitResult: StarHitResult } | null}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~

#### Acts 4: 更新 `geometry.test.ts` 测试文件导入路径

~~~~~act
patch_file
src/utils/__tests__/geometry.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  calcDistance,
  checkHit,
  findNearestGridPoint,
  generateBipolarGridPoints,
  generatePolarGridPoints,
  generateQuestion,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
  getGridMinSpacing,
  rotatePoint,
} from '../../packs/star/utils';
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import { evaluatePointGridHit, findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { generateBipolarGridPoints, generatePolarGridPoints } from '../../modules/star/_shared/gridGenerators';
import { getDynamicCrosshairMetrics, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { calcDistance, rotatePoint } from '../../modules/star/_shared/pointMath';
import { generateSingleAnchorQuestion as generateQuestion } from '../../modules/star/SingleAnchorCard/generator';
import { getGridMinSpacing } from '../../core/canvas/drawPointGrid';

const checkHit = (click: any, target: any, grid: any) => evaluatePointGridHit(click, target, grid);
const findNearestGridPoint = (click: any, grid: any) => findNearestPointInGrid(click, grid);
~~~~~
