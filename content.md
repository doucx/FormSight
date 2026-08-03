好的，我现在将针对 `src/utils/geometry.ts` 中的双锚点题目生成逻辑进行修复，以确保“弱点专项靶向强化”功能在所有训练模式下均能正常生效。

## [WIP] fix: 支持双锚点模式下的弱点专项靶向强化

### 错误分析

在 `src/utils/geometry.ts` 的 `generateQuestion` 函数中，单锚点模式 (`mode === 'single'`) 能够正确调用 `selectAngleWithTargeting(options)`，依据配置对弱点扇区进行概率加权抽样。然而在双锚点模式（水平双锚点 `double_h` 及旋转双锚点 `double_r`）中，题目坐标 `(px, py)` 仅通过 `projChoices` 和 `hgtChoices` 进行完全随机的选择，完全忽略了传入的 `options` 参数。这导致在双锚点训练时，即使开启了靶向强化模式，出题系统依然会进行全局随机出题，使靶向训练失效。

### 用户需求

修复双锚点模式下的题目生成逻辑，使其支持依据用户设置的扇区（`targetSectors`）进行 70% 概率的弱点角度加权抽取，与单锚点模式的行为保持一致。

### 评论

该修复弥补了算法逻辑中的缺失分支，确保了自适应训练和弱点分析功能的完整闭环，提升了整体产品体验与训练有效性。

### 目标

1. 在 `generateQuestion` 处理双锚点模式时，预计算所有可能 `(px, py)` 坐标组合的相对角度。
2. 接入 `options.targetingMode` 拦截检查，当触发靶向强化时，筛选落入指定扇区（±22.5° 范围内）的坐标组合。
3. 若存在符合弱点扇区的坐标组合，以 70% 概率从中抽取；否则回退至全局随机，保证题目多样性与稳定性。

### 基本原理

通过预先对二维网格的离散相对坐标组合 `(px, py)` 计算极角 `atan2(py, px)`，将其划归至 8 个 45° 扇区。在触发靶向筛选时，利用 `Math.abs(p.angle - sectorCenter)` 计算夹角偏差（并处理 0°/360° 跨越临界点），即可准确挑出属于弱点扇区的几何坐标组合。

### 标签

#intent/fix #flow/ready #priority/high #comp/engine #concept/executor #scope/core #ai/instruct #task/domain/testing #task/object/targeting-mode #task/action/bug-fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 修复 `geometry.ts` 中双锚点题目的靶向选择逻辑

我们将修改 `src/utils/geometry.ts` 文件中关于双锚点模式生成题目坐标的部分，加入对 `options` 参数的判定与扇区筛选逻辑。

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript
  // 双锚点基础拓扑 (相对于中心的偏移)
  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];

  const px = projChoices[Math.floor(Math.random() * projChoices.length)];
  const py = hgtChoices[Math.floor(Math.random() * hgtChoices.length)];

  const rotAngle = mode === 'double_h' 
    ? 0 
    : [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];
~~~~~
~~~~~typescript
  // 双锚点基础拓扑 (相对于中心的偏移)
  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];

  // 1. 生成所有合法的 (px, py) 组合，并预计算其角度
  const validPairs: { px: number; py: number; angle: number }[] = [];
  projChoices.forEach((x) => {
    hgtChoices.forEach((y) => {
      const angle = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    });
  });

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];

  // 2. 靶向强化逻辑拦截
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;

      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        const minDiff = Math.min(diff, 360 - diff);
        return minDiff <= 22.5;
      });

      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;

  const rotAngle = mode === 'double_h' 
    ? 0 
    : [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];
~~~~~

### 下一步建议

- **手动测试验证**: 可以在前端开启“手动指定弱点扇区”（如仅勾选正北 90°），启动水平双锚点或旋转双锚点训练，验证生成题目中目标点相对于双锚点的位置是否显著集中在正上方。
- **提交代码**: 验证无误后，可以创建 `[COMMIT]` 计划提交本次 Bug 修复。
