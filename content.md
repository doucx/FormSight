好的，我已经了解了新的需求：
1. **答对时也需要显示箭头**：只要已进行做答，无论是否击中容错带，均渲染指示箭头；
2. **样式与寻星练习一致**：线宽设为 `1.5`，采用 `4 4` 虚线（`strokeDasharray="4 4"`），线条与箭头颜色采用寻星练习中的标准标准色（答错 `#FF0000` 红色，答对 `#00AA00` 绿色）。

我将为你生成对应的更新计划。

## [WIP] refactor(components): 统一色彩滑块箭头的显示逻辑与寻星练习样式

### 用户需求
1. 答对（Hit）时也同样渲染从用户选择点指向真理点的箭头。
2. 将箭头的虚线样式、线宽及颜色，调整为与寻星练习（`StarCanvas.tsx`）中的渲染标准完全一致（线宽 `1.5`，虚线 `4 4`，答错 `#FF0000`，答对 `#00AA00`）。

### 评论
这样可以保证全站视觉反馈语言的高度一致性。无论是几何寻星还是色彩调制，做答揭晓后的误差/方向指示都遵循统一的线条虚实、粗细与颜色规范。

### 目标
1. 移除 `HsvTrackSlider.tsx` 与 `ColorCanvas.tsx` 中仅在 `!isHit` 时才渲染箭头的限定条件。
2. 将 SVG 指示线条的 `strokeWidth` 设为 `1.5`，`strokeDasharray` 设为 `4 4`。
3. 根据 `isHit` 状态，分别应用 `#00AA00`（答对）与 `#FF0000`（答错）作为线条与箭头的颜色。

### 基本原理
直接对 `showAnswer` 渲染块中的 SVG 连线进行逻辑优化与样式更新。去掉 `!isHit` 条件判断后，只要包含用户作答结果，便会生成带有箭头的虚线。SVG 的 marker 定义也会动态接收对应的标准状态色，从而实现与 Canvas Canvas 渲染一致的视觉体验。

### 标签
#intent/refine #flow/ready #priority/medium
#comp/ui #concept/ui #scope/ux
#ai/instruct
#task/domain/ui #task/object/color-slider-arrow #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 更新 HsvTrackSlider.tsx 中的箭头渲染逻辑与样式

~~~~~act
patch_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~tsx
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
~~~~~
~~~~~tsx
              {userVal !== undefined && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible">
                  <defs>
                    <marker
                      id={`arrow-${label}-${isHit ? 'hit' : 'miss'}`}
                      viewBox="0 0 6 6"
                      refX="5"
                      refY="3"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 6 3 L 0 6 z" fill={isHit ? '#00AA00' : '#FF0000'} />
                    </marker>
                  </defs>
                  <line
                    x1={getPercent(userVal, max)}
                    y1="50%"
                    x2={getPercent(actualTargetVal, max)}
                    y2="50%"
                    stroke={isHit ? '#00AA00' : '#FF0000'}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    markerEnd={`url(#arrow-${label}-${isHit ? 'hit' : 'miss'})`}
                  />
                </svg>
              )}
~~~~~

#### Acts 2: 更新 ColorCanvas.tsx 中的 SingleDimensionSlider 箭头渲染逻辑与样式

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~tsx
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
~~~~~
~~~~~tsx
              {userAnswer && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible">
                  <defs>
                    <marker
                      id={`arrow-single-${label}-${userAnswer.isHit ? 'hit' : 'miss'}`}
                      viewBox="0 0 6 6"
                      refX="5"
                      refY="3"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 6 3 L 0 6 z" fill={userAnswer.isHit ? '#00AA00' : '#FF0000'} />
                    </marker>
                  </defs>
                  <line
                    x1={getPercent(userAnswer.userValue, max)}
                    y1="50%"
                    x2={getPercent(val, max)}
                    y2="50%"
                    stroke={userAnswer.isHit ? '#00AA00' : '#FF0000'}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    markerEnd={`url(#arrow-single-${label}-${userAnswer.isHit ? 'hit' : 'miss'})`}
                  />
                </svg>
              )}
~~~~~

### 下一步建议
- 在界面中测试不同难度下的答对/答错情况，确认绿线/红线与箭头的指向是否清晰美观。
