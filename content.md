好的！我们将基于空间旋转不变性（Invariance under Rotation）与比例估测原理，新增一张实验性卡片——**“空间比例角度迁移 (Proportion Angle Migration)”**。

在顶部提供一条水平参考基准线（左端为紫色起点环，并在其上随机标出任意比例的目标点），在下方渲染相同线长的任意倾角线段。用户需要在倾斜线段上利用正交吸附光标，精准复刻出该比例位置。

以下是实现该功能的完整实施计划。

## [WIP] feat(packs): 新增实验性卡片“空间比例角度迁移”

### 用户需求

1. 模仿平面比例盲切交互，在顶部渲染一条水平线段（左端为紫色起点环），并在其上标注一个任意随机位置的目标点。
2. 下方渲染任意旋转倾角的相同线段，并支持正交投影吸附与无光标定点交互。
3. 创建一张标记为实验性（`isExperimental: true`）的新卡片并注册至 `perspective` 扩展包。

### 评论

这是一个非常棒的认知训练维度。传统的比例盲切仅依赖“1/2、1/3、0.618”等语义化数值记忆，而“空间比例角度迁移”要求大脑在倾斜旋转的二维几何空间中，纯视觉地提取并迁移任意比例特征，对素描起形中的动态长宽比捕捉能力有极高训练价值。

### 目标

1. 在 `perspectiveUtils.ts` 中增加 `PROPORTION_MIGRATION` 模式支持、水平参考线绘制函数 `drawHorizontalReferenceLine` 与连续任意比例的题目生成算法。
2. 创建独立的组件 `src/packs/perspective/components/ProportionMigrationView.tsx`。
3. 在 `PerspectiveCanvas.tsx`、`plugin.tsx` 与 `index.ts` 中注册并导出该卡片。

### 基本原理

1. **基准线与目标线**：
   - 顶部参考线：水平放置，长度 $L = 230\text{px}$，起点 $P_{\text{ref1}}(x_0, y_0)$，终点 $P_{\text{ref2}}(x_0 + L, y_0)$，在 $t_{\text{target}} \in [0.08, 0.92]$ 处标出参考点。
   - 下方目标线：旋转角度 $\theta \in [0, 2\pi)$，长度同样为 $L = 230\text{px}$，居中于画布中心。
2. **正交吸附交互**：
   复用正交投影计算公式，将用户鼠标指针吸附到倾斜线段上，点击提交该投影点并进行误差与自适应评估。

### 标签

#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/proportion-migration-card #task/action/create-card #task/state/continue

---

### Script

#### Acts 1: 在 `perspectiveUtils.ts` 中添加模式定义、题目生成与参考线绘制

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript.old
export type PerspectiveMode =
  | 'VP_CONVERGENCE'
  | 'PROPORTION_DIVISION'
  | 'GESTALT_CONTINUATION_2AFC'
  | 'STRUCTURE_PROJECTION_3D';
~~~~~
~~~~~typescript.new
export type PerspectiveMode =
  | 'VP_CONVERGENCE'
  | 'PROPORTION_DIVISION'
  | 'PROPORTION_MIGRATION'
  | 'GESTALT_CONTINUATION_2AFC'
  | 'STRUCTURE_PROJECTION_3D';
~~~~~

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 绘制良好连续性断线与障碍物
 */
~~~~~
~~~~~typescript.new
/**
 * 绘制顶部水平参考线与目标分段点
 */
