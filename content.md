好的，我已经明确了你的需求。在相对色感（色彩矢量迁移）训练中，中间的 HSV 滑块面板作为起点 C 节点的视觉参照，应该始终展示 C 节点的 HSV 色彩值，并保留黑色竖线标记。

我将为你生成一个 Plan 来实现这一改动。

## [WIP] fix(ui): 在相对色感训练中让 HSV 滑块始终展示 C 节点颜色与黑色基准线

### 错误分析

在之前的实现中，`RelativeColorCanvas` 中将当前选中候选 D 节点的 HSV 值（`userH`, `userS`, `userV`）传给了 `HsvTrackSlider` 的 `val` 属性。

这导致：
1. 用户在下方切换选项时，滑块上的黑色竖线会随选项变化而跳动，无法直观观察基准 C 节点（推移起点）在 HSV 轨道上的原始位置。
2. 在揭晓答案（`showAnswer = true`）时，`HsvTrackSlider` 默认隐藏了黑色竖线，无法直观对比“起点 C -> 真理 D / 用户选中的 D”在 HSV 轨道上的矢量推移过程。

### 用户需求

在相对色感（色彩矢量迁移）模块中，HSV 滑块应始终展示起点 C 节点的 HSV 色彩（包含轨道渐变背景与数值），并且滑块上的黑色竖线标记需始终保持显示，作为矢量推移的基准参照点。

### 评论

这是一个提升相对色感视觉感知体验的重要改进。在相对色彩矢量推移（C -> D）中，显示起点 C 节点的坐标能帮助练习者更好地建立基准推移矢量（v_AB）施加在 C 节点上的心理预期与对比关系。

### 目标

1. 在 `HsvTrackSlider` 中增加 `alwaysShowValueMark` 可选属性，允许在揭晓答案状态下继续保留黑色基准竖线。
2. 在 `RelativeColorCanvas` 中，将传给 `HsvTrackSlider` 的 `val` 和 `allUserHSV` 绑定为起点 C 节点的值（`colorC[0]`, `colorC[1]`, `colorC[2]`）。
3. 将 S / V 轨道的背景渐变公式更新为依据 C 节点的色相/明度生成。
4. 在 `RelativeColorCanvas` 的 `HsvTrackSlider` 调用中开启 `alwaysShowValueMark={true}`。

### 基本原理

通过将 `RelativeColorCanvas` 中的 `HsvTrackSlider` 数据源从动态选中的 D 节点更改为确定的 C 节点，并开启黑色竖线常亮显示，可以让滑块稳定充当 C 节点的基准参考轨。揭晓答案时，C 节点（黑色竖线）、真理 D 节点（绿色竖线）和用户选中的 D 节点（红/绿竖线）将同时在同一条轨道上展现，呈现极佳的三线对比效果。

### 标签

#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/relative-color-canvas #task/action/fix-slider-c-node #task/state/begin

---

### Script

#### Acts 1: 更新 HsvTrackSlider 属性支持常亮黑色基准线

支持 `alwaysShowValueMark` 选项，以便在 `showAnswer` 状态下依然可以保留基准黑色竖线。

~~~~~act
patch_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~typescript.old
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  onHoverStateChange?: (hoverVal: number | null) => void;
~~~~~
~~~~~typescript.new
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  alwaysShowValueMark?: boolean;
  onHoverStateChange?: (hoverVal: number | null) => void;
~~~~~

~~~~~act
patch_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~typescript.old
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  onHoverStateChange,
  onDraggingStateChange,
}: HsvTrackSliderProps) {
~~~~~
~~~~~typescript.new
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  alwaysShowValueMark = false,
  onHoverStateChange,
  onDraggingStateChange,
}: HsvTrackSliderProps) {
~~~~~

~~~~~act
patch_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~typescript.old
          {/* 当前设定值标记线 */}
          {!showAnswer && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
              style={{ left: getPercent(val, max) }}
            />
          )}
~~~~~
~~~~~typescript.new
          {/* 当前设定值标记线 */}
          {(!showAnswer || alwaysShowValueMark) && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
              style={{ left: getPercent(val, max) }}
            />
          )}
~~~~~

#### Acts 2: 绑定 RelativeColorCanvas 滑块为 C 节点色彩

更新渐变计算与 `HsvTrackSlider` 传值，使其固定展示起点 C 节点的色彩。

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;
~~~~~
~~~~~typescript.new
  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(colorC[0], 0, colorC[2])}, ${hsvToHex(colorC[0], 100, colorC[2])})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(colorC[0], 100, 100)})`;
~~~~~

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={userH}
          max={360}
          unit="°"
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[0]}
          userVal={userAnswer?.userD?.[0] ?? userH}
          isHit={userAnswer?.isHit}
          onValChange={() => {}}
          allUserHSV={[userH, userS, userV]}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={userS}
          max={100}
          unit="%"
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[1]}
          userVal={userAnswer?.userD?.[1] ?? userS}
          isHit={userAnswer?.isHit}
          onValChange={() => {}}
          allUserHSV={[userH, userS, userV]}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={userV}
          max={100}
          unit="%"
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[2]}
          userVal={userAnswer?.userD?.[2] ?? userV}
          isHit={userAnswer?.isHit}
          onValChange={() => {}}
          allUserHSV={[userH, userS, userV]}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>
~~~~~
~~~~~typescript.new
      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={colorC[0]}
          max={360}
          unit="°"
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[0]}
          userVal={userAnswer?.userD?.[0] ?? userH}
          isHit={userAnswer?.isHit}
          onValChange={() => {}}
          allUserHSV={colorC}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          alwaysShowValueMark={true}
        />
        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={colorC[1]}
          max={100}
          unit="%"
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[1]}
          userVal={userAnswer?.userD?.[1] ?? userS}
          isHit={userAnswer?.isHit}
          onValChange={() => {}}
          allUserHSV={colorC}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          alwaysShowValueMark={true}
        />
        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={colorC[2]}
          max={100}
          unit="%"
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[2]}
          userVal={userAnswer?.userD?.[2] ?? userV}
          isHit={userAnswer?.isHit}
          onValChange={() => {}}
          allUserHSV={colorC}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          alwaysShowValueMark={true}
        />
      </div>
~~~~~

### 下一步建议

1. 执行上述变更后，可在界面中体验“相对色感 - 色彩矢量迁移”界面，验证 HSV 滑块上的黑色竖线是否固定指示 C 节点的 HSV 位置。
2. 运行项目测试单元（例如 `npm run test`）验证功能无回归影响。
