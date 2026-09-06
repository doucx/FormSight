我将为 3D 分形截面感知原型 (`playground/fractal_section_prototype.html`) 增加空间定向提示机制。

在 3D 视口的截面平面上引入可视的坐标轴/边界参考线（例如：用红色标注 $u$ 轴正向对应的一侧边/边界方向、用蓝色标注 $v$ 轴正向对应的一侧边/边界方向），并在 4-AFC 的每个 2D 截面选项卡上同步绘制相应的彩色参考边框或方向指示线。这样可以有效降低纯空间盲转的难度，帮助用户建立更直观、更迅速的截面坐标映射直觉。

我将生成一个实现此功能的 `[WIP]` 计划。

## [WIP] feat: 为截面选项卡和 3D 切片平面增加颜色编码的定向提示线

### 用户需求
用户希望在截面上显示直观的位置/坐标轴定向提示（例如：正方形截面 ABCD 中，AB 边标注为红色，AD 边标注为蓝色）。在 4-AFC 的四个选项中也作相应联动，在顶端/右侧或对应边界画出红色和蓝色定向指示线。这能让用户快速建立空间直觉，免去在脑海中对三维截面进行困难的无参照翻转。

### 评论
这个改进极其契合 FormSight 的渐进式认知训练理念。通过引入视口坐标系到 2D 截面空间的视觉锚点（Color-coded Axis Indicators），不仅降低了空间感知训练的受挫感，还使得用户能够通过结构化的边界对齐来训练对截面局部曲率和旋转矩阵的敏感度。

### 目标
1. 在 3D 切片平面（PlaneHelper）周围或表面动态渲染可视的边界/坐标参考线（例如红色 $u$ 轴与蓝色 $v$ 轴指示方向）。
2. 在 2D 截面选项 Canvas 渲染函数 `renderSectionToCanvas` 中，沿画布边缘同步绘制对应的彩色边框或定向指示标记（如顶部红线、左侧蓝线，并考虑对齐旋转与变换）。
3. 确保在难度升级、倾斜旋转以及重新生成题目时，定向提示线能够精确跟随截面的局部坐标基底，保证视觉语义的一致性。

### 基本原理
我们在 3D 空间中的切片平面拥有完备的正交基底 `uVec`（对应水平扩展）和 `vVec`（对应垂直扩展），其中心为 `planeCenter`。
在 2D 截面渲染时，画布上的像素对应着 `uVec` 和 `vVec` 张成的平面。因此，我们在 Canvas 的边缘（如顶边或左边）直接绘制带有颜色标识的几何指示标记或边框线（Top Edge = Red 对应 $u$ 正向，Left Edge = Blue 对应 $v$ 正向），这在数学上完全等价于将截面的 2D 本地坐标系进行了显式可视化。

