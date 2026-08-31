## [WIP] fix: resolve typescript errors related to missing imports, incorrect typings, and legacy test imports

### 用户需求
修复 TypeScript 类型检查失败的问题：
1. `src/core/contracts.ts` 中缺失 `CardTags` 和 `SettingFieldSchema` 类型导入。
2. `src/core/registry.ts` 中 `registerCardLocales` 调用的类型不匹配。
3. `src/modules/star` 系列卡片中 `userAnswer` 类型在 `index.tsx` 和子组件的 Props 定义之间不匹配。
4. `src/utils/__tests__/geometry.test.ts` 依然引用了旧的 `../../packs/star/utils` 路径及废弃的函数名。

### 评论
这些错误属于系统重构后的类型断层问题。解决它们将使得 TypeScript 编译完全通过，提升代码库的类型安全度。

### 目标
1. 补全缺失的类型导入。
2. 添加必要的类型断言或更改，使 `registry.ts` 的类型兼容。
3. 更新 `HorizontalDoubleView`, `RotatedDoubleView`, `SingleAnchorView` 的 Props，使 `userAnswer` 接收纯 `StarHitResult | null`。
4. 重写 `geometry.test.ts` 导入路径，使用更新后的工具函数 (`evaluatePointGridHit` 等) 来确保单元测试正常运行。

### 基本原理
直接修复类型错误，对齐重构后的文件路径与接口签名，是维护健康代码库的必要环节。特别是 `geometry.test.ts` 需要随着架构演进而迁移到新的函数调用模式。

### 标签
#intent/fix #flow/ready #priority/high #comp/core #comp/tests #concept/executor #scope/core #human/lead #task/domain/testing #task/object/type-checker #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 `src/core/contracts.ts` 的类型导入
引入缺失的 `SettingFieldSchema` 与 `CardTags`。

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript.old
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../storage/db/schema';
import type {
  AbstractionSettings,
  BaseModuleSettings,
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../storage/settings';
import type { Point } from '../types';
import type { CardDefinition, PackMeta } from '../types/card';
~~~~~
~~~~~typescript.new
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { UnifiedTrialRecord } from '../storage/db/schema';
import type {
  AbstractionSettings,
  BaseModuleSettings,
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../storage/settings';
import type { Point } from '../types';
import type { CardDefinition, CardTags, PackMeta } from '../types/card';
~~~~~

#### Acts 2: 修复 `src/core/registry.ts` 的语言包类型
修复类型不兼容错误。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
    // 1. 挂载私有多语言
    if (manifest.locales) {
      i18n.registerCardLocales(manifest.id, manifest.locales);
    }
~~~~~
~~~~~typescript.new
    // 1. 挂载私有多语言
    if (manifest.locales) {
      i18n.registerCardLocales(manifest.id, manifest.locales as Record<string, Record<string, unknown>>);
    }
~~~~~

#### Acts 3: 修复 `src/modules/star/HorizontalDoubleCard/HorizontalDoubleView.tsx` 类型
对齐 `userAnswer` 类型。

~~~~~act
patch_file
src/modules/star/HorizontalDoubleCard/HorizontalDoubleView.tsx
~~~~~
~~~~~typescript.old
export interface HorizontalDoubleViewProps {
  question: HorizontalDoubleQuestion;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: StarHitResult } | null;
  onAnswer: (val: { clickPoint: Point; hitResult: StarHitResult }) => void;
  disabled?: boolean;
}
~~~~~
~~~~~typescript.new
export interface HorizontalDoubleViewProps {
  question: HorizontalDoubleQuestion;
  showAnswer: boolean;
  userAnswer: StarHitResult | null;
  onAnswer: (val: { clickPoint: Point; hitResult: StarHitResult }) => void;
  disabled?: boolean;
}
~~~~~
~~~~~act
patch_file
src/modules/star/HorizontalDoubleCard/HorizontalDoubleView.tsx
~~~~~
~~~~~typescript.old
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
~~~~~
~~~~~typescript.new
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
~~~~~

#### Acts 4: 修复 `src/modules/star/RotatedDoubleCard/RotatedDoubleView.tsx` 类型
对齐 `userAnswer` 类型。

~~~~~act
patch_file
src/modules/star/RotatedDoubleCard/RotatedDoubleView.tsx
~~~~~
~~~~~typescript.old
export interface RotatedDoubleViewProps {
  question: RotatedDoubleQuestion;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: StarHitResult } | null;
  onAnswer: (val: { clickPoint: Point; hitResult: StarHitResult }) => void;
  disabled?: boolean;
}
~~~~~
~~~~~typescript.new
export interface RotatedDoubleViewProps {
  question: RotatedDoubleQuestion;
  showAnswer: boolean;
  userAnswer: StarHitResult | null;
  onAnswer: (val: { clickPoint: Point; hitResult: StarHitResult }) => void;
  disabled?: boolean;
}
~~~~~
~~~~~act
patch_file
src/modules/star/RotatedDoubleCard/RotatedDoubleView.tsx
~~~~~
~~~~~typescript.old
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
~~~~~
~~~~~typescript.new
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
~~~~~

