好的，我将 `ColorCanvas` 中所有滑块游标（包括单维度鼠标悬停准心、已知维度标记以及 ALL 模式调制的游标）统一调整为双像素黑色竖条样式（`w-0.5 h-8 bg-slate-900`），并且去掉了白色边框。

下面为您生成实施计划：

## [WIP] refactor(color): 将 ColorCanvas 游标样式统一为无边框双像素黑色竖条

### 用户需求
将 `ColorCanvas` 中所有滑块的游标及当前选中标记统一修改为与色相训练中鼠标悬停时相同的样式：细长的双像素纯黑色竖条（`w-0.5` 或 `w-1` 窄黑线），且不带白色边框。

### 评论
统一的视觉反馈能带来极致的精致感与专业操作体验。将粗黑线及白色外边框去除，换成精细的纯黑微型游标，与整体冷色科技风底色相得益彰。

### 目标
1. 修改 `src/components/ColorCanvas.tsx` 中已知维度标记、ALL 模式游标、单维度悬停准心的样式类。
2. 统一移除带有 `border` 和较大宽度的样式，精简为 `w-0.5 h-8 bg-slate-900`（或 `w-1`）。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/color-canvas-cursors #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 精简并统一 ColorCanvas 游标样式

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            {/* 已知维度/单维度标记 (细长黑色竖条) */}
            {(!isTargetActiveMode || (mode !== 'ALL' && !isTargetActiveMode)) && mode !== 'ALL' && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 border border-white/80 rounded-sm shadow-sm"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* ALL 模式拖拽 Range Input */}
            {mode === 'ALL' && (
              <input
                type="range"
                min="0"
                max={max}
                value={val}
                disabled={disabled || showAnswer}
                onChange={(e) =>
                  handleAllSliderChange(
                    label,
                    Number.parseInt((e.target as HTMLInputElement).value, 10),
                  )
                }
                onInput={(e) =>
                  handleAllSliderChange(
                    label,
                    Number.parseInt((e.target as HTMLInputElement).value, 10),
                  )
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default z-30"
              />
            )}

            {/* ALL 模式调制中的当前游标 (与单维度一致的黑色竖条) */}
            {mode === 'ALL' && !showAnswer && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 border border-white/80 rounded-sm shadow-sm pointer-events-none z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}
~~~~~
~~~~~typescript.new
            {/* 已知维度/单维度标记 (无边框双像素黑色竖条) */}
            {(!isTargetActiveMode || (mode !== 'ALL' && !isTargetActiveMode)) && mode !== 'ALL' && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* ALL 模式拖拽 Range Input */}
            {mode === 'ALL' && (
              <input
                type="range"
                min="0"
                max={max}
                value={val}
                disabled={disabled || showAnswer}
                onChange={(e) =>
                  handleAllSliderChange(
                    label,
                    Number.parseInt((e.target as HTMLInputElement).value, 10),
                  )
                }
                onInput={(e) =>
                  handleAllSliderChange(
                    label,
                    Number.parseInt((e.target as HTMLInputElement).value, 10),
                  )
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default z-30"
              />
            )}

            {/* ALL 模式调制中的当前游标 (无边框双像素黑色竖条) */}
            {mode === 'ALL' && !showAnswer && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}
~~~~~

### 下一步建议
- **执行构建与校验**: 运行 `npm run check` 及 `npm run build` 确保样式变更后类型和打包完全通过。
