我已经定位到了这 11 处 TypeScript 编译错误。主要包括三类问题：
1. 视图组件解构中存在声明但未使用的 `userAnswer` / `hitResult` 参数。
2. `NegVertexFittingView.tsx` 中使用了 CommonJS 的 `require` 动态导入而非标准 ES 模块静态导入，且存在未使用的局部函数。
3. 测试用例仍指向已重构迁移至 Flat Cards 架构前的旧路径 `../../packs/*`。

我们将针对这 9 个文件进行精确修正。

## [WIP] fix(types): 修复未使用的变量声明、模块引入及迁移测试路径

### 错误分析

1. **未使用变量错误 (TS6133)**: 
   - `AbsPolygonDecimationView`, `AbsTdGesture2afcView`, `AbsTdHull2afcView`, `AbsTdNotan2afcView` 的组件参数解构中声明了 `userAnswer` 但未实际使用。
   - `neg_vertex_fitting/index.tsx` 引入了未使用的 `evaluateAnswer`。
   - `rel_decontextual_2afc/index.tsx` 的 `extractRecordDetails` 中未读取 `hitResult`。
2. **非法 require 引入 (TS2580)**: 
   - `NegVertexFittingView.tsx` 在 ES Module / Vite 源码环境下调用了 CommonJS 的 `require('./utils/generator')`，导致 TS 编译失败。
3. **已废弃路径引用 (TS2307)**:
   - `negativeSpaceUtils.test.ts` 和 `relativeColorUtils.test.ts` 依然引用了旧的 `../../packs/...` 路径，需更新为新的 Flat Cards 和 Core Utils 模块路径。

### 用户需求

修复所有 TypeScript 类型检查错误，使 `tsc --noEmit` 和 `npm run checkf` 能够顺利通过。

### 评论

这是卡片扁平化解耦重构后的重要收尾工作，确保静态类型系统在全工程各模块与测试套件间保持严谨一致。

### 目标

1. 清理 4 个 2AFC/N-AFC 视图组件中未使用的 `userAnswer` 声明。
2. 在 `NegVertexFittingView.tsx` 中改用标准的 ES Module 顶层 `import { evaluateAnswer }`，并接入 `onCommitPoint` 处理函数。
3. 清理 `neg_vertex_fitting/index.tsx` 与 `rel_decontextual_2afc/index.tsx` 中的未使用标识符。
4. 重定向并更新 `negativeSpaceUtils.test.ts` 与 `relativeColorUtils.test.ts` 中的导入路径与测试断言。

### 基本原理

通过标准 ES 模块导入消除 `require` 依赖，移除多余解构字段，并将重构后的单元测试对齐到新的 Flat Cards generator 与 core utils 结构。

### 标签

#intent/fix #flow/ready #priority/high #comp/cards #comp/tests #concept/parser #scope/core #ai/instruct #task/domain/testing #task/object/typecheck-fixes #task/action/bug-fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 修复卡片视图组件中未使用的变量与 require 引入

