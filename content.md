我完全赞同这个设计方向。在美术临摹与动势感知训练中，“提取”本身意味着在大脑中抽象出主导势线并在白纸上重构，而不是在原始对象上直接描红。将散点流场（观察源）与势线画布（重构提取区）左右双窗口分离，不仅贴合真实临摹心智，也与“动态势线寻源 (2AFC)”在视觉语言和认知逻辑上形成了工整的互相对称。

我将为您生成重构计划，将绘制逻辑解耦为散点流场与独立势线画布，并在视图层采用双视窗并列布局。

## [WIP] refactor: 分离动态势线提取中的散点与势线画布

### 用户需求

在“动态势线提取”(`abs_gesture_axis`) 模块中，将原本叠加在单个画布上的散点流场与势线（主轴指示线）拆分为两个独立的画布视窗并列展示，以符合临摹提取时观察与重构分离的实际心智，并与“动态势线寻源”的视觉模块形成对称。

### 评论

原有的单画布叠层显示虽然直观，但更偏向于“重合校准”，削弱了空间势线抽象提取的认知挑战。将“观察源”与“提取势线”分离后，学习者必须在两幅画面间进行视觉跨越与空间投影，训练强度与真实感大大提升，同时界面的双窗结构与 `abs_td_gesture_2afc` 形成了良好的系统对称性。

### 目标

1. 在 `generator.ts` 中解耦画布绘制函数，拆分为纯散点流场绘制与纯势线（Spine/Axis）绘制函数。
2. 更新中英文语言包 (`zh-CN.json`, `en-US.json`)，补充散点源与提取势线的视窗副标题。
3. 重构 `AbsGestureAxisView.tsx`，将单视窗扩展为对称的双视窗网格布局，分别承载粒子流与可交互的势线。

### 基本原理

1. **绘制解耦**：将 `drawParticlesCanvas` 重构为：
   - `drawParticlesOnlyCanvas`：仅绘制背景离散流向粒子。
   - `drawAxisSpineCanvas`：仅绘制中心旋转的势线骨架，在公布答案时支持目标势线与用户输入势线的对比标注。
2. **响应式布局对称**：采用 `grid grid-cols-1 sm:grid-cols-2 gap-4` 双视窗结构，在移动端垂直堆叠、桌面端水平对称展开，外层卡片扩展至 `max-w-2xl`，提供舒适的对比视野。
3. **国际化标签补充**：在双视窗顶部加入如“粒子流向 / Particle Flow”与“提取势线 / Extracted Axis”的副标签，清晰界定观察区与绘制区。

### 标签

#intent/refine #flow/ready #priority/high #comp/cards #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/abs-gesture-axis #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 更新中英文本地化语言文件

增加双视窗的视窗标题。

~~~~~act
patch_file
src/cards/abs_gesture_axis/locales/zh-CN.json
~~~~~
~~~~~json.old
  "badge": "动态势线提取",
  "hint": "旋转主轴对齐粒子群动态流向 (0°~180°)",
  "label": "动态势线角度:",
  "settings": {
~~~~~
~~~~~json.new
  "badge": "动态势线提取",
  "hint": "旋转主轴对齐粒子群动态流向 (0°~180°)",
  "sourceTitle": "粒子流向",
  "axisTitle": "提取势线",
  "label": "动态势线角度:",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/abs_gesture_axis/locales/en-US.json
~~~~~
~~~~~json.old
  "badge": "Gesture Axis",
  "hint": "Rotate the primary axis to align with the particle flow (0°~180°)",
  "label": "Gesture Axis Angle:",
  "settings": {
~~~~~
~~~~~json.new
  "badge": "Gesture Axis",
  "hint": "Rotate the primary axis to align with the particle flow (0°~180°)",
  "sourceTitle": "Particle Flow",
  "axisTitle": "Extracted Axis",
  "label": "Gesture Axis Angle:",
  "settings": {
~~~~~

#### Acts 2: 解耦 `generator.ts` 中的绘制函数

将原本散点与势线合一的绘制逻辑拆解为独立的 `drawParticlesOnlyCanvas` 与 `drawAxisSpineCanvas`，并保留向后兼容。

~~~~~act
patch_file
src/cards/abs_gesture_axis/utils/generator.ts
~~~~~
~~~~~typescript.old
export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = CANVAS_SIZE,
  axisAngle?: number,
  axisColor: string = CANVAS_THEME.status.hit,
  userAxisAngle?: number,
  isHit?: boolean,
) {
  if (!particles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS_THEME.shape.fill;
    ctx.fill();
  }

  if (userAxisAngle !== undefined && userAxisAngle !== axisAngle) {
    const radU = (userAxisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = isHit ? CANVAS_THEME.status.hit : CANVAS_THEME.status.miss;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(radU), cy - L * Math.sin(radU));
    ctx.lineTo(cx + L * Math.cos(radU), cy + L * Math.sin(radU));
    ctx.stroke();
    ctx.setLineDash([]);
  }

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
~~~~~
~~~~~typescript.new
export function drawParticlesOnlyCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = CANVAS_SIZE,
) {
  if (!particles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS_THEME.shape.fill;
    ctx.fill();
  }
}

export function drawAxisSpineCanvas(
  canvas: HTMLCanvasElement | null,
  size = CANVAS_SIZE,
  axisAngle?: number,
  axisColor: string = CANVAS_THEME.status.hit,
  userAxisAngle?: number,
  isHit?: boolean,
) {
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  const cx = size / 2;
  const cy = size / 2;
  const L = size * 0.44;

  // 中心原点辅助微点
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = CANVAS_THEME.muted.foreground;
  ctx.fill();

  if (userAxisAngle !== undefined && userAxisAngle !== axisAngle) {
    const radU = (userAxisAngle * Math.PI) / 180;

    ctx.strokeStyle = isHit ? CANVAS_THEME.status.hit : CANVAS_THEME.status.miss;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(radU), cy - L * Math.sin(radU));
    ctx.lineTo(cx + L * Math.cos(radU), cy + L * Math.sin(radU));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (axisAngle !== undefined) {
    const rad = (axisAngle * Math.PI) / 180;

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(rad), cy - L * Math.sin(rad));
    ctx.lineTo(cx + L * Math.cos(rad), cy + L * Math.sin(rad));
    ctx.stroke();
  }
}

export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = CANVAS_SIZE,
  axisAngle?: number,
  axisColor: string = CANVAS_THEME.status.hit,
  userAxisAngle?: number,
  isHit?: boolean,
) {
  drawParticlesOnlyCanvas(canvas, particles, size);
  if (axisAngle !== undefined || userAxisAngle !== undefined) {
    drawAxisSpineCanvas(canvas, size, axisAngle, axisColor, userAxisAngle, isHit);
  }
}
~~~~~

