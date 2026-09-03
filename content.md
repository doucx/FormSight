好的，我已定位到问题所在。在 `src/components/common/HsvTrackSlider.tsx` 中，鼠标位置悬停准心线（以及设定值指示线）使用了 `bg-card`，而在浅色模式下卡片背景色为纯白色，导致彩色渐变轨道上的准心线呈现为白色，与浅色主题下的预期不符。我将生成修复计划将其改为高对比的自适应深色/黑色。

## [WIP] fix: 修复拾色条在浅色模式下鼠标位置准心线为黑色

### 错误分析

在 `HsvTrackSlider.tsx` 中，鼠标悬停准心线以及当前设定值标记线使用了 `bg-card` 类名。
由于系统的设计系统变量在浅色模式下 `--card: 0 0% 100%`（即纯白色），导致在色相、饱和度、明度等色彩轨道上滑动时，鼠标准心指示线呈现为白色，辨识度不佳且违背了浅色模式下的视觉预期。

### 用户需求

在色相、饱和度、明度等使用了颜色选择条的模式下，浅色模式时鼠标位置的竖线应当为黑色而不是白色。

### 评论

这是一个关键的视觉交互与可访问性改进。在色彩感知训练中，指示线的高对比与清晰度直接影响用户的微调体验与定标判断。

### 目标

1. 修改 `src/components/common/HsvTrackSlider.tsx` 中鼠标悬停准心线的颜色样式。
2. 同步调整当前设定值标记线颜色，确保在浅色模式下呈现黑色（深色模式下保持浅色/白色）。

### 基本原理

将 `bg-card` 替换为 `bg-foreground`（或 `bg-black dark:bg-white`）。在浅色模式下，`bg-foreground` 解析为近黑色（深深蓝墨色 `hsl(222 47% 11%)`）或黑，深色模式下解析为高对比白色，确保任何主题下均能清晰可见。

### 标签

#intent/fix #flow/ready #priority/high #comp/common #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/hsv-track-slider #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `HsvTrackSlider.tsx` 中的准心线和标记线颜色

修改当前设定值标记线与鼠标悬停准心线，将 `bg-card` 替换为 `bg-foreground`。

~~~~~act
patch_file
src/components/common/HsvTrackSlider.tsx
~~~~~
~~~~~typescript.old
          {/* 当前设定值标记线：在非目标盲测轨道、或非揭晓状态的参考轨道上显示 */}
          {(!showAnswer && !isInteractiveTarget) || (showAnswer && userVal === undefined) ? (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-card pointer-events-none shadow-sm z-20"
              style={{ left: getPercent(val, max) }}
            />
          ) : null}

          {/* 动态 ΔE 容错感应指示线 */}
~~~~~
~~~~~typescript.new
          {/* 当前设定值标记线：在非目标盲测轨道、或非揭晓状态的参考轨道上显示 */}
          {(!showAnswer && !isInteractiveTarget) || (showAnswer && userVal === undefined) ? (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-foreground pointer-events-none shadow-sm z-20"
              style={{ left: getPercent(val, max) }}
            />
          ) : null}

          {/* 动态 ΔE 容错感应指示线 */}
~~~~~

~~~~~act
patch_file
src/components/common/HsvTrackSlider.tsx
~~~~~
~~~~~typescript.old
          {/* 鼠标悬停准心线 */}
          {!showAnswer && hoverVal !== null && (isInteractiveTarget || hoverVal !== val) && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-card shadow-sm pointer-events-none z-30 opacity-75"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}
~~~~~
~~~~~typescript.new
          {/* 鼠标悬停准心线 */}
          {!showAnswer && hoverVal !== null && (isInteractiveTarget || hoverVal !== val) && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-foreground shadow-sm pointer-events-none z-30 opacity-75"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}
~~~~~

### 下一步建议

- 在浅色与深色两种主题下分别测试色相（H）、饱和度（S）、明度（V）滑块的鼠标悬停与拖拽表现，确认对比度与清晰度。
- 如果确认修复符合预期，可推进后续的单元测试校验或提交变更。
