你的分析切中要害。`createNoise2D` 中 `perm[X + perm[Y]]` 的单侧嵌套哈希破坏了空间旋转各向同性（Rotational Isotropy），导致沿 Y 轴的插值曲率和梯度分布出现不对称的纵向条带伪像。

我将生成一个计划，将置换表索引修正为标准的 Ken Perlin 双重置换查找 `perm[perm[X] + Y]`，以恢复 2D 噪声场的完全各向同性与有机斑块分布。

## [WIP] fix: 修复 2D 梯度噪声置换哈希不对称导致的垂直拉伸伪像

### 错误分析
在 `src/utils/noiseUtils.ts` 的 `createNoise2D` 实现中，四角网格顶点的梯度向量索引采用了 `perm[X + perm[Y]]`、`perm[X + 1 + perm[Y]]` 等非对称哈希。由于 $X$ 坐标未经过置换表的非线性离散映射，而 $Y$ 坐标经过了置换映射，导致 $X$ 轴与 $Y$ 轴在空间统计特征上失去了旋转对称性与自相关各向同性，在生成 Notan 灰度场和连续纹理时表现为明显的垂直条纹和竖向拉伸瑕疵。

### 用户需求
修正 2D 梯度噪声生成器中的网格顶点哈希算法，消除垂直条带化与方向性畸变，使 Notan 灰度场与噪声颗粒呈现均匀各向同性的自然有机分布。

### 评论
该修复对于基于 FBM 过程生成的视知觉训练模块（如 Notan 素描归组、骨架寻源）至关重要。各向同性的底噪能确保生成的素描剪影形态真实、均匀，避免产生误导学员的非自然方向性视觉线索。

### 目标
1. 修改 `src/utils/noiseUtils.ts` 中的 `createNoise2D` 函数。
2. 将四角梯度的查找逻辑更新为标准 Perlin 噪声的双重置换哈希 `perm[perm[X] + Y]`。

### 基本原理
利用长度为 512 的 `perm` 表（前 256 元素的双倍展开），`perm[X]` 与 `perm[X + 1]` 会将 X 轴坐标进行伪随机哈希，随后加上 Y 轴坐标 `Y` 或 `Y + 1`，最大索引值为 $255 + 256 = 511 < 512$，无需额外的模运算即可安全读取。此举使 X 与 Y 在哈希深度上完全等价对称，彻底恢复旋转各向同性。

### 标签
#intent/fix #flow/ready #priority/medium #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/algorithm #task/object/noise-generator #task/action/bug-fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 修复 2D 梯度噪声置换哈希逻辑

我们将 `src/utils/noiseUtils.ts` 中 `createNoise2D` 的四角梯度索引修正为各向同性的双重置换。

~~~~~act
patch_file
src/utils/noiseUtils.ts
~~~~~
~~~~~typescript
    const u = fade(xf);
    const v = fade(yf);

    const g00 = grad[perm[X + perm[Y]] % 8];
    const g10 = grad[perm[X + 1 + perm[Y]] % 8];
    const g01 = grad[perm[X + perm[Y + 1]] % 8];
    const g11 = grad[perm[X + 1 + perm[Y + 1]] % 8];

    const n00 = g00[0] * xf + g00[1] * yf;
~~~~~
~~~~~typescript
    const u = fade(xf);
    const v = fade(yf);

    const g00 = grad[perm[perm[X] + Y] % 8];
    const g10 = grad[perm[perm[X + 1] + Y] % 8];
    const g01 = grad[perm[perm[X] + Y + 1] % 8];
    const g11 = grad[perm[perm[X + 1] + Y + 1] % 8];

    const n00 = g00[0] * xf + g00[1] * yf;
~~~~~

### 下一步建议
1. 启动本地开发服务验证：进入 `NOTAN_THRESHOLD`（黑白素描归组）或 `TD_NOTAN_2AFC`（黑白素描骨架）模式，观察生成的二值剪影与灰度图是否已恢复为自然的各向同性斑块形态。
2. 运行自动化测试与代码检查（`npm run check` 或 `npm test`），确保所有相关模块通过回归验证。
