我将生成一个针对本次 DRY 分析报告的系统重构计划，提炼通用 Canvas 上下文初始化工具、统一统计聚合函数以及抽离高频复用的视口样式。

## [WIP] refactor: 消除 Canvas 样板代码、统计计算克隆与重复样式

### 用户需求
针对 `scripts/check_dry.py --include-packs` 报告指出的代码克隆与重复样式组合，实施系统化重构：
1. 提炼 Canvas 2D 绘图上下文与清屏样板逻辑（`setup2DCanvas`）。
2. 在核心契约层提供通用的指标统计聚合辅助函数（`calculateBasicOverallStats`）及交互属性基类接口（`BaseInteractiveCardProps`）。
3. 重构各大 Pack 的 Canvas 绘制工具与 Analytics 插件，移除冗余计算。
4. 优化 `TopDown2AfcView` 中的重复 Tailwind 题干与选项样式组合。

### 评论
该重构能够以零运行时风险消除 40 余组代码克隆与多处重复样式，大幅提升 Canvas 绘图函数与统计分析模块的可维护性与一致性。

### 目标
1. 在 `src/core/canvas/hidpi.ts` 中新增 `setup2DCanvas` 基础清屏辅助函数。
2. 在 `src/core/contracts.ts` 中新增 `BaseInteractiveCardProps` 与 `calculateBasicOverallStats`。
3. 重构 `packs/abstraction`、`packs/angle`、`packs/perspective`、`packs/color`、`packs/negative_space`、`packs/star` 中的样板代码。
4. 优化 `TopDown2AfcView.tsx` 中的题干框架组件与画框样式。

### 基本原理
通过在 Core 契约与底层 Canvas 基础设施中收敛通用的“画板准备”与“做答命中率统计”通用逻辑，避免各个扩展包中重复编写 `getContext('2d')` 判空、白底填充以及 `records.filter(r => r.isHit).length` 等样板代码。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/refactoring #task/object/dry-consolidation #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 扩展 Core 基础设施（新增 `setup2DCanvas`、`BaseInteractiveCardProps` 与 `calculateBasicOverallStats`）

~~~~~act
patch_file
src/core/canvas/hidpi.ts
~~~~~
~~~~~typescript
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  return { ctx, size };
}
~~~~~
~~~~~typescript
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  return { ctx, size };
}

/**
 * 快速获取 2D 绘图上下文并填充默认背景色（轻量 2D 绘制专用）
 */
export function setup2DCanvas(
  canvas: HTMLCanvasElement | null,
  size: number,
  bgColor = '#FFFFFF',
): CanvasRenderingContext2D | null {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  return ctx;
}
~~~~~

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript
export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[]) => void;
  renderDiagnostics: (records: TRecord[]) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}
~~~~~
~~~~~typescript
export interface BaseInteractiveCardProps {
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function calculateBasicOverallStats<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord>(
  records: TRecord[],
): { accuracy: number; total: number } {
  const total = records.length;
  const hits = records.filter((r) => r.isHit).length;
  const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
  return { accuracy, total };
}

export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[]) => void;
  renderDiagnostics: (records: TRecord[]) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}
~~~~~

#### Acts 2: 重构 Abstraction Pack Canvas 工具与 TopDown2AfcView 样式

~~~~~act
patch_file
src/packs/abstraction/canvas/drawPaletteTiles.ts
~~~~~
~~~~~typescript
import { hsvToHex } from '../../../core/color/colorUtils';

export interface PaletteTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hsv: [number, number, number];
  weight: number;
}

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = 400,
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
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { hsvToHex } from '../../../core/color/colorUtils';

