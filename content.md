好的，我将把 `ColorCanvas.tsx` 中容错带的背景色从半透明色块（`bg-indigo-500/20`）修改为纯透明（`bg-transparent`），使其不再遮挡滑块底部的颜色渐变，仅保留两侧精准的蓝色卡尺边界线。

下面生成具体的实施计划。

## [WIP] style(color): 将色感滑块容错条背景设为纯透明，仅保留边界卡尺线

### 用户需求
用户需要将容错带的半透明背景色完全去除，使其变成纯透明，避免对滑块底部的色彩渐变产生任何视觉遮挡，只通过两侧的卡尺边界线指示容错范围。

### 评论
纯透明背景配合两侧边界卡尺线（Caliper style）是一种极其优雅的工程设计。它既能让用户一眼看出当前的允许误差宽度，又 100% 保留了滑块底层色彩的真实呈现，彻底解决了视觉干扰问题。

### 目标
在 `src/components/ColorCanvas.tsx` 中，将容错带元素的背景样式由 `bg-indigo-500/20` 修改为 `bg-transparent`。

### 基本原理
通过将 `bg-indigo-500/20` 改为 `bg-transparent`，DOM 元素仅保留 `border-x-2 border-indigo-500/80`，使容错区间转化为无遮挡的纯边界框，完美兼顾了“误差可视化”与“色彩真实性”。

### 标签
#intent/tune #flow/ready #priority/low #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/tolerance-band-transparent #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 修改 `ColorCanvas.tsx` 容错带背景为纯透明

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
              return (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-20 border-x-2 border-indigo-500/80 bg-indigo-500/20 rounded-sm transition-all duration-75"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                />
              );
~~~~~
~~~~~typescript.new
              return (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-20 border-x-2 border-indigo-500/80 bg-transparent rounded-sm transition-all duration-75"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                />
              );
~~~~~

### 下一步建议
- **本地体验**: 执行 `npm run dev` 检查色感滑块在悬停时是否呈现出干净、无遮挡的卡尺边界线效果。
- **阶段提交**: 如果对当前的所有视觉与功能微调满意，请随时告诉我，我将为你生成一个 `[COMMIT]` 计划，将这些成果固化到 Git 仓库中。