### 标签
#intent/build #flow/ready #priority/high #comp/docs #concept/ui #scope/ux #ai/brainstorm #task/domain/ui #task/object/fractal-section-hints #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新 3D 切片平面视觉辅助与 2D 截面渲染逻辑

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~html.old
    function renderSectionToCanvas(canvas, config, level) {
      const ctx = canvas.getContext('2d');
      const size = canvas.width;
      ctx.clearRect(0, 0, size, size);

      const span = 1.55;
      const imgData = ctx.createImageData(size, size);
      const data = imgData.data;

      for (let py = 0; py < size; py++) {
        let vFrac = (py / size - 0.5) * 2 * span;
        for (let px = 0; px < size; px++) {
          let uFrac = (px / size - 0.5) * 2 * span;
          
          let worldP = config.center.clone()
            .add(config.u.clone().multiplyScalar(uFrac))
            .add(config.v.clone().multiplyScalar(vFrac));
          
          let val = evaluateSDF(worldP.x, worldP.y, worldP.z, level);
          let pIdx = (py * size + px) * 4;

          if (val <= 0) {
            let edgeDist = Math.min(1.0, -val * 3.2);
            data[pIdx] = Math.round(99 + edgeDist * 45);
            data[pIdx + 1] = Math.round(102 + edgeDist * 65);
            data[pIdx + 2] = Math.round(241 + edgeDist * 14);
            data[pIdx + 3] = 255;
          } else if (val < 0.035) {
            data[pIdx] = 52;
            data[pIdx + 1] = 211;
            data[pIdx + 2] = 153;
            data[pIdx + 3] = 255;
          } else {
            data[pIdx] = 15;
            data[pIdx + 1] = 23;
            data[pIdx + 2] = 42;
            data[pIdx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size/2, 0); ctx.lineTo(size/2, size);
      ctx.moveTo(0, size/2); ctx.lineTo(size, size/2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeRect(1, 1, size - 2, size - 2);
    }
~~~~~
~~~~~html.new
    function renderSectionToCanvas(canvas, config, level) {
      const ctx = canvas.getContext('2d');
      const size = canvas.width;
      ctx.clearRect(0, 0, size, size);

      const span = 1.55;
      const imgData = ctx.createImageData(size, size);
      const data = imgData.data;

      for (let py = 0; py < size; py++) {
        let vFrac = (py / size - 0.5) * 2 * span;
        for (let px = 0; px < size; px++) {
          let uFrac = (px / size - 0.5) * 2 * span;
          
          let worldP = config.center.clone()
            .add(config.u.clone().multiplyScalar(uFrac))
            .add(config.v.clone().multiplyScalar(vFrac));
          
          let val = evaluateSDF(worldP.x, worldP.y, worldP.z, level);
          let pIdx = (py * size + px) * 4;

          if (val <= 0) {
            let edgeDist = Math.min(1.0, -val * 3.2);
            data[pIdx] = Math.round(99 + edgeDist * 45);
            data[pIdx + 1] = Math.round(102 + edgeDist * 65);
            data[pIdx + 2] = Math.round(241 + edgeDist * 14);
            data[pIdx + 3] = 255;
          } else if (val < 0.035) {
            data[pIdx] = 52;
            data[pIdx + 1] = 211;
            data[pIdx + 2] = 153;
            data[pIdx + 3] = 255;
          } else {
            data[pIdx] = 15;
            data[pIdx + 1] = 23;
            data[pIdx + 2] = 42;
            data[pIdx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // 内部网格微光
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size/2, 0); ctx.lineTo(size/2, size);
      ctx.moveTo(0, size/2); ctx.lineTo(size, size/2);
      ctx.stroke();

      // 绘制空间定向彩色提示边框 (红：u轴正向/顶部, 蓝：v轴正向/左侧)
      const borderWidth = 4;
      
      // 顶部边框 (红色 - 对应 U 轴正向方位指示)
      ctx.fillStyle = '#ef4444'; // red-500
      ctx.fillRect(0, 0, size, borderWidth);

      // 左侧边框 (蓝色 - 对应 V 轴正向方位指示)
      ctx.fillStyle = '#3b82f6'; // blue-500
      ctx.fillRect(0, 0, borderWidth, size);

      // 整体外框微光
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, size, size);
    }
~~~~~

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~html.old
    function updateCuttingPlaneVisual(q) {
      if (planeHelper) scene.remove(planeHelper);

      const planeGeom = new THREE.PlaneGeometry(2.8, 2.8);
      const planeMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      planeHelper = new THREE.Mesh(planeGeom, planeMat);
      planeHelper.position.copy(q.planeCenter);
      planeHelper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), q.normal);

      const edges = new THREE.EdgesGeometry(planeGeom);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 }));
      planeHelper.add(line);

      const arrow = new THREE.ArrowHelper(q.normal, new THREE.Vector3(0,0,0), 0.65, 0x10b981, 0.15, 0.1);
      planeHelper.add(arrow);

      scene.add(planeHelper);
    }
~~~~~
~~~~~html.new
    function updateCuttingPlaneVisual(q) {
      if (planeHelper) scene.remove(planeHelper);

      const planeGeom = new THREE.PlaneGeometry(2.8, 2.8);
      const planeMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      planeHelper = new THREE.Mesh(planeGeom, planeMat);
      planeHelper.position.copy(q.planeCenter);
      planeHelper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), q.normal);

      const edges = new THREE.EdgesGeometry(planeGeom);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 }));
      planeHelper.add(line);

      // 在截面平面上增加颜色编码的坐标轴指示线 (红色：U轴 / 蓝色：V轴)
      // U 轴指示器 (红色细杆，沿正 u 方向)
      const uDirGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1.2, 0, 0)
      ]);
      const uLine = new THREE.Line(uDirGeom, new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 3 }));
      planeHelper.add(uLine);

      // V 轴指示器 (蓝色细杆，沿正 v 方向)
      const vDirGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 1.2, 0)
      ]);
      const vLine = new THREE.Line(vDirGeom, new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 3 }));
      planeHelper.add(vLine);

      // 法向量指示箭头
      const arrow = new THREE.ArrowHelper(q.normal, new THREE.Vector3(0,0,0), 0.65, 0x10b981, 0.15, 0.1);
      planeHelper.add(arrow);

      scene.add(planeHelper);
    }
~~~~~

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~html.old
    <!-- 2D 截面 4-AFC 选项列表 -->
    <div class="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <span>选择正确的 2D 剖截面 (Cross-Section Options)</span>
        </h3>
        <span class="text-xs text-slate-500 font-mono">4-AFC (按 1, 2, 3, 4 快捷作答)</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4" id="options-grid"></div>
    </div>
~~~~~
~~~~~html.new
    <!-- 2D 截面 4-AFC 选项列表 -->
    <div class="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <span>选择正确的 2D 剖截面 (Cross-Section Options)</span>
        </h3>
        <div class="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"></span> U轴定向 (顶边)</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span> V轴定向 (左边)</span>
          <span class="text-slate-500">4-AFC (1-4)</span>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4" id="options-grid"></div>
    </div>
~~~~~

### 下一步建议
我们已经成功在 3D 切片平面上添加了红色（U轴）与蓝色（V轴）坐标指示线，并在所有 4 个 2D 截面选项的 Canvas 边缘同步渲染了对应的红、蓝定向边框提示。
你可以打开 `playground/fractal_section_prototype.html` 预览效果。如果你希望进一步增强交互，例如当鼠标悬停在选项上时在 3D 视口中高亮对应方向轴，或者增加图例文字，请随时告诉我！
