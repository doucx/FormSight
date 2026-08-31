通过对应用主题状态流转及样式渲染机制的分析，当用户在设置中切换主题外观（浅色 / 深色 / 跟随系统）时，由于根 DOM 节点的 `color-scheme` 与 `body` 底色未与 Tailwind 的 `dark` 类协同绑定，导致在系统偏好为深色模式或特定浏览器环境下无法即时解除深色渲染。

通过在 `applyThemeToDocument` 中显式同步 `document.documentElement.style.colorScheme`，并在全局样式表 `src/index.css` 中为 `html` / `body` 声明自适应的背景色与色彩方案规则，即可确保点击“浅色”、“深色”或“跟随系统”时界面的即时无缝切换。

## [WIP] fix(theme): 修复外观浅色深色模式切换即时生效与根节点色彩方案同步

### 错误分析
1. **浏览器默认 `color-scheme` 锁定**: 在部分现代浏览器及操作系统启用夜间模式时，若根节点未显式设置 `color-scheme: light`，即使移除了 `<html>` 上的 `.dark` 类，底层渲染容器与表单控件仍会受操作系统深色偏好影响呈现暗色。
2. **全局基础底色缺失**: `src/index.css` 中未定义 `body` 与 `html.dark body` 的标准基底色彩，导致在样式切换瞬间可能出现闪烁或底色未同步切换。
3. **DOM 状态与 Tailwind Class 联动**: 需要在 `applyThemeToDocument` 执行 `classList.add('dark')` / `classList.remove('dark')` 的同时，同步设置 `document.documentElement.style.colorScheme`。

### 用户需求
在设置弹窗中点击“浅色”、“深色”或“跟随系统”时，应用外观必须即时无缝切换，无论在普通模式还是无痕模式下均能精准响应。

### 评论
外观主题模式是用户体验的重要基础。通过将 Tailwind 的 `.dark` class 切换与浏览器的 `color-scheme` 声明深度联动，可以确保从 UI 容器、侧边栏到 Canvas 绘图层的全局一致性与零延迟切换。

### 目标
1. 在 `src/hooks/useTheme.ts` 中增强 `applyThemeToDocument`，使其在增删 `dark` 类名的同时同步配置 `document.documentElement.style.colorScheme`。
2. 在 `src/index.css` 中显式声明 `html`、`html.dark` 及 `body` 的基础背景色与色彩空间，确保明暗模式过渡自然。

### 基本原理
Tailwind CSS 的 `darkMode: 'class'` 依赖于根元素 `<html>` 上的 `dark` 类。通过在切换主题时严格更新 `classList` 并将 CSS 原生 `color-scheme` 同步为 `'light'` 或 `'dark'`，使浏览器内核、CSS 变量及 Tailwind 样式树协同响应，实现零延迟、即时无缝的主题切换。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/refine #task/domain/ui #task/object/theme-mode #task/action/fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 更新 `useTheme.ts` 同步更新 `document.documentElement.style.colorScheme`

~~~~~act
patch_file
src/hooks/useTheme.ts
~~~~~
~~~~~typescript.old
export function applyThemeToDocument(themeMode: ThemeMode = 'system'): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches);
  const resolved: ResolvedTheme = isDark ? 'dark' : 'light';

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return resolved;
}
~~~~~
~~~~~typescript.new
export function applyThemeToDocument(themeMode: ThemeMode = 'system'): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches);
  const resolved: ResolvedTheme = isDark ? 'dark' : 'light';

  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }

  return resolved;
}
~~~~~

#### Acts 2: 更新 `index.css` 声明 HTML 与 Body 的根色彩方案及基底背景

~~~~~act
patch_file
src/index.css
~~~~~
~~~~~css.old
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
    "Open Sans", "Helvetica Neue", sans-serif;
}

@keyframes shrinkWidth {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
~~~~~
~~~~~css.new
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  color-scheme: light;
}

html.dark {
  color-scheme: dark;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
    "Open Sans", "Helvetica Neue", sans-serif;
  background-color: #f8fafc;
  color: #0f172a;
}

html.dark body {
  background-color: #020617;
  color: #f8fafc;
}

@keyframes shrinkWidth {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
~~~~~

### 下一步建议
1. 在浏览器设置弹窗中分别点击“浅色”、“深色”和“跟随系统”，验证界面、侧边栏、卡片和弹窗是否能即时响应切换。
2. 验证刷新页面或在无痕模式下打开应用，检查外观是否与设定一致。
