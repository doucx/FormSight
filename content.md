好的，我已为您准备好为 FormSight 项目配置 PWA（Progressive Web App）完整支持的实施计划。

我们将通过 `vite-plugin-pwa` 插件为项目提供 Service Worker 自动注册与预缓存管理，并配置完整的 Web App Manifest、移动端适配 Meta 标签以及高保真矢量应用图标，使 FormSight 具备离线免网运行和桌面/移动端一键安装（Add to Home Screen）能力。

## [WIP] feat(pwa): 为 FormSight 配置渐进式 Web 应用 (PWA) 支持

### 用户需求
为 FormSight 引入 PWA (Progressive Web App) 支持，使得应用可以安装到桌面与移动端主屏幕，且在完全断网时仍能依靠 Service Worker 与 IndexedDB 实现 100% 离线独立运行。

### 评论
FormSight 核心机制原本即为纯前端算法驱动与 IndexedDB 本地持久化（Offline-First）。配置 PWA 能够将这一离线优势发挥到极致，不仅消除了网络波动对快速作答心流的影响，还能提供原生应用般的独立视口体验（去除浏览器地址栏与导航干扰）。

### 目标
1. 安装 `vite-plugin-pwa` 依赖。
2. 创建 `public/favicon.svg` 品牌图标，作为 PWA 应用图标与 Favicon。
3. 在 `vite.config.ts` 中集成并配置 `VitePWA` 插件，定义 Manifest（名称、主题色、展示模式、图标）及 Workbox 资源预缓存策略。
4. 在 `index.html` 中添加 PWA 移动端与主题元标签（`theme-color`、`apple-mobile-web-app-capable` 等）。

### 基本原理
- **`vite-plugin-pwa` 自动注入**：利用 Vite 编译流水线自动生成 Service Worker (`sw.js`) 与 Manifest (`manifest.webmanifest`)，并支持 `autoUpdate` 无感更新。
- **相对路径适配**：Manifest 与静态资源配置为相对路径，完美兼容 GitHub Pages 等子目录部署环境。
- **SVG Maskable 图标**：使用 SVG 格式矢量图，支持 `any` 与 `maskable`，自适应不同操作系统（Android/iOS/Windows/macOS）的应用图标裁剪。

### 标签
#intent/build #flow/ready #priority/high #comp/build #comp/cli #concept/executor #concept/config #scope/ux #scope/dx #ai/instruct #task/domain/pwa #task/object/service-worker-manifest #task/action/integration #task/state/begin #task/status/active

---

### Script

#### Acts 1: 安装 vite-plugin-pwa 依赖

在 `package.json` 中声明 `vite-plugin-pwa` 并执行依赖安装。

~~~~~act
patch_file
package.json
~~~~~
~~~~~json.old
    "typescript": "^5.2.2",
    "vite": "^5.1.4",
    "vitest": "^1.3.1"
  }
}
~~~~~
~~~~~json.new
    "typescript": "^5.2.2",
    "vite": "^5.1.4",
    "vite-plugin-pwa": "^0.19.8",
    "vitest": "^1.3.1"
  }
}
~~~~~

~~~~~act
run_command
~~~~~
~~~~~
npm install
~~~~~

#### Acts 2: 创建应用专属矢量图标

在 `public/` 目录下创建 `favicon.svg`，融合准星焦点、造型四芒星与感知色相渐变设计。

~~~~~act
write_file
public/favicon.svg
~~~~~
~~~~~xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="50%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#4338CA" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#A855F7" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#312E81" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- 背景底板 -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />

  <!-- 外围辅助透视与准星环 -->
  <circle cx="256" cy="256" r="160" fill="none" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="6" stroke-dasharray="16 12" />
  <circle cx="256" cy="256" r="96" fill="none" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="4" />

  <!-- 正交准星轴线 -->
  <line x1="256" y1="64" x2="256" y2="128" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="6" stroke-linecap="round" />
  <line x1="256" y1="384" x2="256" y2="448" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="6" stroke-linecap="round" />
  <line x1="64" y1="256" x2="128" y2="256" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="6" stroke-linecap="round" />
  <line x1="384" y1="256" x2="448" y2="256" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="6" stroke-linecap="round" />

  <!-- 核心视知觉四芒星主体 -->
  <path d="M 256 128 Q 256 256 384 256 Q 256 256 256 384 Q 256 256 128 256 Q 256 256 256 128 Z" fill="url(#glowGrad)" filter="url(#shadow)" />
  <path d="M 256 160 Q 256 256 352 256 Q 256 256 256 352 Q 256 256 160 256 Q 256 256 256 160 Z" fill="#FFFFFF" fill-opacity="0.9" />

  <!-- 中心高亮目标靶心 -->
  <circle cx="256" cy="256" r="16" fill="#4F46E5" />
  <circle cx="256" cy="256" r="8" fill="#FFFFFF" />
</svg>
~~~~~

#### Acts 3: 在 Vite 配置中集成 VitePWA 插件

在 `vite.config.ts` 中配置 PWA manifest 与 workbox 缓存规则。

~~~~~act
write_file
vite.config.ts
~~~~~
~~~~~typescript
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FormSight - 视觉造型构图与色彩感知强化系统',
        short_name: 'FormSight',
        description: '基于视知觉心理学、OKLab 感知色彩空间与几何拓扑建模的自适应视觉与手眼协调强化训练系统',
        theme_color: '#4F46E5',
        background_color: '#F8FAFC',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt}'],
      },
    }),
  ],
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

#### Acts 4: 更新 index.html 补充 PWA 元信息

在 `index.html` 中配置 `theme-color`、iOS 苹果桌面应用以及图标声明。

~~~~~act
write_file
index.html
~~~~~
~~~~~html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <link rel="apple-touch-icon" href="./favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#4F46E5" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="FormSight" />
    <title>FormSight - 视觉造型构图与色彩感知强化训练系统</title>
    <meta name="description" content="基于视知觉认知与色彩空间建模的自适应视觉与手眼协调强化训练系统" />
  </head>
  <body class="bg-gray-50 text-gray-900 antialiased min-h-screen">
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
~~~~~

### 下一步建议
1. **执行构建验证**：运行 `npm run build`，检查构建日志中 `vite-plugin-pwa` 是否成功生成 `sw.js` 与 `manifest.webmanifest` 产物。
2. **离线测试**：通过 `npm run preview` 启动本地服务，在 Chrome DevTools 的 **Application -> Service workers / Manifest** 中检查 PWA 安装横幅，并在 **Network -> Offline** 模式下验证断网可玩性。
