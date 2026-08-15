好的，没问题！我将为您更新综合拾色（ALL）模式的滑块游标样式，将其统一为与其他模式一致的细长黑色竖条，并在综合拾色模式下基于当前调制的 HSV 动态计算并展示各个滑块轨道的 OKLab $\Delta E$ 容错区间。

下面是为您生成的实施计划：

## [WIP] refactor(color): 统一综合拾色滑块样式并启用 OKLab 动态容错区间

### 用户需求
1. 将“综合拾色（ALL）”模式下的滑块游标样式替换为与其他单维度模式（色相/明度/饱和度）一致的黑色竖条。
2. 在“综合拾色”模式下同样支持显示 OKLab $\Delta E$ 感知色差的动态容错区间。

### 评论
将滑块样式统一为细黑色竖条可保持 FormSight 整体视觉语言的一致性与严谨度。在 ALL 模式下开启动态容错区间，能够让用户在同时调制 H/S/V 三维色彩时直观感受每个维度对总色差 $\Delta E$ 的影响边界，大幅提升视觉反馈质量与训练体验。

### 目标
1. 扩展 `src/utils/colorUtils.ts` 中的 `getToleranceSpan` 函数，使其支持传入当前已调制的 `[userH, userS, userV]` 组合。
2. 重构 `src/components/ColorCanvas.tsx` 中 ALL 模式的游标渲染逻辑，统一为黑色竖条。
3. 在 ALL 模式下，针对 H/S/V 轨道的当前值实时计算并显示 $\Delta E$ 容错光带。

### 基本原理
在 ALL 模式下，由于三个维度都在同时变动，各个滑块的容错边界取决于当前色彩点在 OKLab 空间中的绝对位置。通过扩展 `getToleranceSpan`，以用户当前调制的 `[userH, userS, userV]` 为基准，依次向左/右单维探索色差在 $Target\Delta E$ 阈值以内的极限边界，并在 Canvas 轨道的当前游标左右准确渲染提示光带。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/comprehensive-color-matching #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 扩展 `getToleranceSpan` 函数支持自定义 HSV 基准

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 根据悬停数值 hoverVal 和 OKLab 容错，计算滑块轨道上的容错数值跨度
 */
export function getToleranceSpan(
  mode: ColorMode,
  hoverVal: number,
  question: ColorQuestionData,
): ToleranceSpan {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);

  const curH = mode === 'H' ? hoverVal : targetH;
  const curS = mode === 'S' ? hoverVal : targetS;
  const curV = mode === 'V' ? hoverVal : targetV;
  const baseLab = hsvToOkLab(curH, curS, curV);

  const maxValLimit = mode === 'H' ? 360 : 100;
  const step = mode === 'H' ? 0.5 : 0.2;

  // 向左探索界限
  let leftVal = hoverVal;
  while (leftVal > (mode === 'H' ? hoverVal - 180 : 0)) {
    const testVal = leftVal - step;
    const testH = mode === 'H' ? (testVal + 360) % 360 : targetH;
    const testS = mode === 'S' ? Math.max(0, testVal) : targetS;
    const testV = mode === 'V' ? Math.max(0, testVal) : targetV;
    const testLab = hsvToOkLab(testH, testS, testV);

    if (calcDeltaEOk(baseLab, testLab) > targetDeltaE) break;
    leftVal = testVal;
  }

  // 向右探索界限
  let rightVal = hoverVal;
  while (rightVal < (mode === 'H' ? hoverVal + 180 : 100)) {
    const testVal = rightVal + step;
    const testH = mode === 'H' ? testVal % 360 : targetH;
    const testS = mode === 'S' ? Math.min(100, testVal) : targetS;
    const testV = mode === 'V' ? Math.min(100, testVal) : targetV;
    const testLab = hsvToOkLab(testH, testS, testV);

    if (calcDeltaEOk(baseLab, testLab) > targetDeltaE) break;
    rightVal = testVal;
  }

  const halfSpan = (rightVal - leftVal) / 2;
  return {
    minVal: Math.max(0, hoverVal - halfSpan),
    maxVal: Math.min(maxValLimit, hoverVal + halfSpan),
    halfSpan: Math.round(halfSpan * 10) / 10,
  };
}
~~~~~
~~~~~typescript.new
/**
 * 根据数值 val 和 OKLab 容错，计算滑块轨道上的容错数值跨度
 */
