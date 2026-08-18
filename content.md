好的，我现在为你生成一个完整的执行计划，在 `src/utils/relativeColorUtils.ts` 中实施正四面体（Regular Tetrahedron）干扰项生成算法，并运行自动化测试进行验证。

## [WIP] refactor(color): 使用正四面体几何分布重构相对色感干扰项生成算法

### 用户需求
修复“相对色感（色彩矢量迁移）”模式中干扰项生成算法的确定性破绽，通过在 OKLab 空间构造以目标 $D$ 为顶点之一的随机姿态正四面体，确保 4 个选项在感知几何上完全等距且无重心偏置，彻底杜绝盲猜捷径。

### 评论
这是一个至关重要的算法质量改进。原先固定沿 $L$ 轴与 $v_{AB}$ 轴做单向偏移的逻辑，使得选项中必然出现一对色相完全相同且目标偏暗的模式。引入 3D 刚体旋转的正四面体模型不仅消除了视觉重心偏差，而且在数学上保证了 4 个选项之间两两距离严格相等，使训练真正聚焦于对色彩矢量推移的感知。

### 目标
1. 在 `src/utils/relativeColorUtils.ts` 中实现 3D 随机旋转轴与罗德里格旋转公式辅助函数。
2. 替换原先的 `applyOffsetWithGamutCheck` 及确定性正交轴生成逻辑，改为随机 3D 姿态的正四面体顶点生成。
3. 引入刚体旋转色域有效性校验，优先选取完全落在显示色域内的四面体姿态。
4. 运行单元测试，确保题目生成与命中检测逻辑稳定通过。

### 基本原理
1. **正四面体几何构造**：以原点为第一个顶点，构建单位正四面体的另外三个顶点向量 $V_1=(1,0,0)$，$V_2=(0.5, \frac{\sqrt{3}}{2}, 0)$，$V_3=(0.5, \frac{\sqrt{3}}{6}, \sqrt{\frac{2}{3}})$，其两两之间的欧氏距离恒为 1。
2. **随机 3D 刚体变换**：生成均匀随机的单位旋转轴与转角 $\theta$，将四面体向量旋转并按当前难度距离 $R$ 进行缩放，随后平移至目标点 $D_{Lab}$。
3. **色域适应性重试**：进行最多 30 次随机姿态试探，若所有顶点转换至 HSV 后能保留 $\ge 70\%$ 的理论距离，则视为最优解并立即采用。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/color #task/object/relative-color-distractors #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 `src/utils/relativeColorUtils.ts` 中的干扰项生成逻辑

我们将替换原有的辅助函数和 `generateRelativeColorQuestion` 内的生成代码，接入正四面体算法。

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
/**
 * 带有色域边缘检测与反射的加点辅助函数
 */
function applyOffsetWithGamutCheck(
  baseLab: [number, number, number],
  directionVector: [number, number, number],
  distance: number,
): [number, number, number] {
  // 试探正向偏移
  const candidateLab1: [number, number, number] = [
    baseLab[0] + directionVector[0] * distance,
    baseLab[1] + directionVector[1] * distance,
    baseLab[2] + directionVector[2] * distance,
  ];

  const hsv1 = okLabToHsv(candidateLab1);
  const reprojectedLab1 = hsvToOkLab(...hsv1);
  const actualDist1 = calcDeltaEOk(baseLab, reprojectedLab1);

  // 如果正向偏移转换回 HSV 后未发生严重的色域裁剪 (有效感知距离保留了至少 70%)
  if (actualDist1 >= distance * 0.7) {
    return hsv1;
  }

  // 否则尝试反方向（反弹机制），避免撞墙被裁剪导致颜色重合
  const candidateLab2: [number, number, number] = [
    baseLab[0] - directionVector[0] * distance,
    baseLab[1] - directionVector[1] * distance,
    baseLab[2] - directionVector[2] * distance,
  ];

  return okLabToHsv(candidateLab2);
}
~~~~~
~~~~~typescript
/**
 * 生成 3D 空间中的随机单位向量 (用于旋转轴)
 */
function getRandomAxis(): [number, number, number] {
  const z = Math.random() * 2 - 1;
  const phi = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(phi), r * Math.sin(phi), z];
}

/**
 * 罗德里格旋转公式：将向量 v 绕单位轴 axis 旋转 theta 角度
 */