export interface PaletteTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hsv: [number, number, number];
  weight: number;
}

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = 400,
) {
  if (!tiles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}
~~~~~

~~~~~act
patch_file
src/packs/abstraction/canvas/drawParticles.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';

export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = 400,
  axisAngle?: number,
  axisColor = '#22C55E',
  userAxisAngle?: number,
  isHit?: boolean,
) {
  if (!canvas || !particles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 绘制散点
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import type { Point } from '../../../types';

export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = 400,
  axisAngle?: number,
  axisColor = '#22C55E',
  userAxisAngle?: number,
  isHit?: boolean,
) {
  if (!particles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 绘制散点
~~~~~

~~~~~act
patch_file
src/packs/abstraction/canvas/drawParticles.ts
~~~~~
~~~~~typescript
export function drawSpinePromptCanvas(
  canvas: HTMLCanvasElement | null,
  spine?: Point[],
  size = 160,
) {
  if (!canvas || !spine || spine.length < 2) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const [p1, p2] = spine;
~~~~~
~~~~~typescript
export function drawSpinePromptCanvas(
  canvas: HTMLCanvasElement | null,
  spine?: Point[],
  size = 160,
) {
  if (!spine || spine.length < 2) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  const [p1, p2] = spine;
~~~~~

~~~~~act
patch_file
src/packs/abstraction/components/TopDown2AfcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTranslation } from '../../../core/i18n';
import { drawRawGrayscaleNoiseField } from '../canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../canvas/drawParticles';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface TopDown2AfcViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTranslation } from '../../../core/i18n';
import { drawRawGrayscaleNoiseField } from '../canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../canvas/drawParticles';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

function PromptFrame({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {title}
      </span>
      <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
        {children}
      </div>
    </div>
  );
}

interface TopDown2AfcViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}
~~~~~

~~~~~act
patch_file
src/packs/abstraction/components/TopDown2AfcView.tsx
~~~~~
~~~~~typescript
  const renderPrompt = () => {
    if (isPoly && question.detailedPolygon) {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_polygon_decimation.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ABSTRACTION_CANVAS_SIZE}
              height={ABSTRACTION_CANVAS_SIZE}
              className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.detailedPolygon,
                  size: ABSTRACTION_CANVAS_SIZE,
                })
              }
              deps={[question.detailedPolygon]}
            />
          </div>
        </div>
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_gesture_2afc.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ABSTRACTION_THUMB_SIZE}
              height={ABSTRACTION_THUMB_SIZE}
              className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
              draw={(canvas) =>
                drawSpinePromptCanvas(canvas, question.promptSpine, ABSTRACTION_THUMB_SIZE)
              }
              deps={[question.promptSpine]}
            />
          </div>
        </div>
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_hull_2afc.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ABSTRACTION_THUMB_SIZE}
              height={ABSTRACTION_THUMB_SIZE}
              className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.promptHull,
                  size: ABSTRACTION_THUMB_SIZE,
                  fillColor: '#4F46E5',
                  strokeColor: '#3730A3',
                })
              }
              deps={[question.promptHull]}
            />
          </div>
        </div>
      );
    }

    if (mode === 'TD_NOTAN_2AFC' && question.promptNotanBuffer) {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_notan_2afc.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ABSTRACTION_THUMB_SIZE}
              height={ABSTRACTION_THUMB_SIZE}
              className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.promptNotanBuffer,
                  question.notanFieldDim ?? 120,
                  ABSTRACTION_THUMB_SIZE,
                )
              }
              deps={[question.promptNotanBuffer, question.notanFieldDim]}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  const renderOptionCanvas = (choice: 'A' | 'B') => {
    if (isPoly && question.simplifiedOptions) {
      const verts = choice === 'A' ? question.simplifiedOptions[0] : question.simplifiedOptions[1];
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
              fillColor: '#4F46E5',
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      const particles = choice === 'A' ? question.particlesA : question.particlesB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
          draw={(canvas) => drawParticlesCanvas(canvas, particles, ABSTRACTION_2AFC_SIZE)}
          deps={[particles]}
        />
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      const verts = choice === 'A' ? question.hullDetailedA : question.hullDetailedB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_NOTAN_2AFC') {
      const buf = choice === 'A' ? question.notanSceneBufferA : question.notanSceneBufferB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block"
          draw={(canvas) =>
            drawRawGrayscaleNoiseField(
              canvas,
              buf,
              question.notanFieldDim ?? 120,
              ABSTRACTION_2AFC_SIZE,
            )
          }
          deps={[buf, question.notanFieldDim]}
        />
      );
    }

    return null;
  };