export function getToleranceSpan(
  dimension: 'H' | 'S' | 'V',
  val: number,
  question: ColorQuestionData,
  currentHSV?: [number, number, number],
): ToleranceSpan {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);

  const curH = currentHSV ? currentHSV[0] : dimension === 'H' ? val : targetH;
  const curS = currentHSV ? currentHSV[1] : dimension === 'S' ? val : targetS;
  const curV = currentHSV ? currentHSV[2] : dimension === 'V' ? val : targetV;
  const baseLab = hsvToOkLab(curH, curS, curV);

  const maxValLimit = dimension === 'H' ? 360 : 100;
  const step = dimension === 'H' ? 0.5 : 0.2;

  // 向左探索界限
  let leftVal = val;
  while (leftVal > (dimension === 'H' ? val - 180 : 0)) {
    const testVal = leftVal - step;
    const testH = dimension === 'H' ? (testVal + 360) % 360 : curH;
    const testS = dimension === 'S' ? Math.max(0, testVal) : curS;
    const testV = dimension === 'V' ? Math.max(0, testVal) : curV;
    const testLab = hsvToOkLab(testH, testS, testV);

    if (calcDeltaEOk(baseLab, testLab) > targetDeltaE) break;
    leftVal = testVal;
  }

  // 向右探索界限
  let rightVal = val;
  while (rightVal < (dimension === 'H' ? val + 180 : 100)) {
    const testVal = rightVal + step;
    const testH = dimension === 'H' ? testVal % 360 : curH;
    const testS = dimension === 'S' ? Math.min(100, testVal) : curS;
    const testV = dimension === 'V' ? Math.min(100, testVal) : curV;
    const testLab = hsvToOkLab(testH, testS, testV);

    if (calcDeltaEOk(baseLab, testLab) > targetDeltaE) break;
    rightVal = testVal;
  }

  const halfSpan = (rightVal - leftVal) / 2;
  return {
    minVal: Math.max(0, val - halfSpan),
    maxVal: Math.min(maxValLimit, val + halfSpan),
    halfSpan: Math.round(halfSpan * 10) / 10,
  };
}
~~~~~

#### Acts 2: 统一 ColorCanvas 游标样式并渲染 ALL 模式的容错区间

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            {/* ALL 模式调制中的当前游标 (纯色竖条) */}
            {mode === 'ALL' && !showAnswer && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 bg-indigo-600 border border-white rounded-md shadow-md pointer-events-none z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* 单维度悬停容错感应区 */}
            {mode !== 'ALL' &&
              isTargetActiveMode &&
              !showAnswer &&
              hoverVal !== null &&
              showToleranceBand &&
              (() => {
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
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${leftPct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${rightPct}%` }}
                    />
                  </>
                );
              })()}
~~~~~
~~~~~typescript.new
            {/* ALL 模式调制中的当前游标 (与单维度一致的黑色竖条) */}
            {mode === 'ALL' && !showAnswer && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 border border-white/80 rounded-sm shadow-sm pointer-events-none z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* 容错感应区指示线 (支持单维度悬停与 ALL 模式实时调制) */}
            {!showAnswer &&
              showToleranceBand &&
              ((mode !== 'ALL' && isTargetActiveMode && hoverVal !== null) || mode === 'ALL') &&
              (() => {
                const activeVal = mode === 'ALL' ? val : (hoverVal as number);
                const currentHSVTuple: [number, number, number] | undefined =
                  mode === 'ALL' ? [userH, userS, userV] : undefined;

                const span = getToleranceSpan(label, activeVal, question, currentHSVTuple);
                const isWrapMode = label === 'H';

                const leftVal = isWrapMode
                  ? (activeVal - span.halfSpan + max) % max
                  : Math.max(0, activeVal - span.halfSpan);
                const rightVal = isWrapMode
                  ? (activeVal + span.halfSpan + max) % max
                  : Math.min(max, activeVal + span.halfSpan);

                const leftPct = (leftVal / max) * 100;
                const rightPct = (rightVal / max) * 100;

                return (
                  <>
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${leftPct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${rightPct}%` }}
                    />
                  </>
                );
              })()}
~~~~~

### 下一步建议
- 校验测试套件与代码规则：运行 `npm run check` 与 `npm run build` 确保更新完后编译构建正常。
