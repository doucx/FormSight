好的，我将生成 Quipu 计划以实施**方案二：色域安全距离过滤（Gamut Margin Rejection）**。

在题目生成的主循环中引入对目标点 $D$ 的色域安全气囊（Gamut Margin）检测，若 $D$ 周围在 $R$ 距离内存在触碰 sRGB 色域边界的风险，则直接重新抽取 $A, B, C$，确保生成的正四面体能够 100% 完整舒展，杜绝 $S=100$ 的拍扁坍缩现象。

## [WIP] feat(color): 实现相对色感目标色域安全边距检测与过滤

### 用户需求
在生成色彩矢量迁移（相对色感）题目时，为目标色彩 $D$ 引入色域安全边距（Gamut Margin）过滤机制，防止 $D$ 落在极高饱和度边界导致正四面体干扰项被截断拍扁。

### 评论
方案二在题目生成源头上建立了一道安全闸门。通过在 OKLab 空间对候选 $D$ 点进行 6 轴向 $R$ 距离的色域试探，确保每个生成的正四面体在三维色彩空间中都有充足的容积舒展，彻底消除了饱和度在边界处坍缩（例如全部贴在 $S=100$）的缺陷，同时使训练内容更精准地聚焦在中度/高质感色彩推移上。

### 目标
1. 在 `src/utils/relativeColorUtils.ts` 中实现精确的 `isOkLabInGamut` 色域检测与 `hasGamutMargin` 安全边距检测函数。
2. 将 `generateRelativeColorQuestion` 的题目抽取循环升级为基于安全边距的过滤式生成。
3. 确保四面体无论随机旋转至何种姿态，四个选项均保持无裁剪状态且两两感知距离恒为 $R$。
4. 运行 Vitest 自动化测试，验证生成效率与算法稳定性。

### 基本原理
在 sRGB 显色系统中，当线性 RGB 坐标的分量位于 $[0, 1]$ 之间时，颜色为合法色域内色彩。我们在 OKLab 空间中以 $D$ 点为中心，向 $\pm L, \pm a, \pm b$ 六个轴向各探出距离 $R$。若所有试探点均能无裁剪地被 sRGB 表达，则证明以 $D$ 为顶点的半径为 $R$ 的正四面体在任意旋转姿态下都不会发生色域撞墙，从而保证了四个选项的几何刚性与绝对公平性。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/color #task/object/gamut-margin-filter #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 在 `src/utils/relativeColorUtils.ts` 中实现色域检测并在生成链路中接入安全边距过滤

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
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
~~~~~typescript
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

/**
 * 判断 OKLab 坐标是否严格落在 sRGB 可显色域内部 (无截断)
 */
export function isOkLabInGamut(lab: [number, number, number]): boolean {
  const [L, a, b] = lab;
  if (L < 0 || L > 1) return false;

  const lCbrt = L + 0.3963377774 * a + 0.2158037573 * b;
  const mCbrt = L - 0.1055613458 * a - 0.0638541728 * b;
  const sCbrt = L - 0.0894841775 * a - 1.291485548 * b;

  const lCone = lCbrt ** 3;
  const mCone = mCbrt ** 3;
  const sCone = sCbrt ** 3;

  const rLin = +4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone;
  const gLin = -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone;
  const bLin = -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone;

  const eps = 1e-4;
  return (
    rLin >= -eps && rLin <= 1 + eps &&
    gLin >= -eps && gLin <= 1 + eps &&
    bLin >= -eps && bLin <= 1 + eps
  );
}

/**
 * 校验 OKLab 目标点周围在指定 margin 距离内是否拥有充足的 sRGB 色域安全气囊
 */
