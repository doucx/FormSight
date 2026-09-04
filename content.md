我们将立即实施阻塞式初始化方案：在 HTML `<head>` 注入防闪烁同步内联脚本、重构 `main.tsx` 实现 IndexedDB 数据库与全局 Signal Store 完全就绪后再渲染 Preact 组件，并移除首屏根容器变色动画与组件内滞后的异步加载。

## [WIP] fix: 实现阻塞式初始化以彻底解决首屏主题闪烁与变色动画问题

### 错误分析

1. **Store 初始化滞后于首次渲染**：`$settings`、`$activePlan` 和 `$profiles` 的异步加载此前位于 `useAppBootstrap` 的 `useEffect` 中。组件首次挂载时，`$settings` 仍处于静态默认值（`theme: 'system'`）。当系统为深色模式时，界面首先以深色渲染，数毫秒后异步读取到用户的浅色配置才切换，造成视觉跳变。
2. **全局 CSS 颜色插值动画**：`src/app.tsx` 根容器声明了 `transition-colors duration-200`，当主题类名在首屏渲染后被剥离或变动时，触发了 200ms 的背景变色动画，产生“先暗后亮”的渐变感。
3. **HTML 静态类名与初始解析空窗期**：`index.html` 的 `<body>` 写死了浅色类名 `bg-gray-50`，且 `<head>` 中缺乏同步读取 `localStorage` 缓存的内联脚本，导致 DOM 解析早期阶段无法以正确的主题着色。

### 用户需求

在 IndexedDB 数据完全加载就绪、主题与语言均已应用到 DOM 之前，绝不挂载渲染 Preact 界面（真正的阻塞式初始化），打开应用时必须直接呈现正确的主题，杜绝任何过渡变色动画与模式闪烁。

### 评论

这是一个非常关键的用户体验（UX/DX）优化。单页应用（SPA）在从异步本地存储（如 IndexedDB）还原用户个性化主题配置时，极易因首屏渲染超前于持久化数据就绪而产生“Flash of Incorrect Theme (FOIT)”。通过结合 `<head>` 级的轻量同步脚本拦截与主入口的异步阻塞挂载，可以在维持现代响应式状态库的同时达到原生应用的稳定展现。

### 目标

1. 在 `index.html` 中引入轻量内联防闪微脚本，并在 DOM 解析首帧直接确立 `<html>` 的 `dark` 类名与 `color-scheme`，移除 `<body>` 上的固定写死背景色。
2. 重构 `src/main.tsx` 的 `bootstrap` 流程，阻塞并发等待 `initSettingsStore`、`initPlanStore` 和 `refreshAppData` 完全就绪，同步应用 i18n 与主题至 DOM 后再挂载 Preact。
3. 清理 `src/hooks/useAppBootstrap.ts` 中滞后的重复异步初始化逻辑。
4. 移除 `src/app.tsx` 根容器上的 `transition-colors duration-200`，杜绝首屏变色过渡动画。

### 基本原理

1. **防闪拦截（Anti-Flicker Script）**：浏览器的 HTML 解析是线性的。在 `<head>` 中读取 `localStorage` 的微脚本是纯同步的，能在任何 CSS 解析与 DOM 绘制发生前直接给 `document.documentElement` 打上 `.dark` 或移除，阻断系统深色模式对浅色配置的误判。
2. **完全就绪后再挂载（Pre-render Hydration）**：通过在 `main.tsx` 中 `await Promise.all(...)` 将存储状态灌入 Preact Signals，使 Preact 组件在渲染第一帧时读取到的 `$settings`、`$activePlan` 等就是真实的持久化数据，避免状态变更引发二次重绘。
3. **消除瞬态插值（Zero Transition on Mount）**：移除外层全屏容器的颜色过渡样式，防止类名初始化时浏览器触发属性过渡插值。

### 标签

#intent/fix #flow/ready #priority/high
#comp/runtime #concept/state #concept/ui #scope/ux
#ai/instruct
#task/domain/ui #task/object/bootstrap-theme #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 在 `index.html` 中注入防闪烁同步脚本并清理 body 样式

移除写死的浅色 class，并在 `<head>` 底部同步应用缓存主题。

