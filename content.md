## [WIP] feat(abstraction): 为 GestureAxisView 增加直观的上方画布与下方滑块正误视觉反馈

### 错误分析
当前 `GestureAxisView` 在答案揭晓 (`showAnswer = true`) 时，仅绘制了标准答案的势线与滑块位置，未记录和展示用户的选择位置与对错状态，导致关闭音效时用户无法感知判断偏差。

### 用户需求
在 `GestureAxisView` 中提交并揭晓答案后：
1. 上方粒子画布需同时呈现标准答案势线（实线绿）与用户选择势线（正确为实线绿，错误为虚线红）。
2. 下方滑块轨道需同时呈现标准真理游标（绿杠）与用户选择游标（命中绿杠、未命中红杠）。

### 评论
该改进补齐了视觉反馈的闭环，大幅提升了无声环境下的产品体验。

### 目标
1. 扩展 `drawParticlesCanvas` 工具函数，支持在揭晓时额外绘制用户作答轨迹线。
2. 更新 `GestureAxisView` 组件逻辑，传入用户作答值与命中状态，渲染上方双轴对比与下方双游标对比。

### 基本原理
复用系统中成熟的 `ContinuousTrackPanel` 视觉规范，采用双色双线（绿 = 真理/正确，红 = 偏差/错误）对比方案，使对错一目了然。

### 标签
#intent/build #flow/ready #priority/medium #comp/engine #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/gesture-axis-view #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 扩展 drawParticlesCanvas 支持双轴对比绘制
~~~~~act
patch_file
src/utils/canvas/drawParticles.ts
~~~~~
~~~~~typescript.old
export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = 400,
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
~~~~~
~~~~~typescript.new
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
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
  }

  // 若存在用户作答角度且已揭晓，先绘制用户选择的势线（命中绿，未命中红）
  if (userAxisAngle !== undefined && userAxisAngle !== axisAngle) {
    const radU = (userAxisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = isHit ? '#22C55E' : '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(radU), cy - L * Math.sin(radU));
    ctx.lineTo(cx + L * Math.cos(radU), cy + L * Math.sin(radU));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 绘制指示势线 (标准真理线)
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

#### Acts 2: 更新 GestureAxisView 组件以支持上下双轨正误反馈
~~~~~act
patch_file
src/components/abstraction/GestureAxisView.tsx
~~~~~
~~~~~tsx.old
  const activeVal = hoverVal !== null ? hoverVal : sliderVal;

  useEffect(() => {
    drawParticlesCanvas(
      canvasRef.current,
      question.particles,
      ABSTRACTION_CANVAS_SIZE,
      showAnswer ? question.targetAngleDeg : activeVal,
      showAnswer ? '#22C55E' : '#6366F1',
    );
  }, [question.particles, activeVal, showAnswer, question.targetAngleDeg]);

  const unit = '°';
~~~~~
~~~~~tsx.new
  const activeVal = hoverVal !== null ? hoverVal : sliderVal;
  const userVal = userAnswer?.userValue ?? sliderVal;
  const targetVal = question.targetAngleDeg ?? 0;
  const isHit = Boolean(userAnswer?.isHit);

  useEffect(() => {
    drawParticlesCanvas(
      canvasRef.current,
      question.particles,
      ABSTRACTION_CANVAS_SIZE,
      showAnswer ? targetVal : activeVal,
      showAnswer ? '#22C55E' : '#6366F1',
      showAnswer ? userVal : undefined,
      isHit,
    );
  }, [question.particles, activeVal, showAnswer, targetVal, userVal, isHit]);

  const unit = '°';
~~~~~

~~~~~act
patch_file
src/components/abstraction/GestureAxisView.tsx
~~~~~
~~~~~tsx.old
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${(activeVal / 180) * 100}%` }}
                />
              )}

              {showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                  style={{ left: `${((question.targetAngleDeg ?? 0) / 180) * 100}%` }}
                />
              )}
~~~~~
~~~~~tsx.new
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${(activeVal / 180) * 100}%` }}
                />
              )}

              {showAnswer && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${(targetVal / 180) * 100}%` }}
                  />
                  <div
                    className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                      isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ left: `${(userVal / 180) * 100}%` }}
                  />
                </>
              )}
~~~~~

### 下一步建议
建议检查其他连续滑块类视图（如 `RatioEstimationView` 等）是否也需要类似的双轨正误提示，以保持全局交互体验的一致性。
