这个设计非常符合视知觉手眼协调的交互逻辑！通过将鼠标在画布上的任意位置实时**正交投影（垂足）**吸附到目标线段上，并隐去系统的默认鼠标指针（`cursor: none`），用户将获得在倾斜线段上直接“滑动定点”的沉浸式体验。

以下是实现该交互特性的完整实施计划。

## [WIP] feat(packs): 实现比例盲切的线段正交投影吸附与无光标定点交互

### 用户需求

1. 鼠标在画布上移动时，计算当前鼠标坐标在线段上的垂足点 $x$。
2. 隐藏系统鼠标指针，仅在线段上实时渲染该高亮投影吸附点 $x$。
3. 点击作答时，以该投影点 $x$ 的坐标作为用户的实际作答数据并提交存储。

### 评论

这是一个优秀的视知觉 UX 改进。原先自由点击会导致线外无效偏差点干扰用户专注度，正交投影（Snap to Segment）不仅消除了空间垂直维度的噪点，还使用户的注意力完全聚焦在线段一维比例划分的纯粹直觉上。

### 目标

1. 在 `perspectiveUtils.ts` 的 `drawProportionCanvas` 中增加对 `hoverPoint` 的高亮渲染支持。
2. 在 `ProportionDivisionView.tsx` 中增加鼠标移动与离屏监听，实时计算正交投影坐标 $\mathbf{P}_{\text{proj}}$ 并更新视图。
3. 将 Canvas 样式在交互状态下切换为 `cursor-none`，点击时直接提交投影坐标点 $\mathbf{P}_{\text{proj}}$。

### 基本原理

设线段两端点为 $\mathbf{P}_1(x_1, y_1)$ 与 $\mathbf{P}_2(x_2, y_2)$，鼠标在 Canvas 中的当前坐标为 $\mathbf{M}(x_m, y_m)$：
1. 向量 $\mathbf{V} = \mathbf{P}_2 - \mathbf{P}_1$。
2. 计算投影参数 $t = \frac{(\mathbf{M} - \mathbf{P}_1) \cdot \mathbf{V}}{|\mathbf{V}|^2}$。
3. 夹紧参数 $t_{\text{clamped}} = \operatorname{clamp}(t, 0, 1)$。
4. 垂足投影点 $\mathbf{P}_{\text{proj}} = \mathbf{P}_1 + t_{\text{clamped}} \cdot \mathbf{V}$。
5. 画布在悬停时隐藏系统指针，仅在 $\mathbf{P}_{\text{proj}}$ 处绘制吸附指示光斑。点击时以 $\mathbf{P}_{\text{proj}}$ 触发提交。

### 标签

#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/proportion-division #task/action/feature-interactive-snap #task/state/continue

---

### Script

#### Acts 1: 在 `drawProportionCanvas` 中增加实时吸附点的渲染

修改 `drawProportionCanvas` 支持接收并在未作答时绘制鼠标投影点 `hoverPoint`。

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 绘制比例盲切线段与落点
 */