export function drawHorizontalReferenceCanvas(
  canvas: HTMLCanvasElement | null,
  targetRatio = 0.5,
  width = 280,
  height = 48,
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const marginX = 24;
  const y = height / 2;
  const lineW = width - marginX * 2;
  const p1 = { x: marginX, y };
  const p2 = { x: marginX + lineW, y };

  // 1. 水平基准线
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // 2. 左端起点 (P1)：紫环高亮
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 3. 右端终点 (P2)：灰端点
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 4. 目标比例点：高亮指示
  const targetX = p1.x + lineW * targetRatio;
  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(targetX, y, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // 垂直指示小针标
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(targetX, y - 11);
  ctx.lineTo(targetX, y - 6);
  ctx.stroke();
}

/**
 * 绘制良好连续性断线与障碍物
 */
~~~~~

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript.old
  if (mode === 'PROPORTION_DIVISION') {
    const preset = PROPORTION_PRESETS[Math.floor(Math.random() * PROPORTION_PRESETS.length)];
    const angleRad = Math.random() * Math.PI * 2;
    const lineLen = 190 + Math.random() * 60;
    const center = PERSPECTIVE_CANVAS_SIZE / 2;

    const halfX = (lineLen / 2) * Math.cos(angleRad);
    const halfY = (lineLen / 2) * Math.sin(angleRad);

    const p1: Point = {
      x: Math.round(center - halfX),
      y: Math.round(center - halfY),
    };
    const p2: Point = {
      x: Math.round(center + halfX),
      y: Math.round(center + halfY),
    };

    const targetDivisionPoint: Point = {
      x: Math.round(p1.x + (p2.x - p1.x) * preset.ratio),
      y: Math.round(p1.y + (p2.y - p1.y) * preset.ratio),
    };

    const tolerance = Math.round(expDecayInterpolate(0.08, 0.015, clampedLevel) * 1000) / 1000;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      divisionLine: { p1, p2 },
      targetRatio: preset.ratio,
      targetRatioName: preset.name,
      targetDivisionPoint,
      tolerance,
    };
  }
~~~~~
~~~~~typescript.new
  if (mode === 'PROPORTION_DIVISION' || mode === 'PROPORTION_MIGRATION') {
    const isMigration = mode === 'PROPORTION_MIGRATION';

    let ratio: number;
    let ratioName: string | undefined;

    if (isMigration) {
      // 连续随机比例 (8% ~ 92% 之间，保留一位小数百分比精度)
      ratio = Math.round((Math.random() * 0.84 + 0.08) * 1000) / 1000;
      ratioName = `${(ratio * 100).toFixed(1)}% 处`;
    } else {
      const preset = PROPORTION_PRESETS[Math.floor(Math.random() * PROPORTION_PRESETS.length)];
      ratio = preset.ratio;
      ratioName = preset.name;
    }

    const angleRad = Math.random() * Math.PI * 2;
    const lineLen = 220;
    const center = PERSPECTIVE_CANVAS_SIZE / 2;

    const halfX = (lineLen / 2) * Math.cos(angleRad);
    const halfY = (lineLen / 2) * Math.sin(angleRad);

    const p1: Point = {
      x: Math.round(center - halfX),
      y: Math.round(center - halfY),
    };
    const p2: Point = {
      x: Math.round(center + halfX),
      y: Math.round(center + halfY),
    };

    const targetDivisionPoint: Point = {
      x: Math.round(p1.x + (p2.x - p1.x) * ratio),
      y: Math.round(p1.y + (p2.y - p1.y) * ratio),
    };

    const tolerance = Math.round(expDecayInterpolate(0.08, 0.015, clampedLevel) * 1000) / 1000;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      divisionLine: { p1, p2 },
      targetRatio: ratio,
      targetRatioName: ratioName,
      targetDivisionPoint,
      tolerance,
    };
  }
~~~~~

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript.old
  if (mode === 'PROPORTION_DIVISION') {
    const clickPoint = userVal as Point;
    const line = question.divisionLine;
    if (!line) {
      return { isHit: false, errorValue: 1, tolerance: question.tolerance };
    }

    // 正交投影计算 t: (P - A)·(B - A) / |B - A|^2
    const dx = line.p2.x - line.p1.x;
    const dy = line.p2.y - line.p1.y;
    const lenSq = dx * dx + dy * dy;
    const t = ((clickPoint.x - line.p1.x) * dx + (clickPoint.y - line.p1.y) * dy) / lenSq;
    const clampedT = Math.max(0, Math.min(1, t));

    const targetT = question.targetRatio ?? 0.5;
    const errorT = Math.abs(clampedT - targetT);
    const isHit = errorT <= question.tolerance;

    return {
      isHit,
      userValue: clickPoint,
      targetValue: question.targetDivisionPoint,
      errorValue: Math.round(errorT * 1000) / 1000,
      tolerance: question.tolerance,
      ratioProgress: Math.round(clampedT * 1000) / 1000,
    };
  }
