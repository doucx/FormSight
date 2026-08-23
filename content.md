已经定位到问题所在。以下是针对**透视灭点汇聚感**和**平面比例与黄金分割盲切**两张卡片的修复与优化计划。

## [WIP] fix(packs): 修复透视灭点实时联动与居中布局，优化比例盲切目标指引

### 错误分析

1. **透视灭点汇聚（VP Convergence）实时联动失效**：
   `PerspectiveVpView` 在传递给 `CanvasView` 的 `draw` 函数时，仅使用了 `userVal`（来自 `userAnswer`，只有在提交后才存在），且未监听 `StandardSliderView` 的 `onValueChange` 事件，导致用户拖动滑块时画布未进行实时响应与重绘。
2. **透视射线组未居中**：
   原题目生成算法中，所有线段起点固定写死了 `center - 110` / `center - 100` 等负向偏移，在不同灭点方向下会导致射线偏向一角甚至部分超出画布。
3. **比例盲切无明确目标提示与方向基准**：
   提示仅依赖顶部的可选小胶囊；同时线段具有对称性，未标明“起点端”与“终点端”，导致用户无法确定比例（如 1/3 或黄金分割）应从哪一侧起算。

### 用户需求

1. 修复滑块调制时上方射线角度的实时动态响应。
2. 射线组与灭点几何基准居中显示在视口中央。
3. 比例盲切卡片增加醒目的目标比例提示与线段起点标示。

### 评论

这两个问题直接影响了透视模块交互的直观性与可用性。实时视觉反馈（Real-time Visual Feedback）是手眼协调训练的关键；明确的方向基准与居中对称性则能消除几何歧义，提升练习体验。

### 目标

1. 在 `PerspectiveVpView.tsx` 中引入 `liveAngle` 响应状态，并在滑块变动时实时重绘射线。
2. 重构 `perspectiveUtils.ts` 中的 `VP_CONVERGENCE` 几何生成算法，利用灭点方向与垂直法向量将 3 条射线整体居中布局在画布视口中心。
3. 在 `drawProportionCanvas` 与 `ProportionDivisionView.tsx` 中清晰标识线段起点，并提供显眼的目标比例提示卡片。

### 基本原理

- 通过在 `PerspectiveVpView` 订阅 `StandardSliderView.onValueChange`，将动态的当前/悬停角度同步至 Canvas 的绘图依赖 `deps`，触发实时重绘。
- 在 `VP_CONVERGENCE` 中计算灭点单位方向向量 $\mathbf{d}$ 与法向量 $\mathbf{n}$，以画布中心 $(c_x, c_y)$ 为基准，将 3 条线段的中心分布在 $\mathbf{n} \cdot \Delta$ 线上，并沿 $-\mathbf{d} \cdot (L/2)$ 放置起点，确保射线组始终居中。
- 在 `ProportionDivisionView` 增加独立醒目的目标看板，并在 Canvas 上对起点端增加标记与方向感，消除比例起算方向歧义。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/perspective-views #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 PerspectiveVpView 实时响应与重绘逻辑

我们将为 `PerspectiveVpView` 引入 `liveAngle` 状态，并将其接入 `StandardSliderView` 的 `onValueChange` 回调。

~~~~~act
patch_file
src/packs/perspective/components/PerspectiveVpView.tsx
~~~~~
~~~~~typescript.old
export function PerspectiveVpView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: PerspectiveVpViewProps) {
  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue as number | undefined;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="观察已有透视基准线，调制滑块旋转第三条射线使其交汇于同一灭点 (0°~360°)"
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="射线倾角:"
      max={360}
      step={0.5}
      initialValue={180}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onAnswer={onAnswer}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
            draw={(canvas) => {
              drawVpConvergenceCanvas(
                canvas,
                question.referenceLines,
                question.testLineAnchor,
                userVal ?? 180,
                question.testLineLength ?? 95,
                PERSPECTIVE_CANVAS_SIZE,
                showAnswer,
                targetVal,
              );
            }}
            deps={[question.referenceLines, userVal, showAnswer]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              精准交汇角: <span className="font-bold text-slate-800 font-mono">{targetVal}°</span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              误差: {userAnswer?.errorValue}° (容错: ±{tolerance}°)
            </span>
          </div>
        ) : null
      }
    />
  );
}
~~~~~
~~~~~typescript.new
import { useEffect, useState } from 'preact/hooks';