~~~~~
~~~~~typescript
  const renderPrompt = () => {
    if (isPoly && question.detailedPolygon) {
      return (
        <PromptFrame title={t('packs.abstraction.cards.abs_polygon_decimation.promptTitle')}>
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.detailedPolygon,
                size: ABSTRACTION_CANVAS_SIZE,
              })
            }
            deps={[question.detailedPolygon]}
          />
        </PromptFrame>
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      return (
        <PromptFrame title={t('packs.abstraction.cards.abs_td_gesture_2afc.promptTitle')}>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawSpinePromptCanvas(canvas, question.promptSpine, ABSTRACTION_THUMB_SIZE)
            }
            deps={[question.promptSpine]}
          />
        </PromptFrame>
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      return (
        <PromptFrame title={t('packs.abstraction.cards.abs_td_hull_2afc.promptTitle')}>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.promptHull,
                size: ABSTRACTION_THUMB_SIZE,
                fillColor: '#4F46E5',
                strokeColor: '#3730A3',
              })
            }
            deps={[question.promptHull]}
          />
        </PromptFrame>
      );
    }

    if (mode === 'TD_NOTAN_2AFC' && question.promptNotanBuffer) {
      return (
        <PromptFrame title={t('packs.abstraction.cards.abs_td_notan_2afc.promptTitle')}>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawRawGrayscaleNoiseField(
                canvas,
                question.promptNotanBuffer,
                question.notanFieldDim ?? 120,
                ABSTRACTION_THUMB_SIZE,
              )
            }
            deps={[question.promptNotanBuffer, question.notanFieldDim]}
          />
        </PromptFrame>
      );
    }

    return null;
  };

  const renderOptionCanvas = (choice: 'A' | 'B') => {
    if (isPoly && question.simplifiedOptions) {
      const verts = choice === 'A' ? question.simplifiedOptions[0] : question.simplifiedOptions[1];
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className={CANVAS_OPTION_CLASS}
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
              fillColor: '#4F46E5',
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      const particles = choice === 'A' ? question.particlesA : question.particlesB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className={CANVAS_OPTION_CLASS}
          draw={(canvas) => drawParticlesCanvas(canvas, particles, ABSTRACTION_2AFC_SIZE)}
          deps={[particles]}
        />
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      const verts = choice === 'A' ? question.hullDetailedA : question.hullDetailedB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className={CANVAS_OPTION_CLASS}
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_NOTAN_2AFC') {
      const buf = choice === 'A' ? question.notanSceneBufferA : question.notanSceneBufferB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className={CANVAS_OPTION_CLASS}
          draw={(canvas) =>
            drawRawGrayscaleNoiseField(
              canvas,
              buf,
              question.notanFieldDim ?? 120,
              ABSTRACTION_2AFC_SIZE,
            )
          }
          deps={[buf, question.notanFieldDim]}
        />
      );
    }

    return null;
  };
~~~~~

#### Acts 3: 重构 Angle 与 Perspective 模块的 Canvas 绘制函数

~~~~~act
patch_file
src/packs/angle/utils/angleUtils.ts
~~~~~
~~~~~typescript
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';

export type AngleMode = 'ANGLE_ESTIMATION' | 'ANGLE_COMPARISON_2AFC' | 'PARALLEL_ALIGNMENT_2AFC';

export const ANGLE_CANVAS_SIZE = 340;
export const ANGLE_2AFC_SIZE = 240;
export const ANGLE_PROMPT_SIZE = 140;

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleQuestionData {
  id: string;
  mode: AngleMode;
  difficultyLevel: number;
  tolerance: number;

  targetAngleDeg?: number;
  startAngleDeg?: number;
  lineA?: LineSegment;
  lineB?: LineSegment;

  angleA?: number;
  angleB?: number;
  linesA?: [LineSegment, LineSegment];
  linesB?: [LineSegment, LineSegment];
  largerSide?: 'A' | 'B';

  promptLine?: LineSegment;
  lineOptionA?: LineSegment;
  lineOptionB?: LineSegment;
  parallelSide?: 'A' | 'B';
  angularDeviation?: number;
}

export interface AngleHitResult {
  isHit: boolean;
  userValue?: number;
  targetValue?: number;
  errorValue: number;
  tolerance: number;
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
}

