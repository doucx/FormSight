好的，我们将开始实施这个优化方案，使得在低 Level 下节点 C 的颜色自动贴近节点 A，从而让初学者更容易在大脑中模拟色彩矢量的映射。

我将生成并执行修改计划。

## [WIP] feat: 优化相对色感在低 Level 下节点 C 的色彩生成分布

### 用户需求
在相对色感模式（色彩矢量迁移）下，低难度（低 Level）时节点 C 的颜色过于独立和随机，增加了认知难度。需要让低 Level 时 C 节点的颜色更接近 A 节点，随着 Level 提高再逐渐扩大离散度。

### 评论
这是一个重要的用户体验与感知学习曲线优化。通过在 Level 1 时限制 $C$ 与 $A$ 的偏置距离，使得 $C \to D$ 的推移行为几乎与 $A \to B$ 一致，极大降低了新手建立色彩矢量概念的心理门槛。

### 目标
1. 在 `generateRelativeColorQuestion` 中根据 `difficultyLevel` 计算归一化难度因子 $t \in [0, 1]$。
2. 将节点 $C$ 的色相、饱和度和明度的生成方式改写为在节点 $A$ 的基础上进行动态抖动（jitter）。
3. 在 `relativeColorUtils.test.ts` 中补充针对该难度平滑曲线的单元测试用例。
4. 运行 `npm test` 验证修改并确保已有功能正常。

### 基本原理
根据 $t = \frac{\text{level} - 1}{34}$ 缩放抖动范围：
* Level 1：色相偏移上限为 $\pm 10^\circ$，饱和度与明度偏移上限为 $\pm 5\%$；
* Level 35：色相偏移上限为 $\pm 180^\circ$（全色相环），饱和度与明度偏移上限为 $\pm 40\%$。

通过该映射，既保留了低等级易上手的特性，又在满级时维持了高阶色感训练的随机性与挑战度。

### 标签
#intent/build #flow/ready #priority/medium #comp/engine #concept/perception #scope/ux #ai/instruct #task/domain/color #task/object/relative-color-level-curve #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新 `relativeColorUtils.ts` 中的色彩生成算法

修改 `generateRelativeColorQuestion` 函数，引入基于 Level 的 $C$ 节点抖动算法。

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);
  const R = getDistractorDistanceForLevel(clampedLevel);

  let attempts = 0;
~~~~~
~~~~~typescript
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);
  const R = getDistractorDistanceForLevel(clampedLevel);

  // 难度归一化因子 (0.0 ~ 1.0)
  const t = (clampedLevel - 1) / 34;

  let attempts = 0;
~~~~~

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
    // 生成 C (全新的固有色 2)
    const hC = Math.floor(Math.random() * 360);
    const sC = Math.floor(Math.random() * 60) + 30;
    const vC = Math.floor(Math.random() * 60) + 30;
    colorC = [hC, sC, vC];
~~~~~
~~~~~typescript
    // 生成 C (根据 level 动态控制与 A 的相似度)
    // Level 1 时偏置极小 (±10°, ±5%, ±5%)，Level 35 时全色域随机 (±180°, ±40%, ±40%)
    const maxHueOffset = 10 + t * 170;
    const maxSatOffset = 5 + t * 35;
    const maxValOffset = 5 + t * 35;

    const hC_jitter = (Math.random() * 2 - 1) * maxHueOffset;
    const sC_jitter = (Math.random() * 2 - 1) * maxSatOffset;
    const vC_jitter = (Math.random() * 2 - 1) * maxValOffset;

    const hC = (hA + hC_jitter + 360) % 360;
    const sC = Math.max(10, Math.min(100, sA + sC_jitter));
    const vC = Math.max(10, Math.min(100, vA + vC_jitter));
    colorC = [Math.round(hC), Math.round(sC), Math.round(vC)];
~~~~~

#### Acts 2: 补充 `relativeColorUtils.test.ts` 单元测试

添加针对低 Level 和高 Level 节点 C 差异范围的断言。

~~~~~act
patch_file
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~
~~~~~typescript
  it('okLabToHsv - should convert OKLab bounds back to valid HSV tuple', () => {
    const hsv = okLabToHsv([0.7, 0, 0]);
    expect(hsv[0]).toBeGreaterThanOrEqual(0);
    expect(hsv[0]).toBeLessThanOrEqual(360);
    expect(hsv[1]).toBeGreaterThanOrEqual(0);
    expect(hsv[2]).toBeGreaterThanOrEqual(0);
  });
});
~~~~~
~~~~~typescript
  it('okLabToHsv - should convert OKLab bounds back to valid HSV tuple', () => {
    const hsv = okLabToHsv([0.7, 0, 0]);
    expect(hsv[0]).toBeGreaterThanOrEqual(0);
    expect(hsv[0]).toBeLessThanOrEqual(360);
    expect(hsv[1]).toBeGreaterThanOrEqual(0);
    expect(hsv[2]).toBeGreaterThanOrEqual(0);
  });

  it('generateRelativeColorQuestion - should generate C closer to A at lower difficulty levels', () => {
    const qEasy = generateRelativeColorQuestion('VECTOR_SHIFT', 1);
    const hueDiffEasy = Math.min(
      Math.abs(qEasy.colorA[0] - qEasy.colorC[0]),
      360 - Math.abs(qEasy.colorA[0] - qEasy.colorC[0]),
    );
    expect(hueDiffEasy).toBeLessThanOrEqual(10.5);

    let maxHueDiffHard = 0;
    for (let i = 0; i < 20; i++) {
      const qHard = generateRelativeColorQuestion('VECTOR_SHIFT', 35);
      const diff = Math.min(
        Math.abs(qHard.colorA[0] - qHard.colorC[0]),
        360 - Math.abs(qHard.colorA[0] - qHard.colorC[0]),
      );
      if (diff > maxHueDiffHard) maxHueDiffHard = diff;
    }
    expect(maxHueDiffHard).toBeGreaterThan(40);
  });
});
~~~~~

### 下一步建议
* 运行测试确认修改无误后，可以在本地启动开发服务器 (`npm run dev`) 进行实际体验；
* 体验确认良好后，可以在独立计划中将代码提交到 Git 仓库。
