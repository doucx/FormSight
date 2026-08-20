我们将分步骤对 FormSight 的核心交互组件、Canvas 绘图逻辑与算法工具进行模块化抽象重构。通过提取通用的 2AFC 选项容器、连续滑动面板、统一答案诊断条、多边形与点阵渲染器以及数学插值工具，显著提升代码复用率并精简工程体积。

## [WIP] refactor: 提取通用交互组件与绘图算法以精简代码体积并提升复用率

### 用户需求
基于前面的架构与复用率分析，对系统中重复度较高的 2AFC 交互卡片、连续调节滑块、答题反馈诊断条、Canvas 基础多边形与点阵绘图逻辑、以及指数衰减与随机打乱算法进行模块化提取并在各卡片组件中应用，降低冗余代码并提升系统的可维护性与扩展性。

### 评论
当前各训练卡片的 Canvas 组件中包含大量重复的 DOM 结构、状态监听与 Canvas 基础绘图逻辑。将这些模式提取为可复用的组件与纯函数工具，不仅能减少上千行重复代码，还能为后续新增训练题型建立标准化的基础设施。

### 目标
1. **新建通用算法工具**：在 `src/utils/mathUtils.ts` 中提取指数衰减插值函数 `expDecayInterpolate` 与洗牌装配工具 `createShuffledChoices`。
2. **新建通用 Canvas 绘图工具**：
   - `src/utils/canvas/drawPolygon.ts`：统一多边形路径与正负形渲染。
   - `src/utils/canvas/drawPointGrid.ts`：统一干扰点阵、悬停高亮、真理十字准星与误差虚线绘制。
3. **新建通用交互 UI 组件**：
   - `src/components/common/AnswerDiagnosticBar.tsx`：统一下方答案揭晓诊断条。
   - `src/components/common/Choice2AfcContainer.tsx`：统一 2AFC 双候选对比卡片容器及键盘 `1`/`2` 快捷键处理。
   - `src/components/common/ContinuousTrackPanel.tsx`：统一连续调节滑动轨、容错区间及提交状态控制。
4. **重构各卡片组件与工具**：
   - 重构 `StarCanvas.tsx`、`NegativeSpaceCanvas.tsx`、`AbstractionCanvas.tsx` 与 `RelativeColorCanvas.tsx`，接入提取后的公共组件与工具函数。
   - 优化 `abstractionUtils.ts`、`relativeColorUtils.ts`、`negativeSpaceUtils.ts` 等算法文件中的重复逻辑。

### 基本原理
1. **交互范式统一**：在视知觉与几何/色感训练中，交互形式主要分为 `2AFC 对比选择`、`连续滑块/旋转调节` 与 `点阵坐标点击`。将这些交互范式的视图骨架与键盘事件抽象为受控通用组件，业务组件仅需关注 Canvas 内部渲染与数据流。
2. **绘图管道下沉**：Canvas 绘图中的点阵反馈、十字准星与多边形绘制均属于纯函数视图层，提取至 `utils/canvas/` 下可确保渲染表现一致，并便于后续统一适配 HiDPI 与主题样式。
3. **数学算子标准化**：统一难度插值公式与选项洗牌算法，避免各模块中重复的手写循环与公式硬编码。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/common-interactions #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建通用数学与算法工具函数

~~~~~act
write_file
src/utils/mathUtils.ts
~~~~~
~~~~~typescript
/**
 * 基于当前等级 (1..maxLevel) 对最大与最小边界值执行指数衰减插值
 * @param maxVal Level 1 时的初始宽松值
 * @param minVal Level maxLevel 时的极限精细值
 * @param level 当前等级 (1..maxLevel)
 * @param maxLevel 最大等级，默认 35
 */
export function expDecayInterpolate(
  maxVal: number,
  minVal: number,
  level: number,
  maxLevel = 35,
): number {
  const clamped = Math.max(1, Math.min(maxLevel, level));
  const t = (clamped - 1) / (maxLevel - 1);
  return maxVal * (minVal / maxVal) ** t;
}

/**
 * 将真理项与干扰项组合并随机洗牌 (Fisher-Yates)，返回乱序数组与真理项索引
 */