~~~~~
~~~~~typescript.new
  if (mode === 'PROPORTION_DIVISION' || mode === 'PROPORTION_MIGRATION') {
    const clickPoint = userVal as Point;
    const line = question.divisionLine;
    if (!line) {
      return { isHit: false, errorValue: 1, tolerance: question.tolerance };
    }

    // 正交投影计算 t: (P - A)·(B - A) / |B - A|^2
    const dx = line.p2.x - line.p1.x;
    const dy = line.p2.y - line.p1.y;
    const lenSq = dx * dx + dy * dy;
    const t = ((clickPoint.x - line.p1.x) * dx + (clickPoint.y - line.p1.y) * dy) / lenSq;
    const clampedT = Math.max(0, Math.min(1, t));

    const targetT = question.targetRatio ?? 0.5;
    const errorT = Math.abs(clampedT - targetT);
    const isHit = errorT <= question.tolerance;

    return {
      isHit,
      userValue: clickPoint,
      targetValue: question.targetDivisionPoint,
      errorValue: Math.round(errorT * 1000) / 1000,
      tolerance: question.tolerance,
      ratioProgress: Math.round(clampedT * 1000) / 1000,
    };
  }
~~~~~

#### Acts 2: 创建新卡片视图组件 `ProportionMigrationView.tsx`

创建上方渲染水平基准线、下方渲染倾斜吸附画布的全新视图组件。

~~~~~act
write_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~
~~~~~typescript
import { ArrowRightLeft } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawHorizontalReferenceCanvas,
  drawProportionCanvas,
} from '../utils/perspectiveUtils';

interface ProportionMigrationViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ProportionMigrationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ProportionMigrationViewProps) {
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
   * 将屏幕鼠标坐标垂直正交投影吸附至下方倾斜线段，获得线段上的垂足点与比例参数 t
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

  // 触发下方倾斜 Canvas 重绘
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
      hintText="观察上方基准线上的目标点，在下方倾斜线段上精准点选相同比例位置"
      hintIcon={ArrowRightLeft}
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
      {/* 顶部水平参考基准线面板 */}
      <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-col items-center gap-1.5 shadow-sm">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
          基准水平比例 (从左侧紫环起点起算)
        </div>
        <div className="w-full flex justify-center py-1">
          <CanvasView
            width={280}
            height={48}
            className="w-full max-w-[280px] h-[48px] bg-white rounded-xl border border-slate-200 shadow-inner"
            draw={(canvas) => {
              drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
            }}
            deps={[question.targetRatio]}
          />
        </div>
      </div>

