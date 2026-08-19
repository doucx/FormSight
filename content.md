这两个问题的原因如下：
1. **正形偏向右下角**：目标多边形是以 `400×400`（`NEGATIVE_SPACE_CANVAS_SIZE`）的坐标系生成的（中心在 200, 200）。而 4 个选项卡片用的是 `280×280`（`TWO_AFC_CANVAS_SIZE`）的画布。在没有缩放坐标的情况下直接绘制，导致中心点（200, 200）偏到了 280 画布的右下方。
2. **进度条没有缩短**：Tailwind 默认未定义 `shrinkWidth` 这个 CSS keyframe 动画，导致 `animation: shrinkWidth ...` 未生效；同时缺少 `key` 绑定导致切题时动画未能重置。

我将生成一个修复计划来解决这两个问题。

## [WIP] fix(negative-space): 修复正形偏向右下角及倒计时进度条未动画问题

### 错误分析
1. **多边形坐标跨画布尺寸未等比缩放**：
   - 目标多边形与扰动选项均以 `400px` 逻辑画布为基准生成，中心位于 `(200, 200)`。
   - 4AFC 选项卡片的画布尺寸为 `280px`（中心应为 `(140, 140)`）。在绘制选项时直接传入原始坐标，使原本居中的图形被偏移到了右下角，边缘顶点甚至溢出画布。
2. **CSS Keyframe 动画缺失与未重置**：
   - `NegativeSpaceCanvas.tsx` 中使用了 `animation: shrinkWidth ...`，但项目中未声明 `@keyframes shrinkWidth` 动画规则。
   - 倒计时元素未绑定 `key`，在切题时 DOM 节点被复用，动画无法重新触发。

### 用户需求
1. 修复 4AFC 选项中正形偏向右下角的问题，使所有选项的正形在 280×280 的小画布中居中呈现。
2. 修复曝光阶段倒计时进度条，使其在规定的 `displayTimeMs` 内从 100% 平滑缩减到 0%。

### 评论
修复这两处显示与动画问题对于保证做答沉浸感与视觉对称性非常关键。

### 目标
1. 在 `src/index.css` 中注入 `@keyframes shrinkWidth` 动画定义。
2. 在 `src/components/NegativeSpaceCanvas.tsx` 中，对 4 个选项多边形的顶点坐标按 `280 / 400`（0.7）比例缩放后再绘制。
3. 为进度条添加 `key` 绑定，确保每道新题目出现时动画准时从 100% 开始倒数。

### 基本原理
- **等比缩放映射**: 将 `400×400` 空间内的点 $(x, y)$ 乘以缩放系数 $k = 280 / 400 = 0.7$，所得坐标精准映射到 `280×280` 空间，中心 $(200, 200) \times 0.7 = (140, 140)$ 精确重合。
- **CSS 硬件加速关键帧**: 通过 `@keyframes shrinkWidth` 直接由浏览器 Compositor 驱动宽度变换，无需 React 频繁触发 re-render，保证毫秒级的平滑动画。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/negative-space #task/object/shape-match-4afc #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 在全局样式中添加 shrinkWidth 关键帧

在 `src/index.css` 中声明 `@keyframes shrinkWidth`。

~~~~~act
patch_file
src/index.css
~~~~~
~~~~~css.old
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
    "Open Sans", "Helvetica Neue", sans-serif;
  user-select: none;
}
~~~~~
~~~~~css.new
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
    "Open Sans", "Helvetica Neue", sans-serif;
  user-select: none;
}

@keyframes shrinkWidth {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
~~~~~

#### Acts 2: 修复选项坐标缩放与进度条 Key 绑定

在 `src/components/NegativeSpaceCanvas.tsx` 中：
1. 绘制 4AFC 选项时将多边形顶点等比缩放到 `TWO_AFC_CANVAS_SIZE`（280px）。
2. 给倒计时条添加唯一的 `key` 确保动画重置。

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // 渲染 4AFC 候选画布
  useEffect(() => {
    if (is4AFC && (matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      question.optionsPolygons.forEach((poly, idx) => {
        drawPolygonCanvas(optionRefs[idx].current, poly, TWO_AFC_CANVAS_SIZE);
      });
    }
  }, [is4AFC, matchPhase, showAnswer, question.optionsPolygons]);
~~~~~
~~~~~typescript.new
  // 渲染 4AFC 候选画布 (等比缩放 400 -> 280 坐标)
  useEffect(() => {
    if (is4AFC && (matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      const scale = TWO_AFC_CANVAS_SIZE / NEGATIVE_SPACE_CANVAS_SIZE;
      question.optionsPolygons.forEach((poly, idx) => {
        const scaledPoly = poly.map((p) => ({
          x: Math.round(p.x * scale),
          y: Math.round(p.y * scale),
        }));
        drawPolygonCanvas(optionRefs[idx].current, scaledPoly, TWO_AFC_CANVAS_SIZE);
      });
    }
  }, [is4AFC, matchPhase, showAnswer, question.optionsPolygons]);
~~~~~
~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all ease-linear"
                style={{
                  width: '100%',
                  animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
                }}
              />
            </div>
~~~~~
~~~~~typescript.new
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                key={`${question.id}-${matchPhase}`}
                className="bg-indigo-600 h-full"
                style={{
                  width: '100%',
                  animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
                }}
              />
            </div>
~~~~~

### 下一步建议
1. 在浏览器中测试“负形轮廓记忆匹配”卡片，确认：
   - 刺激阶段的倒计时进度条平滑从满格缩短至 0 并切换阶段。
   - 回忆阶段 4 个候选卡片中的正多边形全部完美居中展示。
2. 验证无误后，可以创建 Git 提交。
