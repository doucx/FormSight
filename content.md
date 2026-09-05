这是一个非常切合写生与临摹认知心智的改进。在实际的视觉提炼与动势感知训练中，观察对象（点阵流场）与提炼表达（主成分势线骨架）应当保持视窗解耦，这不仅能避免参考线条直接遮蔽或干扰散点原貌，还能与“动态势线寻源 (abs_td_gesture_2afc)”形成统一的双视口交互对称性。

我已为你准备好将 `abs_gesture_axis` 重构为双视窗并列渲染的执行计划。

## [WIP] feat: 将动态势线提取卡片重构为双视口分离渲染

### 用户需求
在“动态势线提取”(abs_gesture_axis) 模块中，将原本重叠在单一画布中的散点粒子流场与旋转势线拆分成左右两个独立的视窗（左视口展示离散粒子流场，右视口展示提炼出的势线），并在布局上与“动态势线寻源”模块保持对称。

### 评论
当前单画布叠加模式降低了提取难度，且不符合实际绘画中“独立观察与心智重构”的心智模型。利用 SDK 中现有的 `DualViewportContainer` 进行左右分屏展示，既能让学习者专注通过视觉感知提取主轴角度，又规范了全系统的双视口布局标准。

### 目标
1. 扩充 `abs_gesture_axis` 中英文语言包，添加双视窗标题词条（“粒子流场”与“提取势线”）。
2. 解耦 `generator.ts` 的画布绘制逻辑，将原本合一的渲染拆分为独立绘制散点粒子场的 `drawParticlesCanvas` 与独立绘制主导势线及中心原点的 `drawAxisCanvas`。
3. 升级 `AbsGestureAxisView.tsx`，引入 `DualViewportContainer` 将外层卡片宽度调整为 `max-w-3xl`，将流场与势线分别挂载到左右视窗。

### 基本原理
1. 通过 `DualViewportContainer` 标准组件提供响应式网格布局（在桌面端双列平铺，移动端单列自适应），统一卡片级视窗的标题与间距规范。
2. 左右两侧 Canvas 复用 `CANVAS_SIZE` 内部坐标系，外层通过统一的响应式约束类自适应容器，确保粒子密度与主轴长短在各分辨率下保持物理比例一致。
3. 动态保留作答反馈特性：在揭晓答案时，右侧势线视口清晰对比目标真理势线（实线）与用户提交势线（虚线与命中色彩）。

### 标签
#intent/build #flow/ready #priority/high #comp/cards #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/gesture-axis-viewports #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新中英多语言字典，增加双视口标题

我们为 `abs_gesture_axis` 模块的 `zh-CN.json` 与 `en-US.json` 添加左右视口的语义标题。

~~~~~act
patch_file
src/cards/abs_gesture_axis/locales/zh-CN.json
~~~~~
~~~~~json.old
  "hint": "旋转主轴对齐粒子群动态流向 (0°~180°)",
  "label": "动态势线角度:",
  "settings": {
~~~~~
~~~~~json.new
  "hint": "旋转主轴对齐粒子群动态流向 (0°~180°)",
  "label": "动态势线角度:",
  "particleField": "粒子流场",
  "gestureAxis": "提取势线",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/abs_gesture_axis/locales/en-US.json
~~~~~
~~~~~json.old
  "hint": "Rotate the primary axis to align with the particle flow (0°~180°)",
  "label": "Gesture Axis Angle:",
  "settings": {
~~~~~
~~~~~json.new
  "hint": "Rotate the primary axis to align with the particle flow (0°~180°)",
  "label": "Gesture Axis Angle:",
  "particleField": "Particle Flow Field",
  "gestureAxis": "Extracted Axis",
  "settings": {
~~~~~

#### Acts 2: 解耦画布图元渲染函数

在 `generator.ts` 中拆分绘制逻辑：保留 `drawParticlesCanvas` 仅负责渲染散点，新增 `drawAxisCanvas` 负责渲染提炼势线与对比线。

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
export function drawParticlesCanvas(
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

export function drawAxisCanvas(
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

  // 绘制中心基准弱锚点
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = CANVAS_THEME.shape.border;
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
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(rad), cy - L * Math.sin(rad));
    ctx.lineTo(cx + L * Math.cos(rad), cy + L * Math.sin(rad));
    ctx.stroke();
  }
}
~~~~~

#### Acts 3: 重构 AbsGestureAxisView 视图组件为双视口布局

替换 `AbsGestureAxisView.tsx`，使用 `DualViewportContainer` 承载两个并列视窗，并将外部卡片宽度调整为宽屏 `max-w-3xl`。

~~~~~act
write_file
src/cards/abs_gesture_axis/AbsGestureAxisView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';

import {
  CANVAS_THEME,
  CanvasView,
  DualViewportContainer,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, drawAxisCanvas, drawParticlesCanvas } from './utils/generator';

const CANVAS_VIEWPORT_CLASS =
  'w-full max-w-[220px] sm:max-w-[250px] aspect-square rounded-xl block';

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
      maxWidth="max-w-3xl"
    >
      {/* 散点流场与提炼势线双视口 */}
      <div className="bg-muted/60 p-4 rounded-2xl border border-border shadow-inner w-full">
        <DualViewportContainer
          leftTitle={t('particleField')}
          rightTitle={t('gestureAxis')}
          leftContent={
            <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
              <CanvasView
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className={CANVAS_VIEWPORT_CLASS}
                draw={(canvas) => {
                  drawParticlesCanvas(canvas, question.particles, CANVAS_SIZE);
                }}
                deps={[question.particles]}
              />
            </div>
          }
          rightContent={
            <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
              <CanvasView
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className={CANVAS_VIEWPORT_CLASS}
                draw={(canvas) => {
                  drawAxisCanvas(
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
          }
        />
      </div>

      {/* 势线角度连续调节滑块 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('label')}</span>
          <span className="font-mono text-base font-black text-primary">
            {showAnswer && userAnswer?.userValue !== undefined
              ? `${userAnswer.userValue}°`
              : `${activeSliderVal}°`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0°</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeSliderVal}
            max={180}
            min={0}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetVal}
            userValue={userAnswer?.userValue}
            tolerance={question.tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">180°</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

### 下一步建议
1. **启动本地开发服务验证**: 运行 `pnpm dev` 查看 `abs_gesture_axis` 卡片在桌面端与移动端下的双视口对齐效果与流畅度。
2. **校验快捷键与手势体验**: 在滑块拖拽与悬停时，确保右侧势线视窗能实时高响应联动，且在揭晓答案时能够正确呈现红/绿比对线。
3. **确认无误后提交**: 如效果符合预期，通知我生成 `[COMMIT]` 计划以纳入版本控制。
