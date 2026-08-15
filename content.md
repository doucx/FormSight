你的思路非常优雅且完全正确！在 Hue（色相）模式下，由于色相轨是 $0^\circ \sim 360^\circ$ 循环封闭的，当光标在靠近左端（如 $5^\circ$）时，左侧容错界限（如 $-10^\circ \equiv 350^\circ$）理应绕到最右端显示。

既然容错区域已设为纯透明，我们只需要**将左右两条卡尺线拆分为独立渲染的 2px 竖线**，并在 Hue 模式下对其取模（`% max`）即可轻松实现完美的环形卷叠效果！

下面生成具体的实施计划。

## [WIP] feat(color): 实现色相模式容错卡尺线环形卷叠

### 用户需求
在色相 (Hue) 模式下，当悬停光标靠近 $0^\circ$ 或 $360^\circ$ 边缘时，容错边界线能够在滑块轨道的两端实现首尾相连的环形卷叠（Wrap-around）。例如：当光标位于 $5^\circ$、容错半跨度为 $15^\circ$ 时，左侧卡尺线自动出现在最右端的 $350^\circ$ 位置。

### 评论
该改进完美契合了色相环（Hue Wheel）的拓扑特性。打破了传统线性滑块在边缘处的截断感，使用户在接近 $0^\circ$ 和 $360^\circ$ 边界时依然能准确观察到完整的左右容错区间。

### 目标
在 `src/components/ColorCanvas.tsx` 中：
1. 将原来一个带有 `border-x-2` 边框的容器，拆分为两条独立定位的 `w-0.5`（2px）卡尺边界线（左容错线与右容错线）。
2. 对于色相模式（`mode === 'H'`），计算边界值时使用模运算 `(val + max) % max` 实现首尾卷叠。
3. 对于明度/饱和度模式（`mode !== 'H'`），保留 `Math.max(0)` 与 `Math.min(100)` 的线性截断。

### 基本原理
对于 Hue 模式（`max = 360`）：
- 左卡尺线位置：`((hoverVal - span.halfSpan + 360) % 360) / 360 * 100%`
- 右卡尺线位置：`((hoverVal + span.halfSpan + 360) % 360) / 360 * 100%`

当 $hoverVal = 5^\circ, halfSpan = 15^\circ$ 时：
- 左线位于 $(5 - 15 + 360) \% 360 = 350^\circ$（轨道的 97.22% 处）
- 右线位于 $(5 + 15 + 360) \% 360 = 20^\circ$（轨道的 5.55% 处）

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/hue-ring-tolerance-wrap #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 修改 `ColorCanvas.tsx` 卡尺线渲染逻辑支持色相卷叠

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            {/* 悬停容错感应区 (半透明高亮与卡尺边界线) */}
            {isTargetActiveMode && !showAnswer && hoverVal !== null && showToleranceBand && (() => {
              const span = getToleranceSpan(mode, hoverVal, question);
              const leftPct = Math.max(0, ((hoverVal - span.halfSpan) / max) * 100);
              const rightPct = Math.min(100, ((hoverVal + span.halfSpan) / max) * 100);
              const widthPct = rightPct - leftPct;

              return (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-20 border-x-2 border-indigo-500/80 bg-transparent rounded-sm transition-all duration-75"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                />
              );
            })()}
~~~~~
~~~~~typescript.new
            {/* 悬停容错感应区 (左右卡尺边界线，支持色相环形卷叠) */}
            {isTargetActiveMode && !showAnswer && hoverVal !== null && showToleranceBand && (() => {
              const span = getToleranceSpan(mode, hoverVal, question);
              const isWrapMode = mode === 'H';

              const leftVal = isWrapMode
                ? (hoverVal - span.halfSpan + max) % max
                : Math.max(0, hoverVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (hoverVal + span.halfSpan + max) % max
                : Math.min(max, hoverVal + span.halfSpan);

              const leftPct = (leftVal / max) * 100;
              const rightPct = (rightVal / max) * 100;

              return (
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
              );
            })()}
~~~~~

### 下一步建议
- **测试卷叠逻辑**: 在 Hue 模式下把鼠标移动到最左侧（红色 $0^\circ$ 附近），观察左侧蓝卡尺线是否自然出现在最右端。
- **提交代码**: 如果一切符合预期，请告知我，我将为你生成最终的 Git Commit 计划。
