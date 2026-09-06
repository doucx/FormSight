简要回答
我已经看到了你的 `vite.config.ts` 文件。为了完美遵循开头我们设定的“首屏零开销（Zero Initial Overhead）”架构原则，我们需要通过 Rollup 的 `manualChunks` 将 `Three.js` 单独打包为一个独立的 chunk。

这样当用户在首页或使用其他 2D 卡片时，浏览器绝不会预先下载这部分 3D 渲染内核代码，直到用户首次点开 `spatial_fractal` 实验性卡片时才会按需加载。

## [WIP] feat: 优化 vite.config.ts 配置，为 Three.js 引入独立 ManualChunk 懒加载缓存包

### 用户需求
在现有的 `vite.config.ts` 基础上，增加 Rollup 的 `manualChunks` 规则，将 `three` 库自动分离到 `vendor-three` 独立文件块中。

### 评论
在单页面应用（SPA）中引入 WebGL 3.0 或 Three.js 往往会带来超过 500KB 的未压缩依赖。通过 `manualChunks` 隔离，可以确保主入口 JS 保持极其轻量，提升 PWA 的全网加载速度与移动端体验。

### 目标
在 `vite.config.ts` 的 `build.rollupOptions.output` 中增加针对 `node_modules/three` 的分块策略。

### 标签
#intent/build #flow/ready #priority/high #comp/build #concept/config #scope/dx #ai/instruct #task/domain/cards #task/object/vite-config #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 修改 vite.config.ts 增加 Three.js 代码分包策略

通过 `patch_file` 精确向 `vite.config.ts` 中注入 `build.rollupOptions.output.manualChunks` 配置。

~~~~~act
patch_file
vite.config.ts
~~~~~
~~~~~typescript.old
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
~~~~~
~~~~~typescript.new
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
~~~~~

### 下一步建议
我们已经完成了 3D 分形截面感知卡片 (`spatial_fractal`) 的全部核心开发、Bug 修复以及 Vite 代码分包（Code Splitting）策略。
你可以通过运行 `npm run build` 验证打包产物中是否成功生成了独立的 `vendor-three` 文件块，并在网页端体验顺滑的 3D 难度自适应训练！
