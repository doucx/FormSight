好的，我将按照你的需求，实施色感识别滑块容错可视化的完整开发。

将包含以下 5 个步骤的修改：
1. 在配置接口 `UserSettings` 中增加 `showToleranceBand` 字段及默认值 `true`；
2. 在 `colorUtils.ts` 中实现基于 OKLab 感知色差 $\Delta E_{OK}$ 的滑块容错区间算子 `getToleranceSpan`；
3. 在 `ColorCanvas.tsx` 组件中渲染悬停光标两侧的高亮容错带与边界卡尺线；
4. 在 `ColorTrainingView.tsx` 中将偏好设置中的 `showToleranceBand` 传入 `ColorCanvas`；
5. 在 `SettingsModal.tsx` 中增加显隐开关选项。

下面生成具体的实施计划。

## [WIP] feat(color): 实现基于 OKLab 色差的滑块容错感应区可视化

### 用户需求
用户需要在色感训练模块的滑块交互中，基于当前 Level 的 OKLab 感知色差 $\Delta E_{OK}$，动态可视化光标左右两侧的容错区间（半透明高亮带与卡尺边界线），并能在偏好设置中控制该功能的开启与关闭。

### 评论
该功能极大地增强了色感训练的交互直观性与公平感。通过在滑块上手动显示 $\Delta E_{OK}$ 对应的离散区间，用户能直观理解色彩感知在不同饱和度/明度下非线性变化的科学原理（如高饱和度下色相容错极窄，低饱和度下容错变宽）。

### 目标
1. 扩展 `UserSettings` 接口及 `DEFAULT_SETTINGS`，增加 `showToleranceBand: boolean` 配置。
2. 在 `src/utils/colorUtils.ts` 中增加 `getToleranceSpan` 函数，通过探测 OKLab 色差边界，返回当前悬停值对应的两侧容错半跨度 `halfSpan`。
3. 在 `src/components/ColorCanvas.tsx` 中，当鼠标悬停于活动轨且未揭晓答案时，在悬停光标下方渲染半透明容错带与两侧 2px 卡尺边界线。
4. 在 `src/views/ColorTrainingView.tsx` 中将设置项传递给 `ColorCanvas`。
5. 在 `src/components/SettingsModal.tsx` 中增加控制开关。

### 基本原理
利用已有的 `hsvToOkLab` 与 `calcDeltaEOk` 算子，在用户悬停于滑块上的某个数值 `hoverVal` 时，向左右方向步进探索产生 $\Delta E_{OK} \le \text{tolerance}$ 的边界数值，将其换算为百分比后作为 DOM 元素的定位样式渲染在滑块轨上。整体计算开销小于 1ms，体验流畅且无额外依赖。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/slider-tolerance-visualization #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在 `settings.ts` 中增加配置字段

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
  gridSize: number; // 网格维数 (2, 3, 4, 5)
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
}
~~~~~
~~~~~typescript.new
  gridSize: number; // 网格维数 (2, 3, 4, 5)
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否显示滑块容错感应区
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
  gridSize: 3,
  sliderHitMargin: 12,
};
~~~~~
~~~~~typescript.new
  gridSize: 3,
  sliderHitMargin: 12,
  showToleranceBand: true,
};
~~~~~

#### Acts 2: 在 `colorUtils.ts` 中实现 `getToleranceSpan` 容错区间算子

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript.old
  return {
    isHit,
    userValue: userVal,
    targetValue: targetVal,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: targetDeltaE,
  };
}
~~~~~
~~~~~typescript.new
  return {
    isHit,
    userValue: userVal,
    targetValue: targetVal,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: targetDeltaE,
  };
}

export interface ToleranceSpan {
  minVal: number;
  maxVal: number;
  halfSpan: number;
}

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

#### Acts 3: 在 `ColorCanvas.tsx` 中绘制容错带与卡尺边界线

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
import { type ColorHitResult, type ColorQuestionData, hsvToHex } from '../utils/colorUtils';

interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  hitMargin?: number;
}
~~~~~
~~~~~typescript.new
import {
  type ColorHitResult,
  type ColorQuestionData,
  getToleranceSpan,
  hsvToHex,
} from '../utils/colorUtils';

interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
}: ColorCanvasProps) {
~~~~~
~~~~~typescript.new
export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: ColorCanvasProps) {
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            {/* 悬停准心 (细长空心竖条) */}
            {isTargetActiveMode && !showAnswer && hoverVal !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 border-2 border-indigo-600 bg-white/40 rounded-sm shadow-md pointer-events-none z-30"
                style={{ left: getPercent(hoverVal, max) }}
              />
            )}
~~~~~
~~~~~typescript.new
            {/* 悬停容错感应区 (半透明高亮与卡尺边界线) */}
            {isTargetActiveMode && !showAnswer && hoverVal !== null && showToleranceBand && (() => {
              const span = getToleranceSpan(mode, hoverVal, question);
              const leftPct = Math.max(0, ((hoverVal - span.halfSpan) / max) * 100);
              const rightPct = Math.min(100, ((hoverVal + span.halfSpan) / max) * 100);
              const widthPct = rightPct - leftPct;

              return (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-20 border-x-2 border-indigo-500/80 bg-indigo-500/20 rounded-sm transition-all duration-75"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                />
              );
            })()}

            {/* 悬停准心 (细长空心竖条) */}
            {isTargetActiveMode && !showAnswer && hoverVal !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 border-2 border-indigo-600 bg-white/40 rounded-sm shadow-md pointer-events-none z-30"
                style={{ left: getPercent(hoverVal, max) }}
              />
            )}
~~~~~

#### Acts 4: 在 `ColorTrainingView.tsx` 中透传 `showToleranceBand` 设置

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript.old
      {/* 色彩交互 Canvas */}
      <ColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
        hitMargin={settings.sliderHitMargin ?? 12}
      />
~~~~~
~~~~~typescript.new
      {/* 色彩交互 Canvas */}
      <ColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
        hitMargin={settings.sliderHitMargin ?? 12}
        showToleranceBand={settings.showToleranceBand ?? true}
      />
~~~~~

#### Acts 5: 在 `SettingsModal.tsx` 中增加开关控制 UI

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
          {/* 色感滑块极值吸附外延感应区 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">色感滑块极值吸附外延感应区</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '关闭 (0px)', value: 0 },
                { label: '8px', value: 8 },
                { label: '12px', value: 12 },
                { label: '20px', value: 20 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => updateSettings({ sliderHitMargin: opt.value })}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.sliderHitMargin ?? 12) === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
~~~~~
~~~~~typescript.new
          {/* 色感滑块极值吸附外延感应区 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">色感滑块极值吸附外延感应区</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '关闭 (0px)', value: 0 },
                { label: '8px', value: 8 },
                { label: '12px', value: 12 },
                { label: '20px', value: 20 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => updateSettings({ sliderHitMargin: opt.value })}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.sliderHitMargin ?? 12) === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 色感滑块容错感应区可视化开关 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">显示滑块容错感应区</div>
              <div className="text-xs text-slate-400">在悬停光标两侧实时显示 ΔE 动态容错区间</div>
            </div>
            <button
              type="button"
              onClick={() =>
                updateSettings({ showToleranceBand: !(current.showToleranceBand ?? true) })
              }
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(current.showToleranceBand ?? true) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>
~~~~~

### 下一步建议
- **构建测试**: 执行 `npm run build` 和 `npm run test`，确保 TypeScript 编译全过且单元测试绿灯。
- **验证功能**: 启动 `npm run dev`，进入色感训练，移动鼠标体验在不同 Level 和不同 S/V 颜色下滑块高亮容错带的动态缩放效果。
