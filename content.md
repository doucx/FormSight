`src/modules/star/_shared/analytics.ts` 文件中同样包含了 `<Callout />` JSX 组件，但使用了 `.ts` 后缀，导致 esbuild 报错。

我将生成一个修复计划将其重命名为 `analytics.tsx`。

## [WIP] fix: 修复 star/_shared/analytics.ts 的 JSX 文件扩展名

### 错误分析
`src/modules/star/_shared/analytics.ts` 内部的 `renderDiagnostics` 方法返回了 `<Callout ...>` 等 JSX 元素，但文件后缀为 `.ts`，触发了 esbuild 的解析错误 `Expected ">" but found "variant"`。

### 用户需求
将 `analytics.ts` 重命名为 `analytics.tsx` 以便正确通过 Vite/esbuild 编译。

### 评论
所有直接内嵌 JSX 组件渲染的分析逻辑文件都应使用 `.tsx` 扩展名。

### 目标
将 `src/modules/star/_shared/analytics.ts` 移动/重命名为 `src/modules/star/_shared/analytics.tsx`。

### 基本原理
TypeScript 模块解析器支持省略后缀名的导入语句（`from '../_shared/analytics'`），将其重命名为 `.tsx` 即可自动生效并开启 JSX 语法解析。

### 标签
#intent/fix #flow/ready #priority/critical #comp/runtime #comp/build #scope/core #ai/instruct #task/domain/architecture #task/object/star-module #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 重命名 `analytics.ts` 为 `analytics.tsx`

~~~~~act
move_file
src/modules/star/_shared/analytics.ts
src/modules/star/_shared/analytics.tsx
~~~~~

### 下一步建议
重命名完成后，`src/modules/star` 将全部正常编译加载。建议在本地测试一次寻星训练和统计大盘，确认无误后推进下一个领域（如 `angle`）的卡片化重构。
