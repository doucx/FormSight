我找到了原因：当开启“截面贴图调试视图”时，`renderSectionToCanvas` 生成的 2D 贴图本身已经在 Canvas 上绘制了红色的顶边框和蓝色的左边框；而 `updateCuttingPlaneVisual` 又在 3D 空间中额外添加了 `topEdgeLine` (红) 和 `leftEdgeLine` (蓝) 这两条 3D 几何线条，导致线条与贴图边框重叠渲染（多出了一条红线）。

我将使用 `patch_file` 修复此重复渲染问题，使红蓝定向边框仅在非调试模式下作为 3D 辅助线渲染。

---

## [WIP] fix(prototype): 修复调试视图下红蓝定向边框重复渲染问题

### 错误分析
1. **重复渲染根因**：
   - 在标准模式下（`debugTextureMode === false`），切片平面是纯绿色的，因此需要通过 3D 几何线条 `topEdgeLine` (红) 和 `leftEdgeLine` (蓝) 来标注 U 轴和 V 轴的定向。
   - 在调试模式下（`debugTextureMode === true`），切片平面加载了 2D 贴图，而该贴图本身就在 Canvas 像素级绘制了红色的顶边和蓝色的左边。
   - 代码中无条件地将 `topEdgeLine` 和 `leftEdgeLine` 添加到了 `planeHelper` 中，导致贴图自带的边框与 3D 几何线条重叠，产生视觉上的“多了一条红线”现象。
2. **解决方案**：将 3D 红蓝边框线的创建包裹在 `if (!debugTextureMode)` 条件判断中。

### 用户需求
消除勾选“截面贴图调试视图”时多渲染出来的一条红色/蓝色辅助边框线。

### 评论
通过条件控制，确保 3D 辅助线条与 2D 贴图自带边框互斥，保持画面干净整洁。

### 目标
修改 `updateCuttingPlaneVisual`，使 `topEdgeLine` 和 `leftEdgeLine` 仅在关闭调试模式时渲染。

### 基本原理
2D 贴图与 3D 几何辅助物件在不同视图模式下各司其职，避免重复绘制带来的 Z-fighting 或线条加粗。

### 标签
#intent/fix #flow/ready #priority/high #comp/docs #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/fractal-section-prototype #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 使用 patch_file 限制 3D 红蓝边框线仅在非调试模式下渲染

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~html.old
      // 默认绿色外框
      const edges = new THREE.EdgesGeometry(planeGeom);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 }));
      planeHelper.add(line);

      // 在绿色截面正方形的顶边 and 左边渲染对应的红、蓝定向边框提示
      const topEdgeGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfSize, halfSize, 0.002),
        new THREE.Vector3(halfSize, halfSize, 0.002)
      ]);
      const topEdgeLine = new THREE.Line(topEdgeGeom, new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 4 }));
      planeHelper.add(topEdgeLine);

      const leftEdgeGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfSize, -halfSize, 0.002),
        new THREE.Vector3(-halfSize, halfSize, 0.002)
      ]);
      const leftEdgeLine = new THREE.Line(leftEdgeGeom, new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 4 }));
      planeHelper.add(leftEdgeLine);

      // 法向量指示箭头
      const arrow = new THREE.ArrowHelper(q.normal, new THREE.Vector3(0,0,0), 0.65, 0x10b981, 0.15, 0.1);
      planeHelper.add(arrow);
~~~~~
~~~~~html.new
      // 默认绿色外框
      const edges = new THREE.EdgesGeometry(planeGeom);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 }));
      planeHelper.add(line);

      // 仅在非调试模式下渲染 3D 辅助红蓝定向边框（调试模式下贴图本身已包含红蓝边框）
      if (!debugTextureMode) {
        const topEdgeGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-halfSize, halfSize, 0.002),
          new THREE.Vector3(halfSize, halfSize, 0.002)
        ]);
        const topEdgeLine = new THREE.Line(topEdgeGeom, new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 4 }));
        planeHelper.add(topEdgeLine);

        const leftEdgeGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-halfSize, -halfSize, 0.002),
          new THREE.Vector3(-halfSize, halfSize, 0.002)
        ]);
        const leftEdgeLine = new THREE.Line(leftEdgeGeom, new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 4 }));
        planeHelper.add(leftEdgeLine);
      }

      // 法向量指示箭头
      const arrow = new THREE.ArrowHelper(q.normal, new THREE.Vector3(0,0,0), 0.65, 0x10b981, 0.15, 0.1);
      planeHelper.add(arrow);
~~~~~

### 下一步建议
1. 刷新浏览器并再次切换 `🔧 截面贴图调试视图`。
2. 确认多余的重复红线已消失，切片平面的贴图与边框显示干净利落。
