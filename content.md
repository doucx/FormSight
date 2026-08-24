在手机等移动端窄屏设备上，结算弹窗中的“难度层阶变化曲线” Canvas 超出弹窗容器，其根本原因在于 `setupHiDpiCanvas` 函数在配置 Retina / HiDPI 高清像素倍率时，直接将固定的逻辑像素数值赋给了元素的内联样式 `canvas.style.width = \`${logicalWidth}px\`` 与 `canvas.style.height = \`${logicalHeight}px\``。内联样式的优先级高于 CSS 类名中的响应式宽度 `w-full`，导致 Canvas 宽度被锁死在 440px，进而撑破了手机端弹窗。

我们将对此进行修复，将 `setupHiDpiCanvas` 的固定内联宽高调整为响应式流式布局约束 (`maxWidth = '100%'`, `height = 'auto'`)，并在弹窗与图表容器处强化防溢出约束。

## [WIP] fix: 修复移动端难度层阶变化曲线超出弹窗的问题

### 错误分析

1. **内联样式覆盖响应式类**: `src/core/canvas/hidpi.ts` 中的 `setupHiDpiCanvas` 将 `canvas.style.width` 硬编码设置为了 `${logicalWidth}px`（如 440px），在移动端屏幕（宽度通常为 360px~412px）上，内联样式优先级高于 Tailwind 的 `w-full`，强制 Canvas 保持 440px 宽。
2. **容器缺乏防溢出防护**: `SessionSummaryModal.tsx` 中的折线图包裹层未显式声明 `w-full` 与 `overflow-hidden`，导致子元素若有固定宽时会直接破位溢出。

### 用户需求

修复移动端手机设备上训练结算弹窗中“难度层阶变化曲线”超出弹窗宽度的样式溢出缺陷，确保在各类视口宽度下均能自适应等比缩放并清晰显示。

### 评论

这是一个典型的移动端响应式与 Canvas HiDPI 适配协同问题。Canvas 的物理渲染分辨率 (`canvas.width` / `canvas.height`) 应当负责画质与抗锯齿，而 CSS 盒模型样式应当交由容器流式布局管理，避免内联像素宽造成破坏。

### 目标

1. 修改 `src/core/canvas/hidpi.ts` 中的 `setupHiDpiCanvas`，移除强制写死的 `style.width` 与 `style.height`，替换为 `maxWidth = '100%'` 与 `height = 'auto'`。
2. 更新 `src/components/SessionSummaryModal.tsx`，为折线图容器及 Canvas 增加完备的 `w-full`、`max-w-full` 与 `overflow-hidden` 约束。

### 基本原理

1. `canvas.width` 和 `canvas.height` 设置为 `logicalWidth * dpr` 与 `logicalHeight * dpr`，并在绘制上下文应用 `ctx.scale(dpr, dpr)`，这决定了画布内部的逻辑坐标系与位图高清解析度。
2. 将 Canvas 样式宽度交给 CSS 控制（`max-width: 100%; height: auto; aspect-ratio: 11/4;`），浏览器会在保持 11:4 纵横比的同时，根据外层弹窗容器宽度平滑等比缩放，既保证在桌面端清晰，又保证在移动端窄屏下完美贴合容器内边距。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/refine #task/domain/ui #task/object/trend-chart-canvas #task/action/responsive-fix #task/state/begin

---

### Script

#### Acts 1: 修正 `setupHiDpiCanvas` 的 CSS 样式约束

修改 HiDPI 初始化函数，避免向 canvas 元素注入写死的像素级内联宽，改用响应式自适应样式。

~~~~~act
patch_file
src/core/canvas/hidpi.ts
~~~~~
~~~~~typescript
  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  ctx.resetTransform?.();
~~~~~
~~~~~typescript
  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';

  ctx.resetTransform?.();
~~~~~

#### Acts 2: 完善 `SessionSummaryModal.tsx` 折线图容器的响应式约束

为“难度层阶变化曲线”的外层容器添加 `w-full` 与 `overflow-hidden`，并规范 Canvas 类名。

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~typescript
        {/* 折线图 Canvas 区 */}
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-400">难度层阶变化曲线</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 击中
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 未击中
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full aspect-[11/4] rounded-xl"
          />
        </div>
~~~~~
~~~~~typescript
        {/* 折线图 Canvas 区 */}
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 w-full overflow-hidden">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-400">难度层阶变化曲线</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 击中
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 未击中
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full max-w-full aspect-[11/4] rounded-xl block"
          />
        </div>
~~~~~

### 下一步建议

1. **真机与移动端断点验证**: 在移动端或浏览器 DevTools 切换至 375px (iPhone SE) 与 390px (iPhone 14) 视口，完成一次训练并弹出总结弹窗，确认曲线图与弹窗内边距贴合无溢出。
2. **全局统计图表检查**: 检查 `GlobalStatsModal.tsx` 中的“能力峰值演进轨迹”图表在小屏下的表现，确认均已通过 `setupHiDpiCanvas` 的更新获得响应式保护。
