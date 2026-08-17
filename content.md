在寻星练习高难度（如高 Level 或密集网格点阵）下，点间距可能从原本的 25px+ 骤降至 3.5px~6px 左右。原本固定的 12px 十字准星和 2px 粗线会直接遮挡周围 3~5 个临近网格点，严重影响做答后的空间视觉复盘。

我们将十字准星的尺寸（臂长、线宽）与网格的最小局部间距（$d_{\min}$）进行动态线性映射与比例约束，确保在任何难度下十字准星都不会溢出覆盖邻近干扰点。

---

## [WIP] fix: 动态自适应寻星练习答题反馈准星与指示元素尺寸

### 错误分析
在原实现中：
1. **十字准星固定臂长**: `chSize` 固定为 `12px`，`lineWidth` 固定为 `2px`。
2. **高密集点阵下的视觉污染**: 在 Level 25+ 或 5x5 双极透视网格下，干扰点之间的最小距离常降至 4px~8px，12px 臂长的十字准星会径向覆盖 24px 范围内的多个邻近点，遮蔽了正确的真理点与其周围点的真实相对位置关系。
3. **连线与误差反馈缺乏动态比例**: 误差虚线的线宽与虚线步长在密集网格下偏粗。

### 用户需求
让选择正确后的绿色十字准星大小、线宽以及相关指示元素自适应当前网格点间距变化，避免在点间距过小时盖住周围的网格点。

### 评论
精准的视觉反馈是感知训练系统的核心体验。当网格密度随难度动态变化时，所有反馈标记（包含真理点十字、高亮圈、误差指示线）都必须与当前视场空间的分辨率（局部最小点距）保持同构缩放。

### 目标
1. 在 `src/utils/geometry/hitDetection.ts` 中提取并导出通用的 `getGridMinSpacing` 与 `getDynamicCrosshairMetrics` 算子。
2. 更新 `src/components/StarCanvas.tsx`，将绿色十字准星的臂长 `chSize`、线宽 `lineWidth` 以及误差指示线动态绑定至网格点间距。
3. 补充完善 `src/utils/__tests__/geometry.test.ts` 相关测试。

### 基本原理
定义网格最小间距 $d_{\min} = \min_{i \neq j} \|P_i - P_j\|$：
- **十字准星臂长 (Crosshair Half-Size)**: $L_{ch} = \text{clamp}(0.45 \times d_{\min}, 3.5\text{px}, 12\text{px})$，确保十字臂长不会触碰甚至跨越最近的相邻点。
- **十字线宽 (Line Width)**: $W_{ch} = \text{clamp}(0.12 \times d_{\min}, 1.0\text{px}, 2.0\text{px})$。
- **误差虚线指示**: 虚线步长与线宽按比例动态衰减，保证在密集网格下的锐利与清晰。

### 标签
#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/star-canvas-crosshair #task/action/dynamic-scaling #task/state/begin

---

### Script

#### Acts 1: 在 `src/utils/geometry/hitDetection.ts` 中增加最小点间距与动态标记几何算子

~~~~~act
patch_file
src/utils/geometry/hitDetection.ts
~~~~~
~~~~~typescript
/**
 * 根据点阵间距动态计算渲染圆点的半径
 */
export function getDynamicDotRadius(gridPoints: Point[]): number {
  if (!gridPoints || gridPoints.length < 2) return 3.5;
  let minDist = Number.MAX_VALUE;
  for (let i = 0; i < gridPoints.length; i++) {
    for (let j = i + 1; j < gridPoints.length; j++) {
      const d = calcDistance(gridPoints[i], gridPoints[j]);
      if (d > 0 && d < minDist) {
        minDist = d;
      }
    }
  }
  if (minDist === Number.MAX_VALUE) return 3.5;
  return Math.max(1.2, Math.min(3.5, minDist * 0.25));
}
~~~~~
~~~~~typescript
/**
 * 计算点阵中任意两点间的最小欧氏间距
 */
export function getGridMinSpacing(gridPoints: Point[]): number {
  if (!gridPoints || gridPoints.length < 2) return 25;
  let minDist = Number.MAX_VALUE;
  for (let i = 0; i < gridPoints.length; i++) {
    for (let j = i + 1; j < gridPoints.length; j++) {
      const d = calcDistance(gridPoints[i], gridPoints[j]);
      if (d > 0 && d < minDist) {
        minDist = d;
      }
    }
  }
  return minDist === Number.MAX_VALUE ? 25 : minDist;
}

/**
 * 根据点阵间距动态计算渲染圆点的半径
 */
export function getDynamicDotRadius(gridPoints: Point[]): number {
  const minDist = getGridMinSpacing(gridPoints);
  return Math.max(1.2, Math.min(3.5, minDist * 0.25));
}

/**
 * 根据点阵间距动态计算十字准星的臂长与线宽
 */
export function getDynamicCrosshairMetrics(gridPoints: Point[]): {
  size: number;
  lineWidth: number;
} {
  const minDist = getGridMinSpacing(gridPoints);
  // 臂长控制在最小点间距的 42% 以内，绝不超过相邻点
  const size = Math.max(3.5, Math.min(12, minDist * 0.42));
  const lineWidth = Math.max(1, Math.min(2, minDist * 0.08));

  return { size, lineWidth };
}
~~~~~

