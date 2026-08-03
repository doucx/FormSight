好，我们将开始初始化 **Vite + Preact + TypeScript + Tailwind CSS** 的脚手架项目结构和配置文件。

我会创建所有必需的配置文件和基础代码结构，不执行任何 `npm` 命令。生成完成后，你只需在终端运行 `npm install` 即可安装依赖。

## [WIP] feat: 初始化 Vite + Preact + TypeScript 项目基础脚手架

### 用户需求
创建“寻星练习 (Star-Hopping)”网页项目的脚手架文件，包含目录结构、Vite 部署配置、Preact 核心配置、TypeScript 类型声明、Tailwind CSS 配置以及 `.gitignore`，且不执行任何 `npm` 安装命令。

### 评论
这是 Phase 1 路线图的第一步。建立干净、完备的现代化 Preact + TypeScript 架构，配置好 Tailwind CSS 和 IDB 支持，能为后续几何算法库与 Canvas 交互组件开发打下扎实的基础。

### 目标
1. 创建脚手架描述文件 `package.json`（包含 Preact, Tailwind, IDB, Lucide 图标等依赖定义）。
2. 创建 TypeScript 配置文件 `tsconfig.json` 与 `tsconfig.node.json`。
3. 创建 Vite 配置文件 `vite.config.ts`（包含 `@preact/preset-vite` 预设）。
4. 配置 Tailwind CSS 样式文件（`tailwind.config.js` 与 `postcss.config.js`）。
5. 创建基础代码入口（`index.html`, `src/main.tsx`, `src/app.tsx`, `src/index.css`）。
6. 配置 `.gitignore` 过滤项。

### 基本原理
采用 Vite 官方推荐的 Preact+TS 项目模板结构，结合 Tailwind CSS 3.x 进行快速 UI 开发。`package.json` 中配置了预期的核心依赖（`preact`, `idb`, `lucide-preact`），开发者只需在脚本文件写入后执行 `npm install` 即可完成本地环境构建。

### 标签
#intent/build #flow/ready #priority/high #comp/build #comp/interfaces #scope/dx #ai/instruct #task/domain/setup #task/object/vite-preact-scaffold #task/action/init #task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建配置文件与入口代码

创建 Git 忽略配置文件 `.gitignore`。

~~~~~act
write_file
.gitignore
~~~~~
~~~~~text
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
~~~~~

创建项目依赖配置文件 `package.json`。

~~~~~act
write_file
package.json
~~~~~
~~~~~json
{
  "name": "star-hopping",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "idb": "^8.0.0",
    "lucide-preact": "^0.344.0",
    "preact": "^10.19.6"
  },
  "devDependencies": {
    "@preact/preset-vite": "^2.8.2",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.4"
  }
}
~~~~~

创建 TypeScript 主配置文件 `tsconfig.json`。

~~~~~act
write_file
tsconfig.json
~~~~~
~~~~~json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
~~~~~

创建 TypeScript 节点配置文件 `tsconfig.node.json`。

~~~~~act
write_file
tsconfig.node.json
~~~~~
~~~~~json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
~~~~~

创建 Vite 配置文件 `vite.config.ts`。

~~~~~act
write_file
vite.config.ts
~~~~~
~~~~~typescript
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
});
~~~~~

创建 PostCSS 配置文件 `postcss.config.js`。

~~~~~act
write_file
postcss.config.js
~~~~~
~~~~~javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
~~~~~

创建 Tailwind CSS 配置文件 `tailwind.config.js`。

~~~~~act
write_file
tailwind.config.js
~~~~~
~~~~~javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#FFFFFF',
          border: '#EEEEEE',
          dot: '#000000',
          grid: '#888888',
          highlight: '#00AA00',
          error: '#FF0000',
        }
      }
    },
  },
  plugins: [],
}
~~~~~

创建 HTML 入口文件 `index.html`。

~~~~~act
write_file
index.html
~~~~~
~~~~~html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>寻星练习 (Star-Hopping)</title>
  </head>
  <body class="bg-gray-50 text-gray-900 antialiased min-h-screen">
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
~~~~~

创建 Vite 环境声明文件 `src/vite-env.d.ts`。

~~~~~act
write_file
src/vite-env.d.ts
~~~~~
~~~~~typescript
/// <reference types="vite/client" />
~~~~~

创建 Tailwind 入口样式文件 `src/index.css`。

~~~~~act
write_file
src/index.css
~~~~~
~~~~~css
@tailwindcss base;
@tailwindcss components;
@tailwindcss utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  user-select: none;
}
~~~~~

创建应用根入口文件 `src/main.tsx`。

~~~~~act
write_file
src/main.tsx
~~~~~
~~~~~typescript
import { render } from 'preact';
import { App } from './app';
import './index.css';

render(<App />, document.getElementById('app')!);
~~~~~

创建 Preact 根组件 `src/app.tsx`。

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
export function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          📐 寻星练习 (Star-Hopping)
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          基于空间拓扑与自适应难度的造型眼力训练系统
        </p>
      </header>

      <main className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 font-medium">项目初始化完成</p>
          <p className="text-xs text-gray-400 mt-1">下一步：开发几何计算库与双 Canvas 渲染组件</p>
        </div>
      </main>
    </div>
  );
}
~~~~~

---

### 下一步建议

脚手架文件已经全部创建完毕！请你在终端运行以下命令进行依赖安装并启动开发服务器：

```bash
npm install
npm run dev
```

在确认项目正常启动后，我们可以开始 **Phase 1** 的下一个步骤：**编写核心几何推演与算法库 `src/utils/geometry.ts`**（包含坐标旋转、极坐标算子、动态点阵与 Hit Detection 判定计算）。