export function PerspectiveVpView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: PerspectiveVpViewProps) {
  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue as number | undefined;

  const [liveAngle, setLiveAngle] = useState<number>(180);

  // 当题目切换时重置当前调制角度为 180°
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset liveAngle on new question
  useEffect(() => {
    setLiveAngle(180);
  }, [question.id]);

  const currentActiveAngle = showAnswer && userVal !== undefined ? userVal : liveAngle;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="观察已有透视基准线，调制滑块旋转第三条射线使其交汇于同一灭点 (0°~360°)"
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="射线倾角:"
      max={360}
      step={0.5}
      initialValue={180}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onValueChange={(_cur, active) => setLiveAngle(active)}
      onAnswer={onAnswer}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
            draw={(canvas) => {
              drawVpConvergenceCanvas(
                canvas,
                question.referenceLines,
                question.testLineAnchor,
                currentActiveAngle,
                question.testLineLength ?? 95,
                PERSPECTIVE_CANVAS_SIZE,
                showAnswer,
                targetVal,
              );
            }}
            deps={[
              question.referenceLines,
              question.testLineAnchor,
              question.testLineLength,
              currentActiveAngle,
              showAnswer,
              targetVal,
            ]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              精准交汇角: <span className="font-bold text-slate-800 font-mono">{targetVal}°</span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              误差: {userAnswer?.errorValue}° (容错: ±{tolerance}°)
            </span>
          </div>
        ) : null
      }
    />
  );
}
~~~~~

#### Acts 2: 优化 perspectiveUtils.ts 中的射线居中算法与线段起点绘制

我们将更新透视灭点汇聚题目的生成算法，将射线组围绕画布中心排布，并在比例盲切中增加起点视觉标识。

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

  // 两端端点
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 4, 0, Math.PI * 2);
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