export function drawAngleCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_CANVAS_SIZE,
  strokeColor = '#0F172A',
  lineWidth = 2.5,
): void {
  if (!canvas || !lines) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }
}

export function drawSingleLineCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  size = ANGLE_2AFC_SIZE,
  strokeColor = '#0F172A',
  lineWidth = 2.5,
): void {
  if (!canvas || !line) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();
}
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';

export type AngleMode = 'ANGLE_ESTIMATION' | 'ANGLE_COMPARISON_2AFC' | 'PARALLEL_ALIGNMENT_2AFC';

export const ANGLE_CANVAS_SIZE = 340;
export const ANGLE_2AFC_SIZE = 240;
export const ANGLE_PROMPT_SIZE = 140;

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleQuestionData {
  id: string;
  mode: AngleMode;
  difficultyLevel: number;
  tolerance: number;

  targetAngleDeg?: number;
  startAngleDeg?: number;
  lineA?: LineSegment;
  lineB?: LineSegment;

  angleA?: number;
  angleB?: number;
  linesA?: [LineSegment, LineSegment];
  linesB?: [LineSegment, LineSegment];
  largerSide?: 'A' | 'B';

  promptLine?: LineSegment;
  lineOptionA?: LineSegment;
  lineOptionB?: LineSegment;
  parallelSide?: 'A' | 'B';
  angularDeviation?: number;
}

export interface AngleHitResult {
  isHit: boolean;
  userValue?: number;
  targetValue?: number;
  errorValue: number;
  tolerance: number;
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
}

export function drawAngleCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_CANVAS_SIZE,
  strokeColor = '#0F172A',
  lineWidth = 2.5,
): void {
  if (!lines) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }
}

