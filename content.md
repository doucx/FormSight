经过分析，问题的根本原因在于生成 `TD_NOTAN_2AFC` 题型时，噪声生成器的种子（seed）计算存在越界，导致 LCG（线性同余随机数生成器）溢出并破坏了 Fisher-Yates 排列洗牌。

具体表现为：在 `TD_NOTAN_2AFC` 中，代码使用了 `createNoise2D(Math.random() + 200)` 来构造微观高频肌理噪波 `microNoise`。因为传入的种子大于 1，初始化状态 `s` 远超出了 `[1, 2147483646]` 的正常有效范围，导致乘法同余计算严重退化，置换表 `perm` 出现大量的周期性重复与线性相关，最终使叠加了微观高频噪波的两个候选画面渲染出严重的垂直条带拉伸纹理。

我将生成一个修复计划，修正种子传递并为 `createNoise2D` 增加 seed 规范化防御逻辑。

## [WIP] fix: 修复黑白素描骨架模式下的随机噪声条带化拉伸问题

### 错误分析

1. **种子越界导致 LCG 同余退化**: `createNoise2D` 内部使用 `s = Math.floor(seed * 2147483647)` 作为 31 位 LCG 伪随机数发生器的初始状态。当 `seed` 传入 `Math.random() + 200` 时，初始状态高达 `4.3 × 10^11`，在执行 `(s * 16807) % 2147483647` 循环打乱 `p` 数组时产生了同余退化，置换表未能充分随机洗牌。
2. **微观肌理条带化污染**: 题干的 Notan 剪影只基于宏观场 `targetMacroNoise`，因而显示正常；但下方的具象选项画面的每个像素均叠加了 `microNoise`，退化的伪随机置换表在 2D 梯度插值时产生明显的垂直/对角线周期性条带拉伸。
3. **缺少防御性归一化**: `createNoise2D` 没有对传入的 `seed` 进行 `(seed % 1)` 截断和防御，任何大于 1 的非标准 seed 都会触发此问题。

### 用户需求
消除“黑白素描骨架 (`TD_NOTAN_2AFC`)”题型下方候选画面的垂直拉伸与条带化异常，使其呈现出与“黑白素描归组 (`NOTAN_THRESHOLD`)”一致的均匀自然素描噪波质感。

### 评论
该修复能够恢复 2D 梯度噪声生成器的数学严谨性，确保多尺度 FBM 双频噪声在具象细节渲染时保持各项同性与自然颗粒感，彻底杜绝条带假象。

### 目标
1. 修改 `src/utils/noiseUtils.ts` 中的 `createNoise2D` 函数，对传入的 `seed` 进行绝对值取模归一化防御处理。
2. 修改 `src/utils/abstractionUtils.ts` 中的 `generateAbstractionQuestion`，确保 `distractorMacroNoise` 和 `microNoise` 传入标准的独立随机浮点数。

### 基本原理
通过将种子规范化到 `(0, 1)` 开区间，确保 LCG 内部状态始终位于标准模数 `2147483647` 范围内，Fisher-Yates 算法可以对 256 项排列进行均匀的无偏洗牌，从而消除梯度查表中的周期性瑕疵。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/refine #task/domain/rendering #task/object/noise-generator #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复噪声生成器种子规范化与 TD_NOTAN_2AFC 噪波生成调用

我们将修复 `createNoise2D` 的种子预处理逻辑，并在 `TD_NOTAN_2AFC` 中使用规范的独立随机种子。

~~~~~act
patch_file
src/utils/noiseUtils.ts
~~~~~
~~~~~typescript.old
export function createNoise2D(seed = Math.random()): Noise2DFunction {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  let s = Math.floor(seed * 2147483647);
  if (s <= 0) s += 2147483646;

  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const n = s % (i + 1);
    const temp = p[i];
    p[i] = p[n];
    p[n] = temp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
~~~~~
~~~~~typescript.new
export function createNoise2D(seed = Math.random()): Noise2DFunction {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  const normalizedSeed = (Math.abs(seed) % 1) || Math.random();
  let s = Math.floor(normalizedSeed * 2147483647);
  if (s <= 0) s += 2147483646;

  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const n = s % (i + 1);
    const temp = p[i];
    p[i] = p[n];
    p[n] = temp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript.old
    const targetMacroNoise = createNoise2D(Math.random());
    const distractorMacroNoise = createNoise2D(Math.random() + 100);
    const microNoise = createNoise2D(Math.random() + 200);
~~~~~
~~~~~typescript.new
    const targetMacroNoise = createNoise2D(Math.random());
    const distractorMacroNoise = createNoise2D(Math.random());
    const microNoise = createNoise2D(Math.random());
~~~~~

### 下一步建议
1. 运行 `npm run test` 或 `npm run dev`，在细化感知模块中启动“黑白素描骨架”模式，观察下方选项的连续灰阶原图是否已恢复为自然的素描肌理。
2. 确认渲染无误后，可以生成一个 `[COMMIT]` 计划将此次修复提交到代码库。
