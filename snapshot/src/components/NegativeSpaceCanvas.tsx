import { Check, Columns, Sparkles, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import type { Point } from '../types';
import { drawPolygonCanvas } from '../utils/canvas/drawPolygon';
import {
  findNearestGridPoint,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from '../utils/geometry';
import {
  FITTING_CANVAS_SIZE,
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/negativeSpaceUtils';

interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B' | Point) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

// 辅助绘图函数：在给定 canvas 上绘制多边形正形与白色负形底
function renderPolygon(
  canvas: HTMLCanvasElement | null,
  vertices: Point[] | undefined,
  size: number,
  isHighlighted?: boolean,
) {
  drawPolygonCanvas({
    canvas,
    vertices,
    size,
    fillColor: '#0F172A',
    strokeColor: '#1E293B',
    isHighlighted,
  });
}

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

export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: NegativeSpaceCanvasProps) {
  const is2AFC = question.mode === 'AREA_COMPARISON_2AFC';
  const isFitting = question.mode === 'NEGATIVE_VERTEX_FITTING';
  const is2AfcMatch = question.mode === 'SHAPE_MATCH_2AFC';

  // === 1. 单图滑块模式状态 ===
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: setCurrentVal,
  });

  // === 2. 2AFC 模式专属画布与状态 ===
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // === 3. 定点反切模式专属画布与状态 ===
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
  const rightFittingRef = useRef<HTMLCanvasElement | null>(null);
  const [fittingHoverPoint, setFittingHoverPoint] = useState<Point | null>(null);

  // === 4. 2AFC 记忆匹配模式专属画布与状态 ===
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selectedMatchChoice, setSelectedMatchChoice] = useState<'A' | 'B' | null>(null);
  const matchOptionRefA = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefB = useRef<HTMLCanvasElement | null>(null);

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
      setFittingHoverPoint(null);
      setMatchPhase('stimulus');
      setSelectedMatchChoice(null);
    }
  }, [question.id, setHoverVal]);

  // 记忆匹配曝光倒计时处理
  useEffect(() => {
    if (is2AfcMatch && matchPhase === 'stimulus' && !showAnswer) {
      const timer = setTimeout(() => {
        setMatchPhase('recall');
      }, question.displayTimeMs || 1500);
      return () => clearTimeout(timer);
    }
  }, [is2AfcMatch, matchPhase, question.displayTimeMs, showAnswer]);

  // 渲染单图滑块 Canvas 与 记忆匹配刺激图
  useEffect(() => {
    if (!is2AFC && !isFitting && !is2AfcMatch && question.vertices) {
      renderPolygon(
        canvasRef.current,
        question.vertices,
        NEGATIVE_SPACE_CANVAS_SIZE,
        showAnswer && userAnswer?.isHit,
      );
    } else if (is2AfcMatch && matchPhase === 'stimulus' && question.targetPolygon) {
      renderPolygon(canvasRef.current, question.targetPolygon, NEGATIVE_SPACE_CANVAS_SIZE);
    }
  }, [
    is2AFC,
    isFitting,
    is2AfcMatch,
    matchPhase,
    question.vertices,
    question.targetPolygon,
    showAnswer,
    userAnswer,
  ]);

  // 渲染 记忆匹配 2AFC 候选画布 (1:1 等大 NEGATIVE_SPACE_CANVAS_SIZE 原生渲染)
  useEffect(() => {
    if (is2AfcMatch && (matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      renderPolygon(
        matchOptionRefA.current,
        question.optionsPolygons[0],
        NEGATIVE_SPACE_CANVAS_SIZE,
      );
      renderPolygon(
        matchOptionRefB.current,
        question.optionsPolygons[1],
        NEGATIVE_SPACE_CANVAS_SIZE,
      );
    }
  }, [is2AfcMatch, matchPhase, showAnswer, question.optionsPolygons]);

  // 渲染 2AFC 双 Canvas
  useEffect(() => {
    if (is2AFC) {
      renderPolygon(canvasRefA.current, question.verticesA, TWO_AFC_CANVAS_SIZE);
      renderPolygon(canvasRefB.current, question.verticesB, TWO_AFC_CANVAS_SIZE);
    }
  }, [is2AFC, question.verticesA, question.verticesB]);

  // 渲染 定点反切 双 Canvas (左侧参考，右侧截断 + 点阵)
  useEffect(() => {
    if (!isFitting || !question.vertices) return;

    // 1. 左侧参考 Canvas：绘制完整多边形与负形
    const leftCanvas = leftFittingRef.current;
    if (leftCanvas) {
      renderPolygon(leftCanvas, question.vertices, FITTING_CANVAS_SIZE);
    }

    // 2. 右侧交互 Canvas
    const rightCanvas = rightFittingRef.current;
    if (rightCanvas) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, FITTING_CANVAS_SIZE, FITTING_CANVAS_SIZE);

        // 绘制截断残缺多边形
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

        const distractorPoints = question.distractorPoints || [];
        const dotRadius = getDynamicDotRadius(distractorPoints);
        const hoverRadius = Math.max(2.5, dotRadius * 1.6);

        // 绘制候选干扰点阵
        for (const p of distractorPoints) {
          drawDot(ctx, p.x, p.y, '#888888', dotRadius);
        }

        // 鼠标悬停高亮点
        if (!disabled && !showAnswer && fittingHoverPoint) {
          drawDot(ctx, fittingHoverPoint.x, fittingHoverPoint.y, '#4F46E5', hoverRadius);
        }

        // 揭晓状态：反馈绘制
        if (showAnswer && question.targetPoint) {
          const { x: tx, y: ty } = question.targetPoint;
          const { size: chSize, lineWidth: chLineWidth } =
            getDynamicCrosshairMetrics(distractorPoints);

          // 绘制完整多边形真实线框（绿色半透明补全反馈）
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

          // 绘制真理顶点十字准星
          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = chLineWidth;
          ctx.beginPath();
          ctx.moveTo(tx - chSize, ty);
          ctx.lineTo(tx + chSize, ty);
          ctx.moveTo(tx, ty - chSize);
          ctx.lineTo(tx, ty + chSize);
          ctx.stroke();
          drawDot(ctx, tx, ty, '#000000', dotRadius);

          // 若答错，绘制红虚线与用户点击位置
          if (userAnswer?.nearestGridPoint && !userAnswer.isHit) {
            const chosen = userAnswer.nearestGridPoint;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(chosen.x, chosen.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.setLineDash([]);
            drawDot(ctx, chosen.x, chosen.y, '#FF0000', dotRadius);
          }
        }
      }
    }
  }, [isFitting, question, showAnswer, userAnswer, fittingHoverPoint, disabled]);

  // 处理 2AFC 点击选择
  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 处理 记忆匹配 2AFC 点击选择
  const handleSelectMatchChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelectedMatchChoice(choice);
      onAnswer(choice === 'A' ? 0 : 1);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );

  // 定点模式鼠标移动与点击
  const handleFittingMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !question.distractorPoints) {
      if (fittingHoverPoint) setFittingHoverPoint(null);
      return;
    }

    const canvas = rightFittingRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = FITTING_CANVAS_SIZE / rect.width;
    const scaleY = FITTING_CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      { x: clickX, y: clickY },
      question.distractorPoints,
    );

    if (isWithinRange) {
      setFittingHoverPoint(nearestPoint);
    } else if (fittingHoverPoint) {
      setFittingHoverPoint(null);
    }
  };

  const handleFittingClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !question.distractorPoints) return;

    const canvas = rightFittingRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = FITTING_CANVAS_SIZE / rect.width;
    const scaleY = FITTING_CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const { isWithinRange } = findNearestGridPoint(clickPoint, question.distractorPoints);

    if (!isWithinRange) return;

    setFittingHoverPoint(null);
    onAnswer(clickPoint);
  };

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;

      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else if (is2AfcMatch && matchPhase === 'recall') {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectMatchChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectMatchChoice('B');
        }
      } else if (!isFitting && !is2AfcMatch) {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    is2AFC,
    isFitting,
    is2AfcMatch,
    matchPhase,
    disabled,
    showAnswer,
    currentVal,
    onAnswer,
    handleSelectChoice,
    handleSelectMatchChoice,
  ]);

  // =========================================================================
  // 模式 C：NEGATIVE_VERTEX_FITTING 负形反向还原顶点视图
  // =========================================================================
  if (isFitting) {
    return (
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Columns className="w-3.5 h-3.5 text-indigo-600" />
            对比左侧负形空间，在右侧点阵中点击定位被截断的顶点
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
          {/* 左侧参考 Canvas */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              完整剪影参考
            </span>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={leftFittingRef}
                width={FITTING_CANVAS_SIZE}
                height={FITTING_CANVAS_SIZE}
                className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm"
              />
            </div>
          </div>

          {/* 右侧互动做答 Canvas */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
              交互定点画布 (点击定位)
            </span>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={rightFittingRef}
                width={FITTING_CANVAS_SIZE}
                height={FITTING_CANVAS_SIZE}
                onClick={handleFittingClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label="右侧定点做答画布"
                onMouseMove={handleFittingMouseMove}
                onMouseLeave={() => setFittingHoverPoint(null)}
                className={`w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm transition-all ${
                  disabled || showAnswer
                    ? 'cursor-default'
                    : fittingHoverPoint
                      ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                      : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 答案揭晓诊断条 */}
        {showAnswer && (
          <div className="w-full max-w-xl bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-xl ${
                  userAnswer?.isHit
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  {userAnswer?.isHit ? '精准命中目标顶点！' : '定点定位出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (像素误差:{' '}
                  <strong className="font-mono text-slate-700">{userAnswer?.errorValue}px</strong>)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 模式 A：2AFC 负形面积二分判别视图
  // =========================================================================
  if (is2AFC) {
    const largerSide = question.largerSide;
    const isAHit = largerSide === 'A';
    const isBHit = largerSide === 'B';

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Columns className="w-3.5 h-3.5 text-indigo-600" />
            判别哪一侧的白色留白 (负形) 面积更大
          </div>
        )}

        {/* 左右双卡片对比区 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isAHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selectedChoice === 'A'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selectedChoice === 'A'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  1
                </span>
                区域 A
              </span>

              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isAHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isAHit ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      留白更大 ({question.negRatioA}%)
                    </>
                  ) : (
                    `留白 (${question.negRatioA}%)`
                  )}
                </span>
              )}
            </div>

            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={TWO_AFC_CANVAS_SIZE}
                height={TWO_AFC_CANVAS_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          </button>

          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isBHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selectedChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selectedChoice === 'B'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  2
                </span>
                区域 B
              </span>

              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isBHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isBHit ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      留白更大 ({question.negRatioB}%)
                    </>
                  ) : (
                    `留白 (${question.negRatioB}%)`
                  )}
                </span>
              )}
            </div>

            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={TWO_AFC_CANVAS_SIZE}
                height={TWO_AFC_CANVAS_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          </button>
        </div>

        {/* 答案揭晓诊断条 */}
        {showAnswer && (
          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-xl ${
                  userAnswer?.isHit
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  {userAnswer?.isHit ? '瞬时直觉判断正确！' : '直觉判断出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (留白实际差异率 Δ ={' '}
                  <strong className="font-mono text-slate-700">{question.areaDeltaPercent}%</strong>
                  )
                </span>
              </div>
            </div>

            <div className="text-xs font-mono font-bold text-slate-600">
              A: {question.negRatioA}% vs B: {question.negRatioB}%
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 模式 D：SHAPE_MATCH_2AFC 负形轮廓记忆匹配视图 (1:1 等大)
  // =========================================================================
  if (is2AfcMatch) {
    const isRevealed = showAnswer;
    const isTargetA = question.correctOptionIndex === 0;
    const isTargetB = question.correctOptionIndex === 1;

    const isSelectedA =
      selectedMatchChoice === 'A' ||
      userAnswer?.userChoice === 'A' ||
      userAnswer?.userChoiceIndex === 0;
    const isSelectedB =
      selectedMatchChoice === 'B' ||
      userAnswer?.userChoice === 'B' ||
      userAnswer?.userChoiceIndex === 1;

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            {matchPhase === 'stimulus' && !isRevealed
              ? `瞬时记忆负形轮廓特征 (${question.displayTimeMs}ms)`
              : '匹配回忆：哪一侧与刚才展示完全相同？'}
          </div>
        )}

        {matchPhase === 'stimulus' && !isRevealed ? (
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner flex flex-col items-center gap-3 w-full max-w-sm">
            <canvas
              ref={canvasRef}
              width={NEGATIVE_SPACE_CANVAS_SIZE}
              height={NEGATIVE_SPACE_CANVAS_SIZE}
              className="w-full aspect-square rounded-2xl border border-slate-200 shadow-sm"
            />
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                key={`${question.id}-${matchPhase}`}
                className="bg-indigo-600 h-full"
                style={{
                  width: '100%',
                  animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
            {/* 卡片 A */}
            <button
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => handleSelectMatchChoice('A')}
              className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
                isRevealed
                  ? isTargetA
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : isSelectedA
                      ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                  : isSelectedA
                    ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                  <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                    A
                  </span>
                  区域 A (键 1)
                </span>

                {isRevealed && isTargetA && (
                  <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" />
                    真实目标
                  </span>
                )}
              </div>

              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefA}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            </button>

            {/* 卡片 B */}
            <button
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => handleSelectMatchChoice('B')}
              className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
                isRevealed
                  ? isTargetB
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : isSelectedB
                      ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                  : isSelectedB
                    ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                  <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                    B
                  </span>
                  区域 B (键 2)
                </span>

                {isRevealed && isTargetB && (
                  <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" />
                    真实目标
                  </span>
                )}
              </div>

              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefB}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            </button>
          </div>
        )}

        {isRevealed && (
          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-xl ${
                  userAnswer?.isHit
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  {userAnswer?.isHit ? '瞬时形态记忆完全正确！' : '记忆形态判断出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (正确目标为: 区域 {question.correctChoice})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 模式 B：单图滑块评估视图 (RATIO_ESTIMATION)
  // =========================================================================
  const { targetNegativeRatio, tolerance } = question;
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          估计白色留白 (负形) 占整幅画面的面积百分比
        </div>
      )}

      {/* 画布区域 */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={NEGATIVE_SPACE_CANVAS_SIZE}
          height={NEGATIVE_SPACE_CANVAS_SIZE}
          className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      {/* 占比滑块调节区 */}
      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>负形空间占比估计:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userRatio ?? currentVal}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0%</span>

          <div
            {...pointerProps}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              {/* 进度底色 */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${activeVal}%` }}
              />

              {/* 当前设定游标线 */}
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${currentVal}%` }}
                />
              )}

              {/* 容错区间指示 */}
              {!showAnswer && showToleranceBand && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.max(0, activeVal - tolerance)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.min(100, activeVal + tolerance)}%` }}
                  />
                </>
              )}

              {/* 揭晓答案标记 */}
              {showAnswer && (
                <>
                  {/* 真理值 (绿色标线) */}
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${targetNegativeRatio}%` }}
                  />
                  {/* 用户提交值 */}
                  {userAnswer && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                        userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: `${userAnswer.userRatio}%` }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
        </div>

        {/* 揭晓答案对比条 */}
        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              真实负形占比:{' '}
              <span className="font-bold text-slate-800 font-mono">{targetNegativeRatio}%</span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}% (容错: ±{tolerance}%)
            </span>
          </div>
        )}
      </div>

      {/* 确认提交按钮 */}
      {!showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(currentVal);
          }}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
