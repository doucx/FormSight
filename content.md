好的！我们现在将色感交互界面重构为与 Anki 卡片逻辑**完全一致的递进显隐结构**：

1. **色相训练 (`H`)**：仅显示 **H** 一条滑块，完全不出现 S 与 V 的任何信息或数值。
2. **明度训练 (`V`)**：显示已知固定位置的 **H** 滑块，以及等待用户点击选取的 **V** 滑块。
3. **饱和度训练 (`S`)**：显示已知固定位置的 **H** 滑块、等待用户点击选取的 **S** 滑块，以及已知固定位置的 **V** 滑块。

## [WIP] fix(color): 调整色感交互界面以完全契合 Anki 递进显隐卡片规则

### 用户需求
1. 调整 `ColorCanvas.tsx` 布局，使其完全遵循 Anki 卡片的递进显隐规则。
2. H 模式下仅展示 H 轨道；V 模式下展示已知 H 与待测 V 轨道；S 模式下展示已知 H、待测 S 与已知 V 轨道。
3. 数值文本仅在已知维度或揭晓答案后显示，待测维度在未答题前统一显示为 `?`。

### 评论
这样改造使得认知难度保持了严格的递进关系，排除了多余参量的视觉干扰，能够让练习者更专注地建立单个色彩因子的感知直觉。

### 目标
重构 `src/components/ColorCanvas.tsx`，按当前模式（`H` / `V` / `S`）动态过滤渲染的滑块行，并准确应用对应 Gradation 渐变。

### 基本原理
根据传入的 `mode`（`H` / `V` / `S`）按需控制 `renderSliderRow` 的渲染逻辑：
* `H` 模式：仅渲染 `H` 行（待测 `?`）。
* `V` 模式：渲染 `H` 行（已知）和 `V` 行（待测 `?`）。
* `S` 模式：渲染 `H` 行（已知）、`S` 行（待测 `?`）和 `V` 行（已知）。

### 标签
#intent/refine #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-canvas-anki-alignment #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 ColorCanvas.tsx 符合 Anki 递进规则

替换 `src/components/ColorCanvas.tsx`，准确实现按模式递进显隐滑块。

~~~~~act
write_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~tsx
import { useRef } from 'preact/hooks';
import { type ColorHitResult, type ColorQuestionData, hsvToHex } from '../utils/colorUtils';

interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
}

export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: ColorCanvasProps) {
  const activeTrackRef = useRef<HTMLDivElement | null>(null);

  const { mode, targetH, targetS, targetV } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);

  // 点击活动待测轨道选择数值
  const handleActiveTrackClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !activeTrackRef.current) return;
    const rect = activeTrackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const maxVal = mode === 'H' ? 360 : 100;
    const selectedVal = Math.round(ratio * maxVal);

    onAnswer(selectedVal);
  };

  const getPercent = (val: number, max: number) => `${(val / max) * 100}%`;

  // === 渐变背景 (完美复刻 Anki 算法) ===
  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';

  const satGradient = `linear-gradient(to right, ${hsvToHex(targetH, 0, targetV)}, ${hsvToHex(targetH, 100, targetV)})`;

  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(targetH, 100, 100)})`;

  // 渲染单个 Slider 轨道行
  const renderSliderRow = (
    label: 'H' | 'S' | 'V',
    isTargetActiveMode: boolean,
    gradient: string,
    val: number,
    max: number,
    unit: string,
  ) => {
    return (
      <div key={label} className="flex items-center gap-3 w-full">
        {/* Label */}
        <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

        {/* Track */}
        <div
          ref={isTargetActiveMode ? activeTrackRef : null}
          onClick={isTargetActiveMode ? handleActiveTrackClick : undefined}
          className={`relative flex-1 h-5 rounded-full border border-slate-200/80 shadow-inner ${
            isTargetActiveMode && !showAnswer && !disabled
              ? 'cursor-pointer hover:ring-2 ring-indigo-400/60'
              : 'cursor-default'
          }`}
          style={{ background: gradient }}
        >
          {/* 已知维度滑块 Marker */}
          {!isTargetActiveMode && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-700 shadow-sm"
              style={{ left: getPercent(val, max) }}
            />
          )}

          {/* 待测维度答题后揭晓真理点与用户点击点 */}
          {isTargetActiveMode && showAnswer && (
            <>
              {/* 真理目标位 Marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-emerald-500 shadow-md z-10"
                style={{ left: getPercent(val, max) }}
              />

              {/* 用户点击 Marker */}
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 ${
                    userAnswer.isHit ? 'border-emerald-500' : 'border-rose-500'
                  } shadow-md z-20`}
                  style={{ left: getPercent(userAnswer.userValue, max) }}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full mx-auto my-1 ${
                      userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* 数值 Label */}
        <span
          className={`w-12 text-right font-mono font-bold text-xs ${
            isTargetActiveMode
              ? showAnswer
                ? userAnswer?.isHit
                  ? 'text-emerald-600'
                  : 'text-rose-600'
                : 'text-amber-500'
              : 'text-slate-700'
          }`}
        >
          {isTargetActiveMode && !showAnswer ? '?' : `${val}${unit}`}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 目标色块 */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
        <div className="font-mono text-xs font-bold text-slate-400">
          {showAnswer ? targetHex : '???'}
        </div>
      </div>

      {/* 按 Anki 规则递进显隐轨道 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* H 行: 所有模式均展示 */}
        {renderSliderRow('H', mode === 'H', hueGradient, targetH, 360, '°')}

        {/* S 行: 仅在测试 S 时展示 */}
        {mode === 'S' && renderSliderRow('S', true, satGradient, targetS, 100, '%')}

        {/* V 行: 在测试 V 和测试 S 时展示 */}
        {(mode === 'V' || mode === 'S') &&
          renderSliderRow('V', mode === 'V', valGradient, targetV, 100, '%')}
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
1. 现在切换到 **色相 (H)** 训练时，将只会展现干净的 H 滑块；**明度 (V)** 展现固定 H + 待测 V；**饱和度 (S)** 展现固定 H + 待测 S + 固定 V。
2. 可以在界面上练习体验并检查各角度渐变与数据保存记录。
