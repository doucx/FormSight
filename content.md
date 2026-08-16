分析了该问题，出现只有直线而没有箭头尖端的原因在于：在单页应用 (SPA) 与动态 React/Preact DOM 渲染环境中，使用 SVG `<marker>` 配合 `markerEnd="url(#id)"` 极易因 base URL / 路由上下文或相同的全局 ID 匹配失效，导致浏览器忽略 marker 仅绘制 `<line>`。

我们将渲染方式改用直接在终点绝对定位手绘箭头 `<polygon>` / `<path>`，彻底摆脱对 `<marker>` 和 URL ID 引用的依赖，确保箭头 100% 精准可靠地显示在目标位置。

## [WIP] fix(components): 修复滑块指示箭头尖端未渲染的问题

### 错误分析
原先的实现依赖 SVG `<marker>` 和 `markerEnd="url(#id)"` 机制。在现代 SPA 单页应用与 DOM 重新渲染过程中：
1. **URL 引用失效**：`url(#id)` 可能会受当前路由或 `<base>` 标签影响而无法在 Shadow/DOM 树中成功匹配 `<defs>` 中的 `marker` 元素；
2. **重名冲突与定位偏移**：多个滑块实例同时渲染时，同名 marker ID 或 `markerUnits` 缩放可能导致箭头被隐藏或裁剪。

### 用户需求
修复色彩滑块指示箭头的尖端缺失问题，确保任何情况下都能清晰看到指向真理位置的箭头，且箭头尖端与真理线完美贴合。

### 评论
使用绝对定位的内联 SVG 箭头替代 `<marker>` 引用是解决此类 SVG 渲染遗失问题的标准健壮解法，不仅保证了跨浏览器兼容性，而且渲染性能更好。

### 目标
1. 将 `HsvTrackSlider.tsx` 和 `ColorCanvas.tsx` 中依赖 `<marker>` 的实现替换为基于终点位置 `tPct%` 绝对定位的内联箭头。
2. 根据指向方向（向左或向右），自动调整箭头的 Path 尖端方向与偏移量，使其精准与连线及真理标线对齐。

### 基本原理
通过计算起点百分比 `uPct` 与终点百分比 `tPct` 判断向量方向 `isRight = tPct >= uPct`。连线 `<line>` 继续保持从 `uPct%` 到 `tPct%` 的虚线，箭头的三角形 `<path>` 则直接放置在 `left: tPct%` 的位置，并用 CSS `transform` 将三角形的尖端刚好偏移对齐至 `tPct%`。

### 标签
#intent/fix #flow/ready #priority/high
#comp/ui #concept/ui #scope/ux
#ai/instruct
#task/domain/ui #task/object/color-slider-arrow #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 替换 HsvTrackSlider.tsx 中的箭头渲染方式

~~~~~act
patch_file
src/components/HsvTrackSlider.tsx
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
~~~~~tsx
              {userVal !== undefined && (() => {
                const uPct = (userVal / max) * 100;
                const tPct = (actualTargetVal / max) * 100;
                const isRight = tPct >= uPct;
                const color = isHit ? '#00AA00' : '#FF0000';
                return (
                  <div className="absolute inset-0 pointer-events-none z-25">
                    <svg className="w-full h-full overflow-visible">
                      <line
                        x1={`${uPct}%`}
                        y1="50%"
                        x2={`${tPct}%`}
                        y2="50%"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    </svg>
                    <div
                      className="absolute top-1/2"
                      style={{
                        left: `${tPct}%`,
                        transform: isRight ? 'translate(-8px, -5px)' : 'translate(0px, -5px)',
                      }}
                    >
                      <svg width="8" height="10" viewBox="0 0 8 10">
                        <path
                          d={isRight ? 'M 0 0 L 8 5 L 0 10 z' : 'M 8 0 L 0 5 L 8 10 z'}
                          fill={color}
                        />
                      </svg>
                    </div>
                  </div>
                );
              })()}
~~~~~

#### Acts 2: 替换 ColorCanvas.tsx 中的箭头渲染方式

~~~~~act
patch_file
src/components/ColorCanvas.tsx
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
~~~~~tsx
              {userAnswer && (() => {
                const uPct = (userAnswer.userValue / max) * 100;
                const tPct = (val / max) * 100;
                const isRight = tPct >= uPct;
                const color = userAnswer.isHit ? '#00AA00' : '#FF0000';
                return (
                  <div className="absolute inset-0 pointer-events-none z-25">
                    <svg className="w-full h-full overflow-visible">
                      <line
                        x1={`${uPct}%`}
                        y1="50%"
                        x2={`${tPct}%`}
                        y2="50%"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    </svg>
                    <div
                      className="absolute top-1/2"
                      style={{
                        left: `${tPct}%`,
                        transform: isRight ? 'translate(-8px, -5px)' : 'translate(0px, -5px)',
                      }}
                    >
                      <svg width="8" height="10" viewBox="0 0 8 10">
                        <path
                          d={isRight ? 'M 0 0 L 8 5 L 0 10 z' : 'M 8 0 L 0 5 L 8 10 z'}
                          fill={color}
                        />
                      </svg>
                    </div>
                  </div>
                );
              })()}
~~~~~

### 下一步建议
- 重新测试滑块做答后的显示情况，验证向左与向右偏差时箭头尖端是否均能准确无误地指向绿色真理位线。
