好的，我将把 `ColorCanvas.tsx` 中鼠标悬停时的光标样式从 8px 宽的框线块（`w-2`）调整为 2px 宽的半透明深色竖线（`w-0.5 bg-indigo-600/90`），从而提高精准定位时的视觉清晰度。

下面生成具体的实施计划。

## [WIP] style(color): 将色感滑块悬停准心调整为半透明细线

### 用户需求
用户需要将色感滑块交互时中间的悬停光标从半透明竖方块（`w-2`，8px）调整为细竖线，降低视觉宽度，提高极精细定位时的操控体验。

### 评论
该样式调整能有效减少游标本身的视觉占位与对下方容错带的遮挡，使准心点对准的数值更加明确，尤其在 Level 20+ 极其微小的色差判定中，提升了像素级精准选择的能力。

### 目标
在 `src/components/ColorCanvas.tsx` 中，将悬停光标 `hoverVal` 的元素类名由 `w-2 h-8 border-2 border-indigo-600 bg-white/40 rounded-sm shadow-md` 替换为 `w-0.5 h-8 bg-indigo-600/90 shadow-sm`。

### 基本原理
通过将容器宽度从 8px 缩小到 2px（`w-0.5`），并将中空背景替换为半透明深靛蓝色高亮，使得准心线在彩虹轨和容错带上方拥有极高对比度的同时，避免遮挡两侧的色值变化。

### 标签
#intent/tune #flow/ready #priority/low #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/slider-cursor-refinement #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 修改 `ColorCanvas.tsx` 游标样式

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            {/* 悬停准心 (细长空心竖条) */}
            {isTargetActiveMode && !showAnswer && hoverVal !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 border-2 border-indigo-600 bg-white/40 rounded-sm shadow-md pointer-events-none z-30"
                style={{ left: getPercent(hoverVal, max) }}
              />
            )}
~~~~~
~~~~~typescript.new
            {/* 悬停准心 (细长半透明竖线) */}
            {isTargetActiveMode && !showAnswer && hoverVal !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-indigo-600/90 shadow-sm pointer-events-none z-30"
                style={{ left: getPercent(hoverVal, max) }}
              />
            )}
~~~~~

### 下一步建议
- **运行预览**: 执行 `npm run dev` 在浏览器中拖动滑块，体验更加精细的准心定位。
- **提交变更**: 当所有改动确认满意后，随时告诉我创建 Git 提交计划（`[COMMIT]` 状态）。