export function createShuffledChoices<T>(
  targetItem: T,
  distractors: T[],
): { options: T[]; correctIndex: number } {
  const rawOptions = [targetItem, ...distractors];
  const indexed = rawOptions.map((opt, i) => ({ opt, isTarget: i === 0 }));

  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  return {
    options: indexed.map((item) => item.opt),
    correctIndex: indexed.findIndex((item) => item.isTarget),
  };
}
~~~~~

#### Acts 2: 创建通用 Canvas 基础绘图函数

~~~~~act
write_file
src/utils/canvas/drawPolygon.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface DrawPolygonOptions {
  canvas: HTMLCanvasElement | null;
  vertices?: Point[];
  size: number;
  fillColor?: string;
  strokeColor?: string;
  lineWidth?: number;
  bgColor?: string;
  isHighlighted?: boolean;
  highlightColor?: string;
}

/**
 * 在 Canvas 上清屏并绘制多边形
 */
export function drawPolygonCanvas({
  canvas,
  vertices,
  size,
  fillColor = '#0F172A',
  strokeColor = '#1E293B',
  lineWidth = 2,
  bgColor = '#FFFFFF',
  isHighlighted = false,
  highlightColor = '#22C55E',
}: DrawPolygonOptions): void {
  if (!canvas || !vertices || vertices.length < 3) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 清屏填充背景
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // 绘制多边形路径
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.strokeStyle = isHighlighted ? highlightColor : strokeColor;
  ctx.lineWidth = isHighlighted ? lineWidth + 1.5 : lineWidth;
  ctx.stroke();
}
~~~~~

~~~~~act
write_file
src/utils/canvas/drawPointGrid.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import { getDynamicCrosshairMetrics, getDynamicDotRadius } from '../geometry';

/**
 * 绘制单个圆点
 */
export function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export interface RenderInteractivePointGridOptions {
  ctx: CanvasRenderingContext2D;
  canvasSize: number;
  gridPoints: Point[];
  targetPoint?: Point;
  userNearestPoint?: Point;
  hoverPoint?: Point | null;
  anchors?: (Point | null | undefined)[];
  showAnswer: boolean;
  isHit?: boolean;
  disabled?: boolean;
}

/**
 * 统一渲染可交互点阵、锚点、悬停高亮与答案揭晓视觉反馈
 */
export function renderInteractivePointGrid({
  ctx,
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  hoverPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
}: RenderInteractivePointGridOptions): void {
  // 清屏背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const dotRadius = getDynamicDotRadius(gridPoints);
  const hoverRadius = Math.max(2.5, dotRadius * 1.6);

  // 1. 绘制底层干扰点阵
  for (const p of gridPoints) {
    drawDot(ctx, p.x, p.y, '#888888', dotRadius);
  }

  // 2. 鼠标悬停高亮点
  if (!disabled && !showAnswer && hoverPoint) {
    drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
  }

  // 3. 绘制锚点
  for (const anchor of anchors) {
    if (anchor) {
      drawDot(ctx, anchor.x, anchor.y, '#000000', dotRadius);
    }
  }

  // 4. 答案揭晓反馈
  if (showAnswer && targetPoint) {
    const { size: chSize, lineWidth: chLineWidth } = getDynamicCrosshairMetrics(gridPoints);

    // 真理点实体
    drawDot(ctx, targetPoint.x, targetPoint.y, '#000000', dotRadius);

    // 绿色十字准星
    ctx.strokeStyle = '#00AA00';
    ctx.lineWidth = chLineWidth;
    ctx.beginPath();
    ctx.moveTo(targetPoint.x - chSize, targetPoint.y);
    ctx.lineTo(targetPoint.x + chSize, targetPoint.y);
    ctx.moveTo(targetPoint.x, targetPoint.y - chSize);
    ctx.lineTo(targetPoint.x, targetPoint.y + chSize);
    ctx.stroke();

    // 答错指示
    if (userNearestPoint && !isHit) {
      const dashLength = Math.max(2, Math.min(4, chSize * 0.4));
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
      ctx.setLineDash([dashLength, dashLength]);
      ctx.beginPath();
      ctx.moveTo(userNearestPoint.x, userNearestPoint.y);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      drawDot(ctx, userNearestPoint.x, userNearestPoint.y, '#FF0000', dotRadius);
    }
  }
}
~~~~~