      {/* 下方倾斜角度作答画布 */}
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
          aria-label="比例迁移答题画布"
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

#### Acts 3: 在 `PerspectiveCanvas.tsx`、`plugin.tsx` 与 `index.ts` 中挂载新卡片

~~~~~act
patch_file
src/packs/perspective/views/PerspectiveCanvas.tsx
~~~~~
~~~~~typescript.old
import type { Point } from '../../../types';
import { GestaltContinuation2AfcView } from '../components/GestaltContinuation2AfcView';
import { PerspectiveVpView } from '../components/PerspectiveVpView';
import { ProportionDivisionView } from '../components/ProportionDivisionView';
import { StructureProjection3DView } from '../components/StructureProjection3DView';
import type { PerspectiveHitResult, PerspectiveQuestionData } from '../utils/perspectiveUtils';
~~~~~
~~~~~typescript.new
import type { Point } from '../../../types';
import { GestaltContinuation2AfcView } from '../components/GestaltContinuation2AfcView';
import { PerspectiveVpView } from '../components/PerspectiveVpView';
import { ProportionDivisionView } from '../components/ProportionDivisionView';
import { ProportionMigrationView } from '../components/ProportionMigrationView';
import { StructureProjection3DView } from '../components/StructureProjection3DView';
import type { PerspectiveHitResult, PerspectiveQuestionData } from '../utils/perspectiveUtils';
~~~~~

~~~~~act
patch_file
src/packs/perspective/views/PerspectiveCanvas.tsx
~~~~~
~~~~~typescript.old
  if (mode === 'PROPORTION_DIVISION') {
    return (
      <ProportionDivisionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer as (point: Point) => void}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }
~~~~~
~~~~~typescript.new
  if (mode === 'PROPORTION_DIVISION') {
    return (
      <ProportionDivisionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer as (point: Point) => void}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'PROPORTION_MIGRATION') {
    return (
      <ProportionMigrationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer as (point: Point) => void}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }
~~~~~

~~~~~act
patch_file
src/packs/perspective/plugin.tsx
~~~~~
~~~~~typescript.old
    const map: Record<string, string> = {
      VP_CONVERGENCE: '透视灭点汇聚',
      PROPORTION_DIVISION: '比例盲切划分',
      GESTALT_CONTINUATION_2AFC: '格式塔完形断线',
      STRUCTURE_PROJECTION_3D: '3D 结构空间翻转',
    };
~~~~~
~~~~~typescript.new
    const map: Record<string, string> = {
      VP_CONVERGENCE: '透视灭点汇聚',
      PROPORTION_DIVISION: '比例盲切划分',
      PROPORTION_MIGRATION: '空间比例角度迁移',
      GESTALT_CONTINUATION_2AFC: '格式塔完形断线',
      STRUCTURE_PROJECTION_3D: '3D 结构空间翻转',
    };
~~~~~

~~~~~act
patch_file
src/packs/perspective/index.ts
~~~~~
~~~~~typescript.old
import { Box, Eye, Layers, Sliders } from 'lucide-preact';
~~~~~
~~~~~typescript.new
import { ArrowRightLeft, Box, Eye, Layers, Sliders } from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/packs/perspective/index.ts
~~~~~
~~~~~typescript.old
  {
    id: 'perspective_proportion_division',
    packId: 'perspective',
    mode: 'PROPORTION_DIVISION',
    title: '平面比例与黄金分割盲切',
    desc: '观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。',
    instruction: '观察线段并在指定比例位置单次点击',
    icon: Layers,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
  },
~~~~~
~~~~~typescript.new
  {
    id: 'perspective_proportion_division',
    packId: 'perspective',
    mode: 'PROPORTION_DIVISION',
    title: '平面比例与黄金分割盲切',
    desc: '观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。',
    instruction: '观察线段并在指定比例位置单次点击',
    icon: Layers,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
  },
  {
    id: 'perspective_proportion_migration',
    packId: 'perspective',
    mode: 'PROPORTION_MIGRATION',
    title: '空间比例角度迁移',
    desc: '观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。',
    instruction: '观察上方基准线目标点，在下方倾斜线段上点选相同比例位置',
    icon: ArrowRightLeft,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['proportion', 'spatial_orientation', 'visual_memory'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
  },
~~~~~

---

### 下一步建议

1. **测试卡片体验**：
   - 在卡片筛选中开启“显示实验性卡片”（或直接在透视包中打开 **空间比例角度迁移**）。
   - 确认顶部水平线左端带有清晰紫环起点标示，且其上标出的目标点为连续随机比例。
   - 确认在下方倾斜线段上移动时光标隐藏且能精准正交投影吸附，点击作答能正确给出比例误差分析。
2. **准备提交**：验证效果无误后可进行统一 Commit。
