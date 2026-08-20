import { Check, Columns, Eye, Sparkles, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import type { Point } from '../types';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
  type PaletteTile,
} from '../utils/abstractionUtils';
import { drawPolygonCanvas } from '../utils/canvas/drawPolygon';
import { hsvToHex } from '../utils/colorUtils';
import { AnswerDiagnosticBar } from './common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from './common/Choice2AfcContainer';

interface AbstractionCanvasProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

// 辅助绘图：绘制散点流
function drawParticles(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = ABSTRACTION_CANVAS_SIZE,
  axisAngle?: number,
  axisColor = '#22C55E',
) {
  if (!canvas || !particles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 绘制散点
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
  }

  // 绘制指示势线
  if (axisAngle !== undefined) {
    const rad = (axisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(rad), cy - L * Math.sin(rad));
    ctx.lineTo(cx + L * Math.cos(rad), cy + L * Math.sin(rad));
    ctx.stroke();
  }
}

// 辅助绘图：绘制多边形
function drawPolygon(
  canvas: HTMLCanvasElement | null,
  vertices?: Point[],
  size = ABSTRACTION_CANVAS_SIZE,
  fillColor = '#0F172A',
  strokeColor = '#1E293B',
) {
  drawPolygonCanvas({ canvas, vertices, size, fillColor, strokeColor });
}

// 辅助绘图：绘制未二值化的连续灰度原图
function drawRawGrayscaleNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  size = ABSTRACTION_2AFC_SIZE,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    const pIdx = i * 4;
    pixels[pIdx] = val;
    pixels[pIdx + 1] = val;
    pixels[pIdx + 2] = val;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}

// 辅助绘图：根据连续灰阶场进行动态二值截断渲染
function drawNotanNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  thresholdPercent = 50,
  size = ABSTRACTION_CANVAS_SIZE,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const thresholdByte = Math.round((thresholdPercent / 100) * 255);

  // 利用离屏 Canvas 进行近邻插值缩放，保持素描颗粒感与极速渲染
  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const isDark = buffer[i] <= thresholdByte;
    const color = isDark ? 15 : 248; // #0F172A vs #F8FAFC
    const pIdx = i * 4;
    pixels[pIdx] = color;
    pixels[pIdx + 1] = color === 15 ? 23 : 250;
    pixels[pIdx + 2] = color === 15 ? 42 : 252;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}

