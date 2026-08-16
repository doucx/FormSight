好的，没问题！我们将在色彩滑块轨道的揭晓阶段，将“真理标记线”的高度调整为 `h-10`（40px），并将“用户选择标记线”调整为 `h-7`（28px），从而使真理线上下显著超出轨道，形成明确的主次对比与视觉层级。

以下是本次修改的完整执行计划。

## [WIP] style(ui): 增加色彩滑块轨道揭晓阶段真理线高度以强化视觉对比

### 用户需求
在色彩答题揭晓阶段，真理线（标准答案位置）应当比用户选择的标记线高度更高、更长，从而形成清晰的主次视觉对比，方便用户快速识别偏差。

### 评论
这是一个很棒的 UI/UX 微调。通过引入视觉高度差（`h-10` 对比 `h-7`）和层级调整（真理线处于更高的 `z-20` 图层），可以显著提升答题反馈的直观度与可读性。

### 目标
1. 修改 `src/components/ColorCanvas.tsx` 中单维度滑块揭晓阶段真理线与用户线的样式。
2. 修改 `src/components/HsvTrackSlider.tsx` 中 HSV 综合调制滑块揭晓阶段真理线与用户线的样式。

### 基本原理
将揭晓时的真理线（翡翠绿线）的高度由 `h-8` 提高至 `h-10`，使其明显长于轨道的 28px（`h-7`），突出轨道边界；同时将用户选择线高度设定为 `h-7`，与轨道保持同高，并调整 z-index，让真理线具备更强的视觉权重。

### 标签
#intent/tune #flow/ready #priority/medium
#comp/interfaces #concept/ui #scope/ux
#ai/instruct
#task/domain/ui #task/object/slider-truth-line #task/action/style-adjustment
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 调整 `ColorCanvas.tsx` 中揭晓阶段标记线样式

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~tsx.old
          {showAnswer && isTargetActiveMode && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 bg-emerald-500 border-x border-white shadow-md z-10"
                style={{ left: getPercent(val, max) }}
              />
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 border-x border-white ${
                    userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-20`}
                  style={{ left: getPercent(userAnswer.userValue, max) }}
                />
              )}
            </>
          )}
~~~~~
~~~~~tsx.new
          {showAnswer && isTargetActiveMode && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-10 bg-emerald-500 border-x border-white shadow-md z-20"
                style={{ left: getPercent(val, max) }}
              />
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-7 border-x border-white ${
                    userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-10`}
                  style={{ left: getPercent(userAnswer.userValue, max) }}
                />
              )}
            </>
          )}
~~~~~

#### Acts 2: 调整 `HsvTrackSlider.tsx` 中揭晓阶段标记线样式

~~~~~act
patch_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~tsx.old
          {/* 揭晓答案之后的真理位与提交位 */}
          {showAnswer && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 bg-emerald-500 border-x border-white shadow-md z-10"
                style={{ left: getPercent(actualTargetVal, max) }}
              />
              {userVal !== undefined && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 border-x border-white ${
                    isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-20`}
                  style={{ left: getPercent(userVal, max) }}
                />
              )}
            </>
          )}
~~~~~
~~~~~tsx.new
          {/* 揭晓答案之后的真理位与提交位 */}
          {showAnswer && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-10 bg-emerald-500 border-x border-white shadow-md z-20"
                style={{ left: getPercent(actualTargetVal, max) }}
              />
              {userVal !== undefined && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-7 border-x border-white ${
                    isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-10`}
                  style={{ left: getPercent(userVal, max) }}
                />
              )}
            </>
          )}
~~~~~

### 下一步建议
- 建议运行一次前端构建或测试（如 `npm run check` 或 `npm test`），确认没有打破已有的代码类型和逻辑校验。
