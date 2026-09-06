你的分析非常精准。错误原因在于：在 `updateCuttingPlaneVisual(q)` 中调用 `renderSectionToCanvas` 时，传入的是整个 `currentQuestion` 对象（其属性为 `planeCenter`, `uVec`, `vVec`），而 `renderSectionToCanvas` 内部期望接收的是带有 `center`, `u`, `v` 属性的 `config` 对象（即正确答案的配置项），导致 `config.center` 为 `undefined` 从而引发 `TypeError`。

我将使用 `patch_file` 修复此参数传递错误。

---

## [WIP] fix(prototype): 修复调试视图中调用 renderSectionToCanvas 的参数对象不匹配错误

### 错误分析
当用户勾选“截面贴图调试视图”时，`updateCuttingPlaneVisual` 触发并尝试渲染切面纹理。代码中直接将 `currentQuestion` 对象（形参名为 `q`）传给了 `renderSectionToCanvas(texCanvas, q, q.level)`。
1. **属性名不一致**：`currentQuestion` 的属性为 `planeCenter`、`uVec`、`vVec`；而 `renderSectionToCanvas` 内部访问的是 `config.center`、`config.u`、`config.v`。
2. **异常触发**：由于 `config.center` 获取不到，其值为 `undefined`，随后执行 `config.center.clone()` 时抛出 `TypeError: Cannot read properties of undefined (reading 'clone')`。
3. **解决方案**：应从 `q.configs` 中提取出属于正确答案的配置项（`type === 'CORRECT'`），或者传入结构匹配的对象。

### 用户需求
修复勾选调试视图时触发的 TypeError 异常，确保切面纹理可以正确投射到 3D 切片平面上。

### 评论
这是一个清晰的属性契约不匹配问题。通过获取 `q.configs.find(c => c.type === 'CORRECT')` 作为正确的渲染配置传入，即可完美解决。

### 目标
1. 修改 `playground/fractal_section_prototype.html` 中 `updateCuttingPlaneVisual` 函数内的 `renderSectionToCanvas` 调用。
2. 确保传入的是标准的 config 对象（包含 `center`, `u`, `v`）。

### 基本原理
通过在 `updateCuttingPlaneVisual` 中定位正确答案的配置对象 `correctCfg` 并传入 `renderSectionToCanvas`，保持了与 4-AFC 选项渲染完全一致的几何定义。

### 标签
#intent/fix #flow/ready #priority/high #comp/docs #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/fractal-section-prototype #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 使用 patch_file 修复 updateCuttingPlaneVisual 中的参数传递

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
        renderSectionToCanvas(texCanvas, q, q.level);

        const texture = new THREE.CanvasTexture(texCanvas);
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
~~~~~

### 下一步建议
1. 刷新浏览器页面，重新勾选 `🔧 截面贴图调试视图`。
2. 验证 3D 切片平面上是否已成功渲染出高清的 2D 剖面贴图，并可配合旋转视角观察对齐效果。
