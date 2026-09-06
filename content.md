好的，我们已经完成了 3D 分形截面感知卡片 (`spatial_fractal`) 的全部代码编写、Linter 静态检查修复及 Vite 分包优化。现在可以为这些变更创建一个干净的 Git 提交。

## [COMMIT] feat(cards): 实现 3D 分形截面感知 (spatial_fractal) 实验性训练卡片

### 用户需求
将 3D 分形截面感知原型转化为 FormSight 的标准实验性训练卡片，通过动态 Code Splitting 引入 Three.js，实现首屏零开销和高精度的 2D/3D 空间几何互动训练。

### 评论
该模块成功拓宽了 FormSight 在三维立体空间与局域曲率解析领域的训练边界。通过自研轻量 Vec3 数学向量层与 Three.js 异步按需加载，完美兼顾了严苛的 Bundle 体积优化与炫酷的 WebGL 视觉体验。

### 目标
1. 提交 `spatial_fractal` 卡片的全部新增源码及组件实现。
2. 提交对 `vite.config.ts` 的 `manualChunks` 代码分包优化配置。

### 基本原理
将所有新增文件添加到暂存区，并进行规范的 Conventional Commits 提交，确保历史图谱的语义化与可追踪性。

### 标签
#intent/build #flow/ready #priority/high 
#comp/engine #concept/executor #scope/core 
#ai/instruct 
#task/domain/cards #task/object/spatial-fractal #task/action/implementation #task/state/end

---

### Script

#### Acts 1: 添加新文件到 Git 暂存区

~~~~~act
git_add
src/cards/spatial_fractal/types.ts
src/cards/spatial_fractal/locales/zh-CN.json
src/cards/spatial_fractal/locales/en-US.json
src/cards/spatial_fractal/utils/sdf.ts
src/cards/spatial_fractal/utils/generator.ts
src/cards/spatial_fractal/hooks/useThreeLoader.ts
src/cards/spatial_fractal/components/Fractal3DViewport.tsx
src/cards/spatial_fractal/components/OptionCanvas.tsx
src/cards/spatial_fractal/SpatialFractalView.tsx
src/cards/spatial_fractal/index.tsx
vite.config.ts
~~~~~

#### Acts 2: 提交代码变更

~~~~~act
git_commit
~~~~~
~~~~~text
feat(cards): Implement spatial_fractal 3D fractal cross-section training module

- Adds the 'spatial_fractal' card to explore 3D fractal morphologies and 2D cross-section matching.
- Implements dynamic loading (Code Splitting) for Three.js via 'useThreeLoader' to guarantee zero initial bundle overhead.
- Separates pure SDF math calculations from WebGL rendering to keep the question generation pipeline lightweight.
- Configures Rollup manualChunks in vite.config.ts to isolate Three.js into a dedicated 'vendor-three' chunk.
- Fully adheres to system Linter rules with strict type checking and performance loops.
~~~~~

### 下一步建议
- **真机/多浏览器测试**：可以在不同设备或移动端浏览器上验证 WebGL 的初始化表现与内存释放情况。
- **扩展卡片变体**：后续可考虑引入更多维度的 SDF 切片方向（如斜切面、多段截面连续动画）。
