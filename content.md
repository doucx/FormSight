好的，我将在相对色感的“色彩矢量迁移”视图中，在现有 D 节点 HSV 滑块的上方增加代表 C 节点（基准节点）的 HSV 滑块组，并增加显式的色彩预览与数值说明，以便用户直观对比 C 节点与 D 节点的色彩参数变化。

## [WIP] feat: 在相对色感训练视图中添加 C 节点 HSV 滑块展示与对比

### 用户需求
在相对色感（色彩矢量迁移）模块的 HSV 滑块区域上方，增加一个代表 C 节点（基准色彩 C）的 HSV 滑块组，帮助用户更直观地比对 C 节点与选择/目标 D 节点之间的 H/S/V 差异。

### 评论
在矢量推移训练中，矢量关系为 $A \rightarrow B$ 作用于 $C \rightarrow D$。给用户同时呈现 C 节点与 D 节点的 HSV 色彩轨道，能极大增强逻辑可视化与即时反馈，提升色彩空间迁移训练的交互与对比体验。

### 目标
1. 在 `RelativeColorCanvas.tsx` 中提取 C 节点 (`colorC`) 的 HSV 参数与渐变轨。
2. 在现有轨道面板上方添加独立的“C 节点颜色 (基准 C)” HSV 轨道展示区域。
3. 清晰划分“C 节点”与“D 节点”两个区域，并增加对应的色块点与 H/S/V 精确数值标注。

### 基本原理
通过利用已有的 `HsvTrackSlider` 组件，为 `colorC` 计算其 H, S, V 轨道的渐变背景，并以 `disabled={true}` 的只读参考模式渲染 C 节点的三个维度。将面板分为 C 节点与 D 节点上下两个子分组，并使用底部分隔线及标题标注加以区分。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/relative-color-canvas #task/action/feature-add #task/state/begin

---

### Script

#### Acts 1: 在 RelativeColorCanvas 组件中添加 C 节点的 HSV 滑块与对比展示面板

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
  const hexSelectedD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;
~~~~~
~~~~~typescript.new
  const hexSelectedD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const cH = colorC[0];
  const cS = colorC[1];
  const cV = colorC[2];

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  const cSatGradient = `linear-gradient(to right, ${hsvToHex(cH, 0, cV)}, ${hsvToHex(cH, 100, cV)})`;
  const cValGradient = `linear-gradient(to right, #000000, ${hsvToHex(cH, 100, 100)})`;
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
        {/* C 节点颜色 (基准 C) */}
        <div className="space-y-3 pb-3 border-b border-slate-200/60">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full border border-slate-300 shadow-sm"
                style={{ backgroundColor: hexC }}
              />
              C 节点颜色 (基准 C)
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {cH}° / {cS}% / {cV}%
            </span>
          </div>
          <HsvTrackSlider
            label="H"
            gradient={hueGradient}
            val={cH}
            max={360}
            unit="°"
            targetHSV={colorC}
            difficultyLevel={difficultyLevel}
            showAnswer={false}
            targetVal={cH}
            userVal={cH}
            allUserHSV={colorC}
            disabled={true}
            hitMargin={hitMargin}
            showToleranceBand={false}
          />
          <HsvTrackSlider
            label="S"
            gradient={cSatGradient}
            val={cS}
            max={100}
            unit="%"
            targetHSV={colorC}
            difficultyLevel={difficultyLevel}
            showAnswer={false}
            targetVal={cS}
            userVal={cS}
            allUserHSV={colorC}
            disabled={true}
            hitMargin={hitMargin}
            showToleranceBand={false}
          />
          <HsvTrackSlider
            label="V"
            gradient={cValGradient}
            val={cV}
            max={100}
            unit="%"
            targetHSV={colorC}
            difficultyLevel={difficultyLevel}
            showAnswer={false}
            targetVal={cV}
            userVal={cV}
            allUserHSV={colorC}
            disabled={true}
            hitMargin={hitMargin}
            showToleranceBand={false}
          />
        </div>

        {/* D 节点颜色 (当前选择) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full border border-slate-300 shadow-sm"
                style={{ backgroundColor: hexSelectedD }}
              />
              D 节点颜色 (当前选择)
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {userH}° / {userS}% / {userV}%
            </span>
          </div>
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
      </div>
~~~~~

### 下一步建议
- 运行单元测试（`npm test`）验证对单元测试的影响。
- 在页面中进入“相对色感”，检查滑块以及数值是否清晰准确展示。
