好的，我了解你的需求了。在色彩滑块轨道的揭晓（`showAnswer`）阶段，我们将保持用户选择位置的标记线为标准的黑色竖线，同时在揭晓阶段依然渲染用户选择点对应的 Delta E 动态容错区间指示线。

我将为你生成相应的执行计划（Plan）并执行修改。

## [WIP] fix(ui): 调整揭晓阶段滑块标记线样式及 Delta E 指示线显示

### 错误分析

目前色彩滑块轨道（包括 `HsvTrackSlider` 及 `ColorCanvas` 中的单维度轨道）在答题揭晓阶段（`showAnswer === true`）存在以下两个与用户预期不一致的视觉逻辑：
1. **指示线样式切换**：在揭晓阶段，用户选择的位置被替换成了带有绿/红背景颜色的加宽竖线（`bg-emerald-500` 或 `bg-rose-500`），而不是保持选择前的标准黑色竖线样式（`bg-slate-900`）。
2. **Delta E 容错带隐藏**：容错指示双线设置了 `!showAnswer` 条件限定，导致在答题揭晓后 ΔE 容错双线会被自动隐藏，无法直观对照用户实际选择点与其容错边界的关系。

### 用户需求

1. 在答题揭晓阶段，用户选择位置的指示线应保持与选择前一致的黑色竖线样式（`w-0.5 h-8 bg-slate-900`）。
2. 在答题揭晓阶段，仍然持续显示用户选择位置对应的 Delta E 容错感应指示双线。

### 评论

这是一个提升试题反馈与交互一致性的优秀改进。保持黑色选择线和 ΔE 容错双线在揭晓后继续呈现，能让训练者更加清晰直观地对比自己的选择位置、真理位置（绿色竖线）以及选择点所在的容错边界，方便进行精确诊断。

### 目标

1. 修改 `src/components/HsvTrackSlider.tsx`：
   - 移除 `showToleranceBand` 前置的 `!showAnswer` 限制，使揭晓阶段依据用户提交的值计算并展示 ΔE 容错双线。
   - 将揭晓阶段的提交位指示线样式修改为标准黑色竖线 `w-0.5 h-8 bg-slate-900 shadow-sm`。
2. 修改 `src/components/ColorCanvas.tsx` (`SingleDimensionSlider` 组件)：
   - 调整单维度轨道的 ΔE 容错带显示条件，使其在揭晓阶段基于用户选择值持续渲染。
   - 将揭晓阶段的用户提交位样式更新为统一的黑色竖线。

### 基本原理

通过解耦 ΔE 容错双线的 `showAnswer` 限制，并使用当前选择/提交值作为计算基点，滑块可以在揭晓后精确呈现用户选择点对应的容错区间。同时统一使用 `bg-slate-900` 黑色竖线作为用户选择位的标志线，确保全流程视觉语言一致，且突出代表真理位的绿色竖线（`bg-emerald-500`）。

### 标签

#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-slider #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 更新 `HsvTrackSlider.tsx` 的指示线与 ΔE 容错带渲染逻辑

