## [WIP] fix: 补全 Tailwind CSS 引入以修复样式和布局问题

### 错误分析

用户报告的两个问题（左右图上下排列、主页样式丑陋）的根本原因是相同的：`src/index.css` 文件为空，缺少了 Tailwind CSS 的基础指令（`@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`）。
这导致整个项目中编写的 Tailwind 实用类（如 `flex`, `md:flex-row`, `bg-white`, `text-gray-900` 等）统统没有被编译和应用。由于缺少 `flex` 等样式，原本应该呈左右排列的元素，回退到了普通的块级元素（Block-level element），从而导致总是从上到下排列。

### 用户需求
1. 修复右图和左图的排列方式，从上下排列改为左右排列。
2. 修复主页样式丑陋的问题，使 UI 恢复设计预期。

### 评论
这是一个典型的配置疏漏问题。在基于 Vite + Tailwind 的项目中，必须在全局 CSS 文件中引入 Tailwind 指令。补全后，项目内所有已编写完善的响应式布局和样式都会瞬间恢复正常。

### 目标
- 将 Tailwind CSS 指令补充到 `src/index.css` 中，激活全局样式。

### 基本原理
通过在全局样式表中引入 Tailwind 指令，使得构建工具（PostCSS）能够正确拦截这些指令，根据文件中使用的 `className` 生成对应的 CSS 样式代码。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/tailwind-config #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 补充 Tailwind CSS 基础指令

往空文件 `src/index.css` 写入 `@tailwind` 相关的引入，以激活全局 Tailwind 样式。

~~~~~act
write_file
src/index.css
~~~~~
~~~~~css
@tailwind base;
@tailwind components;
@tailwind utilities;
~~~~~

### 下一步建议
修改将在本地保存后生效。请运行开发服务器并刷新浏览器预览，确认主页是否变得美观，且进入训练页面后两块画布是否能够正常并排显示。验证无误后可进行 Git 提交。
