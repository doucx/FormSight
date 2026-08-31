包含 JSX 语法的卡片入口文件使用了 `.ts` 后缀，导致 Vite/esbuild 默认未开启 JSX 解析；同时需要将注册器的扫描模式扩展为支持 `.tsx`。

我将生成一个修复计划来重命名这些文件并更新注册器扫描规则。

## [WIP] fix: 修复卡片入口文件 JSX 扩展名及注册器扫描规则

### 错误分析
1. **根本原因**：在 `SingleAnchorCard`、`HorizontalDoubleCard` 和 `RotatedDoubleCard` 的入口文件中使用了 JSX 语法（`<View ... />`），但文件被保存为 `.ts` 扩展名，导致 Vite/esbuild 按照纯 TypeScript 模式编译并报错 `Expected ">" but found "question"`。
2. **扫描器限制**：`src/core/registry.ts` 中的 `import.meta.glob` 原先仅指定了 `'../modules/**/index.ts'`，若卡片入口为 `.tsx` 将无法被扫描到。

### 用户需求
修复编译报错，确保所有含 JSX 的卡片入口正确采用 `.tsx` 扩展名，并使注册器能同时扫描 `.ts` 与 `.tsx` 入口。

### 评论
在 Preact/React 项目中，凡是使用了 JSX/TSX 语法的入口文件必须使用 `.tsx` 扩展名，注册器扫描 Glob 也应通配 `index.{ts,tsx}` 以保证健壮性。

### 目标
1. 将 `SingleAnchorCard/index.ts`、`HorizontalDoubleCard/index.ts`、`RotatedDoubleCard/index.ts` 重命名为对应的 `index.tsx`。
2. 更新 `src/core/registry.ts` 的 `import.meta.glob` 路径模式为 `../modules/**/index.{ts,tsx}`。

### 基本原理
1. `esbuild` 通过文件扩展名决定语法解析器，`.tsx` 开启 JSX 树转换。
2. Glob 通配符 `index.{ts,tsx}` 确保单卡自包含目录无论是纯逻辑（`.ts`）还是直接提供视图（`.tsx`）均能被正确自动发现。

### 标签
#intent/fix #flow/ready #priority/critical #comp/runtime #comp/build #concept/parser #scope/core #ai/instruct #task/domain/architecture #task/object/star-module #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 更新 `src/core/registry.ts` 扫描规则以支持 `.tsx`

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
  private autoDiscover(): void {
    // 1. 扫描新版独立 CardManifest
    const cardModules = import.meta.glob<{
      default?: AnyCardManifest | AnyCardManifest[];
      [key: string]: unknown;
    }>('../modules/**/index.ts', {
      eager: true,
    });
~~~~~
~~~~~typescript
  private autoDiscover(): void {
    // 1. 扫描新版独立 CardManifest (支持 .ts 与 .tsx)
    const cardModules = import.meta.glob<{
      default?: AnyCardManifest | AnyCardManifest[];
      [key: string]: unknown;
    }>('../modules/**/index.{ts,tsx}', {
      eager: true,
    });
~~~~~

#### Acts 2: 将包含 JSX 的卡片入口文件重命名为 `.tsx`

~~~~~act
move_file
src/modules/star/SingleAnchorCard/index.ts
src/modules/star/SingleAnchorCard/index.tsx
~~~~~

~~~~~act
move_file
src/modules/star/HorizontalDoubleCard/index.ts
src/modules/star/HorizontalDoubleCard/index.tsx
~~~~~

~~~~~act
move_file
src/modules/star/RotatedDoubleCard/index.ts
src/modules/star/RotatedDoubleCard/index.tsx
~~~~~

### 下一步建议
文件重命名并更新扫描规则后，Vite 的 JSX 编译错误将完全消除，Star 模块已完整就绪。接下来可以继续将 **Angle 领域** 按照相同规范拆解为独立的 `CardManifest` 目录。
