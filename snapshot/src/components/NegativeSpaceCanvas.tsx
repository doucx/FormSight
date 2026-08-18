import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/negativeSpaceUtils';

import { Check, Columns, Sparkles, X } from 'lucide-preact';
import type { Point } from '../types';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/negativeSpaceUtils';

interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
  const is2AFC = question.mode === 'AREA_COMPARISON_2AFC';

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

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
    }
  }, [question.id, setHoverVal]);

  // 辅助绘图函数：在给定 canvas 上绘制多边形正形与白色负形底
  const drawPolygonCanvas = (
    canvas: HTMLCanvasElement | null,
    vertices: Point[] | undefined,
    size: number,
    isHighlighted?: boolean,
  ) => {
    if (!canvas || !vertices || vertices.length < 3) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清屏绘制纯白底色（白色留白即负形）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // 绘制正形多边形
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = '#0F172A'; // Slate-900 黑色正形
    ctx.fill();

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 高亮加粗外边框反馈
    if (isHighlighted) {
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  // 渲染单图滑块 Canvas
  useEffect(() => {
    if (!is2AFC && question.vertices) {
      drawPolygonCanvas(
        canvasRef.current,
        question.vertices,
        NEGATIVE_SPACE_CANVAS_SIZE,
        showAnswer && userAnswer?.isHit,
      );
    }
  }, [is2AFC, question.vertices, showAnswer, userAnswer]);

  // 渲染 2AFC 双 Canvas
  useEffect(() => {
    if (is2AFC) {
      drawPolygonCanvas(canvasRefA.current, question.verticesA, TWO_AFC_CANVAS_SIZE);
      drawPolygonCanvas(canvasRefB.current, question.verticesB, TWO_AFC_CANVAS_SIZE);
    }
  }, [is2AFC, question.verticesA, question.verticesB]);

  // 处理 2AFC 点击选择
  const handleSelectChoice = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
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
      } else {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, disabled, showAnswer, currentVal, onAnswer]);

  // =========================================================================
  // 模式 A：2AFC 负形面积二分判别视图
  // =========================================================================
  if (is2AFC) {
    const largerSide = question.largerSide;
    const isAHit = largerSide === 'A';
    const isBHit = largerSide === 'B';

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        {/* 提示文案 */}
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Columns className="w-5 h-5 text-indigo-600" />
            判别哪一侧的白色留白 (负形) 面积更大？
          </div>
          <p className="text-xs text-slate-400">
            按快捷键{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              1
            </kbd>{' '}
            选择 A，按{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              2
            </kbd>{' '}
            选择 B，或直接点击卡片
          </p>
        </div>

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
                  A
                </span>
                区域 A (键 1)
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
                  B
                </span>
                区域 B (键 2)
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
  // 模式 B：单图滑块评估视图 (RATIO_ESTIMATION)
  // =========================================================================
  const { targetNegativeRatio, tolerance } = question;
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 提示文案 */}
      <div className="text-center space-y-1">
        <div className="text-sm font-bold text-slate-800">
          估计白色背景（负形）占整幅画面的面积百分比
        </div>
        <div className="text-xs text-slate-400">黑色为正形主体，白色空隙为负形</div>
      </div>

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