function hasGamutMargin(lab: [number, number, number], margin: number): boolean {
  const [L, a, b] = lab;
  const testPoints: [number, number, number][] = [
    [L, a, b],
    [L + margin, a, b],
    [L - margin, a, b],
    [L, a + margin, b],
    [L, a - margin, b],
    [L, a, b + margin],
    [L, a, b - margin],
  ];

  return testPoints.every(isOkLabInGamut);
}
~~~~~

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
  while (attempts < 100) {
    attempts++;
    // 生成 A (固有色 1)
    const hA = Math.floor(Math.random() * 360);
    const sA = Math.floor(Math.random() * 60) + 30; // 30..90
    const vA = Math.floor(Math.random() * 60) + 30; // 30..90
    colorA = [hA, sA, vA];

    // 生成 B (在 A 基础上有明暗与色相矢量推移)
    const hB = (hA + (Math.floor(Math.random() * 60) - 30) + 360) % 360;
    const sB = Math.max(10, Math.min(100, sA + (Math.floor(Math.random() * 40) - 20)));
    const vB = Math.max(10, Math.min(100, vA + (Math.floor(Math.random() * 50) - 25)));
    colorB = [hB, sB, vB];

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

    const labA = hsvToOkLab(...colorA);
    const labB = hsvToOkLab(...colorB);
    const labC = hsvToOkLab(...colorC);

    vAB = [labB[0] - labA[0], labB[1] - labA[1], labB[2] - labA[2]];
    const vMag = Math.sqrt(vAB[0] ** 2 + vAB[1] ** 2 + vAB[2] ** 2);

    // 确保基准推移矢量 vAB 具备足够的感知长度，避免矢量过短
    if (vMag < 0.03) continue;

    labTargetD = [labC[0] + vAB[0], labC[1] + vAB[1], labC[2] + vAB[2]];

    if (labTargetD[0] >= 0.1 && labTargetD[0] <= 0.9) {
      targetD = okLabToHsv(labTargetD);
      break;
    }
  }
~~~~~
~~~~~typescript
  while (attempts < 200) {
    attempts++;
    // 生成 A (固有色 1 - 适度收敛饱和度区间以保障 D 具有足够四面体舒展空间)
    const hA = Math.floor(Math.random() * 360);
    const sA = Math.floor(Math.random() * 55) + 25; // 25..80
    const vA = Math.floor(Math.random() * 55) + 30; // 30..85
    colorA = [hA, sA, vA];

    // 生成 B (在 A 基础上有明暗与色相矢量推移)
    const hB = (hA + (Math.floor(Math.random() * 60) - 30) + 360) % 360;
    const sB = Math.max(15, Math.min(90, sA + (Math.floor(Math.random() * 40) - 20)));
    const vB = Math.max(20, Math.min(95, vA + (Math.floor(Math.random() * 50) - 25)));
    colorB = [hB, sB, vB];

    // 生成 C (根据 level 动态控制与 A 的相似度)
    // Level 1 时偏置极小 (±10°, ±5%, ±5%)，Level 35 时全色域随机 (±180°, ±40%, ±40%)
    const maxHueOffset = 10 + t * 170;
    const maxSatOffset = 5 + t * 35;
    const maxValOffset = 5 + t * 35;

    const hC_jitter = (Math.random() * 2 - 1) * maxHueOffset;
    const sC_jitter = (Math.random() * 2 - 1) * maxSatOffset;
    const vC_jitter = (Math.random() * 2 - 1) * maxValOffset;

    const hC = (hA + hC_jitter + 360) % 360;
    const sC = Math.max(15, Math.min(90, sA + sC_jitter));
    const vC = Math.max(20, Math.min(95, vA + vC_jitter));
    colorC = [Math.round(hC), Math.round(sC), Math.round(vC)];

    const labA = hsvToOkLab(...colorA);
    const labB = hsvToOkLab(...colorB);
    const labC = hsvToOkLab(...colorC);

    vAB = [labB[0] - labA[0], labB[1] - labA[1], labB[2] - labA[2]];
    const vMag = Math.sqrt(vAB[0] ** 2 + vAB[1] ** 2 + vAB[2] ** 2);

    // 确保基准推移矢量 vAB 具备足够的感知长度，避免矢量过短
    if (vMag < 0.03) continue;

    labTargetD = [labC[0] + vAB[0], labC[1] + vAB[1], labC[2] + vAB[2]];

    // 方案二核心：检查目标点 D 是否在全方向上具备距离 R 的色域安全气囊
    if (hasGamutMargin(labTargetD, R * 0.95)) {
      targetD = okLabToHsv(labTargetD);
      break;
    }
  }

  // 若极端尝试后仍未打破循环，做平滑回退
  if (!targetD || (targetD[0] === 0 && targetD[1] === 0 && targetD[2] === 0 && attempts >= 200)) {
    targetD = okLabToHsv(labTargetD);
  }
~~~~~

### 下一步建议
1. 执行本计划后，可以运行 `npm run dev` 再次进入“相对色感”训练，重点观察高难度（小 $R$）与低难度（大 $R$）下四个色块的饱满度和差异度，确认不再出现饱和度挤压在 100% 的现象。
2. 体验完毕且一切正常后，可以发起独立的 `[COMMIT]` 计划将本项改进纳入版本管理。