export function drawProportionCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  targetPoint: Point | undefined,
  userPoint: Point | null | undefined,
  showAnswer = false,
  size = PERSPECTIVE_CANVAS_SIZE,
): void {
  if (!canvas || !line) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 主干线段
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();

  // 起点端点 (P1)：带环形高亮标识，明确比例从 P1 算起
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 终点端点 (P2)
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(line.p2.x, line.p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 显示用户点击点与真理点
  if (showAnswer) {
    if (targetPoint) {
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(targetPoint.x, targetPoint.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (userPoint) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(userPoint.x, userPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
~~~~~
~~~~~typescript.new
/**
 * 绘制比例盲切线段与落点
 */
export function drawProportionCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  targetPoint: Point | undefined,
  userPoint: Point | null | undefined,
  hoverPoint?: Point | null,
  showAnswer = false,
  size = PERSPECTIVE_CANVAS_SIZE,
): void {
  if (!canvas || !line) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 主干线段
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();

  // 起点端点 (P1)：带环形高亮标识，明确比例从 P1 算起
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 终点端点 (P2)
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(line.p2.x, line.p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 未作答时：在线段上绘制鼠标垂直正交投影吸附点
  if (!showAnswer && hoverPoint) {
    ctx.fillStyle = 'rgba(79, 70, 229, 0.2)';
    ctx.beginPath();
    ctx.arc(hoverPoint.x, hoverPoint.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4F46E5';
    ctx.beginPath();
    ctx.arc(hoverPoint.x, hoverPoint.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 显示用户点击点与真理点
  if (showAnswer) {
    if (targetPoint) {
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(targetPoint.x, targetPoint.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (userPoint) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(userPoint.x, userPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
~~~~~

#### Acts 2: 在 `ProportionDivisionView` 中集成实时正交投影与光标隐藏交互

更新 `ProportionDivisionView.tsx`，实时计算垂足点并传入 Canvas 绘制，并在点击时以投影点提交。

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript.old
import { Disc } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawProportionCanvas,
} from '../utils/perspectiveUtils';

interface ProportionDivisionViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ProportionDivisionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ProportionDivisionViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = PERSPECTIVE_CANVAS_SIZE / rect.width;
    const clickX = Math.round((e.clientX - rect.left) * scale);
    const clickY = Math.round((e.clientY - rect.top) * scale);

    const pt: Point = { x: clickX, y: clickY };
    setUserClickedPoint(pt);
    onAnswer(pt);
  };

  const isHit = Boolean(userAnswer?.isHit);

  return (
    <QuestionCardShell
      hintText="在倾斜线段上单次点击盲切估测指定比例位置"
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              目标比例:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              作答位置: {((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1)}% (误差: ±
              {((userAnswer?.errorValue ?? 0) * 100).toFixed(1)}%)
            </span>
          </div>
        ) : null
      }
    >
      {/* 醒目的核心目标指引面板 */}
      <div className="w-full bg-indigo-50/70 border border-indigo-100/90 rounded-2xl p-3.5 flex flex-col items-center gap-1.5 text-center">
        <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
          作答目标 (从紫环起点端起算)
        </div>
        <div className="text-base font-black text-indigo-900 tracking-tight">
          标出【{question.targetRatioName ?? '指定比例'}】
        </div>
      </div>

      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={(el) => {
            canvasRef.current = el;
            if (el) {
              drawProportionCanvas(
                el,
                question.divisionLine,
                question.targetDivisionPoint,
                userClickedPoint,
                showAnswer,
                PERSPECTIVE_CANVAS_SIZE,
              );
            }
          }}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label="比例盲切答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white transition-all ${
            disabled || showAnswer ? 'cursor-default' : 'cursor-crosshair hover:border-indigo-300'
          }`}
        />
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>起点 (0%)</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>终点 (100%)</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~
~~~~~typescript.new
import { Disc } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawProportionCanvas,
} from '../utils/perspectiveUtils';

interface ProportionDivisionViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ProportionDivisionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ProportionDivisionViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // 题目切换时重置状态
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setUserClickedPoint(null);
    setHoverPoint(null);
  }, [question.id]);

  /**
   * 将屏幕鼠标坐标垂直正交投影吸附至当前线段，获得线段上的垂足点与比例参数 t
   */
  const getProjectedPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current;
      const line = question.divisionLine;
      if (!canvas || !line) return null;

      const rect = canvas.getBoundingClientRect();
      const scale = PERSPECTIVE_CANVAS_SIZE / rect.width;
      const mouseX = (clientX - rect.left) * scale;
      const mouseY = (clientY - rect.top) * scale;

      const dx = line.p2.x - line.p1.x;
      const dy = line.p2.y - line.p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return null;

      // 正交投影公式: t = (M - P1)·(P2 - P1) / |P2 - P1|^2
      const t = ((mouseX - line.p1.x) * dx + (mouseY - line.p1.y) * dy) / lenSq;
      const clampedT = Math.max(0, Math.min(1, t));

      return {
        x: Math.round((line.p1.x + clampedT * dx) * 10) / 10,
        y: Math.round((line.p1.y + clampedT * dy) * 10) / 10,
      };
    },
    [question.divisionLine],
  );

  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer) {
      if (hoverPoint) setHoverPoint(null);
      return;
    }
    const projPt = getProjectedPoint(e.clientX, e.clientY);
    if (projPt) {
      setHoverPoint(projPt);
    }
  };

  const handleMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;
    const projPt = getProjectedPoint(e.clientX, e.clientY);
    if (!projPt) return;

    setUserClickedPoint(projPt);
    setHoverPoint(null);
    onAnswer(projPt);
  };

  const isHit = Boolean(userAnswer?.isHit);

  // 触发 Canvas 重绘
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawProportionCanvas(
        canvas,
        question.divisionLine,
        question.targetDivisionPoint,
        userClickedPoint,
        hoverPoint,
        showAnswer,
        PERSPECTIVE_CANVAS_SIZE,
      );
    }
  }, [
    question.divisionLine,
    question.targetDivisionPoint,
    userClickedPoint,
    hoverPoint,
    showAnswer,
  ]);

  return (
    <QuestionCardShell
      hintText="在倾斜线段上移动光标吸附定点，单次点击确认比例位置"
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              目标比例:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              作答位置: {((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1)}% (误差: ±
              {((userAnswer?.errorValue ?? 0) * 100).toFixed(1)}%)
            </span>
          </div>
        ) : null
      }
    >
      {/* 醒目的核心目标指引面板 */}
      <div className="w-full bg-indigo-50/70 border border-indigo-100/90 rounded-2xl p-3.5 flex flex-col items-center gap-1.5 text-center">
        <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
          作答目标 (从紫环起点端起算)
        </div>
        <div className="text-base font-black text-indigo-900 tracking-tight">
          标出【{question.targetRatioName ?? '指定比例'}】
        </div>
      </div>

      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label="比例盲切答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>起点 (0%)</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>终点 (100%)</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

---

### 下一步建议

1. **实际体验测试**：进入“平面比例与黄金分割盲切”卡片：
   - 移动鼠标进入画布，确认鼠标光标已被隐藏，且线段上会跟随移动一个紫色的高亮吸附小球。
   - 在任意区域点击，确认提交的数据完全基于线段上的垂足点 $x$ 并精准计算出 $t$。
2. **提交 Git 变更**：若交互体验符合预期，可随时安排提交操作。
