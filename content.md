我已定位到负形包（`negative_space`）中的顶点反切定点模块（`VertexFittingView.tsx`）。

该模块原先使用了 `QuestionCardShell` 和 `DualViewportContainer` 多层嵌套，并在外层卡片中将右侧 `PointClickCanvas` 与左侧 Canvas 限制在 `max-w-[300px]`，导致在不同分辨率下两侧未锁定为 1:1 正方形且样式风格与 `star`（寻星）模块不一致。

我将生成一个计划，将 `VertexFittingView.tsx` 的布局重构为与 `StarCanvas` 一致的双卡片沉浸式对称结构，确保左右两视口严格等大、均为正方形。

## [WIP] refactor: 重构负形顶点定点视图为 Star 风格对称正方形视口

### 用户需求

修复 `negative_space` 包中的点阵定点界面（`VertexFittingView`），使其界面布局与 `star` 模块一致，并保证左右两边窗格大小完全相同、均为严格的正方形。

### 评论

统一全站双视口对比类模块的视觉语言（如寻星与负形顶点定点）有助于保持交互与视觉体验的一致性，消除多层嵌套容器带来的额外内边距与比例失真。

### 目标

1. 重构 `VertexFittingView.tsx`，移除冗余的 `QuestionCardShell` 与 `DualViewportContainer` 容器嵌套。
2. 采用与 `StarCanvas` 相同的双列对称卡片布局（`w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square`），锁定 1:1 正方形比例。
3. 确保左侧多边形参考画布与右侧 `PointClickCanvas` 均撑满卡片容器且严格等大。

### 基本原理

通过直接采用 `flex-col sm:flex-row` 容器包裹两个等尺寸的 `aspect-square` 卡片，使左侧参考图与右侧交互点阵在 Flex 布局中始终分配相同像素宽度与高度，并借助 `setupHiDpiCanvas` 保持清晰度与 1:1 几何无畸变。

### 标签

#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/negative-space-vertex-fitting #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `VertexFittingView.tsx` 布局结构

~~~~~act
patch_file
src/packs/negative_space/components/VertexFittingView.tsx
~~~~~
~~~~~typescript.old
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
import {
  FITTING_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';

interface VertexFittingViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (clickPoint: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function VertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: VertexFittingViewProps) {
  const { t } = useTranslation();
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!question.vertices) return;
    drawPolygonCanvas({
      canvas: leftFittingRef.current,
      vertices: question.vertices,
      size: FITTING_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
  }, [question.vertices]);

  // 自定义绘制截断正形与参考边框
  const handleCustomOverlayRender = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (question.truncatedVertices && question.truncatedVertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(question.truncatedVertices[0].x, question.truncatedVertices[0].y);
        for (let i = 1; i < question.truncatedVertices.length; i++) {
          ctx.lineTo(question.truncatedVertices[i].x, question.truncatedVertices[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = '#0F172A';
        ctx.fill();
        ctx.strokeStyle = '#1E293B';
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
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [question.truncatedVertices, question.vertices, showAnswer],
  );

  return (
    <QuestionCardShell
      hintText={t('packs.negative_space.views.vertexHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-4xl"
    >
      <DualViewportContainer
        leftTitle={t('packs.negative_space.views.vertexRefTitle')}
        rightTitle={t('packs.negative_space.views.vertexCanvasTitle')}
        leftContent={
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={leftFittingRef}
              width={FITTING_CANVAS_SIZE}
              height={FITTING_CANVAS_SIZE}
              className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm"
            />
          </div>
        }
        rightContent={
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
            <PointClickCanvas
              canvasSize={FITTING_CANVAS_SIZE}
              gridPoints={question.distractorPoints || []}
              targetPoint={question.targetPoint}
              userNearestPoint={userAnswer?.nearestGridPoint}
              showAnswer={showAnswer}
              isHit={userAnswer?.isHit}
              disabled={disabled}
              maxDisplayWidth="max-w-[300px]"
              customOverlayRender={handleCustomOverlayRender}
              onCommitPoint={onAnswer}
            />
          </div>
        }
      />
    </QuestionCardShell>
  );
}
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import type { Point } from '../../../types';
import {
  FITTING_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';

interface VertexFittingViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (clickPoint: Point) => void;
  disabled?: boolean;
}

export function VertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: VertexFittingViewProps) {
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!question.vertices) return;
    drawPolygonCanvas({
      canvas: leftFittingRef.current,
      vertices: question.vertices,
      size: FITTING_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
  }, [question.vertices]);

  // 自定义绘制截断正形与参考边框
  const handleCustomOverlayRender = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (question.truncatedVertices && question.truncatedVertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(question.truncatedVertices[0].x, question.truncatedVertices[0].y);
        for (let i = 1; i < question.truncatedVertices.length; i++) {
          ctx.lineTo(question.truncatedVertices[i].x, question.truncatedVertices[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = '#0F172A';
        ctx.fill();
        ctx.strokeStyle = '#1E293B';
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
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [question.truncatedVertices, question.vertices, showAnswer],
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner block"
        />
      </div>

      <div className="w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-center">
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
          onCommitPoint={onAnswer}
        />
      </div>
    </div>
  );
}
~~~~~

### 下一步建议

1. **类型与格式检查**：运行 `npm run check` 确保无任何语法与样式报错。
2. **多卡片对比测试**：分别打开「负形边界反切定点」与「单锚点/双锚点寻星」，验证两者的左右视口卡片在尺寸、内边距、正方形比例及响应式缩放上均保持完全一致。
