## [WIP] refactor(ui): 简化相对色感交互看板并放大色块尺寸

### 错误分析

无错误，本次根据用户要求进行 UI 界面精简与视觉强化。

### 用户需求

1. 去除 `RelativeColorCanvas.tsx` 中所有的干扰性文字（例如“1. 基准色彩矢量推移 (A ➔ B)”、“固有色 A”、“推移色 B”、“固有色 C”、“待调色 D”、“真理色彩 D”等）。
2. 将色块尺寸从原本的 `w-20 h-20` 显著放大。

### 评论

通过移除看板中的引导说明文字，使界面更加纯粹、沉浸；同时将展示色块放大，有助于更清晰地进行微小色彩差别的判断。

### 目标
1. 修改 `src/components/RelativeColorCanvas.tsx`：
   - 移除 A -> B 以及 C -> D 区域上方及下方的所有提示文本、箭头标签等干扰文字。
   - 将色块尺寸由 `w-20 h-20`（80px）扩大至 `w-28 h-28` 或 `w-32 h-32`。
2. 保持底部的 HSV 调节滑块与核心色差判定逻辑完全不变。

### 基本原理

通过直接清理 `RelativeColorCanvas.tsx` 中渲染文字标签的 `span` 元素，并调整 Tailwind 的 `w-* h-*` 类名，可以完美达成用户的设计直觉。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/relative-color-canvas #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 修改 RelativeColorCanvas 简化文字并放大色块

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~tsx.old
  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 上方对比展示区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* 基准推移组 (A -> B) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            1. 基准色彩矢量推移 (A ➔ B)
          </span>
          <div className="flex items-center justify-center gap-3 w-full">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
                style={{ backgroundColor: hexA }}
              />
              <span className="text-[10px] font-mono text-slate-400">固有色 A</span>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-500" />
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
                style={{ backgroundColor: hexB }}
              />
              <span className="text-[10px] font-mono text-slate-400">推移色 B</span>
            </div>
          </div>
        </div>

        {/* 目标推移组 (C -> D) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            2. 目标色彩矢量推移 (C ➔ D)
          </span>
          <div className="flex items-center justify-center gap-3 w-full">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
                style={{ backgroundColor: hexC }}
              />
              <span className="text-[10px] font-mono text-slate-400">固有色 C</span>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-500" />
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-75 relative"
                style={{ backgroundColor: hexUserD }}
              >
                {showAnswer && (
                  <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: hexTargetD }}
                    title="真理色彩 D"
                  />
                )}
              </div>
              <span className="text-[10px] font-mono text-indigo-600 font-bold">待调色 D</span>
            </div>
          </div>
        </div>
      </div>
~~~~~
~~~~~tsx.new
  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 上方对比展示区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* 基准推移组 (A -> B) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexA }}
            />
            <ArrowRight className="w-6 h-6 text-indigo-400" />
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexB }}
            />
          </div>
        </div>

        {/* 目标推移组 (C -> D) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexC }}
            />
            <ArrowRight className="w-6 h-6 text-indigo-400" />
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md transition-all duration-75 relative"
              style={{ backgroundColor: hexUserD }}
            >
              {showAnswer && (
                <div
                  className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: hexTargetD }}
                  title="真理色彩 D"
                />
              )}
            </div>
          </div>
        </div>
      </div>
~~~~~

### 下一步建议

- 检查放大后的色块与底部滑轨在移动端/桌面端下的布局表现是否协调。
- 如果满意，可以随时进行整体测试或提交。
