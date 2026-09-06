分析得非常准确。在 Three.js 中，之前使用的 `planeHelper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), q.normal)` 仅约束了法向量（Z轴），但没有约束平面在局部的旋转角（Roll），导致平面在空间中产生了约 90 度的旋转错位；同时，Canvas 2D 坐标系的上下方向与 Three.js 纹理坐标系（V轴）存在垂直镜像翻转。

我将使用 `patch_file` 显式构建正交基底矩阵（Basis Matrix）并修正纹理映射方向，彻底解决对齐问题。

---

## [WIP] fix(prototype): 修复 3D 截面平面的 90 度旋转错位与上下颠倒问题

### 错误分析
1. **旋转错位根因**：`setFromUnitVectors` 只保证了平面法向量对齐到 `q.normal`，但绕法向量的旋转角度（Roll）是不确定的，这导致切片平面的局部 U/V 轴与算法生成的 `uVec`/`vVec` 产生了角度偏差（表现为 90 度旋转）。
2. **上下翻转根因**：Canvas 2D 的 `py=0` 位于画布顶部，而 Three.js 纹理映射的 V 轴由下往上，导致贴图上下颠倒。
3. **解决方案**：
   - 使用 `THREE.Matrix4().makeBasis(q.uVec, q.vVec, q.normal)` 显式构建切片平面的局部坐标系矩阵，将平面的 X 轴精准绑定到 `uVec`、Y 轴绑定到 `vVec`、Z 轴绑定到 `normal`。
   - 为调试视图的 `CanvasTexture` 设置 `texture.repeat.set(1, -1)` 修正垂直镜像翻转。

### 用户需求
消除 3D 视口中截面贴图与实际 3D 空间结构之间的 90 度旋转偏差与上下颠倒，使 3D 视口切面与下方 4-AFC 选项完全精准对齐。

### 评论
使用正交基底矩阵（Basis Matrix）是解决 3D 空间平面定向与纹理对齐的标准工业级方案，能从根本上杜绝不确定的旋转角。

### 目标
1. 在 `updateCuttingPlaneVisual` 中用 `makeBasis(q.uVec, q.vVec, q.normal)` 替代 `setFromUnitVectors`。
2. 在 `CanvasTexture` 初始化时加入 `repeat.set(1, -1)` 修正 V 轴方向。

### 基本原理
`Matrix4.makeBasis(x, y, z)` 能够精确指定对象在世界坐标系中的正交三个基底向量，从而将数学空间中的 `uVec`/`vVec` 直接映射为 Three.js 对象的本地局部坐标轴。

### 标签
#intent/fix #flow/ready #priority/high #comp/docs #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/fractal-section-prototype #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 使用 patch_file 修复切片平面的矩阵基底与纹理翻转

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~html.old
      let planeMat;
      if (debugTextureMode) {
        // 创建离屏 Canvas 生成截面纹理
        const texCanvas = document.createElement('canvas');
        texCanvas.width = 256;
        texCanvas.height = 256;
        const correctCfg = q.configs.find(c => c.type === 'CORRECT') || q.configs[0];
        renderSectionToCanvas(texCanvas, correctCfg, q.level);

        const texture = new THREE.CanvasTexture(texCanvas);
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;

        planeMat = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95
        });
      } else {
        planeMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
          depthWrite: false
        });
      }

      planeHelper = new THREE.Mesh(planeGeom, planeMat);
      planeHelper.position.copy(q.planeCenter);
      planeHelper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), q.normal);
~~~~~
~~~~~html.new
      let planeMat;
      if (debugTextureMode) {
        // 创建离屏 Canvas 生成截面纹理
        const texCanvas = document.createElement('canvas');
        texCanvas.width = 256;
        texCanvas.height = 256;
        const correctCfg = q.configs.find(c => c.type === 'CORRECT') || q.configs[0];
        renderSectionToCanvas(texCanvas, correctCfg, q.level);

        const texture = new THREE.CanvasTexture(texCanvas);
        texture.center.set(0.5, 0.5);
        texture.repeat.set(1, -1); // 修正 Canvas 2D 与 Three.js 纹理的 V 轴垂直翻转
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;

        planeMat = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95
        });
      } else {
        planeMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
          depthWrite: false
        });
      }

      planeHelper = new THREE.Mesh(planeGeom, planeMat);
      planeHelper.position.copy(q.planeCenter);
      
      // 使用正交基底矩阵 (uVec, vVec, normal) 精确对齐平面的本地 X/Y/Z 轴，消除 90 度旋转错位
      const orientMatrix = new THREE.Matrix4().makeBasis(q.uVec, q.vVec, q.normal);
      planeHelper.quaternion.setFromRotationMatrix(orientMatrix);
~~~~~

### 下一步建议
1. 刷新浏览器并重新勾选 `🔧 截面贴图调试视图`。
2. 观察切片平面上的 2D 贴图与红蓝方位边框是否已经与 3D 空间、下方 4-AFC 选项完全 100% 精准对齐。