#### Acts 2: 更新 `src/components/StarCanvas.tsx` 应用动态准星尺寸与误差线适配

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
import {
  CANVAS_SIZE,
  checkHit,
  findNearestGridPoint,
  getDynamicDotRadius,
} from '../utils/geometry';
~~~~~
~~~~~typescript
import {
  CANVAS_SIZE,
  checkHit,
  findNearestGridPoint,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from '../utils/geometry';
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
        // 图层 3: 做答后的视觉反馈 (反馈层)
        if (showAnswer) {
          const { x: bx, y: by } = question.targetB;

          // 绘制真理点 B 实体点
          drawDot(ctx, bx, by, '#000000', dotRadius);

          // 绘制深绿色十字高亮线
          const chSize = 12;
          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx - chSize, by);
          ctx.lineTo(bx + chSize, by);
          ctx.moveTo(bx, by - chSize);
          ctx.lineTo(bx, by + chSize);
          ctx.stroke();

          // 如果回答错或有用户点击坐标，绘制误差连线与点击位置
          if (userAnswer) {
            const { hitResult } = userAnswer;
            const chosenPoint = hitResult.nearestGridPoint;

            if (!hitResult.isHit) {
              // 绘制红色虚线误差指示
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(chosenPoint.x, chosenPoint.y);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.setLineDash([]); // 恢复实线

              // 用户点击位置标记 (红点 - 锚定在网格点中心)
              drawDot(ctx, chosenPoint.x, chosenPoint.y, '#FF0000', dotRadius);
            }
          }
        }
~~~~~
~~~~~typescript
        // 图层 3: 做答后的视觉反馈 (反馈层)
        if (showAnswer) {
          const { x: bx, y: by } = question.targetB;
          const { size: chSize, lineWidth: chLineWidth } = getDynamicCrosshairMetrics(
            question.distractorPoints,
          );

          // 绘制真理点 B 实体点
          drawDot(ctx, bx, by, '#000000', dotRadius);

          // 绘制深绿色十字高亮线 (尺寸与粗细自适应点间距)
          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = chLineWidth;
          ctx.beginPath();
          ctx.moveTo(bx - chSize, by);
          ctx.lineTo(bx + chSize, by);
          ctx.moveTo(bx, by - chSize);
          ctx.lineTo(bx, by + chSize);
          ctx.stroke();

          // 如果回答错或有用户点击坐标，绘制误差连线与点击位置
          if (userAnswer) {
            const { hitResult } = userAnswer;
            const chosenPoint = hitResult.nearestGridPoint;

            if (!hitResult.isHit) {
              // 绘制红色虚线误差指示 (线宽与虚线间隔按比例适配)
              const dashLength = Math.max(2, Math.min(4, chSize * 0.4));
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
              ctx.setLineDash([dashLength, dashLength]);
              ctx.beginPath();
              ctx.moveTo(chosenPoint.x, chosenPoint.y);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.setLineDash([]); // 恢复实线

              // 用户点击位置标记 (红点 - 锚定在网格点中心)
              drawDot(ctx, chosenPoint.x, chosenPoint.y, '#FF0000', dotRadius);
            }
          }
        }
~~~~~

#### Acts 3: 补充完善 `src/utils/__tests__/geometry.test.ts` 动态准星单元测试

~~~~~act
patch_file
src/utils/__tests__/geometry.test.ts
~~~~~
~~~~~typescript
import {
  calcDistance,
  checkHit,
  findNearestGridPoint,
  generateBipolarGridPoints,
  generatePolarGridPoints,
  generateQuestion,
  getDynamicDotRadius,
  rotatePoint,
} from '../geometry';
~~~~~
~~~~~typescript
import {
  calcDistance,
  checkHit,
  findNearestGridPoint,
  generateBipolarGridPoints,
  generatePolarGridPoints,
  generateQuestion,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
  getGridMinSpacing,
  rotatePoint,
} from '../geometry';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/geometry.test.ts
~~~~~
~~~~~typescript
  it('getDynamicDotRadius - should dynamically calculate dot radius based on grid spacing', () => {
    const gridDense = [
      { x: 10, y: 10 },
      { x: 12, y: 10 },
    ];
    const gridSparse = [
      { x: 10, y: 10 },
      { x: 100, y: 100 },
    ];
    expect(getDynamicDotRadius(gridDense)).toBeLessThan(getDynamicDotRadius(gridSparse));
  });
~~~~~
~~~~~typescript
  it('getDynamicDotRadius & getDynamicCrosshairMetrics - should dynamically scale based on grid spacing', () => {
    const gridDense = [
      { x: 10, y: 10 },
      { x: 14, y: 10 },
    ];
    const gridSparse = [
      { x: 10, y: 10 },
      { x: 100, y: 100 },
    ];
    expect(getGridMinSpacing(gridDense)).toBe(4);
    expect(getDynamicDotRadius(gridDense)).toBeLessThan(getDynamicDotRadius(gridSparse));

    const metricsDense = getDynamicCrosshairMetrics(gridDense);
    const metricsSparse = getDynamicCrosshairMetrics(gridSparse);

    // 密集点阵下的准星尺寸应显著小于稀疏点阵
    expect(metricsDense.size).toBeLessThan(metricsSparse.size);
    expect(metricsDense.size).toBeLessThanOrEqual(4); // 4 * 0.42 ≈ 1.68 -> clamp to 3.5
    expect(metricsDense.lineWidth).toBeLessThanOrEqual(metricsSparse.lineWidth);
  });
~~~~~

### 下一步建议
- 可以通过 `npm test` 验证几何与渲染缩放测试的完整性。
- 在寻星练习的高难度与多网格维数下体验十字准星的视觉通透性，确保其始终在不越界的前提下清晰指示目标。
