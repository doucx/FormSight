好的，我已经分析了问题。在难度较高的 Level 下，干扰点阵间距急剧缩小，原本固定为 3.5px 半径（直径 7px）的圆点会互相粘连重叠，导致视觉混乱和难以点击。

我将通过在 `geometry.ts` 中新增基于欧氏距离的动态半径算法 `getDynamicDotRadius`，并在 `StarCanvas.tsx` 渲染层中动态应用自适应缩放半径，从而保证点在密集状态下依然保持清晰独立。

下面是为您生成的 Quipu 执行计划：

## [WIP] fix: 根据点阵间距自适应缩小近距离圆点半径

### 用户需求
在训练模式达到高难度（点间距过近）时，圆点会互相覆盖粘连，难以准确定位与点击。需要根据点与点之间的相对距离动态缩小圆点的绘制半径。

### 评论
这是一个关键的用户体验（UX）与视觉呈现修复。自适应缩放圆点半径既保留了低难度下的视觉清晰度，又解决了高难度密集点阵下的重叠与粘连问题。

### 目标
1. 在 `src/utils/geometry.ts` 中实现 `getDynamicDotRadius` 函数，根据点阵中相邻点的最小距离动态计算最佳绘制半径。
2. 在 `src/components/StarCanvas.tsx` 中应用该算法，取代原本固定的 `3.5px` 与 `6px` 绘制半径，使参考图和交互图均具备自适应缩放能力。

### 基本原理
通过计算点阵中所有点对之间的最小非零欧氏距离 $d_{\min}$，将绘制半径限制为 $\max(1.2, \min(3.5, 0.25 \times d_{\min}))$。这可确保圆点直径（$2r$）始终不超过点间距的 50%，并在极度密集的极致关卡下保底不小于 1.2px，同时悬停高亮半径也按相同比例等比缩放。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/star-canvas-dots #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 在 `geometry.ts` 中新增 `getDynamicDotRadius` 函数

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
  targetSectors?: number[]; // [0~7]
}
~~~~~
~~~~~typescript.new
/**
 * 根据点阵间距动态计算渲染圆点的半径，防止点距过近时发生粘连重叠
 */
export function getDynamicDotRadius(gridPoints: Point[]): number {
  if (!gridPoints || gridPoints.length < 2) return 3.5;
  let minDist = Number.MAX_VALUE;
  for (let i = 0; i < gridPoints.length; i++) {
    for (let j = i + 1; j < gridPoints.length; j++) {
      const d = calcDistance(gridPoints[i], gridPoints[j]);
      if (d > 0 && d < minDist) {
        minDist = d;
      }
    }
  }
  if (minDist === Number.MAX_VALUE) return 3.5;
  // 保持圆点直径小于相邻间距的一半，最小不小于 1.2px，最大不高于 3.5px
  return Math.max(1.2, Math.min(3.5, minDist * 0.25));
}

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
  targetSectors?: number[]; // [0~7]
}
~~~~~

