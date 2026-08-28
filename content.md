我已定位到问题原因：在寻星练习视图（`StarCanvas.tsx`）中，左侧参考窗格与右侧交互窗格的外层包装容器没有设置统一的弹性宽度和最大宽度约束（`flex-1 w-full max-w-[380px] lg:max-w-[420px]`），且左侧画布未配置高清 DPR 适配与统一的 `maxDisplayWidth`，导致在 Flex 布局下左右两卡片的渲染宽度不一致。

我将生成一个修复计划，为左右两个窗格建立严格一致的布局容器和 Canvas 尺寸规范。

## [WIP] fix: 统一寻星模块左右视口窗格尺寸与排版规范

### 错误分析

1. **容器约束不一致**：在 `StarCanvas.tsx` 中，左右两个卡片外部包装容器仅设置了 `bg-white p-3.5 ...`，缺少明确的 `flex-1 w-full max-w-[380px] lg:max-w-[420px]` 宽度与弹性分配约束。
2. **内部 Canvas 宽度继承差异**：右侧的 `PointClickCanvas` 内部自带了 `max-w-[380px]` 的包裹层，而左侧 `canvas` 缺少高清 DPR 初始化和统一的外层弹性撑满规则，在不同屏幕与 Flexbox 分配下导致左右两个窗格呈现不同的物理尺寸。

### 用户需求

统一寻星点阵训练（如单锚点模式、双锚点模式等）中左右两个窗格的尺寸，使其完全等大对称。

### 评论

左右对比是寻星与几何定位训练的核心交互，双窗格严格等大对称能够避免视觉比例失真，大幅提升感知定位的准确度与视觉舒适度。

### 目标

1. 统一 `StarCanvas.tsx` 中左右两侧包装容器的样式类，使用 `flex-1 w-full max-w-[380px] lg:max-w-[420px]` 保证尺寸完全一致。
2. 将左侧画布引入 `setupHiDpiCanvas`，确保左右两画布的渲染像素密度与内部尺寸完全对齐。
3. 显式传递 `maxDisplayWidth="w-full"` 给右侧 `PointClickCanvas`，确保其填满父容器。

### 基本原理

通过为左右窗格的包装 `div` 赋予相同的 `flex-1 w-full max-w-[380px] lg:max-w-[420px]` 约束，并让内部 Canvas 均采用 `w-full aspect-square block`，可确保在移动端垂直堆叠或桌面端并排时左右两卡片及画布都保持完全相同的宽高比和物理尺寸。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/star-canvas #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `StarCanvas.tsx` 左右窗格尺寸不对称问题

~~~~~act
patch_file
src/packs/star/views/StarCanvas.tsx
~~~~~
~~~~~typescript.old
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawDot } from '../../../core/canvas/drawPointGrid';
import type { Point } from '../../../types';
import {
  CANVAS_SIZE,
  type HitResult,
  type QuestionData,
  checkHit,
  getDynamicDotRadius,
} from '../utils/index';

export interface StarCanvasProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (clickPoint: Point, hitResult: HitResult) => void;
  disabled?: boolean;
}

export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', dotRadius);

        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', dotRadius);
        }

        drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', dotRadius);
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);
    if (!hitResult.isWithinRange) return;
    onAnswer(clickPoint, hitResult);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner"
        />
      </div>

      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript.new
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawDot } from '../../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import type { Point } from '../../../types';
import {
  CANVAS_SIZE,
  type HitResult,
  type QuestionData,
  checkHit,
  getDynamicDotRadius,
} from '../utils/index';

export interface StarCanvasProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (clickPoint: Point, hitResult: HitResult) => void;
  disabled?: boolean;
}

export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', dotRadius);

        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', dotRadius);
        }

        drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', dotRadius);
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);
    if (!hitResult.isWithinRange) return;
    onAnswer(clickPoint, hitResult);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[380px] lg:max-w-[420px] bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[380px] lg:max-w-[420px] bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

### 下一步建议

1. **类型检查与测试验证**：在终端执行 `npm run check` 和 `npm run test` 确保无样式或逻辑回归。
2. **多端视口实机验证**：在桌面端宽屏与移动端窄屏下分别打开单锚点、水平双锚点和旋转双锚点训练，验证左右窗格在并排及换行时是否均保持等大。
