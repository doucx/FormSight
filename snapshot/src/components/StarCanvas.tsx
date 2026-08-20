import { useEffect, useRef, useState } from 'preact/hooks';
import type { HitResult, Point, QuestionData } from '../types';
import { drawDot, renderInteractivePointGrid } from '../utils/canvas/drawPointGrid';
import {
  CANVAS_SIZE,
  checkHit,
  findNearestGridPoint,
  getDynamicDotRadius,
} from '../utils/geometry';

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
        renderInteractivePointGrid({
          ctx,
          canvasSize: CANVAS_SIZE,
          gridPoints: question.distractorPoints,
          targetPoint: question.targetB,
          userNearestPoint: userAnswer?.hitResult.nearestGridPoint,
          hoverPoint,
          anchors: [question.anchorA, question.anchorC],
          showAnswer,
          isHit: userAnswer?.hitResult.isHit,
          disabled,
        });
      }
    }
  }, [question, showAnswer, userAnswer, hoverPoint, disabled]);

  // === 交互事件：鼠标移动计算悬停高亮点 ===
  const handleRightCanvasMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer) {
      if (hoverPoint) setHoverPoint(null);
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
    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      currentPoint,
      question.distractorPoints,
    );

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleRightCanvasMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
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
            disabled || showAnswer
              ? 'cursor-default'
              : hoverPoint
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
        />
      </div>
    </div>
  );
}