#### Acts 2: 在 `StarCanvas.tsx` 中应用动态点半径渲染

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HitResult, Point, QuestionData } from '../types';
import { CANVAS_SIZE, checkHit, findNearestGridPoint } from '../utils/geometry';
~~~~~
~~~~~typescript.new
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HitResult, Point, QuestionData } from '../types';
import { CANVAS_SIZE, checkHit, findNearestGridPoint, getDynamicDotRadius } from '../utils/geometry';
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
  // === 绘图主逻辑 ===
  useEffect(() => {
    // 1. 渲染左侧参考图 (Reference Canvas)
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 绘制锚点 A
        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', 3.5);

        // 绘制锚点 C (若存在)
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', 3.5);
        }

        // 绘制真理点 B
        drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', 3.5);
      }
    }

    // 2. 渲染右侧交互区 (Interactive Canvas)
    const rightCanvas = rightCanvasRef.current;
    if (rightCanvas) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 图层 1: 极坐标/双极透视干扰点阵 (底层)
        const gridPoints = question.distractorPoints;
        for (const p of gridPoints) {
          drawDot(ctx, p.x, p.y, '#888888', 3.5);
        }

        // 图层 1.5: 鼠标悬停高亮网格点
        if (!disabled && !showAnswer && hoverPoint) {
          drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', 6);
        }

        // 图层 2: 锚点 (顶层)
        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', 3.5);
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', 3.5);
        }

        // 图层 3: 做答后的视觉反馈 (反馈层)
        if (showAnswer) {
          const { x: bx, y: by } = question.targetB;

          // 绘制真理点 B 实体点
          drawDot(ctx, bx, by, '#000000', 3.5);

          // 绘制深绿色十字高亮线
          const chSize = 12;
          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx - chSize, by);
          ctx.lineTo(bx + chSize, by);
          ctx.moveTo(bx, by - chSize);
          ctx.lineTo(bx, by + chSize);
          ctx.stroke();

          // 如果回答错或有用户点击坐标，绘制误差连线与点击位置
          if (userAnswer) {
            const { hitResult } = userAnswer;
            const chosenPoint = hitResult.nearestGridPoint;

            if (!hitResult.isHit) {
              // 绘制红色虚线误差指示
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(chosenPoint.x, chosenPoint.y);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.setLineDash([]); // 恢复实线

              // 用户点击位置标记 (红点 - 锚定在网格点中心)
              drawDot(ctx, chosenPoint.x, chosenPoint.y, '#FF0000', 3.5);
            }
          }
        }
      }
    }
  }, [question, showAnswer, userAnswer, hoverPoint, disabled]);
~~~~~
~~~~~typescript.new
  // === 绘图主逻辑 ===
  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const hoverRadius = Math.max(2.5, dotRadius * 1.6);

    // 1. 渲染左侧参考图 (Reference Canvas)
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 绘制锚点 A
        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', dotRadius);

        // 绘制锚点 C (若存在)
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', dotRadius);
        }

        // 绘制真理点 B
        drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', dotRadius);
      }
    }

    // 2. 渲染右侧交互区 (Interactive Canvas)
    const rightCanvas = rightCanvasRef.current;
    if (rightCanvas) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 图层 1: 极坐标/双极透视干扰点阵 (底层)
        const gridPoints = question.distractorPoints;
        for (const p of gridPoints) {
          drawDot(ctx, p.x, p.y, '#888888', dotRadius);
        }

        // 图层 1.5: 鼠标悬停高亮网格点
        if (!disabled && !showAnswer && hoverPoint) {
          drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
        }

        // 图层 2: 锚点 (顶层)
        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', dotRadius);
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', dotRadius);
        }

        // 图层 3: 做答后的视觉反馈 (反馈层)
        if (showAnswer) {
          const { x: bx, y: by } = question.targetB;

          // 绘制真理点 B 实体点
          drawDot(ctx, bx, by, '#000000', dotRadius);

          // 绘制深绿色十字高亮线
          const chSize = 12;
          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx - chSize, by);
          ctx.lineTo(bx + chSize, by);
          ctx.moveTo(bx, by - chSize);
          ctx.lineTo(bx, by + chSize);
          ctx.stroke();

          // 如果回答错或有用户点击坐标，绘制误差连线与点击位置
          if (userAnswer) {
            const { hitResult } = userAnswer;
            const chosenPoint = hitResult.nearestGridPoint;

            if (!hitResult.isHit) {
              // 绘制红色虚线误差指示
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(chosenPoint.x, chosenPoint.y);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.setLineDash([]); // 恢复实线

              // 用户点击位置标记 (红点 - 锚定在网格点中心)
              drawDot(ctx, chosenPoint.x, chosenPoint.y, '#FF0000', dotRadius);
            }
          }
        }
      }
    }
  }, [question, showAnswer, userAnswer, hoverPoint, disabled]);
~~~~~

### 下一步建议
1. 运行 `npm run dev` 启动开发服务器，体验高级别 Level 关卡（如 Level 8+）下的点阵渲染效果。
2. 验证高密度点阵下的悬停指示与点击响应是否依然顺畅准确。
