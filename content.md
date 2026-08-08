为了解决 `biome check --fix --unsafe .` 报出的无障碍（a11y）规则 `useKeyWithClickEvents` 错误，我为你制定了以下修复计划。

## [WIP] fix: 修复 Biome linter 的 a11y 键盘交互响应错误

### 错误分析

运行 `npm run checkf` 时，Biome 抛出了 4 处 `useKeyWithClickEvents` 错误：
1. **`GlobalSettingsModal.tsx`**: 弹窗遮罩 `div` 绑定了 `onClick`（用于点击遮罩背景关闭弹窗），但未绑定对应的键盘事件（如 `onKeyDown`）。
2. **`ColorCanvas.tsx`**: 颜色调节轨道 `div` 绑定了 `onClick`，缺少 `onKeyDown` 键盘响应、`role="button"` 和 `tabIndex` 无障碍属性。
3. **`Home.tsx` (两处)**: 首页的“寻星练习”和“色感练习”卡片 `div` 绑定了 `onClick`，缺少键盘回车/空格触发的支持及 `role="button"` / `tabIndex={0}` 属性。

### 用户需求

修复所有 `useKeyWithClickEvents` linter 报错，补充相应的 `onKeyDown` 事件处理器和无障碍 ARIA 属性，确保项目能够无警告/错误通过 `npm run check` 检查。

### 评论

处理键盘无障碍交互是健全前端应用的最佳实践。为带有 `onClick` 的非原生按钮元素补充 `onKeyDown`、`role="button"` 与 `tabIndex`，不仅满足了静态代码检查的要求，也改善了仅通过键盘操作或屏幕阅读器用户的可访问性体验。

### 目标

1. 为 `GlobalSettingsModal.tsx` 补充遮罩层的 `onKeyDown` 事件处理。
2. 为 `ColorCanvas.tsx` 的滑块轨道补充 `onKeyDown` 键盘答题触发、`role="button"` 及 `tabIndex`。
3. 为 `Home.tsx` 的两个入口卡片补充 `onKeyDown` 导航触发、`role="button"` 及 `tabIndex={0}`。

### 基本原理

通过向相应的交互式 `div` 元素添加 `onKeyDown` 处理器（捕获 `Enter`、`Space` 或 `Escape` 键），并明确其无障碍角色 `role="button"` 和焦点序列 `tabIndex`，可以在保留原有 UI 结构的同时，完全消除 `useKeyWithClickEvents` 错误。

### 标签

#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/a11y-keyboard-events #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 GlobalSettingsModal.tsx 的遮罩键盘响应

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~tsx.old
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
~~~~~
~~~~~tsx.new
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
~~~~~

#### Acts 2: 修复 ColorCanvas.tsx 的轨道滑块无障碍属性与键盘响应

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~tsx.old
        {/* Track */}
        <div
          ref={isTargetActiveMode ? activeTrackRef : null}
          onClick={isTargetActiveMode ? handleActiveTrackClick : undefined}
          onMouseMove={isTargetActiveMode ? handleMouseMove : undefined}
          onMouseLeave={isTargetActiveMode ? handleMouseLeave : undefined}
          className={`relative flex-1 h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center ${
            isTargetActiveMode && !showAnswer && !disabled
              ? 'cursor-none hover:ring-2 ring-indigo-400/60'
              : 'cursor-default'
          }`}
          style={{ background: gradient }}
        >
~~~~~
~~~~~tsx.new
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
~~~~~

#### Acts 3: 修复 Home.tsx 模块入口卡片键盘响应

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~tsx.old
      {/* 模块选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. 寻星练习 */}
        <div
          onClick={() => onNavigate('star-hopping')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                可练习
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">寻星练习 (Star-Hopping)</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                单锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                水平双锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                旋转双锚点
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入寻星练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* 2. 色感练习 */}
        <div
          onClick={() => onNavigate('color-sense')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
        >
~~~~~
~~~~~tsx.new
      {/* 模块选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. 寻星练习 */}
        <div
          onClick={() => onNavigate('star-hopping')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigate('star-hopping');
            }
          }}
          role="button"
          tabIndex={0}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                可练习
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">寻星练习 (Star-Hopping)</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                单锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                水平双锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                旋转双锚点
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入寻星练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* 2. 色感练习 */}
        <div
          onClick={() => onNavigate('color-sense')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigate('color-sense');
            }
          }}
          role="button"
          tabIndex={0}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
        >
~~~~~

### 下一步建议

修改完成后，建议在终端中再次运行以下指令验证结果：

```bash
npm run check
```

确认全量静态检查和格式化没有提示任何错误和警告。如果通过，即可打包或提交变更。
