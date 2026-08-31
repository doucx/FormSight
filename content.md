你的诊断非常准确。

Tailwind CSS 默认采用的是 `media` 策略（基于 `@media (prefers-color-scheme: dark)`）。在操作系统处于深色模式时，CSS 会无视 HTML 根元素上的类名，始终强制激活所有 `dark:*` 样式规则。因此即便我们在 JS 中正确对 `document.documentElement` 执行了 `classList.remove('dark')`，样式依然会保持深色。

通过在 `tailwind.config.js` 中显式配置 `darkMode: 'class'`，Tailwind 将转为依据 `<html>` 元素是否带有 `.dark` 类来决定是否应用暗色样式，从而实现浅色、深色与跟随系统的即时无缝切换。

## [WIP] fix(theme): 配置 Tailwind darkMode 为 class 策略以支持主题即时切换

### 错误分析
1. **根本原因**: `tailwind.config.js` 中未配置 `darkMode` 属性，Tailwind 默认回退至 `media` 策略，直接由浏览器的 `@media (prefers-color-scheme: dark)` 决定暗黑样式的生效与否。
2. **表现行为**: 当宿主操作系统为深色模式时，用户在界面中选择“浅色”，虽然 `useTheme` 成功将 `<html>` 标签上的 `dark` 类名移除并将设置持久化到 LocalStorage，但 CSS 引擎依然按媒体查询匹配 `dark:*` 选择器，导致界面无法切换到浅色。

### 用户需求
在设置弹窗中点击“浅色”、“深色”或“跟随系统”时，应用外观必须即时无缝切换，并在刷新后准确恢复所选外观。

### 评论
该问题属于前端主题架构中典型的配置与控制策略不匹配问题。通过将 Tailwind 的暗黑策略切换至 `class` 模式，使 Tailwind 样式选择器与项目的 `useTheme` DOM 类名控制逻辑完全闭环。

### 目标
1. 在 `tailwind.config.js` 中增加 `darkMode: 'class'` 配置。
2. 确保在操作系统处于深色或浅色模式下，用户均可自由即时切换外观。

### 基本原理
当设置 `darkMode: 'class'` 时，Tailwind 会将所有 `dark:*` 规则编译为类似 `.dark .dark\:bg-slate-900` 的类选择器形式。此时，`applyThemeToDocument` 函数对 `document.documentElement.classList` 的 `add('dark')` 与 `remove('dark')` 能够直接控制暗黑样式的启用与注销。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #concept/config #scope/ux #ai/refine #task/domain/ui #task/object/theme-mode #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 在 `tailwind.config.js` 中添加 `darkMode: 'class'` 配置

我们将向 Tailwind 配置文件中加入 `darkMode: 'class'`。

~~~~~act
patch_file
tailwind.config.js
~~~~~
~~~~~javascript.old
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
~~~~~
~~~~~javascript.new
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
~~~~~

### 下一步建议
- 在本地运行 `npm run dev` / `vite` 启动项目，打开设置弹窗测试以下场景：
  1. 系统处于深色模式下，点击“浅色”，验证页面背景、文字和卡片是否立即切换为明亮风格。
  2. 刷新页面，验证浅色风格是否正常保持。
  3. 切换为“跟随系统”与“深色”，验证响应是否均即时且符合预期。