#### Acts 3: 重构 `AbsGestureAxisView.tsx` 为对称双视窗结构

将单个画布拆为两个对称的卡片视窗（左侧：粒子流向，右侧：提取势线）。

~~~~~act
patch_file
src/cards/abs_gesture_axis/AbsGestureAxisView.tsx
~~~~~
~~~~~typescript.old
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, drawParticlesCanvas } from './utils/generator';

export interface AbsGestureAxisViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AbsGestureAxisView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AbsGestureAxisViewProps) {
  const { t } = useCardTranslation('abs_gesture_axis');
  const [currentVal, setCurrentVal] = useState<number>(90);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  const targetVal = question.targetAngleDeg;
  const isHit = Boolean(userAnswer?.isHit);
  const activeSliderVal = hoverVal !== null ? hoverVal : currentVal;
  const userVal = userAnswer?.userValue ?? activeSliderVal;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      {/* 粒子流向预览画布 */}
      <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center w-full">
        <CanvasView
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
          draw={(canvas) => {
            drawParticlesCanvas(
              canvas,
              question.particles,
              CANVAS_SIZE,
              showAnswer ? targetVal : activeSliderVal,
              showAnswer ? CANVAS_THEME.status.hit : CANVAS_THEME.status.accentHover,
              showAnswer ? userVal : undefined,
              isHit,
            );
          }}
          deps={[question.particles, activeSliderVal, showAnswer, targetVal, userVal, isHit]}
        />
      </div>

      {/* 势线角度连续调节滑块 */}
~~~~~
~~~~~typescript.new
import type { HitResult, QuestionData } from './types';
import {
  CANVAS_SIZE,
  drawAxisSpineCanvas,
  drawParticlesOnlyCanvas,
} from './utils/generator';

const CANVAS_VIEW_CLASS =
  'w-full max-w-[260px] aspect-square rounded-xl border border-border shadow-sm bg-card block';

export interface AbsGestureAxisViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AbsGestureAxisView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AbsGestureAxisViewProps) {
  const { t } = useCardTranslation('abs_gesture_axis');
  const [currentVal, setCurrentVal] = useState<number>(90);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  const targetVal = question.targetAngleDeg;
  const isHit = Boolean(userAnswer?.isHit);
  const activeSliderVal = hoverVal !== null ? hoverVal : currentVal;
  const userVal = userAnswer?.userValue ?? activeSliderVal;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 双视窗对称呈现：观察源（粒子群）与提取骨架（势线） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/* 视窗 1: 粒子流向 */}
        <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('sourceTitle')}
          </span>
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={CANVAS_VIEW_CLASS}
              draw={(canvas) => {
                drawParticlesOnlyCanvas(canvas, question.particles, CANVAS_SIZE);
              }}
              deps={[question.particles]}
            />
          </div>
        </div>

        {/* 视窗 2: 提取势线 */}
        <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('axisTitle')}
          </span>
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={CANVAS_VIEW_CLASS}
              draw={(canvas) => {
                drawAxisSpineCanvas(
                  canvas,
                  CANVAS_SIZE,
                  showAnswer ? targetVal : activeSliderVal,
                  showAnswer ? CANVAS_THEME.status.hit : CANVAS_THEME.status.accentHover,
                  showAnswer ? userVal : undefined,
                  isHit,
                );
              }}
              deps={[activeSliderVal, showAnswer, targetVal, userVal, isHit]}
            />
          </div>
        </div>
      </div>

      {/* 势线角度连续调节滑块 */}
~~~~~

### 下一步建议

1. **界面与交互微调**：运行开发服务器观察在不同移动端和桌面端宽度下的双画布排版是否和谐舒适。
2. **答题结果呈现优化**：若用户希望在答案公布后直观看到“拟合是否精准”，可以考虑在 `showAnswer` 状态下在粒子流场画布上也淡淡叠加出正确势线作为辅助复盘，或保持当前的完全解耦状态。