export function drawSingleLineCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  size = ANGLE_2AFC_SIZE,
  strokeColor = '#0F172A',
  lineWidth = 2.5,
): void {
  if (!line) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();
}
~~~~~

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
~~~~~

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript
export function drawVpConvergenceCanvas(
  canvas: HTMLCanvasElement | null,
  referenceLines: [LineSegment, LineSegment] | undefined,
  anchor: Point | undefined,
  angleDeg: number,
  length: number,
  size = PERSPECTIVE_CANVAS_SIZE,
  showAnswer = false,
  targetAngleDeg?: number,
): void {
  if (!canvas || !referenceLines || !anchor) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 1. 绘制两条已有参考线
~~~~~
~~~~~typescript
export function drawVpConvergenceCanvas(
  canvas: HTMLCanvasElement | null,
  referenceLines: [LineSegment, LineSegment] | undefined,
  anchor: Point | undefined,
  angleDeg: number,
  length: number,
  size = PERSPECTIVE_CANVAS_SIZE,
  showAnswer = false,
  targetAngleDeg?: number,
): void {
  if (!referenceLines || !anchor) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 1. 绘制两条已有参考线
~~~~~

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
export function drawProportionCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  targetPoint: Point | undefined,
  userPoint: Point | null | undefined,
  hoverPoint?: Point | null,
  showAnswer = false,
  size = PERSPECTIVE_CANVAS_SIZE,
): void {
  if (!line) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 主干线段
~~~~~

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript
export function drawGestaltCanvas(
  canvas: HTMLCanvasElement | null,
  obstacle: PerspectiveQuestionData['obstacle'],
  incomingLine: LineSegment | undefined,
  outgoingLine: LineSegment | undefined,
  size = PERSPECTIVE_2AFC_SIZE,
): void {
  if (!canvas || !obstacle || !incomingLine || !outgoingLine) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 入射与出射线段
~~~~~
~~~~~typescript
export function drawGestaltCanvas(
  canvas: HTMLCanvasElement | null,
  obstacle: PerspectiveQuestionData['obstacle'],
  incomingLine: LineSegment | undefined,
  outgoingLine: LineSegment | undefined,
  size = PERSPECTIVE_2AFC_SIZE,
): void {
  if (!obstacle || !incomingLine || !outgoingLine) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 入射与出射线段
~~~~~

#### Acts 4: 重构 Color、Negative Space 与 Star 的 Analytics 插件

~~~~~act
patch_file
src/packs/color/analytics.tsx
~~~~~
~~~~~typescript
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import { hsvToHex } from '../../core/color/colorUtils';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { i18n } from '../../core/i18n';
~~~~~
~~~~~typescript
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import { hsvToHex } from '../../core/color/colorUtils';
import { calculateBasicOverallStats, type CardAnalyticsPlugin } from '../../core/contracts';
import { i18n } from '../../core/i18n';
~~~~~

~~~~~act
patch_file
src/packs/color/analytics.tsx
~~~~~
~~~~~typescript
      getOverallStats: (records) => {
        const total = records.length;
        const hits = records.filter((r) => r.isHit).length;
        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError = total > 0 ? Math.round((sumError / total) * 10) / 10 : 0;

        return {
          accuracy,
          total,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
              <span>{i18n.t('packs.color.analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'hue_ring',
~~~~~
~~~~~typescript
      getOverallStats: (records) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError = baseStats.total > 0 ? Math.round((sumError / baseStats.total) * 10) / 10 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
              <span>{i18n.t('packs.color.analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'hue_ring',
~~~~~

~~~~~act
patch_file
src/packs/color/analytics.tsx
~~~~~
~~~~~typescript
      getOverallStats: (records) => {
        const total = records.length;
        const hits = records.filter((r) => r.isHit).length;
        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError = total > 0 ? Math.round((sumError / total) * 10) / 10 : 0;

        return {
          accuracy,
          total,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
              <span>{i18n.t('packs.color.analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
  ],
};
~~~~~
~~~~~typescript
      getOverallStats: (records) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError = baseStats.total > 0 ? Math.round((sumError / baseStats.total) * 10) / 10 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
              <span>{i18n.t('packs.color.analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
  ],
};
~~~~~

~~~~~act
patch_file
src/packs/negative_space/analytics.tsx
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { i18n } from '../../core/i18n';
import { getTrialRecordsByCard } from '../../utils/db/index';
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import { calculateBasicOverallStats, type CardAnalyticsPlugin } from '../../core/contracts';
import { i18n } from '../../core/i18n';
import { getTrialRecordsByCard } from '../../utils/db/index';
~~~~~

~~~~~act
patch_file
src/packs/negative_space/analytics.tsx
~~~~~
~~~~~typescript
      getOverallStats: (records) => {
        const total = records.length;
        const hits = records.filter((r) => r.isHit).length;
        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        return { accuracy, total };
      },
    },
  ],
};
~~~~~
~~~~~typescript
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ],
};
~~~~~

~~~~~act
patch_file
src/packs/star/analytics.tsx
~~~~~
~~~~~typescript
import { Compass, Target } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { i18n } from '../../core/i18n';
~~~~~
~~~~~typescript
import { Compass, Target } from 'lucide-preact';
import { calculateBasicOverallStats, type CardAnalyticsPlugin } from '../../core/contracts';
import { i18n } from '../../core/i18n';
~~~~~

~~~~~act
patch_file
src/packs/star/analytics.tsx
~~~~~
~~~~~typescript
        getOverallStats: (records) => {
          const total = records.length;
          const hits = records.filter((r) => r.isHit).length;
          const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
          return { accuracy, total };
        },
      },
      {
        id: 'directional_compass',
~~~~~
~~~~~typescript
        getOverallStats: (records) => calculateBasicOverallStats(records),
      },
      {
        id: 'directional_compass',
~~~~~

~~~~~act
patch_file
src/packs/star/analytics.tsx
~~~~~
~~~~~typescript
        getOverallStats: (records) => {
          const total = records.length;
          const hits = records.filter((r) => r.isHit).length;
          const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
          return { accuracy, total };
        },
      },
    ],
  };
}
~~~~~
~~~~~typescript
        getOverallStats: (records) => calculateBasicOverallStats(records),
      },
    ],
  };
}
~~~~~

### 下一步建议
1. 运行 `python scripts/check_dry.py --include-packs` 重新扫描，验证代码克隆数大幅下降。
2. 运行单元测试套件或构建脚本（如 `npm run build` / `npm run test`）验证全部修改类型与逻辑正确无误。
3. 若验证通过，可由用户确认发起 `[COMMIT]` 提交。
