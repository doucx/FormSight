好的，我们来针对【黑白素描归组】（`NOTAN_THRESHOLD`）进行这两项体验升级：

1. **双视口对称展示**：
   - **左侧**：展示**未被二分的连续灰阶分形原图**（`Raw Grayscale Scene`），让用户清晰看到画面的灰度层次与大形体势。
   - **右侧**：展示**随滑块交互实时二值化显影的 Notan 画布**。
2. **直觉即时提交（Click/Drag to Commit）**：
   - 移除底部的“确认提交”按钮，用户在滑动条上的**点击或拖拽松手即视为提交**（与 `GESTURE_AXIS` 和其他滑块卡片行为保持一致）。

## [WIP] feat(abstraction): 黑白素描归组支持原图对照与即点即答

### 用户需求
1. 在画面左侧展示未被二值化截断的连续灰度原图，方便用户对照原图调性与大关系。
2. 取消多余的底部“确认提交”按钮，用户在滑块轨道的点选/拖拽释放直接触发提交。

### 评论
左侧原图对照彻底解决了“用户不知道在调什么”的迷茫感；即点即答（Point-to-Commit）大幅精简了交互链路，使训练节奏更加紧凑流畅。

### 目标
1. 在 `AbstractionCanvas.tsx` 中新增连续灰阶原图绘制函数 `drawRawGrayscaleNoiseField`。
2. 为 `NOTAN_THRESHOLD` 设计双视口布局（左原图、右二值），并接入 `onCommit` 即时判定。
3. 移除 `NOTAN_THRESHOLD` 的显式“确认提交”按钮。

### 基本原理
1. 通过离屏 Canvas 读取 `notanBuffer`（$0 \sim 255$ 原生灰度值）直接生成灰阶位图，以双视口并列呈现（左侧灰阶原图，右侧基于用户即时阈值二值截断）。
2. 在 `useTrackPointer` 的 `onCommit` 钩子中拦截 `NOTAN_THRESHOLD`，在 `PointerUp` 时直接提交当前截断值。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #concept/executor #scope/ux #ai/instruct #task/domain/canvas #task/object/notan-dual-viewport #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 改造 `AbstractionCanvas.tsx` 支持双视口原图对照与即点即答

我们将在 `AbstractionCanvas.tsx` 中添加灰阶原图渲染逻辑，重构 `NOTAN_THRESHOLD` 的视口布局并移除冗余提交按钮。

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
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
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: mode === 'GESTURE_AXIS' ? 180 : 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal: number) => {
      if (mode === 'GESTURE_AXIS' && !disabled && !showAnswer) {
        onAnswer(committedVal);
      }
    },
  });
~~~~~
~~~~~typescript.new
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
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
    } else if (mode === 'NOTAN_THRESHOLD') {
      if (question.notanBuffer) {
        drawNotanNoiseField(
          canvasMainRef.current,
          question.notanBuffer,
          question.notanFieldDim ?? 120,
          showAnswer ? question.idealNotanThreshold : activeVal,
          ABSTRACTION_CANVAS_SIZE,
        );
      } else {
        drawNotanScene(
          canvasMainRef.current,
          question.notanShapes,
          showAnswer ? question.idealNotanThreshold : activeVal,
          ABSTRACTION_CANVAS_SIZE,
        );
      }
    } else if (mode === 'PALETTE_CLUSTERING') {
~~~~~
~~~~~typescript.new
    } else if (mode === 'NOTAN_THRESHOLD') {
      // 左侧渲染连续灰阶原图
      if (question.notanBuffer) {
        drawRawGrayscaleNoiseField(
          canvasRefA.current,
          question.notanBuffer,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
      }
      // 右侧渲染实时二值截断结果
      if (question.notanBuffer) {
        drawNotanNoiseField(
          canvasRefB.current,
          question.notanBuffer,
          question.notanFieldDim ?? 120,
          showAnswer ? question.idealNotanThreshold : activeVal,
          ABSTRACTION_2AFC_SIZE,
        );
      } else {
        drawNotanScene(
          canvasRefB.current,
          question.notanShapes,
          showAnswer ? question.idealNotanThreshold : activeVal,
          ABSTRACTION_2AFC_SIZE,
        );
      }
    } else if (mode === 'PALETTE_CLUSTERING') {
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 视图 C：滑块/旋转连续调节视图 (GESTURE_AXIS / NOTAN_THRESHOLD)
  // =========================================================================
  const isGesture = mode === 'GESTURE_AXIS';
  const unit = isGesture ? '°' : '%';

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          {isGesture
            ? '旋转主轴对齐粒子群动态流向 (0°~180°)'
            : '调节二值化剪切线，达成黑白最平衡的 Notan 状态'}
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
          <span>{isGesture ? '动态势线角度:' : 'Notan 归组阈值:'}</span>
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
                  width: `${(activeVal / (isGesture ? 180 : 100)) * 100}%`,
                }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{
                    left: `${(activeVal / (isGesture ? 180 : 100)) * 100}%`,
                  }}
                />
              )}

              {showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                  style={{
                    left: `${((question.targetAngleDeg ?? question.idealNotanThreshold ?? 50) / (isGesture ? 180 : 100)) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">
            {isGesture ? 180 : 100}
            {unit}
          </span>
        </div>

        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              绝对真理值:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {isGesture ? question.targetAngleDeg : question.idealNotanThreshold}
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

      {!showAnswer && !isGesture && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(activeVal);
          }}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
~~~~~
~~~~~typescript.new
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
~~~~~

### 下一步建议
1. 可以在浏览器中进行试玩：
   - 观察左侧连续灰度原图（无二值化），并在右侧观察实时二值化变化；
   - 在滑动条上点按/滑动释放，确认直接判定并揭晓答案，无需额外敲空格或点击按钮提交。
2. 运行 `npm run check` 确保所有文件通过代码风格和类型检查。
