我将为正负形空间感知模块中的点阵定点训练（`VertexFittingView.tsx`）进行重构，移除多层嵌套卡片，将其布局与视觉风格完全对齐至 `StarCanvas`（双独立白色正方形卡片并排对齐、严格 1:1 正方形比例防拉伸）。

## [WIP] fix: 统一负形顶点反切点阵视口为 star 风格等大正方形

### 错误分析

1. **结构嵌套与多重约束**：原 `VertexFittingView` 嵌套在 `QuestionCardShell` 和 `DualViewportContainer` 中，导致视口面积受限，且两边使用了 `max-w-[300px]` 配合固定尺寸容器，在不同屏幕上容易产生比例不对称或与寻星（star）模块视觉规范不统一的问题。
2. **长宽比未显式锁定**：左侧与右侧容器未强制 `aspect-square` 锁定，可能因文字标题或父级流式布局产生拉伸风险。

### 用户需求

修复 `negative_space` 包中的点阵视图（负形边界反切定点 `neg_vertex_fitting`），使其左右窗格尺寸严格一致、保持 1:1 正方形无拉伸，并将界面风格与 `star`（寻星）对齐。

### 评论

统一所有点阵盲打训练的视口布局和视觉范式，能够消除页面切换时的视觉跳跃感，提供沉浸一致的手眼协调定点体验。

### 目标

1. 重构 `src/packs/negative_space/components/VertexFittingView.tsx`，移除冗余外层嵌套，采用与 `StarCanvas` 完全一致的居中双正方形卡片容器（`w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square`）。
2. 让左右画布均以 `w-full h-full aspect-square` 撑满正方形卡片，确保无论屏幕大小均保持绝对 1:1 正方形且无拉伸。

### 基本原理

通过采用相同的双卡片容器类名和 `aspect-square` 约束，使 `negative_space` 点阵与 `star` 点阵共享相同的视口尺寸规范，彻底消除内容拉伸并实现视觉风格统一。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/negative-space-vertex-view #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `VertexFittingView.tsx` 布局与样式为 Star 对齐风格

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
  showCanvasHints?: boolean;
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

1. **类型与格式检查**：运行 `npm run check` 确保无代码规范或类型报错。
2. **功能验证**：在应用中打开「负形边界反切定点」模块，确认左右两个视口均呈现与寻星相同的双独立正方形卡片布局，且交互与多边形渲染保持 1:1 正方形无畸变。
