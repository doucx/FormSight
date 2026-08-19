好的，我已为您准备好为 FormSight 项目配置 GitHub Pages 自动化部署的执行计划。

我们将执行以下两个操作：
1. 修改 `vite.config.ts`，配置 `base: './'`，确保构建出的静态资源能够使用相对路径在 GitHub Pages 子路径下正常加载。
2. 创建 `.github/workflows/deploy.yml` 工作流文件，配置监听 `v*` tag 推送事件，并通过官方 GitHub Pages Actions 进行自动构建与部署。

## [WIP] feat(ci): 添加 GitHub Pages 自动部署工作流并配置 Vite 相对路径

### 用户需求
1. 在 `vite.config.ts` 中配置相对路径 `base: './'`，以适配 GitHub Pages 的子路径部署。
2. 创建 GitHub Actions 工作流，监听 `v*` 格式的 tag 推送事件（例如 `v0.2.7`），触发自动构建并将 `dist` 产物部署至 GitHub Pages。

### 评论
这是一个标准且规范的发布工作流设计。通过 tag 触发部署既能确保发布版本的确定性与可追溯性，又与项目目前的 semantic versioning 风格保持一致；设置相对路径可以避免部署到 `https://<user>.github.io/<repo>/` 时因静态资源绝对路径导致的 404 问题。

### 目标
1. 在 `vite.config.ts` 的 `defineConfig` 中添加 `base: './'`。
2. 新建 `.github/workflows/deploy.yml` 文件，定义基于 Node.js 20、npm ci、npm run build 以及 GitHub Pages 部署 Action 的自动化流水线。

### 基本原理
- **Vite Base 路径**：默认情况下 Vite 使用绝对路径 `/`，在 GitHub Pages 仓库为子路径时会导致引用错误，配置为 `./` 能生成相对路径引用。
- **GitHub Pages 官方 Action 套件**：使用 `actions/configure-pages@v5`、`actions/upload-pages-artifact@v3` 和 `actions/deploy-pages@v4`，符合 GitHub 推荐的现代 Pages 部署标准（无需手动维护 `gh-pages` 分支）。

### 标签
#intent/tooling #flow/ready #priority/high #comp/build #concept/executor #scope/dx #ai/instruct #task/domain/ci #task/object/github-pages-workflow #task/action/integration #task/state/begin #task/status/active

---

### Script

#### Acts 1: 配置 Vite 的 base 路径为相对路径

我们在 `vite.config.ts` 的配置中添加 `base: './'` 选项。

~~~~~act
patch_file
vite.config.ts
~~~~~
~~~~~typescript.old
export default defineConfig({
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
~~~~~
~~~~~typescript.new
export default defineConfig({
  base: './',
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
~~~~~

#### Acts 2: 创建 GitHub Actions Pages 部署工作流

新建 `.github/workflows/deploy.yml` 文件，配置针对 `v*` tag 的自动化构建与发布流程。

~~~~~act
write_file
.github/workflows/deploy.yml
~~~~~
~~~~~yaml
name: Deploy to GitHub Pages

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
~~~~~

### 下一步建议
1. **本地验证构建**：在本地运行 `npm run build` 确保 `dist/` 目录正常生成且产物引用路径均为相对路径。
2. **启用 Pages 权限**：进入 GitHub 仓库的 **Settings -> Pages**，将 **Build and deployment -> Source** 设置为 **GitHub Actions**。
3. **推送 Tag 触发发布**：提交本次修改后，通过 `git tag v0.2.7 && git push origin v0.2.7` 触发首次自动化部署。