#### Acts 3: 创建通用交互 UI 组件

~~~~~act
write_file
src/components/common/AnswerDiagnosticBar.tsx
~~~~~
~~~~~typescript
import { Check, X } from 'lucide-preact';
import type { ComponentChildren } from 'preact';

interface AnswerDiagnosticBarProps {
  isHit: boolean;
  successTitle?: string;
  failTitle?: string;
  subText?: ComponentChildren;
  rightSlot?: ComponentChildren;
}

export function AnswerDiagnosticBar({
  isHit,
  successTitle = '回答完全正确！',
  failTitle = '判断出现偏差',
  subText,
  rightSlot,
}: AnswerDiagnosticBarProps) {
  return (
    <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
      <div className="flex items-center gap-2">
        <div
          className={`p-1.5 rounded-xl ${
            isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}
        >
          {isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </div>
        <div className="text-xs">
          <span className="font-bold text-slate-800">{isHit ? successTitle : failTitle}</span>
          {subText && <span className="text-slate-400 ml-2">{subText}</span>}
        </div>
      </div>
      {rightSlot && <div className="text-xs font-mono font-bold text-slate-600">{rightSlot}</div>}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/common/Choice2AfcContainer.tsx
~~~~~
~~~~~typescript
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

export interface Choice2AfcOption {
  key: 'A' | 'B';
  keyLabel?: string;
  title: string;
  isCorrect: boolean;
  badge?: ComponentChildren;
  content: ComponentChildren;
}

interface Choice2AfcContainerProps {
  optionA: Choice2AfcOption;
  optionB: Choice2AfcOption;
  selectedChoice: 'A' | 'B' | null;
  showAnswer: boolean;
  disabled?: boolean;
  onSelect: (choice: 'A' | 'B') => void;
  enableKeyboardShortcuts?: boolean;
}

export function Choice2AfcContainer({
  optionA,
  optionB,
  selectedChoice,
  showAnswer,
  disabled = false,
  onSelect,
  enableKeyboardShortcuts = true,
}: Choice2AfcContainerProps) {
  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled || showAnswer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        onSelect('A');
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        onSelect('B');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, disabled, showAnswer, onSelect]);

  const renderCard = (opt: Choice2AfcOption) => {
    const isSelected = selectedChoice === opt.key;
    const isTarget = opt.isCorrect;

    let borderStyle =
      'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]';

    if (showAnswer) {
      if (isTarget) {
        borderStyle = 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20';
      } else if (isSelected) {
        borderStyle = 'bg-rose-50/50 border-rose-400 shadow-sm';
      } else {
        borderStyle = 'bg-slate-50/60 border-slate-200 opacity-60';
      }
    } else if (isSelected) {
      borderStyle = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
    }

    return (
      <button
        type="button"
        disabled={disabled || showAnswer}
        onClick={() => onSelect(opt.key)}
        className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${borderStyle}`}
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
            <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
              {opt.keyLabel || (opt.key === 'A' ? '1' : '2')}
            </span>
            {opt.title}
          </span>

          {showAnswer && isTarget && (
            <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600" />
              {opt.badge || '真实匹配'}
            </span>
          )}

          {showAnswer && !isTarget && opt.badge && (
            <span className="text-xs font-semibold text-slate-400">{opt.badge}</span>
          )}
        </div>

        {opt.content}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
      {renderCard(optionA)}
      {renderCard(optionB)}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/common/ContinuousTrackPanel.tsx
~~~~~
~~~~~typescript
import { useTrackPointer } from '../../hooks/useTrackPointer';

interface ContinuousTrackPanelProps {
  label: string;
  unit: string;
  val: number;
  max: number;
  step?: number;
  showAnswer: boolean;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  tolerance?: number;
  targetVal?: number;
  userVal?: number;
  isHit?: boolean;
  onValChange: (val: number) => void;
  onCommit?: (val: number) => void;
}

export function ContinuousTrackPanel({
  label,
  unit,
  val,
  max,
  step = 0.5,
  showAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  tolerance = 5,
  targetVal,
  userVal,
  isHit,
  onValChange,
  onCommit,
}: ContinuousTrackPanelProps) {
  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max,
    step,
    disabled: disabled || showAnswer,
    onValChange,
    onCommit,
  });

  const activeVal = hoverVal !== null ? hoverVal : val;
  const displayVal = showAnswer && userVal !== undefined ? userVal : activeVal;

  return (
    <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{label}:</span>
        <span className="font-mono text-base font-black text-indigo-600">
          {displayVal}
          {unit}
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
            {/* 进度底色 */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
              style={{ width: `${(activeVal / max) * 100}%` }}
            />

            {/* 游标指示线 */}
            {!showAnswer && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                style={{ left: `${(activeVal / max) * 100}%` }}
              />
            )}

            {/* 容错区间指示 */}
            {!showAnswer && showToleranceBand && (
              <>
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                  style={{ left: `${(Math.max(0, activeVal - tolerance) / max) * 100}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                  style={{ left: `${(Math.min(max, activeVal + tolerance) / max) * 100}%` }}
                />
              </>
            )}

            {/* 揭晓答案指示 */}
            {showAnswer && targetVal !== undefined && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                  style={{ left: `${(targetVal / max) * 100}%` }}
                />
                {userVal !== undefined && (
                  <div
                    className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                      isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ left: `${(userVal / max) * 100}%` }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <span className="font-bold font-mono text-slate-400 text-xs">
          {max}
          {unit}
        </span>
      </div>

      {showAnswer && targetVal !== undefined && (
        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500">
            绝对真理值:{' '}
            <span className="font-bold text-slate-800 font-mono">
              {targetVal}
              {unit}
            </span>
          </span>
          <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
            误差: {userVal !== undefined ? Math.round(Math.abs(userVal - targetVal) * 10) / 10 : 0}
            {unit} (容错: ±{tolerance}
            {unit})
          </span>
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 4: 重构 StarCanvas 组件

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HitResult, Point, QuestionData } from '../types';
import {
  CANVAS_SIZE,
  checkHit,
  findNearestGridPoint,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from '../utils/geometry';
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HitResult, Point, QuestionData } from '../types';
import { drawDot, renderInteractivePointGrid } from '../utils/canvas/drawPointGrid';
import { CANVAS_SIZE, checkHit, findNearestGridPoint, getDynamicDotRadius } from '../utils/geometry';
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
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
          const { size: chSize, lineWidth: chLineWidth } = getDynamicCrosshairMetrics(
            question.distractorPoints,
          );

          // 绘制真理点 B 实体点
          drawDot(ctx, bx, by, '#000000', dotRadius);

          // 绘制深绿色十字高亮线 (尺寸与粗细自适应点间距)
          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = chLineWidth;
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
              // 绘制红色虚线误差指示 (线宽与虚线间隔按比例适配)
              const dashLength = Math.max(2, Math.min(4, chSize * 0.4));
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
              ctx.setLineDash([dashLength, dashLength]);
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
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 5: 重构 AbstractionCanvas 与 Abstraction 工具类

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
import type { Point } from '../types';

export type AbstractionMode =
~~~~~
~~~~~typescript
import type { Point } from '../types';
import { expDecayInterpolate } from './mathUtils';

export type AbstractionMode =
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
    const maxTol = 18.0;
    const minTol = 2.5;
    const tolerance = Math.round(maxTol * (minTol / maxTol) ** t * 10) / 10;
~~~~~
~~~~~typescript
    const tolerance = Math.round(expDecayInterpolate(18.0, 2.5, clampedLevel) * 10) / 10;
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
    const idealNotanThreshold = 50.0;
    const maxTol = 14.0;
    const minTol = 2.0;
    const tolerance = Math.round(maxTol * (minTol / maxTol) ** t * 10) / 10;
~~~~~
~~~~~typescript
    const idealNotanThreshold = 50.0;
    const tolerance = Math.round(expDecayInterpolate(14.0, 2.0, clampedLevel) * 10) / 10;
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
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
  type NotanShape,
  type PaletteTile,
} from '../utils/abstractionUtils';
import { hsvToHex } from '../utils/colorUtils';
~~~~~
~~~~~typescript
import { Check, Columns, Eye, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Point } from '../types';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
  type NotanShape,
  type PaletteTile,
} from '../utils/abstractionUtils';
import { drawPolygonCanvas } from '../utils/canvas/drawPolygon';
import { hsvToHex } from '../utils/colorUtils';
import { AnswerDiagnosticBar } from './common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from './common/Choice2AfcContainer';
import { ContinuousTrackPanel } from './common/ContinuousTrackPanel';
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
// 辅助绘图：绘制多边形
function drawPolygon(
  canvas: HTMLCanvasElement | null,
  vertices?: Point[],
  size = ABSTRACTION_CANVAS_SIZE,
  fillColor = '#0F172A',
  strokeColor = '#1E293B',
) {
  if (!canvas || !vertices || vertices.length < 3) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();
}
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isTargetA
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
              {showAnswer && isTargetA && (
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  真实匹配
                </span>
              )}
            </div>

            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
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
                ? isTargetB
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
              {showAnswer && isTargetB && (
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  真实匹配
                </span>
              )}
            </div>

            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          </button>
        </div>

        {/* 答案揭晓诊断 */}
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
                  {userAnswer?.isHit ? '瞬时结构透视识别完全正确！' : '结构透视判断出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (正确匹配为: 区域 {userAnswer?.correctChoice ?? (isTargetA ? 'A' : 'B')})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 6: 重构 NegativeSpaceCanvas 及负形工具类

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript
import type { Point } from '../types';
import { checkHit } from './geometry';

export type NegativeSpaceMode =
~~~~~
~~~~~typescript
import type { Point } from '../types';
import { checkHit } from './geometry';
import { expDecayInterpolate } from './mathUtils';

export type NegativeSpaceMode =
~~~~~

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript
export function getNegativeSpaceToleranceForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34; // 0..1
  const maxTol = 10.0;
  const minTol = 1.2;
  return Math.round(maxTol * (minTol / maxTol) ** t * 10) / 10;
}
~~~~~
~~~~~typescript
export function getNegativeSpaceToleranceForLevel(level: number): number {
  return Math.round(expDecayInterpolate(10.0, 1.2, level) * 10) / 10;
}
~~~~~

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript
export function get2AfcdeltaForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34; // 0..1
  const maxDelta = 0.35;
  const minDelta = 0.02;
  return maxDelta * (minDelta / maxDelta) ** t;
}
~~~~~
~~~~~typescript
export function get2AfcdeltaForLevel(level: number): number {
  return expDecayInterpolate(0.35, 0.02, level);
}
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
import { Check, Columns, Sparkles, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import type { Point } from '../types';
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
~~~~~
~~~~~typescript
import { Columns, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
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
import { AnswerDiagnosticBar } from './common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from './common/Choice2AfcContainer';
import { ContinuousTrackPanel } from './common/ContinuousTrackPanel';
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
// 辅助绘图函数：在给定 canvas 上绘制多边形正形与白色负形底
function drawPolygonCanvas(
  canvas: HTMLCanvasElement | null,
  vertices: Point[] | undefined,
  size: number,
  isHighlighted?: boolean,
) {
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
}
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
  // 渲染单图滑块 Canvas 与 记忆匹配刺激图
  useEffect(() => {
    if (!is2AFC && !isFitting && !is2AfcMatch && question.vertices) {
      drawPolygonCanvas(
        canvasRef.current,
        question.vertices,
        NEGATIVE_SPACE_CANVAS_SIZE,
        showAnswer && userAnswer?.isHit,
      );
    } else if (is2AfcMatch && matchPhase === 'stimulus' && question.targetPolygon) {
      drawPolygonCanvas(canvasRef.current, question.targetPolygon, NEGATIVE_SPACE_CANVAS_SIZE);
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
      drawPolygonCanvas(
        matchOptionRefA.current,
        question.optionsPolygons[0],
        NEGATIVE_SPACE_CANVAS_SIZE,
      );
      drawPolygonCanvas(
        matchOptionRefB.current,
        question.optionsPolygons[1],
        NEGATIVE_SPACE_CANVAS_SIZE,
      );
    }
  }, [is2AfcMatch, matchPhase, showAnswer, question.optionsPolygons]);

  // 渲染 2AFC 双 Canvas
  useEffect(() => {
    if (is2AFC) {
      drawPolygonCanvas(canvasRefA.current, question.verticesA, TWO_AFC_CANVAS_SIZE);
      drawPolygonCanvas(canvasRefB.current, question.verticesB, TWO_AFC_CANVAS_SIZE);
    }
  }, [is2AFC, question.verticesA, question.verticesB]);

  // 渲染 定点反切 双 Canvas (左侧参考，右侧截断 + 点阵)
  useEffect(() => {
    if (!isFitting || !question.vertices) return;

    // 1. 左侧参考 Canvas：绘制完整多边形与负形
    const leftCanvas = leftFittingRef.current;
    if (leftCanvas) {
      drawPolygonCanvas(leftCanvas, question.vertices, FITTING_CANVAS_SIZE);
    }
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 7: 重构 RelativeColorCanvas 组件

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Check, Eye, X } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/relativeColorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';
~~~~~
~~~~~typescript
import { ArrowRight, Eye } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/relativeColorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';
import { AnswerDiagnosticBar } from './common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from './common/Choice2AfcContainer';
~~~~~

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript
  // =========================================================================
  // 视图 A：DECONTEXTUAL_2AFC 环境穿透判别
  // =========================================================================
  if (mode === 'DECONTEXTUAL_2AFC') {
    const isAHit = question.largerPhysicalSide === 'A';
    const isBHit = question.largerPhysicalSide === 'B';

    const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
    const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
    const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
    const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelect2Afc('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isAHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selected2AfcChoice === 'A'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selected2AfcChoice === 'A'
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
                  {isAHit ? '物理明度更高' : '物理更暗'} (V: {question.centerColorA?.[2]}%)
                </span>
              )}
            </div>

            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
            >
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
            </div>
          </button>

          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelect2Afc('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isBHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selected2AfcChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selected2AfcChoice === 'B'
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
                  {isBHit ? '物理明度更高' : '物理更暗'} (V: {question.centerColorB?.[2]}%)
                </span>
              )}
            </div>

            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
            >
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
            </div>
          </button>
        </div>

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
                  {userAnswer?.isHit ? '成功穿透背景视错觉！' : '受背景诱导产生了认知偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (已统一切换至中性灰背景对比，物理明度差 ΔV ={' '}
                  <strong className="font-mono text-slate-700">
                    {question.physicalValueDiff}%
                  </strong>
                  )
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
~~~~~
~~~~~typescript
  // =========================================================================
  // 视图 A：DECONTEXTUAL_2AFC 环境穿透判别
  // =========================================================================
  if (mode === 'DECONTEXTUAL_2AFC') {
    const isAHit = question.largerPhysicalSide === 'A';
    const isBHit = question.largerPhysicalSide === 'B';

    const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
    const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
    const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
    const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」
          </div>
        )}

        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: '区域 A',
            isCorrect: isAHit,
            badge: isAHit
              ? `物理明度更高 (V: ${question.centerColorA?.[2]}%)`
              : `物理更暗 (V: ${question.centerColorA?.[2]}%)`,
            content: (
              <div
                className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
                style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
              >
                <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: '区域 B',
            isCorrect: isBHit,
            badge: isBHit
              ? `物理明度更高 (V: ${question.centerColorB?.[2]}%)`
              : `物理更暗 (V: ${question.centerColorB?.[2]}%)`,
            content: (
              <div
                className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
                style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
              >
                <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
              </div>
            ),
          }}
          selectedChoice={selected2AfcChoice}
          showAnswer={showAnswer}
          disabled={disabled}
          onSelect={handleSelect2Afc}
        />

        {showAnswer && (
          <AnswerDiagnosticBar
            isHit={Boolean(userAnswer?.isHit)}
            successTitle="成功穿透背景视错觉！"
            failTitle="受背景诱导产生了认知偏差"
            subText={`(已统一切换至中性灰背景对比，物理明度差 ΔV = ${question.physicalValueDiff}%)`}
          />
        )}
      </div>
    );
  }
~~~~~

### 下一步建议
1. 运行测试套件与代码检查命令（如 `npm run check` 或 `npm run test`），验证组件重构后类型与渲染是否完全正确。
2. 在验证无误后，可以继续对 `analyticsPlugins.tsx` 中的扇区数据计算逻辑（如 8 向罗盘与 12 色相环的数据分桶）进行纯函数抽象。
