好的，我理解了你的需求。在答错的情况下，我们需要在色彩滑块轨道的揭晓阶段渲染一条从用户选择的位置指向真实答案位置的指示箭头，以增强直观的视觉反馈。

我将生成一个包含精确 `patch_file` 修改的 Quipu 执行计划。

## [WIP] feat: 在色彩滑块答错时渲染从用户选择指向真理答案的指示箭头

### 用户需求
在绝对色感与相对色感训练的色彩控制滑块中，当揭晓答案且用户未击中目标时，在用户答案指示条（`bg-rose-500`）与真理指示条（`bg-emerald-500`）之间渲染一条带有方向箭头的虚线，直观标识与真理答案的偏移方向及距离。

### 评论
这是一个非常实用的 UX 增强功能。在现有的展示中，用户只能看到两个独立的指示条，在距离较远或色彩微调时不够直观。增加动态 SVG 指示线与箭头能显著提升训练时的视觉提示效果。

### 目标
1. 在 `HsvTrackSlider.tsx` 的揭晓答案区域，增加当 `!isHit` 且用户已做答时的 SVG 虚线与箭头指示器。
2. 在 `ColorCanvas.tsx` (单维度滑块) 的揭晓答案区域，同样增加对应的 SVG 虚线与箭头指示器。
3. 确保 SVG 元素层级适宜、线段连接精准且不遮挡主指示线。

### 基本原理
利用 SVG 的绝对定位 overlay 盖在 1D 轨道上，以用户答案百分比 `getPercent(userVal, max)` 为起点 `x1`，以真实答案百分比 `getPercent(actualTargetVal, max)` 为终点 `x2`。通过 `<marker>` 元素定义端点箭头，使用玫瑰红虚线 (`#F43F5E`) 链接两点，无论方向向左或向右均能自动适应并正确指向真实目标。

### 标签
#intent/build #flow/ready #priority/medium
#comp/ui #concept/ui #scope/ux
#ai/instruct
#task/domain/ui #task/object/color-slider-arrow #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在 HsvTrackSlider.tsx 中添加方向指示箭头

~~~~~act
patch_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~tsx
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
~~~~~tsx
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
              {userVal !== undefined && !isHit && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible">
                  <defs>
                    <marker
                      id={`arrow-${label}`}
                      viewBox="0 0 6 6"
                      refX="5"
                      refY="3"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 6 3 L 0 6 z" fill="#F43F5E" />
                    </marker>
                  </defs>
                  <line
                    x1={getPercent(userVal, max)}
                    y1="50%"
                    x2={getPercent(actualTargetVal, max)}
                    y2="50%"
                    stroke="#F43F5E"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    markerEnd={`url(#arrow-${label})`}
                  />
                </svg>
              )}
            </>
          )}
~~~~~

#### Acts 2: 在 ColorCanvas.tsx 中的 SingleDimensionSlider 中添加方向指示箭头

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~tsx
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
~~~~~tsx
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
              {userAnswer && !userAnswer.isHit && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible">
                  <defs>
                    <marker
                      id={`arrow-single-${label}`}
                      viewBox="0 0 6 6"
                      refX="5"
                      refY="3"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 6 3 L 0 6 z" fill="#F43F5E" />
                    </marker>
                  </defs>
                  <line
                    x1={getPercent(userAnswer.userValue, max)}
                    y1="50%"
                    x2={getPercent(val, max)}
                    y2="50%"
                    stroke="#F43F5E"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    markerEnd={`url(#arrow-single-${label})`}
                  />
                </svg>
              )}
            </>
          )}
~~~~~

### 下一步建议
- 可以运行测试套件（如 `npm run test`）以验证组件逻辑与现有色彩算法无冲突。
- 在页面中实际操作答题，观察色相环、明度及饱和度各轨道在回答错误时的指示效果是否符合预期的视觉舒适度。