function rotateVector(
  v: [number, number, number],
  axis: [number, number, number],
  theta: number,
): [number, number, number] {
  const [vx, vy, vz] = v;
  const [kx, ky, kz] = axis;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const dot = kx * vx + ky * vy + kz * vz;
  const crossX = ky * vz - kz * vy;
  const crossY = kz * vx - kx * vz;
  const crossZ = kx * vy - ky * vx;

  return [
    vx * cosT + crossX * sinT + kx * dot * (1 - cosT),
    vy * cosT + crossY * sinT + ky * dot * (1 - cosT),
    vz * cosT + crossZ * sinT + kz * dot * (1 - cosT),
  ];
}
~~~~~

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
  // 计算正交单位向量
  const vMag = Math.sqrt(vAB[0] ** 2 + vAB[1] ** 2 + vAB[2] ** 2);
  const uV: [number, number, number] = [vAB[0] / vMag, vAB[1] / vMag, vAB[2] / vMag];

  // 1. 矢量方向干扰项 D1 (在推移矢量方向上做绝对距离 R 的偏移)
  const hsvD1 = applyOffsetWithGamutCheck(labTargetD, uV, R);

  // 2. 明度方向干扰项 D2 (纯 L 轴向量方向上做绝对距离 R 的偏移)
  const uL: [number, number, number] = [1, 0, 0];
  const hsvD2 = applyOffsetWithGamutCheck(labTargetD, uL, R);

  // 3. 色相/色偏法向干扰项 D3 (在 a-b 平面上寻找与 vAB 正交的方向向量)
  let uOrth: [number, number, number] = [0, -uV[2], uV[1]];
  const uOrthMag = Math.sqrt(uOrth[1] ** 2 + uOrth[2] ** 2);
  if (uOrthMag < 1e-4) {
    uOrth = [0, 1, 0];
  } else {
    uOrth = [0, uOrth[1] / uOrthMag, uOrth[2] / uOrthMag];
  }
  const hsvD3 = applyOffsetWithGamutCheck(labTargetD, uOrth, R);

  const rawOptions: [number, number, number][] = [targetD, hsvD1, hsvD2, hsvD3];
~~~~~
~~~~~typescript
  // ====================================================================
  // 基于正四面体 (Regular Tetrahedron) 生成干扰项
  // 保证 D 是四个顶点之一，且四个顶点两两间距严格等于 R
  // ====================================================================
  const baseV1: [number, number, number] = [1, 0, 0];
  const baseV2: [number, number, number] = [0.5, Math.sqrt(3) / 2, 0];
  const baseV3: [number, number, number] = [0.5, Math.sqrt(3) / 6, Math.sqrt(2 / 3)];

  let bestDistractors: [number, number, number][] = [];
  let bestValidCount = -1;

  for (let attempt = 0; attempt < 30; attempt++) {
    const axis = getRandomAxis();
    const theta = Math.random() * Math.PI * 2;

    const rotV1 = rotateVector(baseV1, axis, theta);
    const rotV2 = rotateVector(baseV2, axis, theta);
    const rotV3 = rotateVector(baseV3, axis, theta);

    const lab1: [number, number, number] = [
      labTargetD[0] + rotV1[0] * R,
      labTargetD[1] + rotV1[1] * R,
      labTargetD[2] + rotV1[2] * R,
    ];
    const lab2: [number, number, number] = [
      labTargetD[0] + rotV2[0] * R,
      labTargetD[1] + rotV2[1] * R,
      labTargetD[2] + rotV2[2] * R,
    ];
    const lab3: [number, number, number] = [
      labTargetD[0] + rotV3[0] * R,
      labTargetD[1] + rotV3[1] * R,
      labTargetD[2] + rotV3[2] * R,
    ];

    const hsv1 = okLabToHsv(lab1);
    const hsv2 = okLabToHsv(lab2);
    const hsv3 = okLabToHsv(lab3);

    const rep1 = hsvToOkLab(...hsv1);
    const rep2 = hsvToOkLab(...hsv2);
    const rep3 = hsvToOkLab(...hsv3);

    const dist1 = calcDeltaEOk(labTargetD, rep1);
    const dist2 = calcDeltaEOk(labTargetD, rep2);
    const dist3 = calcDeltaEOk(labTargetD, rep3);

    let validCount = 0;
    if (dist1 >= R * 0.7) validCount++;
    if (dist2 >= R * 0.7) validCount++;
    if (dist3 >= R * 0.7) validCount++;

    if (validCount > bestValidCount) {
      bestValidCount = validCount;
      bestDistractors = [hsv1, hsv2, hsv3];
    }

    if (validCount === 3) {
      break;
    }
  }

  const rawOptions: [number, number, number][] = [targetD, ...bestDistractors];
~~~~~

### 下一步建议
1. 执行本计划后，可以启动本地开发服务器 (`npm run dev`) 进入“相对色感”训练模块，连续做 5~10 题以主观体验选项的离散度和视觉分布是否自然。
2. 若测试通过且体感良好，可以发起一个独立的 `[COMMIT]` 计划提交这部分代码变更。
