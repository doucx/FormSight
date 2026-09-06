简要回答
你遇到的这个 `NaN` 发散崩溃其实并非因为模型本身的算法出现了发散，而是因为我之前在一个地方写错了对象解构！

在 `Fractal3DViewport.tsx` 中，我写成了：
`const { level, seed, ... } = question;`
但是 `question` 对象里面其实并没有 `level` 字段，只有 `difficultyLevel` 字段。这导致传入给 3D 数学函数的 `level` 其实是 **`undefined`**！

当数学引擎执行 `(level - 8)` 时，`(undefined - 8)` 就变成了 `NaN`，从而将所有的噪声采样和 `curR` 坐标彻底污染，导致 `Three.js` 底层 `computeBoundingSphere` 时产生崩溃。你所添加的防御代码截断了 `NaN` 扩散，但因为运算从一开始就是坏的，导致截断后只能维持最初设定的 `1.15`，所以你看到所有点最后都变成了一个光滑的圆球！

我已经定位到了问题根源，不仅修复了这个解构错误，还将你的健壮性防御逻辑完整接纳了进来。

## [WIP] fix: 修复 Fractal3DViewport 中由于解构缺失导致 SDF 参数为 NaN 的崩溃问题

### 错误分析

错误原因：`QuestionData` 接口中难度字段为 `difficultyLevel`，但在 `Fractal3DViewport` 获取状态时，由于错误地解构为 `level` 导致其获取到 `undefined`。
这个未定义的数值被传递到 `evaluateSDF` 函数中进行数学四则运算，彻底污染了所有的计算结果为 `NaN`。最终使得 3D 渲染几何体崩溃，或者是引发回退导致永远仅能显示默认的圆球。

### 解决方案

1.  **修复解构错误**：将解构语句调整为 `const { difficultyLevel: level, seed, ... } = question;` 确保正确获取层级。
2.  **增强引擎防御性**：将用户在发散处理上的兜底方案正式接纳进代码中。
3.  **补充纯函数的默认兜底**：在 `evaluateSDF` 和 `hash3D` 中为主参数增加 `??` 短路保护，在未来任意模块意外失传参数时也能保证平稳渲染。

### 标签
#intent/fix #flow/ready #priority/critical #comp/cards #concept/ui #scope/core #ai/instruct #task/domain/cards #task/object/spatial-fractal #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修正 3D 视口的解构引用与迭代保护

修正变量名的获取，并在光线步进循环中加入 `NaN` 截断保护，保障不出现异常顶点。

