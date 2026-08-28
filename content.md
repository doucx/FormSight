我已定位到 `negative_space`（正负形空间感知）包中的点阵定点模块（`VertexFittingView.tsx`）。

其左右两窗格包装容器缺少统一的 `w-full max-w-[300px] aspect-square` 尺寸锁定和弹性对齐，导致左右两个卡片在布局计算时不完全等大，且容易引起尺寸偏差。

我将生成一个修复计划，为 `VertexFittingView.tsx` 应用统一的 1:1 正方形卡片容器与画布尺寸约束。

## [WIP] fix: 统一正负形反切定点左右窗格为等大正方形

### 错误分析

在 `VertexFittingView.tsx` 中，`DualViewportContainer` 的 `leftContent` 与 `rightContent` 外部卡片容器仅设置了 `bg-white p-3 rounded-2xl ...`，未声明 `w-full max-w-[300px] aspect-square flex items-center justify-center`。右侧 `PointClickCanvas` 的 `maxDisplayWidth` 未适配容器填满规则，导致左右两侧视图在不同宽度下无法严格锁定为相同的 1:1 正方形。

### 用户需求

修复正负形反切定点（`neg_vertex_fitting`）中的点阵视图，确保左右两窗格均为严格等大的正方形，内容无拉伸。

### 评论

顶点反切（Vertex Fitting）高度依赖负形几何轮廓的 1:1 视觉对齐，左右两视口保持严格等大和正方形对于形状比例的精确推演必不可少。

### 目标

1. 统一 `VertexFittingView.tsx` 中左右两卡片容器类名，均设置为 `w-full max-w-[300px] aspect-square bg-white p-3 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center`。
2. 为左侧 `canvas` 设置 `w-full h-full aspect-square block`。
3. 为右侧 `PointClickCanvas` 传入 `maxDisplayWidth="w-full h-full aspect-square"`。

### 基本原理

通过给双视口容器与子 Canvas 赋予统一的 `aspect-square`（1:1 宽高比）和最大尺寸限制，结合已重构的 `setupHiDpiCanvas` 自适应渲染，左右两窗格在任何视口尺寸下都将保持完全相同的像素尺寸和正方形结构。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/negative-space-canvas #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `VertexFittingView.tsx` 左右窗格正方形尺寸约束

~~~~~act
patch_file
src/packs/negative_space/components/VertexFittingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
      <DualViewportContainer
        leftTitle={t('packs.negative_space.views.vertexRefTitle')}
        rightTitle={t('packs.negative_space.views.vertexCanvasTitle')}
        leftContent={
          <div className="w-full max-w-[300px] aspect-square bg-white p-3 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center">
            <canvas
              ref={leftFittingRef}
              width={FITTING_CANVAS_SIZE}
              height={FITTING_CANVAS_SIZE}
              className="w-full h-full aspect-square rounded-xl border border-slate-100 shadow-sm block"
            />
          </div>
        }
        rightContent={
          <div className="w-full max-w-[300px] aspect-square bg-white p-3 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center">
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
        }
      />
~~~~~

### 下一步建议

1. **执行构建和测试**：运行 `npm run check` 确保代码格式与类型检查通过。
2. **在界面中验证**：打开「负形边界反切定点（`neg_vertex_fitting`）」练习，验证左侧参考正形与右侧交互点阵是否呈现严格等大的 1:1 正方形且无形变。
