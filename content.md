这个需求非常实用。在滑块交互中，极值点（如 0°/0% 或 360°/100%）在精细操作时极易因为鼠标移出轨道边缘而丢失悬停状态。

我们可以通过在滑块轨道外层添加扩展感应区域（Hotzone Wrapper）来实现该效果：将鼠标事件（`mousemove` / `mouseleave` / `click`）监听提升至外层扩展容器，而将测量基准（`activeTrackRef`）保留在实际的色块轨道上。这样当鼠标移动到滑块左右两侧略微往外（如 ±12px 范围）时，事件仍会触发，同时由于逻辑中已包含 `Math.max(0, Math.min(..., rect.width))` 的边界约束，光标即可精准吸附在 0°/0% 或 360°/100% 的极值末端。

以下是具体的实施计划：

## [WIP] feat(color-sense): 扩展色感滑块感应区以支持极值吸附

### 用户需求
在色感训练中，当鼠标移动到待测滑块左右两侧略微往外的位置时，保持长方形悬停光标吸附在滑块极值末端（如 0°、100%），而不是直接隐藏光标，以便于选择极限数值。

### 评论
这是一个显著提升交互体验（UX）与极端值选择精准度的改进。

### 目标
1. 在 `ColorCanvas.tsx` 中增加轨道的扩展感应容器（Hotzone Wrapper）。
2. 将鼠标交互与点击事件托管至外层容器，保持 `ref` 指向内部物理轨道。
3. 确保鼠标在滑块两侧微外区域移动或点击时，光标能自然吸附在极值位置。

### 基本原理
现有逻辑中，`Math.max(0, Math.min(e.clientX - rect.left, rect.width))` 已经具备极值 Clamp 截断计算能力。通过使用外层容器扩展 12px 的热区 Padding（`px-3 -mx-3`），可以避免移出轨道瞬间触发 `onMouseLeave`，从而让光标稳定显示并吸附在极值处。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-canvas #task/action/extend-hit-area #task/state/begin

---

### Script

