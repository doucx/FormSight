我们在 3D 分形截面卡片的网格生成循环中发现，当难度较高时，多级噪声迭代可能导致 `curR` 发散为 `NaN` 或 `Infinity`，进而引发 Three.js 的 `computeBoundingSphere()` 抛出 `NaN` 半径异常。我将为顶点迭代循环增加严密的有限性检查与安全回退，彻底解决该 Bug。

## [WIP] fix(card): 为 spatial_fractal 的 3D 网格生成增加 NaN 与发散防御

### 错误分析
在 `Fractal3DViewport.tsx` 中，对 `THREE.IcosahedronGeometry` 的顶点进行多步 SDF 迭代投射时：
1. 若初始向量长度 `r` 异常或接近 0，会导致法向量计算出 `NaN`。
2. 在高难度下（如 Lv.20+），`evaluateSDF` 中的高频噪声可能导致 `curR` 产生 `NaN` 或发散到无穷大。
3. 当带有 `NaN` 坐标的顶点被写入 `pos.setXYZ` 后，Three.js 在计算包围球时发生崩溃。

### 用户需求
修复 3D 分形截面卡片在渲染时由于顶点坐标出现 `NaN` 导致的 WebGL 渲染崩溃问题。

### 评论
这是一个在处理过程式 3D 分形几何体时非常典型的边界健壮性问题。通过在顶点修改循环中加入 `Number.isNaN` 和 `Number.isFinite` 校验，可以有效屏蔽异常噪声发散带来的几何破坏。

### 目标
1. 修改 `src/cards/spatial_fractal/components/Fractal3DViewport.tsx`。
2. 在顶点循环中增加对 `r`、`sdfVal` 和最终 `curR` 的有效性（Finite / Not NaN）校验与默认值回退。

### 基本原理
在迭代修改 3D 几何体顶点时，任何涉及过程式噪声（Noise / FBM）的算法都有微小的概率产生极值或发散。增加防御性编程拦截异常值，能够确保 Three.js 渲染管线始终接收到干净的顶点数据。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/refine #task/domain/cards #task/object/spatial-fractal #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修补 Fractal3DViewport.tsx 中的顶点 NaN 异常

~~~~~act
patch_file
src/cards/spatial_fractal/components/Fractal3DViewport.tsx
~~~~~
~~~~~old
    const detail = level <= 8 ? 4 : (level <= 18 ? 5 : (level <= 28 ? 6 : 7));
    const geom = new THREE.IcosahedronGeometry(1.2, detail);
    const pos = geom.attributes.position;
    
    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i);
      let vy = pos.getY(i);
      let vz = pos.getZ(i);
      
      let r = Math.sqrt(vx*vx + vy*vy + vz*vz);
      let normX = vx / r;
      let normY = vy / r;
      let normZ = vz / r;

      let curR = 1.15;
      for (let step = 0; step < 7; step++) {
        let testX = normX * curR;
        let testY = normY * curR;
        let testZ = normZ * curR;
        let sdfVal = evaluateSDF(testX, testY, testZ, level, seed);
        curR = curR - sdfVal * 0.75;
      }

      pos.setXYZ(i, normX * curR, normY * curR, normZ * curR);
    }
    geom.computeVertexNormals();
~~~~~
~~~~~new
    const detail = level <= 8 ? 4 : (level <= 18 ? 5 : (level <= 28 ? 6 : 7));
    const geom = new THREE.IcosahedronGeometry(1.2, detail);
    const pos = geom.attributes.position;
    
    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i);
      let vy = pos.getY(i);
      let vz = pos.getZ(i);
      
      let r = Math.sqrt(vx*vx + vy*vy + vz*vz);
      if (r === 0 || Number.isNaN(r) || !Number.isFinite(r)) {
        continue;
      }
      let normX = vx / r;
      let normY = vy / r;
      let normZ = vz / r;

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
    }
    geom.computeVertexNormals();
~~~~~

### 下一步建议
我们已经完成了对 3D 顶点计算中 `NaN` 异常的防御性修复。你可以重新编译项目并进入 3D 分形截面卡片进行体验。