~~~~~act
patch_file
src/cards/spatial_fractal/components/Fractal3DViewport.tsx
~~~~~
~~~~~tsx.old
  // Re-generate meshes on question change
  useEffect(() => {
    if (!libs || !sceneRef.current) return;
    const scene = sceneRef.current;
    const { THREE } = libs;
    const { level, seed, planeCenter, uVec, vVec, normal } = question;

    const objectsToRemove: any[] = [];
~~~~~
~~~~~tsx.new
  // Re-generate meshes on question change
  useEffect(() => {
    if (!libs || !sceneRef.current) return;
    const scene = sceneRef.current;
    const { THREE } = libs;
    const { difficultyLevel: level, seed, planeCenter, uVec, vVec, normal } = question;

    const objectsToRemove: any[] = [];
~~~~~

~~~~~act
patch_file
src/cards/spatial_fractal/components/Fractal3DViewport.tsx
~~~~~
~~~~~tsx.old
      let curR = 1.15;
      for (let step = 0; step < 7; step++) {
        let testX = normX * curR;
        let testY = normY * curR;
        let testZ = normZ * curR;
        let sdfVal = evaluateSDF(testX, testY, testZ, level, seed);
        curR = curR - sdfVal * 0.75;
      }

      pos.setXYZ(i, normX * curR, normY * curR, normZ * curR);
~~~~~
~~~~~tsx.new
      let curR = 1.15;
      for (let step = 0; step < 7; step++) {
        let testX = normX * curR;
        let testY = normY * curR;
        let testZ = normZ * curR;
        let sdfVal = evaluateSDF(testX, testY, testZ, level, seed);
        if (Number.isNaN(sdfVal) || !Number.isFinite(sdfVal)) {
          break;
        }
        curR = curR - sdfVal * 0.75;
      }

      if (Number.isNaN(curR) || !Number.isFinite(curR)) {
        curR = 1.15;
      }

      pos.setXYZ(i, normX * curR, normY * curR, normZ * curR);
~~~~~

#### Acts 2: 提高底层纯数学计算的鲁棒性

为 `evaluateSDF` 与 `hash3D` 增加变量的自动降级兜底，避免再次由于传递 `undefined` 而产生链式污染。

~~~~~act
patch_file
src/cards/spatial_fractal/utils/sdf.ts
~~~~~
~~~~~typescript.old
export function hash3D(x: number, y: number, z: number, seed: number) {
  let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed) * 43758.5453123;
  return n - Math.floor(n);
}

export function smoothNoise3D(x: number, y: number, z: number, seed: number) {
~~~~~
~~~~~typescript.new
export function hash3D(x: number, y: number, z: number, seed: number) {
  const s = seed ?? 42;
  let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s) * 43758.5453123;
  return n - Math.floor(n);
}

export function smoothNoise3D(x: number, y: number, z: number, seed: number) {
~~~~~

~~~~~act
patch_file
src/cards/spatial_fractal/utils/sdf.ts
~~~~~
~~~~~typescript.old
export function evaluateSDF(x: number, y: number, z: number, level: number, seed: number) {
  let r = Math.sqrt(x*x + y*y + z*z);

  let macroNoise = (smoothNoise3D(x * 0.85 + 1.2, y * 0.85 + 1.2, z * 0.85 + 1.2, seed) - 0.5) * 0.65;
  let dist = (r - 1.15) - macroNoise;

  if (level <= 8) return dist;

  let facetWeight = Math.min(1.0, (level - 8) / 10);
  let facetNoise = Math.abs(smoothNoise3D(x * 1.6 + 3.0, y * 1.6 + 3.0, z * 1.6 + 3.0, seed) - 0.5) * 0.85;
  dist = dist - facetWeight * facetNoise;

  if (level <= 18) return dist;

  let chaosWeight = Math.min(1.0, (level - 18) / 17);
  let fineNoise = (fbm3D(x * 3.0, y * 3.0, z * 3.0, 3, seed) - 0.5) * 0.65 * chaosWeight;
  dist = dist - fineNoise;

  return dist;
}
~~~~~
~~~~~typescript.new
export function evaluateSDF(x: number, y: number, z: number, level: number, seed: number) {
  const s = seed ?? 42;
  const lvl = level ?? 1;
  let r = Math.sqrt(x*x + y*y + z*z);

  let macroNoise = (smoothNoise3D(x * 0.85 + 1.2, y * 0.85 + 1.2, z * 0.85 + 1.2, s) - 0.5) * 0.65;
  let dist = (r - 1.15) - macroNoise;

  if (lvl <= 8) return dist;

  let facetWeight = Math.min(1.0, (lvl - 8) / 10);
  let facetNoise = Math.abs(smoothNoise3D(x * 1.6 + 3.0, y * 1.6 + 3.0, z * 1.6 + 3.0, s) - 0.5) * 0.85;
  dist = dist - facetWeight * facetNoise;

  if (lvl <= 18) return dist;

  let chaosWeight = Math.min(1.0, (lvl - 18) / 17);
  let fineNoise = (fbm3D(x * 3.0, y * 3.0, z * 3.0, 3, s) - 0.5) * 0.65 * chaosWeight;
  dist = dist - fineNoise;

  return dist;
}
~~~~~

### 下一步建议
由于你目前可能还需要确认 Vite 构建配置，如果你希望实施 `manualChunks` 的打包优化，我们将使用 `run_command` 命令修改你的 Vite 配置文件将 Three.js 单独打包，避免首页包体积变大。你可以测试此代码后再告知我。