#### Acts 1: 修改 ColorCanvas.tsx 扩展滑块交互感应区

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
  // 渲染单个 Slider 轨道行
  const renderSliderRow = (
    label: 'H' | 'S' | 'V',
    isTargetActiveMode: boolean,
    gradient: string,
    val: number,
    max: number,
    unit: string,
  ) => {
    return (
      <div key={label} className="flex items-center gap-3 w-full">
        {/* Label */}
        <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

        {/* Track */}
        <div
          ref={isTargetActiveMode ? activeTrackRef : null}
          onClick={isTargetActiveMode ? handleActiveTrackClick : undefined}
          onKeyDown={
            isTargetActiveMode
              ? (e) => {
                  if (
                    (e.key === 'Enter' || e.key === ' ') &&
                    hoverVal !== null &&
                    !disabled &&
                    !showAnswer
                  ) {
                    e.preventDefault();
                    onAnswer(hoverVal);
                  }
                }
              : undefined
          }
          role={isTargetActiveMode ? 'button' : undefined}
          tabIndex={isTargetActiveMode && !showAnswer && !disabled ? 0 : undefined}
          onMouseMove={isTargetActiveMode ? handleMouseMove : undefined}
          onMouseLeave={isTargetActiveMode ? handleMouseLeave : undefined}
          className={`relative flex-1 h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center ${
            isTargetActiveMode && !showAnswer && !disabled
              ? 'cursor-none hover:ring-2 ring-indigo-400/60'
              : 'cursor-default'
          }`}
          style={{ background: gradient }}
        >
          {/* 已知维度标记 (细长黑色竖条) */}
          {!isTargetActiveMode && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 border border-white/80 rounded-sm shadow-sm"
              style={{ left: getPercent(val, max) }}
            />
          )}

          {/* 悬停准心 (细长空心竖条) */}
          {isTargetActiveMode && !showAnswer && hoverVal !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 border-2 border-indigo-600 bg-white/40 rounded-sm shadow-md pointer-events-none z-30"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {/* 待测维度答题揭晓：真理目标与用户选择 (竖条标记) */}
          {isTargetActiveMode && showAnswer && (
            <>
              {/* 真理目标位 (绿色竖条) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-8 bg-emerald-500 border-2 border-white rounded-sm shadow-md z-10"
                style={{ left: getPercent(val, max) }}
              />

              {/* 用户点击位 (红色或绿色竖条) */}
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-8 border-2 border-white ${
                    userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } rounded-sm shadow-md z-20`}
                  style={{ left: getPercent(userAnswer.userValue, max) }}
                />
              )}
            </>
          )}
        </div>

        {/* 数值 Label */}
~~~~~
~~~~~typescript.new
  // 渲染单个 Slider 轨道行
  const renderSliderRow = (
    label: 'H' | 'S' | 'V',
    isTargetActiveMode: boolean,
    gradient: string,
    val: number,
    max: number,
    unit: string,
  ) => {
    return (
      <div key={label} className="flex items-center gap-3 w-full">
        {/* Label */}
        <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

        {/* Track Extended Hit Area */}
        <div
          onClick={isTargetActiveMode ? handleActiveTrackClick : undefined}
          onKeyDown={
            isTargetActiveMode
              ? (e) => {
                  if (
                    (e.key === 'Enter' || e.key === ' ') &&
                    hoverVal !== null &&
                    !disabled &&
                    !showAnswer
                  ) {
                    e.preventDefault();
                    onAnswer(hoverVal);
                  }
                }
              : undefined
          }
          role={isTargetActiveMode ? 'button' : undefined}
          tabIndex={isTargetActiveMode && !showAnswer && !disabled ? 0 : undefined}
          onMouseMove={isTargetActiveMode ? handleMouseMove : undefined}
          onMouseLeave={isTargetActiveMode ? handleMouseLeave : undefined}
          className={`relative flex-1 py-1.5 -my-1.5 px-3 -mx-3 flex items-center ${
            isTargetActiveMode && !showAnswer && !disabled ? 'cursor-none' : 'cursor-default'
          }`}
        >
          {/* Inner Track */}
          <div
            ref={isTargetActiveMode ? activeTrackRef : null}
            className={`relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center ${
              isTargetActiveMode && !showAnswer && !disabled
                ? 'hover:ring-2 ring-indigo-400/60'
                : ''
            }`}
            style={{ background: gradient }}
          >
            {/* 已知维度标记 (细长黑色竖条) */}
            {!isTargetActiveMode && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 border border-white/80 rounded-sm shadow-sm"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* 悬停准心 (细长空心竖条) */}
            {isTargetActiveMode && !showAnswer && hoverVal !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 border-2 border-indigo-600 bg-white/40 rounded-sm shadow-md pointer-events-none z-30"
                style={{ left: getPercent(hoverVal, max) }}
              />
            )}

            {/* 待测维度答题揭晓：真理目标与用户选择 (竖条标记) */}
            {isTargetActiveMode && showAnswer && (
              <>
                {/* 真理目标位 (绿色竖条) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-8 bg-emerald-500 border-2 border-white rounded-sm shadow-md z-10"
                  style={{ left: getPercent(val, max) }}
                />

                {/* 用户点击位 (红色或绿色竖条) */}
                {userAnswer && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-8 border-2 border-white ${
                      userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    } rounded-sm shadow-md z-20`}
                    style={{ left: getPercent(userAnswer.userValue, max) }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* 数值 Label */}
~~~~~

### 下一步建议
1. 在浏览器中体验色感训练（如 Hue 模式），测试将鼠标移动到滑块轨道左侧/右侧外边缘时，光标是否平滑吸附在 `0°` 或 `360°` 处。
2. 确认没有问题后可提交变更。
