没问题。我将生成一个计划，修正 `fractal_section_prototype.html` 中的 Y 轴映射方向、纹理二次翻转问题、3D 辅助平面物理尺寸以匹配采样范围，并修正界面上的定向边框说明文案。

## [WIP] fix(prototype): 修正 3D 分形截面感知原型的坐标映射、尺寸偏差与纹理翻转

### 用户需求
用户指出截面调试视图的红蓝定向边框和不勾选时是反的，3D 物体与截面存在微小的缩放偏差，且需要从下往上看才能对齐。需要修复 2D 采样坐标系与 3D 局部坐标系的映射关系，统一渲染网格尺寸，去除多余的纹理翻转，并修正 UI 标签文案。

### 评论
这是一个精准定位到 Three.js 坐标系与 Canvas 2D 坐标系差异的修复，能够极大地提升用户的交互体验和直觉。

### 目标
1. 修改 `renderSectionToCanvas` 中的 `vFrac` 计算，引入负号以对齐 Canvas 顶部与 3D 的 +V 方向。
2. 将 `updateCuttingPlaneVisual` 中的 `planeSize` 从 2.8 调整为 3.1，与采样范围 `span * 2` 完全对齐。
3. 移除 `updateCuttingPlaneVisual` 中不必要的 `texture.repeat.set(1, -1)`，防止二次翻转。
4. 修正 HTML 中的定向边框图例说明文案。

### 基本原理
通过对齐坐标系（Canvas Top = +V = 3D Plane Local Top）并保持物理尺寸一致（3.1 对应 3.1），消除缩放偏差和方向反转，使调试视图贴图与实时渲染的 3D 辅助框完美重合。

### 标签
#intent/fix #flow/ready #priority/high #comp/docs #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/fractal-section-prototype #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 fractal_section_prototype.html 中的坐标映射与缩放偏差

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~old
        <div class="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"></span> U轴定向 (顶边)</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span> V轴定向 (左边)</span>
          <span class="text-slate-500">4-AFC (1-4)</span>
        </div>
~~~~~
~~~~~new
        <div class="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"></span> 顶边定向 (V轴+)</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span> 左边定向 (U轴-)</span>
          <span class="text-slate-500">4-AFC (1-4)</span>
        </div>
~~~~~

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~old
      for (let py = 0; py < size; py++) {
        let vFrac = (py / size - 0.5) * 2 * span;
        for (let px = 0; px < size; px++) {
~~~~~
~~~~~new
      for (let py = 0; py < size; py++) {
        // 画布从上到下(py增加)，对应 3D 局部坐标的 +V 到 -V，因此需要取负号
        let vFrac = -(py / size - 0.5) * 2 * span;
        for (let px = 0; px < size; px++) {
~~~~~

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~old
    function updateCuttingPlaneVisual(q) {
      if (planeHelper) scene.remove(planeHelper);

      const planeSize = 2.8;
      const halfSize = planeSize / 2;
      const planeGeom = new THREE.PlaneGeometry(planeSize, planeSize);
      
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
~~~~~
~~~~~new
    function updateCuttingPlaneVisual(q) {
      if (planeHelper) scene.remove(planeHelper);

      const planeSize = 3.1;
      const halfSize = planeSize / 2;
      const planeGeom = new THREE.PlaneGeometry(planeSize, planeSize);
      
      let planeMat;
      if (debugTextureMode) {
        // 创建离屏 Canvas 生成截面纹理
        const texCanvas = document.createElement('canvas');
        texCanvas.width = 256;
        texCanvas.height = 256;
        const correctCfg = q.configs.find(c => c.type === 'CORRECT') || q.configs[0];
        renderSectionToCanvas(texCanvas, correctCfg, q.level);

        const texture = new THREE.CanvasTexture(texCanvas);
        // CanvasTexture 默认启用 flipY=true，无需再使用 repeat 进行垂直翻转
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
~~~~~

### 下一步建议

- 建议在浏览器中重新加载 `fractal_section_prototype.html`，验证勾选与不勾选“🔧 截面贴图调试视图”时，红蓝边框是否完全一致，且 3D 物体与截面贴图是否完全无缩放偏差。
