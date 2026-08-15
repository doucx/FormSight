你的定位非常准确！这正是 CSS 过渡属性 `transition-all duration-75` 造成的。

在鼠标跨越 $0^\circ / 360^\circ$ 边界时，样式中的 `left` 百分比发生了突变（例如从 `1%` 跳变到 `98%`），CSS 的 `transition` 会强制在这 75ms 内对这两个百分比进行平滑插值，从而产生了“卡尺线快速横跨整个色相条”的拉丝扫过现象。

由于卡尺线的位置是由鼠标移动事件实时驱动的，**移除卡尺线的 CSS `transition-all`** 不仅能彻底解决此跨屏横拉问题，还能消除鼠标跟随的轻微延迟，实现零延迟即时响应。

下面生成具体的实施计划。

## [WIP] fix(color): 移除容错卡尺线的 CSS 过渡平滑，解决色相卷叠拉丝现象

### 错误分析

**错误原因**: 在 `ColorCanvas.tsx` 中，容错卡尺线元素包含了 `transition-all duration-75` 类名。当鼠标在色相模式下靠近边界，$leftPct$ 发生卷叠跳变（例如从 $1\%$ 突变为 $98\%$）时，CSS 动画引擎会对 `left` 属性进行 75ms 的平滑插值，导致卡尺线横向扫过整个色相轨。

**解决方案**: 移除左右卡尺线元素上的 `transition-all duration-75` 类名，改为即时定位（Instant Positoning），消除动画插值。

### 用户需求
修复色相卡尺线在首尾卷叠时快速横跨整个色相轨道的动画拉丝问题，使其在跨越边界时直接瞬间呈现在对应端。

### 评论
在由鼠标像素坐标实时驱动（Event-Driven）的 UI 交互元素上，应尽量避免使用 CSS `transition` 平滑插值。移除后不仅解决了卷叠突变时的过渡插值异常，更提升了手感与响应灵敏度。

### 目标
在 `src/components/ColorCanvas.tsx` 中，移除左右卡尺线 `div` 元素类名中的 `transition-all duration-75`。

### 基本原理
直接将 `className` 中的 `transition-all duration-75` 移除后，当 `leftPct` 发生离散跳变时，浏览器渲染引擎会在下一帧直接绘制在目标位置，彻底避免了跨屏平滑插值。

### 标签
#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/hue-ring-tolerance-wrap #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修改 `ColorCanvas.tsx` 移除卡尺线 CSS transition 属性

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
                <>
                  {/* 左容错边界卡尺线 */}
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2 transition-all duration-75"
                    style={{ left: `${leftPct}%` }}
                  />
                  {/* 右容错边界卡尺线 */}
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2 transition-all duration-75"
                    style={{ left: `${rightPct}%` }}
                  />
                </>
~~~~~
~~~~~typescript.new
                <>
                  {/* 左容错边界卡尺线 */}
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${leftPct}%` }}
                  />
                  {/* 右容错边界卡尺线 */}
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${rightPct}%` }}
                  />
                </>
~~~~~

### 下一步建议
- **回归测试**: 运行 `npm run dev` 重新测试，验证鼠标移动到色相条最左/最右边缘时，卡尺线是否能瞬间无缝跳变到另一端。
- **阶段提交**: 如果无其他样式或交互问题，我们可以发起最终的 Git 提交。
