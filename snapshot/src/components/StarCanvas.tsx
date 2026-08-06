import { useEffect, useRef, useState } from 'preact/hooks';
import type { HitResult, Point, QuestionData } from '../types';
import { CANVAS_SIZE, checkHit, findNearestGridPoint, getDynamicDotRadius } from '../utils/geometry';

interface StarCanvasProps {
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
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);

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

        // 图层 1.5: 磁性吸附准心 (未作答状态下吸附在网格点上)
        if (!disabled && !showAnswer) {
          if (hoverPoint) {
            // 1. 磁吸实体核心点
            drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
            // 2. 磁吸包围光环 (强视觉提示：鼠标已精确锁定在点上)
            ctx.strokeStyle = '#6366F1';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(hoverPoint.x, hoverPoint.y, hoverRadius + 3.5, 0, Math.PI * 2);
            ctx.stroke();
          } else if (mousePos) {
            // 空白区域：绘制跟随实际鼠标的极淡微型准心
            drawDot(ctx, mousePos.x, mousePos.y, 'rgba(99, 102, 241, 0.35)', 2);
          }
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

  // 辅助函数：绘制圆点
  function drawDot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    radius: number,
  ) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // === 交互事件：鼠标移动计算悬停吸附与指针隐藏 ===
  const handleRightCanvasMouseMove = (e: MouseEvent) => {
    if (disabled) {
      if (hoverPoint) setHoverPoint(null);
      if (mousePos) setMousePos(null);
      return;
    }

    const canvas = rightCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const currentPoint: Point = { x: clickX, y: clickY };
    setMousePos(currentPoint);

    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      currentPoint,
      question.distractorPoints,
    );

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else {
      setHoverPoint(null);
    }
  };

  const handleRightCanvasMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
    if (mousePos) setMousePos(null);
  };

  // === 交互事件：点击右侧 Canvas 做答 ===
  const handleRightCanvasClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;

    const canvas = rightCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // 换算 CSS 实际像素到 Canvas 逻辑像素 (500x500)
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);

    // 忽略在有效感应范围之外的点击
    if (!hitResult.isWithinRange) return;

    setHoverPoint(null);
    onAnswer(clickPoint, hitResult);
  };

  const isCursorHidden = !disabled && hoverPoint !== null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      {/* 左侧参考 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner"
        />
      </div>

      {/* 右侧交互 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={rightCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleRightCanvasClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="右侧做答画布"
          onMouseMove={handleRightCanvasMouseMove}
          onMouseLeave={handleRightCanvasMouseLeave}
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled
              ? 'cursor-default'
              : isCursorHidden
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
        />
      </div>
    </div>
  );
}
