收到。在开启调试视图时，半透明的 3D 母体确实可能会在某些视角下遮挡切片平面。将其完全隐藏 (`visible = false`) 是更彻底、更清晰的调试方案。

我将使用 `patch_file` 进行更新。

---

## [WIP] fix(prototype): 在调试视图中完全隐藏 3D 母体物体以避免遮挡截面

### 错误分析
在之前的实现中，开启“截面贴图调试视图”时，3D 母体物体仅被设置为低透明度（`opacity: 0.15`）。由于 Three.js 的半透明渲染排序（Sorting）及物体本身的体积遮挡，在某些交互视角下，母体表面的半透明片段仍然会干扰或遮蔽切片平面上的 2D 贴图。
**解决方案**：将 3D 母体网格的 `visible` 属性在调试模式下设为 `false`，彻底关闭其渲染，使切片平面和红蓝定向边框 100% 无遮挡呈现。

### 用户需求
当勾选调试视图时，3D 视口中的完整分形母体应完全不显示（隐藏），只保留切片平面及其 2D 截面贴图和定向坐标轴。

### 评论
彻底隐藏母体能够提供绝对纯净的截面观察视角，非常利于校验切片位置与 4-AFC 选项的几何对应关系。

### 目标
1. 修改 `createFractal3DMesh` 函数，在 `debugTextureMode` 为真时将 `fractalMesh.visible` 设置为 `false`。
2. 确保关闭调试视图时恢复正常渲染。

### 基本原理
直接通过 Three.js 对象的 `visible` 属性控制渲染管线裁剪，比单纯调整材质透明度更干净且无渲染排序开销。

### 标签
#intent/fix #flow/ready #priority/high #comp/docs #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/fractal-section-prototype #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 使用 patch_file 完全隐藏调试视图下的 3D 母体

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~html.old
      const mat = new THREE.MeshStandardMaterial({
        color: debugTextureMode ? 0x312e81 : 0x4f46e5,
        roughness: 0.35,
        metalness: 0.15,
        transparent: true,
        opacity: debugTextureMode ? 0.15 : 1.0,
        flatShading: level > 8
      });

      fractalMesh = new THREE.Mesh(geom, mat);
      scene.add(fractalMesh);
~~~~~
~~~~~html.new
      const mat = new THREE.MeshStandardMaterial({
        color: 0x4f46e5,
        roughness: 0.35,
        metalness: 0.15,
        flatShading: level > 8
      });

      fractalMesh = new THREE.Mesh(geom, mat);
      fractalMesh.visible = !debugTextureMode;
      scene.add(fractalMesh);
~~~~~

### 下一步建议
1. 刷新浏览器并勾选 `🔧 截面贴图调试视图`，此时 3D 母体将完全不可见，只展示带有 2D 剖面贴图、红蓝方位边框和法向箭头的切片平面。
2. 尽情旋转和缩放视角，进行最精细的对齐验证。