~~~~~act
patch_file
index.html
~~~~~
~~~~~old
    <title>FormSight - 视觉造型构图与色彩感知强化训练系统</title>
    <meta name="description" content="基于视知觉认知与色彩空间建模的自适应视觉与手眼协调强化训练系统" />
  </head>
  <body class="bg-gray-50 text-gray-900 antialiased min-h-screen">
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
~~~~~
~~~~~new
    <title>FormSight - 视觉造型构图与色彩感知强化训练系统</title>
    <meta name="description" content="基于视知觉认知与色彩空间建模的自适应视觉与手眼协调强化训练系统" />
    <script>
      (function () {
        try {
          var cachedTheme = localStorage.getItem('formsight_theme_cache') || 'system';
          var isDark =
            cachedTheme === 'dark' ||
            (cachedTheme === 'system' &&
              window.matchMedia('(prefers-color-scheme: dark)').matches);
          if (isDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
          }
        } catch (e) {}
      })();
    </script>
  </head>
  <body class="antialiased min-h-screen">
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
~~~~~

#### Acts 2: 重构 `src/main.tsx` 为纯阻塞式入口

并发初始化所有 Signal Stores（Settings、Plans、Profiles/Summaries），应用多语言和最终主题后再执行 `render(<App />, appElement)`。

~~~~~act
write_file
src/main.tsx
~~~~~
~~~~~tsx
import { render } from 'preact';
import { App } from './app';
import { i18n } from './core/i18n';
import { applyThemeToDocument } from './hooks/useTheme';
import { initPlanStore } from './stores/planStore';
import { refreshAppData } from './stores/profileStore';
import { $settings, initSettingsStore } from './stores/settingsStore';
import './index.css';

async function bootstrap() {
  // 1. 严格阻塞等待全部 IndexedDB 核心数据加载至 Signals
  await Promise.all([
    initSettingsStore(),
    initPlanStore(),
    refreshAppData(),
  ]);

  // 2. 确保 i18n 语言与当前设定严格对齐
  const currentSettings = $settings.value;
  if (currentSettings.global.locale) {
    i18n.setLocale(currentSettings.global.locale);
  }

  // 3. 确保 DOM 主题与数据库配置完全一致
  applyThemeToDocument(currentSettings.global.theme);

  // 4. 全部状态与 DOM 基准就绪，挂载渲染 Preact
  const appElement = document.getElementById('app');
  if (appElement) {
    render(<App />, appElement);
  }
}

bootstrap();
~~~~~

#### Acts 3: 优化 `src/hooks/useAppBootstrap.ts` 移除冗余异步加载

由于数据已在主入口阻塞加载完成，移除 `useEffect` 中滞后执行的 `initSettingsStore` 等调用。

~~~~~act
patch_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { getCardTitle, i18n, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { $activePlan, $allPlans, initPlanStore, setActivePlanAction } from '../stores/planStore';
import {
  $isProfilesLoaded,
  $profiles,
  $todayStatsMap,
  $totalTimeMs,
  refreshAppData,
} from '../stores/profileStore';
import { $settings, initSettingsStore } from '../stores/settingsStore';
import { $toasts, dismissToast, showToast } from '../stores/toastStore';
import type { RouteLocation } from './useHashRoute';

export function useAppBootstrap(route: RouteLocation) {
  const { t } = useTranslation();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  useEffect(() => {
    i18n.init();
    Promise.all([initSettingsStore(), initPlanStore(), refreshAppData()]);
  }, []);

  // 动态更新页面标题
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { $activePlan, $allPlans, setActivePlanAction } from '../stores/planStore';
import {
  $isProfilesLoaded,
  $profiles,
  $todayStatsMap,
  $totalTimeMs,
  refreshAppData,
} from '../stores/profileStore';
import { $settings } from '../stores/settingsStore';
import { $toasts, dismissToast, showToast } from '../stores/toastStore';
import type { RouteLocation } from './useHashRoute';

export function useAppBootstrap(route: RouteLocation) {
  const { t } = useTranslation();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  // 动态更新页面标题
~~~~~

#### Acts 4: 移除 `src/app.tsx` 根节点的变色过渡动画

移除 `transition-colors duration-200`，杜绝任何页面打开时的渐变闪烁。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx
  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground antialiased transition-colors duration-200">
      <AppRouter
~~~~~
~~~~~tsx
  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground antialiased">
      <AppRouter
~~~~~

### 下一步建议

1. **环境验证**：在本地启动服务 (`npm run dev` 或 `pnpm dev`)，在系统深色模式下分别切换应用主题为“浅色”和“深色”，刷新页面验证是否打开即为指定模式且无渐变变亮过渡。
2. **构建校验**：运行项目类型检查与构建脚本（如 `npm run build`），确保 TypeScript 编译通过且无引入破坏性改动。
