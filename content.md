## [WIP] 将 3D 切片平面上的定向提示线替换为了与 2D 选项完全一致的边界边框

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
~~~~~html.new
    function updateCuttingPlaneVisual(q) {
      if (planeHelper) scene.remove(planeHelper);

      const planeSize = 2.8;
      const halfSize = planeSize / 2;
      const planeGeom = new THREE.PlaneGeometry(planeSize, planeSize);
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

      // 默认绿色外框
      const edges = new THREE.EdgesGeometry(planeGeom);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 }));
      planeHelper.add(line);

      // 在绿色截面正方形的顶边 and 左边渲染对应的红、蓝定向边框提示
      // 平面在本地坐标系中：u 对应 X 轴（从 -halfSize 到 +halfSize），v 对应 Y 轴（从 -halfSize 到 +halfSize）
      // 顶边：y = +halfSize, x 从 -halfSize 到 +halfSize (红色, 对应 U 轴正向方位)
      const topEdgeGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfSize, halfSize, 0.002),
        new THREE.Vector3(halfSize, halfSize, 0.002)
      ]);
      const topEdgeLine = new THREE.Line(topEdgeGeom, new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 4 }));
      planeHelper.add(topEdgeLine);

      // 左边：x = -halfSize, y 从 -halfSize 到 +halfSize (蓝色, 对应 V 轴正向方位)
      const leftEdgeGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfSize, -halfSize, 0.002),
        new THREE.Vector3(-halfSize, halfSize, 0.002)
      ]);
      const leftEdgeLine = new THREE.Line(leftEdgeGeom, new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 4 }));
      planeHelper.add(leftEdgeLine);

      // 法向量指示箭头
      const arrow = new THREE.ArrowHelper(q.normal, new THREE.Vector3(0,0,0), 0.65, 0x10b981, 0.15, 0.1);
      planeHelper.add(arrow);

      scene.add(planeHelper);
    }
~~~~~

### 下一步建议
我们已经将 3D 切片平面上的定向提示线替换为了与 2D 选项完全一致的边界边框：
- **顶边**：渲染为醒目的**红色**（对应 U 轴定向）。
- **左边**：渲染为醒目的**蓝色**（对应 V 轴定向）。

这样用户在 3D 视图中观察切片平面时，可以直接将绿色正方形的**红顶边**与**蓝左边**与四个 2D 选项卡进行点对点直观对齐，彻底消除了空间旋转带来的理解障碍。你可以刷新网页查看最新的直观视觉效果！