~~~~~act
patch_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~typescript.old
          {/* 动态 ΔE 容错感应指示线 */}
          {!showAnswer &&
            showToleranceBand &&
            (() => {
              const currentTuple: [number, number, number] = allUserHSV
                ? [
                    label === 'H' ? activeVal : allUserHSV[0],
                    label === 'S' ? activeVal : allUserHSV[1],
                    label === 'V' ? activeVal : allUserHSV[2],
                  ]
                : [
                    label === 'H' ? activeVal : targetHSV[0],
                    label === 'S' ? activeVal : targetHSV[1],
                    label === 'V' ? activeVal : targetHSV[2],
                  ];

              const span = getToleranceSpan(
                label,
                activeVal,
                targetHSV,
                difficultyLevel,
                currentTuple,
              );
              const isWrapMode = label === 'H';
              const leftVal = isWrapMode
                ? (activeVal - span.halfSpan + max) % max
                : Math.max(0, activeVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (activeVal + span.halfSpan + max) % max
                : Math.min(max, activeVal + span.halfSpan);

              return (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(leftVal / max) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(rightVal / max) * 100}%` }}
                  />
                </>
              );
            })()}

          {/* 鼠标悬停准心线 */}
          {!showAnswer && hoverVal !== null && hoverVal !== val && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-75"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

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
~~~~~typescript.new
          {/* 动态 ΔE 容错感应指示线 */}
          {showToleranceBand &&
            (() => {
              const chosenVal = showAnswer ? (userVal ?? val) : activeVal;
              const currentTuple: [number, number, number] = allUserHSV
                ? [
                    label === 'H' ? chosenVal : allUserHSV[0],
                    label === 'S' ? chosenVal : allUserHSV[1],
                    label === 'V' ? chosenVal : allUserHSV[2],
                  ]
                : [
                    label === 'H' ? chosenVal : targetHSV[0],
                    label === 'S' ? chosenVal : targetHSV[1],
                    label === 'V' ? chosenVal : targetHSV[2],
                  ];

              const span = getToleranceSpan(
                label,
                chosenVal,
                targetHSV,
                difficultyLevel,
                currentTuple,
              );
              const isWrapMode = label === 'H';
              const leftVal = isWrapMode
                ? (chosenVal - span.halfSpan + max) % max
                : Math.max(0, chosenVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (chosenVal + span.halfSpan + max) % max
                : Math.min(max, chosenVal + span.halfSpan);

              return (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(leftVal / max) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(rightVal / max) * 100}%` }}
                  />
                </>
              );
            })()}

          {/* 鼠标悬停准心线 */}
          {!showAnswer && hoverVal !== null && hoverVal !== val && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-75"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {/* 揭晓答案之后的真理位与提交位 */}
          {showAnswer && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 bg-emerald-500 border-x border-white shadow-md z-10"
                style={{ left: getPercent(actualTargetVal, max) }}
              />
              {userVal !== undefined && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
                  style={{ left: getPercent(userVal, max) }}
                />
              )}
            </>
          )}
~~~~~

#### Acts 2: 更新 `ColorCanvas.tsx` 单维度轨道的指示线与 ΔE 容错带渲染逻辑

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
          {!showAnswer &&
            isTargetActiveMode &&
            showToleranceBand &&
            hoverVal !== null &&
            (() => {
              const span = getToleranceSpan(label, hoverVal, targetHSV, question.difficultyLevel);
              const isWrapMode = label === 'H';
              const leftVal = isWrapMode
                ? (hoverVal - span.halfSpan + max) % max
                : Math.max(0, hoverVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (hoverVal + span.halfSpan + max) % max
                : Math.min(max, hoverVal + span.halfSpan);

              return (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(leftVal / max) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(rightVal / max) * 100}%` }}
                  />
                </>
              );
            })()}

          {!showAnswer && isTargetActiveMode && hoverVal !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-85"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

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
~~~~~typescript.new
          {isTargetActiveMode &&
            showToleranceBand &&
            (hoverVal !== null || showAnswer) &&
            (() => {
              const currentVal = showAnswer
                ? (userAnswer ? userAnswer.userValue : val)
                : hoverVal!;
              const span = getToleranceSpan(
                label,
                currentVal,
                targetHSV,
                question.difficultyLevel,
              );
              const isWrapMode = label === 'H';
              const leftVal = isWrapMode
                ? (currentVal - span.halfSpan + max) % max
                : Math.max(0, currentVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (currentVal + span.halfSpan + max) % max
                : Math.min(max, currentVal + span.halfSpan);

              return (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(leftVal / max) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(rightVal / max) * 100}%` }}
                  />
                </>
              );
            })()}

          {!showAnswer && isTargetActiveMode && hoverVal !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-85"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {showAnswer && isTargetActiveMode && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 bg-emerald-500 border-x border-white shadow-md z-10"
                style={{ left: getPercent(val, max) }}
              />
              {userAnswer && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
                  style={{ left: getPercent(userAnswer.userValue, max) }}
                />
              )}
            </>
          )}
~~~~~

### 下一步建议

1. **测试验证**：建议运行项目的单元测试或通过界面交互体验绝对色感与相对色感模式下的揭晓动画，检查揭晓阶段黑色选择位竖线与蓝色 ΔE 容错双线的位置渲染是否准确。
2. **状态离散化**：如果后续需要对“未击中”的偏差做更强视觉提醒，可以考虑在黑色选择线上方追加一个微型的偏差数值微标签（如 `+3.2°` / `ΔE 0.012`），提升即时反馈的丰富度。