#### Acts 5: 修复 `src/modules/star/SingleAnchorCard/SingleAnchorView.tsx` 类型
对齐 `userAnswer` 类型。

~~~~~act
patch_file
src/modules/star/SingleAnchorCard/SingleAnchorView.tsx
~~~~~
~~~~~typescript.old
export interface SingleAnchorViewProps {
  question: SingleAnchorQuestion;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: StarHitResult } | null;
  onAnswer: (val: { clickPoint: Point; hitResult: StarHitResult }) => void;
  disabled?: boolean;
}
~~~~~
~~~~~typescript.new
export interface SingleAnchorViewProps {
  question: SingleAnchorQuestion;
  showAnswer: boolean;
  userAnswer: StarHitResult | null;
  onAnswer: (val: { clickPoint: Point; hitResult: StarHitResult }) => void;
  disabled?: boolean;
}
~~~~~
~~~~~act
patch_file
src/modules/star/SingleAnchorCard/SingleAnchorView.tsx
~~~~~
~~~~~typescript.old
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
~~~~~
~~~~~typescript.new
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
~~~~~

#### Acts 6: 更新测试导入 `src/utils/__tests__/geometry.test.ts`
将遗留测试的导入指向新的函数与路径。

~~~~~act
patch_file
src/utils/__tests__/geometry.test.ts
~~~~~
~~~~~typescript.old
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

