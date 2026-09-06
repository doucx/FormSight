高难度下 3D 分形物体未能完全跟随算法演化的根本原因是网格几何精度（三角形密度）不足。通过引入动态细分策略，可以完美解决高频分形和孔洞的几何表达。

## [WIP] fix(prototype): 动态提升分形 3D 网格细分精度以适配高难度算法

### 错误分析

在高难度（Lv.20-35）下，SDF 评估函数引入了高频 FBM 噪声、局部孔洞穿透与混沌突刺。然而原先的代码中，网格细分级别被静态限制在 `detail = 5`（顶点数约 10,242）。当局部几何特征的波长小于网格采样间距时，顶点采样将发生严重失真（Aliasing），使得孔洞和微观分形成为主观上的“平滑表面变形缺失”。

### 用户需求
用户希望在高难度下，3D 视口中的几何形态能够精确、细腻地跟随算法演化（展现出真实的负空间空腔、多棱角折叠与分形突刺）。

### 评论
该修复直接提升了 3D 空间形态感知原型的拟真度与视觉反馈质量，对高难度关卡的辨识度有决定性影响。

### 目标
1. 分析 `fractal_section_prototype.html` 中 `createFractal3DMesh` 函数的网格生成逻辑。
2. 将固定的 `detail` 逻辑改造为随 `level` 动态调整的阶梯式细分策略（Lv.1-8: 4级; Lv.9-18: 5级; Lv.19-28: 6级; Lv.29-35: 7级）。
3. 确保在极致难度下拥有足够的顶点密度（高达 ~16 万顶点），以完美呈现分形空腔与突刺。

### 基本原理
Three.js 的 `IcosahedronGeometry` 顶点数随细分级数呈 $4^{\text{detail}}$ 增长。通过根据 `level` 分段扩大切片细分度，我们既能在低难度下保持极高的帧率流畅度，又能在高难度下提供媲美真实光线步进（Raymarching）网格的丰富细节。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/fractal-mesh #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 升级网格细分精度逻辑

修改 `playground/fractal_section_prototype.html` 中的 `createFractal3DMesh` 函数，实现随难度动态递增的网格细分策略。

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~html.old
    function createFractal3DMesh(level) {
      if (fractalMesh) scene.remove(fractalMesh);

      const detail = level <= 8 ? 4 : 5;
      const geom = new THREE.IcosahedronGeometry(1.2, detail);
      const pos = geom.attributes.position;
~~~~~
~~~~~html.new
    function createFractal3DMesh(level) {
      if (fractalMesh) scene.remove(fractalMesh);

      // 根据难度动态调整 icosahedron 网格细分级别，确保高难度下能够捕捉高频分形与孔洞突刺细节
      const detail = level <= 8 ? 4 : (level <= 18 ? 5 : (level <= 28 ? 6 : 7));
      const geom = new THREE.IcosahedronGeometry(1.2, detail);
      const pos = geom.attributes.position;
~~~~~

### 下一步建议

- **性能验证**: 建议在浏览器中拖动难度滑块至 Lv.35（混沌分形），观察帧率表现，确保细分到 7 级（~16w 顶点）时 Three.js 的顶点位移计算依然保持丝滑。
- **视觉复核**: 确认多孔和负空间穿透在 3D 模型表面清晰可见。如果确认无误，后续可进行 Git 提交。