// 辅助绘图：绘制色彩拼贴图案
function drawPaletteTiles(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = ABSTRACTION_CANVAS_SIZE,
) {
  if (!canvas || !tiles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}

// 辅助绘图：绘制基准骨架势线
function drawSpinePrompt(
  canvas: HTMLCanvasElement | null,
  spine?: Point[],
  size = ABSTRACTION_THUMB_SIZE,
) {
  if (!canvas || !spine || spine.length < 2) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const [p1, p2] = spine;
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: AbstractionCanvasProps) {
  const { mode } = question;

  // 1. 角度与滑块交互状态
  const [sliderVal, setSliderVal] = useState<number>(0);
  const canvasMainRef = useRef<HTMLCanvasElement | null>(null);

  // 2. 2AFC / 4AFC 状态
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const canvasThumbRef = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef0 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef3 = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [selected4AfcIdx, setSelected4AfcIdx] = useState<number | null>(null);
  const [selectedTdPatternIdx, setSelectedTdPatternIdx] = useState<number | null>(null);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: mode === 'GESTURE_AXIS' ? 180 : 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal: number) => {
      if ((mode === 'GESTURE_AXIS' || mode === 'NOTAN_THRESHOLD') && !disabled && !showAnswer) {
        onAnswer(committedVal);
      }
    },
  });

  useEffect(() => {
    if (question.id) {
      // 避免默认值固定在 50 导致空格盲通过，随机生成初始离散探索位置
      const initialVal =
        mode === 'GESTURE_AXIS'
          ? 90
          : mode === 'NOTAN_THRESHOLD'
            ? Math.random() < 0.5
              ? Math.floor(Math.random() * 25) + 10
              : Math.floor(Math.random() * 25) + 65
            : 50;
      setSliderVal(initialVal);
      setHoverVal(null);
      setSelectedChoice(null);
      setSelected4AfcIdx(null);
      setSelectedTdPatternIdx(null);
    }
  }, [question.id, mode, setHoverVal]);

  const activeVal = hoverVal !== null ? hoverVal : sliderVal;

  // 渲染各种题型 Canvas
  useEffect(() => {
    if (mode === 'GESTURE_AXIS') {
      drawParticles(
        canvasMainRef.current,
        question.particles,
        ABSTRACTION_CANVAS_SIZE,
        showAnswer ? question.targetAngleDeg : activeVal,
        showAnswer ? '#22C55E' : '#6366F1',
      );
    } else if (mode === 'POLYGON_DECIMATION' && question.detailedPolygon) {
      drawPolygon(canvasMainRef.current, question.detailedPolygon, ABSTRACTION_CANVAS_SIZE);
      drawPolygon(
        canvasRefA.current,
        question.simplifiedOptions?.[0],
        ABSTRACTION_2AFC_SIZE,
        '#4F46E5',
      );
      drawPolygon(
        canvasRefB.current,
        question.simplifiedOptions?.[1],
        ABSTRACTION_2AFC_SIZE,
        '#4F46E5',
      );
    } else if (mode === 'NOTAN_THRESHOLD') {
      // 左侧渲染连续灰阶原图
      if (question.notanBuffer) {
        drawRawGrayscaleNoiseField(
          canvasRefA.current,
          question.notanBuffer,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
        // 右侧渲染实时二值截断结果
        drawNotanNoiseField(
          canvasRefB.current,
          question.notanBuffer,
          question.notanFieldDim ?? 120,
          showAnswer ? question.idealNotanThreshold : activeVal,
          ABSTRACTION_2AFC_SIZE,
        );
      }
    } else if (mode === 'PALETTE_CLUSTERING') {
      drawPaletteTiles(canvasMainRef.current, question.paletteTiles, ABSTRACTION_CANVAS_SIZE);
    } else if (mode === 'TD_GESTURE_2AFC') {
      drawSpinePrompt(canvasThumbRef.current, question.promptSpine, ABSTRACTION_THUMB_SIZE);
      drawParticles(canvasRefA.current, question.particlesA, ABSTRACTION_2AFC_SIZE);
      drawParticles(canvasRefB.current, question.particlesB, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_HULL_2AFC') {
      drawPolygon(
        canvasThumbRef.current,
        question.promptHull,
        ABSTRACTION_THUMB_SIZE,
        '#4F46E5',
        '#3730A3',
      );
      drawPolygon(canvasRefA.current, question.hullDetailedA, ABSTRACTION_2AFC_SIZE);
      drawPolygon(canvasRefB.current, question.hullDetailedB, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_NOTAN_2AFC') {
      if (question.promptNotanBuffer && question.notanSceneBufferA && question.notanSceneBufferB) {
        drawRawGrayscaleNoiseField(
          canvasThumbRef.current,
          question.promptNotanBuffer,
          question.notanFieldDim ?? 120,
          ABSTRACTION_THUMB_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefA.current,
          question.notanSceneBufferA,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefB.current,
          question.notanSceneBufferB,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
      }
    } else if (mode === 'TD_PALETTE_2AFC' && question.palettePatternOptions) {
      drawPaletteTiles(
        patternCanvasRef0.current,
        question.palettePatternOptions[0],
        ABSTRACTION_2AFC_SIZE,
      );
      drawPaletteTiles(
        patternCanvasRef1.current,
        question.palettePatternOptions[1],
        ABSTRACTION_2AFC_SIZE,
      );
      drawPaletteTiles(
        patternCanvasRef2.current,
        question.palettePatternOptions[2],
        ABSTRACTION_2AFC_SIZE,
      );
      drawPaletteTiles(
        patternCanvasRef3.current,
        question.palettePatternOptions[3],
        ABSTRACTION_2AFC_SIZE,
      );
    }
  }, [mode, question, activeVal, showAnswer]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (mode === 'TD_PALETTE_2AFC') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const idx = Number.parseInt(e.key, 10) - 1;
          setSelectedTdPatternIdx(idx);
          onAnswer(idx);
        }
        return;
      }
      if (mode === 'PALETTE_CLUSTERING') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const idx = Number.parseInt(e.key, 10) - 1;
          setSelected4AfcIdx(idx);
          onAnswer(idx);
          return;
        }
      }
      if (e.key === '1' || e.code === 'Digit1') {
        e.preventDefault();
        handleSelectChoice('A');
      } else if (e.key === '2' || e.code === 'Digit2') {
        e.preventDefault();
        handleSelectChoice('B');
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (mode === 'PALETTE_CLUSTERING') {
          if (selected4AfcIdx !== null) onAnswer(selected4AfcIdx);
        } else if (mode === 'GESTURE_AXIS' || mode === 'NOTAN_THRESHOLD') {
          onAnswer(activeVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, mode, activeVal, selected4AfcIdx, handleSelectChoice, onAnswer]);

  // =========================================================================
  // 视图 A-1：TD_PALETTE_2AFC (4AFC) 调性基底归位视图
  // =========================================================================
  if (mode === 'TD_PALETTE_2AFC') {
    const promptHex = question.promptDominantColor
      ? hsvToHex(...question.promptDominantColor)
      : '#6366F1';
    const targetIdx = question.correctPatternIndex ?? 0;
    const chosenIdx = userAnswer?.userChoiceIndex ?? selectedTdPatternIdx;
    const patternCanvasRefs = [
      patternCanvasRef0,
      patternCanvasRef1,
      patternCanvasRef2,
      patternCanvasRef3,
    ];

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            观察上方基准主色，选出以此为基调的拼贴画面
          </div>
        )}

        {/* 顶部单色基准展示 */}
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            基准主调色
          </span>
          <div
            className="w-16 h-16 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200"
            style={{ backgroundColor: promptHex }}
          />
        </div>

        {/* 4 候选拼贴图案网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {question.palettePatternOptions?.map((pat, idx) => {
            const isSelected = chosenIdx === idx;
            const isTarget = idx === targetIdx;
            const keyLabel = (idx + 1).toString();
            const patternKey = `td-pattern-card-${question.id}-${pat.map((t) => `${t.x}_${t.y}_${t.hsv.join('_')}`).join('-')}`;

            let border = 'border-slate-200/90 hover:border-indigo-300 hover:shadow-md bg-slate-50';
            if (showAnswer) {
              if (isTarget) {
                border = 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
              } else if (isSelected) {
                border = 'bg-rose-50/50 border-rose-400 shadow-sm';
              } else {
                border = 'bg-slate-50/60 border-slate-200 opacity-50';
              }
            } else if (isSelected) {
              border = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
            }

            return (
              <button
                key={patternKey}
                type="button"
                disabled={disabled || showAnswer}
                onClick={() => {
                  setSelectedTdPatternIdx(idx);
                  onAnswer(idx);
                }}
                className={`group flex flex-col items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] ${border}`}
              >
                <div className="flex items-center justify-between w-full px-1">
                  <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                    <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                      {keyLabel}
                    </span>
                    画面 {keyLabel}
                  </span>
                  {showAnswer && isTarget && (
                    <Check className="w-4 h-4 text-emerald-600 font-extrabold" />
                  )}
                </div>

                <div className="w-full aspect-square bg-white p-1 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
                  <canvas
                    ref={patternCanvasRefs[idx]}
                    width={ABSTRACTION_2AFC_SIZE}
                    height={ABSTRACTION_2AFC_SIZE}
                    className="w-full aspect-square rounded-lg shadow-sm"
                  />
                </div>
              </button>
            );
          })}
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
                  {userAnswer?.isHit ? '调性基底寻源匹配完全正确！' : '色彩调性感知出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">(正确匹配为: 画面 {targetIdx + 1})</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 视图 A-2：Top-Down 2AFC 逆向匹配系列 (GESTURE / HULL / NOTAN)
  // =========================================================================
  if (mode.startsWith('TD_') || mode === 'POLYGON_DECIMATION') {
    const isPoly = mode === 'POLYGON_DECIMATION';
    const isTargetA = isPoly
      ? question.correctPolyChoice === 'A'
      : userAnswer?.correctChoice === 'A' ||
        question.correctParticleChoice === 'A' ||
        question.correctHullChoice === 'A' ||
        question.correctNotanChoice === 'A';
    const isTargetB = !isTargetA;

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Columns className="w-3.5 h-3.5 text-indigo-600" />
            {isPoly ? '选择保留了主要转折大形的精简项' : '判别哪一侧具象细节符合上方骨架'}
          </div>
        )}

        {/* 顶部题干或基准展示 */}
        {!isPoly && (
          <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              概括基准 (Prompt)
            </span>
            <canvas
              ref={canvasThumbRef}
              width={ABSTRACTION_THUMB_SIZE}
              height={ABSTRACTION_THUMB_SIZE}
              className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        )}

        {isPoly && (
          <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              多边形原图
            </span>
            <canvas
              ref={canvasMainRef}
              width={ABSTRACTION_CANVAS_SIZE}
              height={ABSTRACTION_CANVAS_SIZE}
              className="w-40 h-40 rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        )}

        {/* 双卡片候选区 */}
        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: '区域 A (键 1)',
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={canvasRefA}
                  width={ABSTRACTION_2AFC_SIZE}
                  height={ABSTRACTION_2AFC_SIZE}
                  className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: '区域 B (键 2)',
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={canvasRefB}
                  width={ABSTRACTION_2AFC_SIZE}
                  height={ABSTRACTION_2AFC_SIZE}
                  className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          selectedChoice={selectedChoice}
          showAnswer={showAnswer}
          disabled={disabled}
          enableKeyboardShortcuts={false}
          onSelect={handleSelectChoice}
        />

        {/* 答案揭晓诊断 */}
        {showAnswer && (
          <AnswerDiagnosticBar
            isHit={Boolean(userAnswer?.isHit)}
            successTitle="瞬时结构透视识别完全正确！"
            failTitle="结构透视判断出现偏差"
            subText={`(正确匹配为: 区域 ${userAnswer?.correctChoice ?? (isTargetA ? 'A' : 'B')})`}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // 视图 B：PALETTE_CLUSTERING 4AFC 调色板提炼视图
  // =========================================================================
  if (mode === 'PALETTE_CLUSTERING') {
    return (
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            选出最能代表全局主调的加权主色
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <canvas
            ref={canvasMainRef}
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
          />
        </div>

        {/* 4 候选色块 */}
        <div className="grid grid-cols-4 gap-3 w-full">
          {question.paletteOptions?.map((hsv, idx) => {
            const isSelected = selected4AfcIdx === idx;
            const isTarget = idx === question.correctPaletteIndex;
            const hex = hsvToHex(...hsv);

            let border = 'border-slate-200';
            if (showAnswer) {
              border = isTarget
                ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                : isSelected
                  ? 'border-rose-400 opacity-60'
                  : 'border-slate-200 opacity-40';
            } else if (isSelected) {
              border = 'border-indigo-600 ring-2 ring-indigo-500/30';
            }

            return (
              <button
                key={`palette-option-${idx}-${hex}`}
                type="button"
                disabled={disabled || showAnswer}
                onClick={() => {
                  setSelected4AfcIdx(idx);
                  onAnswer(idx);
                }}
                className={`p-1.5 rounded-2xl border bg-white transition-all duration-150 active:scale-95 cursor-pointer ${border}`}
              >
                <div
                  className="w-full aspect-square rounded-xl shadow-inner border border-white/60"
                  style={{ backgroundColor: hex }}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 视图 C-1：NOTAN_THRESHOLD 双视口原图与二值对照视图
  // =========================================================================
  if (mode === 'NOTAN_THRESHOLD') {
    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            观察左侧灰阶原图，在下方滑块点击/调节右侧最佳黑白二值截断点
          </div>
        )}

        {/* 左右双视口：左原图，右二值 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 左侧连续灰阶原图 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              灰阶原图 (Raw Scene)
            </span>
            <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
              />
            </div>
          </div>

          {/* 右侧实时二值化素描 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              二值显影 (Notan Output)
            </span>
            <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* 连续滑块控制面板 (即点即答) */}
        <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>二值化截断阈值:</span>
            <span className="font-mono text-base font-black text-indigo-600">
              {showAnswer ? `${userAnswer?.userValue ?? sliderVal}%` : `${activeVal}%`}
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
                <div
                  className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                  style={{ width: `${activeVal}%` }}
                />

                {!showAnswer && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                    style={{ left: `${activeVal}%` }}
                  />
                )}

                {showAnswer && (
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${question.idealNotanThreshold ?? 50}%` }}
                  />
                )}
              </div>
            </div>

            <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
          </div>

          {showAnswer && (
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">
                最佳素描阈值:{' '}
                <span className="font-bold text-slate-800 font-mono">
                  {question.idealNotanThreshold}%
                </span>
              </span>
              <span
                className={
                  userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
                }
              >
                误差: {userAnswer?.errorValue}% (容错: ±{question.tolerance}%)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 视图 C-2：GESTURE_AXIS 势线连续旋转调节视图
  // =========================================================================
  const unit = '°';

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          旋转主轴对齐粒子群动态流向 (0°~180°)
        </div>
      )}

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasMainRef}
          width={ABSTRACTION_CANVAS_SIZE}
          height={ABSTRACTION_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>动态势线角度:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userValue ?? sliderVal}${unit}` : `${activeVal}${unit}`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0{unit}</span>

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
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{
                  width: `${(activeVal / 180) * 100}%`,
                }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{
                    left: `${(activeVal / 180) * 100}%`,
                  }}
                />
              )}

              {showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                  style={{
                    left: `${((question.targetAngleDeg ?? 0) / 180) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">180{unit}</span>
        </div>

        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              绝对真理值:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {question.targetAngleDeg}
                {unit}
              </span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}
              {unit} (容错: ±{question.tolerance}
              {unit})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