~~~~~act
patch_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript.old
  if (mode === 'VP_CONVERGENCE') {
    // 灭点距离：Level 1 约 400px (近距离灭点)，Level 35 约 1800px (超远长焦透视)
    const vpDist = expDecayInterpolate(400, 1800, clampedLevel);
    const vpAngle = (Math.floor(Math.random() * 360) * Math.PI) / 180;
    const center = PERSPECTIVE_CANVAS_SIZE / 2;

    const vpPoint: Point = {
      x: center + vpDist * Math.cos(vpAngle),
      y: center + vpDist * Math.sin(vpAngle),
    };

    // 参考线 1 和 2
    const refLine1: LineSegment = {
      p1: { x: center - 110, y: center - 80 + Math.random() * 20 },
      p2: { x: 0, y: 0 },
    };
    const ang1 = Math.atan2(vpPoint.y - refLine1.p1.y, vpPoint.x - refLine1.p1.x);
    refLine1.p2 = {
      x: refLine1.p1.x + 90 * Math.cos(ang1),
      y: refLine1.p1.y + 90 * Math.sin(ang1),
    };

    const refLine2: LineSegment = {
      p1: { x: center - 100, y: center + 70 + Math.random() * 20 },
      p2: { x: 0, y: 0 },
    };
    const ang2 = Math.atan2(vpPoint.y - refLine2.p1.y, vpPoint.x - refLine2.p1.x);
    refLine2.p2 = {
      x: refLine2.p1.x + 90 * Math.cos(ang2),
      y: refLine2.p1.y + 90 * Math.sin(ang2),
    };

    // 待调测试线段
    const testAnchor: Point = {
      x: center - 90 + Math.random() * 20,
      y: center + (Math.random() * 40 - 20),
    };
    const targetRad = Math.atan2(vpPoint.y - testAnchor.y, vpPoint.x - testAnchor.x);
    const targetAngleDeg = Math.round((((targetRad * 180) / Math.PI + 360) % 360) * 10) / 10;

    const tolerance = Math.round(expDecayInterpolate(8.0, 0.6, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      vpPoint,
      referenceLines: [refLine1, refLine2],
      testLineAnchor: testAnchor,
      testLineLength: 95,
      targetAngleDeg,
      tolerance,
    };
  }
~~~~~
~~~~~typescript.new
  if (mode === 'VP_CONVERGENCE') {
    // 灭点距离：Level 1 约 400px (近距离灭点)，Level 35 约 1800px (超远长焦透视)
    const vpDist = expDecayInterpolate(400, 1800, clampedLevel);
    const vpAngle = (Math.floor(Math.random() * 360) * Math.PI) / 180;
    const center = PERSPECTIVE_CANVAS_SIZE / 2;

    const dirX = Math.cos(vpAngle);
    const dirY = Math.sin(vpAngle);
    // 垂直于灭点方向的法向量
    const perpX = -dirY;
    const perpY = dirX;

    const vpPoint: Point = {
      x: center + vpDist * dirX,
      y: center + vpDist * dirY,
    };

    const lineLength = 95;

    // 将 3 条线段的中心沿垂直法向均匀分布在画布中央区域
    // 偏移分别为 -55 (参考线1), 0 (测试线), +55 (参考线2)
    const getCenteredRay = (perpOffset: number, length = lineLength): { p1: Point; p2: Point } => {
      // 锚点位于距离灭点反方向 (center - dir * (length/2)) 并叠加垂直偏移
      const anchorX = center - dirX * (length * 0.5) + perpX * perpOffset;
      const anchorY = center - dirY * (length * 0.5) + perpY * perpOffset;
      const ang = Math.atan2(vpPoint.y - anchorY, vpPoint.x - anchorX);

      return {
        p1: { x: Math.round(anchorX * 10) / 10, y: Math.round(anchorY * 10) / 10 },
        p2: {
          x: Math.round((anchorX + length * Math.cos(ang)) * 10) / 10,
          y: Math.round((anchorY + length * Math.sin(ang)) * 10) / 10,
        },
      };
    };

    const refLine1 = getCenteredRay(-55);
    const refLine2 = getCenteredRay(55);
    const testRay = getCenteredRay(0);

    const testAnchor = testRay.p1;
    const targetRad = Math.atan2(vpPoint.y - testAnchor.y, vpPoint.x - testAnchor.x);
    const targetAngleDeg = Math.round((((targetRad * 180) / Math.PI + 360) % 360) * 10) / 10;

    const tolerance = Math.round(expDecayInterpolate(8.0, 0.6, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      vpPoint,
      referenceLines: [refLine1, refLine2],
      testLineAnchor: testAnchor,
      testLineLength: lineLength,
      targetAngleDeg,
      tolerance,
    };
  }
~~~~~

#### Acts 3: 优化 ProportionDivisionView 界面与目标任务指引

在 `ProportionDivisionView` 视图增加醒目的目标指示栏与起点图例说明。

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript.old
  return (
    <QuestionCardShell
      hintText={`在线段上直接点击标出：【${question.targetRatioName ?? ''}】`}
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
      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
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
      </div>
    </QuestionCardShell>
  );
~~~~~
~~~~~typescript.new
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
~~~~~

---

### 下一步建议

1. **浏览器交互联调**：在本地运行开发服务器，进入 **透视空间感知** 扩展包：
   - 验证 **透视灭点汇聚感**：拖动滑块时，中间的第三条待调射线应实时旋转并跟随指针，且 3 条射线整体对称居中显示在白色画布正中央。
   - 验证 **平面比例盲切**：检查上方目标指引面板是否醒目，确认线段起点端具有明显的紫环标记与图例说明。
2. **确认变更并提交**：验证无误后可生成 `[COMMIT]` 计划将此修复提交至 Git 仓库。