describe('geometry utils', () => {
~~~~~
~~~~~typescript.new
import { describe, expect, it } from 'vitest';
import { getDynamicCrosshairMetrics, getDynamicDotRadius, getGridMinSpacing } from '../../core/canvas/drawPointGrid';
import { evaluatePointGridHit, findNearestGridPoint } from '../../core/geometry/pointGrid';
import { generateBipolarGridPoints, generatePolarGridPoints } from '../../modules/star/_shared/gridGenerators';
import { calcDistance, rotatePoint } from '../../modules/star/_shared/pointMath';
import { generateHorizontalDoubleQuestion } from '../../modules/star/HorizontalDoubleCard/generator';
import { generateRotatedDoubleQuestion } from '../../modules/star/RotatedDoubleCard/generator';
import { generateSingleAnchorQuestion } from '../../modules/star/SingleAnchorCard/generator';
import type { StarSettings } from '../../storage/settings';

const mockSettings: StarSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};

describe('geometry utils', () => {
~~~~~
~~~~~act
patch_file
src/utils/__tests__/geometry.test.ts
~~~~~
~~~~~typescript.old
  it('checkHit - should detect hit when click is very close to target', () => {
    const targetB = { x: 10, y: 10 };
    const grid = [
      { x: 10, y: 10 },
      { x: 30, y: 30 },
    ];
    const hitResult = checkHit({ x: 10.1, y: 10.1 }, targetB, grid);
    expect(hitResult.isHit).toBe(true);
    expect(hitResult.errorDistance).toBeLessThan(0.5);
  });
~~~~~
~~~~~typescript.new
  it('checkHit - should detect hit when click is very close to target', () => {
    const targetB = { x: 10, y: 10 };
    const grid = [
      { x: 10, y: 10 },
      { x: 30, y: 30 },
    ];
    const hitResult = evaluatePointGridHit({ x: 10.1, y: 10.1 }, targetB, grid);
    expect(hitResult.isHit).toBe(true);
    expect(hitResult.errorDistance).toBeLessThan(0.5);
  });
~~~~~
~~~~~act
patch_file
src/utils/__tests__/geometry.test.ts
~~~~~
~~~~~typescript.old
  it('generateQuestion - should generate valid question data for single, double_h and double_r', () => {
    const qSingle = generateQuestion('single', 1);
    expect(qSingle.mode).toBe('single');
    expect(qSingle.anchorA).toBeDefined();
    expect(qSingle.targetB).toBeDefined();
    expect(qSingle.distractorPoints.length).toBeGreaterThan(0);

    const qDoubleH = generateQuestion('double_h', 10);
    expect(qDoubleH.mode).toBe('double_h');
    expect(qDoubleH.anchorC).toBeDefined();

    const qDoubleR = generateQuestion('double_r', 15);
    expect(qDoubleR.mode).toBe('double_r');
    expect(qDoubleR.rotationAngle).toBeDefined();
  });

  it('generateQuestion with manual targeting - should generate targeted angles with higher probability', () => {
    // 锁定扇区 0 (对应 0° 正东，允许加权抖动 ±20°)
    const options = {
      targetingMode: 'manual' as const,
      targetSectors: [0],
    };

    let targetedCount = 0;
    const totalRuns = 200;

    for (let i = 0; i < totalRuns; i++) {
      const q = generateQuestion('single', 5, options);
      // 0° ± 25° 范围 (0~25° 或 335~360°)
      if (q.angleDegree <= 25 || q.angleDegree >= 335) {
        targetedCount++;
      }
    }

    const ratio = targetedCount / totalRuns;
    expect(ratio).toBeGreaterThan(0.4);
  });
~~~~~
~~~~~typescript.new
  it('generateQuestion - should generate valid question data for single, double_h and double_r', () => {
    const qSingle = generateSingleAnchorQuestion(1, mockSettings);
    expect(qSingle.anchorA).toBeDefined();
    expect(qSingle.targetB).toBeDefined();
    expect(qSingle.distractorPoints.length).toBeGreaterThan(0);

    const qDoubleH = generateHorizontalDoubleQuestion(10, mockSettings);
    expect(qDoubleH.anchorC).toBeDefined();

    const qDoubleR = generateRotatedDoubleQuestion(15, mockSettings);
    expect(qDoubleR.rotationAngle).toBeDefined();
  });

  it('generateQuestion with manual targeting - should generate targeted angles with higher probability', () => {
    // 锁定扇区 0 (对应 0° 正东，允许加权抖动 ±20°)
    const options: StarSettings = {
      ...mockSettings,
      targetingMode: 'manual',
      manualTargetSectors: [0],
    };

    let targetedCount = 0;
    const totalRuns = 200;

    for (let i = 0; i < totalRuns; i++) {
      const q = generateSingleAnchorQuestion(5, options);
      // 0° ± 25° 范围 (0~25° 或 335~360°)
      if (q.angleDegree <= 25 || q.angleDegree >= 335) {
        targetedCount++;
      }
    }

    const ratio = targetedCount / totalRuns;
    expect(ratio).toBeGreaterThan(0.4);
  });
~~~~~

### 下一步建议
1. 运行 `npm run checkf` 确保没有漏网的 TypeScript 错误。
2. 运行 `npm run test` 确保所有单元测试能够顺利通过。