~~~~~act
patch_file
src/cards/abs_polygon_decimation/AbsPolygonDecimationView.tsx
~~~~~
~~~~~tsx.old
export function AbsPolygonDecimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsPolygonDecimationViewProps) {
~~~~~
~~~~~tsx.new
export function AbsPolygonDecimationView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsPolygonDecimationViewProps) {
~~~~~

~~~~~act
patch_file
src/cards/abs_td_gesture_2afc/AbsTdGesture2afcView.tsx
~~~~~
~~~~~tsx.old
export function AbsTdGesture2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdGesture2afcViewProps) {
~~~~~
~~~~~tsx.new
export function AbsTdGesture2afcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdGesture2afcViewProps) {
~~~~~

~~~~~act
patch_file
src/cards/abs_td_hull_2afc/AbsTdHull2afcView.tsx
~~~~~
~~~~~tsx.old
export function AbsTdHull2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdHull2afcViewProps) {
~~~~~
~~~~~tsx.new
export function AbsTdHull2afcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdHull2afcViewProps) {
~~~~~

~~~~~act
patch_file
src/cards/abs_td_notan_2afc/AbsTdNotan2afcView.tsx
~~~~~
~~~~~tsx.old
export function AbsTdNotan2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdNotan2afcViewProps) {
~~~~~
~~~~~tsx.new
export function AbsTdNotan2afcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdNotan2afcViewProps) {
~~~~~

~~~~~act
patch_file
src/cards/neg_vertex_fitting/NegVertexFittingView.tsx
~~~~~
~~~~~tsx.old
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { drawPolygonCanvas } from '../../core/canvas/drawPolygon';
import type { Point } from '../../types';
import { CANVAS_THEME, hexToRgba } from '../../utils/theme';
import { FITTING_CANVAS_SIZE, type HitResult, type QuestionData } from './types';

export interface NegVertexFittingViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function NegVertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: NegVertexFittingViewProps) {
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!question.vertices) return;
    drawPolygonCanvas({
      canvas: leftFittingRef.current,
      vertices: question.vertices,
      size: FITTING_CANVAS_SIZE,
      fillColor: CANVAS_THEME.shape.fill,
      strokeColor: CANVAS_THEME.shape.stroke,
    });
  }, [question.vertices]);

  const handleCustomOverlayRender = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (question.truncatedVertices && question.truncatedVertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(question.truncatedVertices[0].x, question.truncatedVertices[0].y);
        for (let i = 1; i < question.truncatedVertices.length; i++) {
          ctx.lineTo(question.truncatedVertices[i].x, question.truncatedVertices[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = CANVAS_THEME.shape.fill;
        ctx.fill();
        ctx.strokeStyle = CANVAS_THEME.shape.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (showAnswer && question.vertices) {
        ctx.beginPath();
        ctx.moveTo(question.vertices[0].x, question.vertices[0].y);
        for (let i = 1; i < question.vertices.length; i++) {
          ctx.lineTo(question.vertices[i].x, question.vertices[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = hexToRgba(CANVAS_THEME.status.hit, 0.7);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [question.truncatedVertices, question.vertices, showAnswer],
  );

  const handleCommitPoint = (clickPoint: Point) => {
    // 采用自身 evaluateAnswer 判定
    const { evaluateAnswer } = require('./utils/generator');
    const hitResult: HitResult = evaluateAnswer(clickPoint, question);
    if (!hitResult.isWithinRange) return;
    onAnswer({ clickPoint, hitResult });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={FITTING_CANVAS_SIZE}
          gridPoints={question.distractorPoints || []}
          targetPoint={question.targetPoint}
          userNearestPoint={userAnswer?.nearestGridPoint}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          customOverlayRender={handleCustomOverlayRender}
          onCommitPoint={(pt) => {
            const hitResult = require('./utils/generator').evaluateAnswer(pt, question);
            if (!hitResult.isWithinRange) return;
            onAnswer({ clickPoint: pt, hitResult });
          }}
        />
      </div>
    </div>
  );
}
~~~~~
~~~~~tsx.new
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { drawPolygonCanvas } from '../../core/canvas/drawPolygon';
import type { Point } from '../../types';
import { CANVAS_THEME, hexToRgba } from '../../utils/theme';
import { FITTING_CANVAS_SIZE, type HitResult, type QuestionData } from './types';
import { evaluateAnswer } from './utils/generator';

export interface NegVertexFittingViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function NegVertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: NegVertexFittingViewProps) {
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!question.vertices) return;
    drawPolygonCanvas({
      canvas: leftFittingRef.current,
      vertices: question.vertices,
      size: FITTING_CANVAS_SIZE,
      fillColor: CANVAS_THEME.shape.fill,
      strokeColor: CANVAS_THEME.shape.stroke,
    });
  }, [question.vertices]);

  const handleCustomOverlayRender = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (question.truncatedVertices && question.truncatedVertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(question.truncatedVertices[0].x, question.truncatedVertices[0].y);
        for (let i = 1; i < question.truncatedVertices.length; i++) {
          ctx.lineTo(question.truncatedVertices[i].x, question.truncatedVertices[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = CANVAS_THEME.shape.fill;
        ctx.fill();
        ctx.strokeStyle = CANVAS_THEME.shape.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (showAnswer && question.vertices) {
        ctx.beginPath();
        ctx.moveTo(question.vertices[0].x, question.vertices[0].y);
        for (let i = 1; i < question.vertices.length; i++) {
          ctx.lineTo(question.vertices[i].x, question.vertices[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = hexToRgba(CANVAS_THEME.status.hit, 0.7);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [question.truncatedVertices, question.vertices, showAnswer],
  );

  const handleCommitPoint = useCallback(
    (clickPoint: Point) => {
      const hitResult: HitResult = evaluateAnswer(clickPoint, question);
      if (!hitResult.isWithinRange) return;
      onAnswer({ clickPoint, hitResult });
    },
    [question, onAnswer],
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={FITTING_CANVAS_SIZE}
          gridPoints={question.distractorPoints || []}
          targetPoint={question.targetPoint}
          userNearestPoint={userAnswer?.nearestGridPoint}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          customOverlayRender={handleCustomOverlayRender}
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/cards/neg_vertex_fitting/index.tsx
~~~~~
~~~~~tsx.old
import { evaluateAnswer, generateQuestion } from './utils/generator';
~~~~~
~~~~~tsx.new
import { generateQuestion } from './utils/generator';
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/index.tsx
~~~~~
~~~~~tsx.old
    extractRecordDetails: (q, hitResult, userVal) => ({
~~~~~
~~~~~tsx.new
    extractRecordDetails: (q, _hitResult, userVal) => ({
~~~~~

#### Acts 2: 更新单元测试中的模块导入与断言适配

~~~~~act
patch_file
src/utils/__tests__/negativeSpaceUtils.test.ts
~~~~~
~~~~~ts.old
import { describe, expect, it } from 'vitest';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  calcPolygonArea,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
  generateRandomPolygon,
  getNegativeSpaceToleranceForLevel,
} from '../../packs/negative_space/utils';

describe('negativeSpaceUtils', () => {
  it('calcPolygonArea - should calculate rectangle and triangle area accurately via Shoelace formula', () => {
    // 100x100 正方形 -> 面积 10000
    const rect = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(calcPolygonArea(rect)).toBe(10000);

    // 直角三角形 (底 60, 高 80) -> 面积 2400
    const triangle = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 0, y: 80 },
    ];
    expect(calcPolygonArea(triangle)).toBe(2400);

    // 顶点少于 3 个应返回 0
    expect(
      calcPolygonArea([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBe(0);
  });

  it('getNegativeSpaceToleranceForLevel - should provide decreasing tolerance curve', () => {
    const tolL1 = getNegativeSpaceToleranceForLevel(1);
    const tolL35 = getNegativeSpaceToleranceForLevel(35);

    expect(tolL1).toBe(10.0);
    expect(tolL35).toBe(1.2);
    expect(tolL1).toBeGreaterThan(tolL35);

    const tolL18 = getNegativeSpaceToleranceForLevel(18);
    expect(tolL18).toBeLessThan(tolL1);
    expect(tolL18).toBeGreaterThan(tolL35);
  });

  it('generateRandomPolygon - should generate valid vertex sequences bounded within canvas', () => {
    for (let l = 1; l <= 35; l += 10) {
      const poly = generateRandomPolygon(l);
      expect(poly.length).toBeGreaterThanOrEqual(3);
      for (const p of poly) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(NEGATIVE_SPACE_CANVAS_SIZE);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(NEGATIVE_SPACE_CANVAS_SIZE);
      }
    }
  });

  it('generateNegativeSpaceQuestion - should create question with consistent areas and ratio', () => {
    const q = generateNegativeSpaceQuestion('RATIO_ESTIMATION', 10);
    expect(q.mode).toBe('RATIO_ESTIMATION');
    expect(q.canvasArea).toBe(NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE);
    expect((q.positiveArea ?? 0) + (q.negativeArea ?? 0)).toBeCloseTo(q.canvasArea, -1);
    expect(q.targetNegativeRatio).toBeGreaterThan(15);
    expect(q.targetNegativeRatio).toBeLessThan(85);
  });

  it('checkNegativeSpaceHit - should validate hit within dynamic tolerance threshold', () => {
    const q = generateNegativeSpaceQuestion('RATIO_ESTIMATION', 1);
    q.targetNegativeRatio = 60.0;
    q.tolerance = 10.0;

    // 命中
    const hitRes = checkNegativeSpaceHit(65.0, q);
    expect(hitRes.isHit).toBe(true);
    expect(hitRes.errorValue).toBe(5.0);

    // 未命中
    const missRes = checkNegativeSpaceHit(75.0, q);
    expect(missRes.isHit).toBe(false);
    expect(missRes.errorValue).toBe(15.0);
  });
});
~~~~~
~~~~~ts.new
import { describe, expect, it } from 'vitest';
import { NEGATIVE_SPACE_CANVAS_SIZE } from '../../cards/neg_ratio_estimation/types';
import {
  calcPolygonArea,
  evaluateAnswer as checkNegativeSpaceHit,
  generateQuestion as generateNegativeSpaceQuestion,
  generateRandomPolygon,
  getNegativeSpaceToleranceForLevel,
} from '../../cards/neg_ratio_estimation/utils/generator';

describe('negativeSpaceUtils', () => {
  it('calcPolygonArea - should calculate rectangle and triangle area accurately via Shoelace formula', () => {
    // 100x100 正方形 -> 面积 10000
    const rect = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(calcPolygonArea(rect)).toBe(10000);

    // 直角三角形 (底 60, 高 80) -> 面积 2400
    const triangle = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 0, y: 80 },
    ];
    expect(calcPolygonArea(triangle)).toBe(2400);

    // 顶点少于 3 个应返回 0
    expect(
      calcPolygonArea([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBe(0);
  });

  it('getNegativeSpaceToleranceForLevel - should provide decreasing tolerance curve', () => {
    const tolL1 = getNegativeSpaceToleranceForLevel(1);
    const tolL35 = getNegativeSpaceToleranceForLevel(35);

    expect(tolL1).toBe(10.0);
    expect(tolL35).toBe(1.2);
    expect(tolL1).toBeGreaterThan(tolL35);

    const tolL18 = getNegativeSpaceToleranceForLevel(18);
    expect(tolL18).toBeLessThan(tolL1);
    expect(tolL18).toBeGreaterThan(tolL35);
  });

  it('generateRandomPolygon - should generate valid vertex sequences bounded within canvas', () => {
    for (let l = 1; l <= 35; l += 10) {
      const poly = generateRandomPolygon(l);
      expect(poly.length).toBeGreaterThanOrEqual(3);
      for (const p of poly) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(NEGATIVE_SPACE_CANVAS_SIZE);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(NEGATIVE_SPACE_CANVAS_SIZE);
      }
    }
  });

  it('generateNegativeSpaceQuestion - should create question with consistent areas and ratio', () => {
    const q = generateNegativeSpaceQuestion(10);
    expect(q.canvasArea).toBe(NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE);
    expect((q.positiveArea ?? 0) + (q.negativeArea ?? 0)).toBeCloseTo(q.canvasArea, -1);
    expect(q.targetNegativeRatio).toBeGreaterThan(15);
    expect(q.targetNegativeRatio).toBeLessThan(85);
  });

  it('checkNegativeSpaceHit - should validate hit within dynamic tolerance threshold', () => {
    const q = generateNegativeSpaceQuestion(1);
    q.targetNegativeRatio = 60.0;
    q.tolerance = 10.0;

    // 命中
    const hitRes = checkNegativeSpaceHit(65.0, q);
    expect(hitRes.isHit).toBe(true);
    expect(hitRes.errorValue).toBe(5.0);

    // 未命中
    const missRes = checkNegativeSpaceHit(75.0, q);
    expect(missRes.isHit).toBe(false);
    expect(missRes.errorValue).toBe(15.0);
  });
});
~~~~~

~~~~~act
patch_file
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~
~~~~~ts.old
import { describe, expect, it } from 'vitest';
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  getDistractorDistanceForLevel,
  okLabToHsv,
} from '../../packs/relative_color/utils';

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
~~~~~ts.new
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
~~~~~

### 下一步建议

1. 重新执行 `npm run checkf` 以及 `npm test`，确认类型检查和单元测试全部绿灯通过。
2. 确认全部通过后，可以生成对应的工作提交计划 `[COMMIT]`。
