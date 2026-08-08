为你分析并建立项目版本号（App Version）的 **SSOT（单事实来源）** 机制。

现状分析
1. **信息不一致**: `package.json` 中的 `"version"` 为 `"0.1.0"`，而 `src/views/Home.tsx` UI 中硬编码了 `"v0.2.0"`。
2. **缺失注入机制**: 当前 Vite 配置未将 `package.json` 中的版本号暴露给前端运行时，导致前端界面必须手动硬编码或重新维护版本字符串。

SSOT 实施方案
1. **单一事实源定义**: 明确把根目录下的 `package.json` 的 `version` 字段作为版本的唯一事实标准（SSOT）。
2. **构建时全局注入**: 在 `vite.config.ts` 中读取 `package.json`，利用 Vite 的 `define` 配置将版本号注入为编译期全局常量 `__APP_VERSION__`。
3. **类型安全声明**: 在 `src/vite-env.d.ts` 中为 `__APP_VERSION__` 添加 TypeScript 全局常量类型声明。
4. **UI 动态绑定**: 在 `src/views/Home.tsx` 中使用 `__APP_VERSION__` 替代硬编码版本文本，并在 `package.json` 中同步版本号为 `0.2.0`。

以下是具体的实施计划：

## [WIP] feat: 为项目版本号建立 SSOT 注入机制与组件消费

### 用户需求
为 FormSight 项目版本号建立 SSOT（Single Source of Truth），统一在 `package.json` 中维护版本号，并通过构建工具透传至 UI 组件中动态渲染，避免硬编码和版本号不一致的问题。

### 评论
确立版本号 SSOT 是现代前端开发的重要工程化实践。通过将 `package.json` 设为版本号唯一来源，并在 Vite 编译期注入常量，可以完美兼顾类型安全、构建性能与维护体验，消除未来版本升级时遗漏修改 UI 字符串的隐患。

### 目标
1. 将 `package.json` 中的版本号更新并规范为标准的 SSOT 来源。
2. 配置 `vite.config.ts`，在 `define` 中注入 `__APP_VERSION__`。
3. 更新类型声明文件 `src/vite-env.d.ts`，避免 TypeScript 报未定义错误。
4. 修改 `src/views/Home.tsx`，移除硬编码字符串，使用 `__APP_VERSION__` 动态展示版本。

### 基本原理
利用 Vite 在编译时直接替换特定标识符（`define` 选项）的能力，可以将静态 JSON 中的字段在打包时注入到前端代码中，无需额外的运行时开销。通过在 TypeScript 全局声明文件中赋予其类型定义，可在整套 TS 代码中实现零侵入、强类型的编译期常量访问。

### 标签
#intent/build #flow/ready #priority/medium #comp/build #concept/config #scope/dx #ai/instruct #task/domain/config #task/object/version-ssot #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新 package.json 版本号并统一为 SSOT 来源

将 `package.json` 中的版本号对齐更新为 `0.2.0`。

~~~~~act
patch_file
package.json
~~~~~
~~~~~json.old
  "name": "star-hopping",
  "private": true,
  "version": "0.1.0",
  "type": "module",
~~~~~
~~~~~json.new
  "name": "star-hopping",
  "private": true,
  "version": "0.2.0",
  "type": "module",
~~~~~

#### Acts 2: 在 vite.config.ts 中注入编译期版本号常量

读取 `package.json` 中的 `version` 属性并通过 Vite 的 `define` 字段注入全局常量 `__APP_VERSION__`。

~~~~~act
patch_file
vite.config.ts
~~~~~
~~~~~ts.old
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
});
~~~~~
~~~~~ts.new
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
});
~~~~~

#### Acts 3: 在 vite-env.d.ts 中补充全局常量类型声明

为 `__APP_VERSION__` 增加 TypeScript 全局变量声明，确保代码编排无类型错误提示。

~~~~~act
patch_file
src/vite-env.d.ts
~~~~~
~~~~~ts.old
/// <reference types="vite/client" />
~~~~~
~~~~~ts.new
/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
~~~~~

#### Acts 4: 修改 Home.tsx 组件引用 SSOT 版本号

替换 `src/views/Home.tsx` 中硬编码的 `"v0.2.0"` 字符串为动态读取的 `v{__APP_VERSION__}`。

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~tsx.old
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              FormSight{' '}
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                v0.2.0
              </span>
            </h1>
~~~~~
~~~~~tsx.new
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              FormSight{' '}
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                v{__APP_VERSION__}
              </span>
            </h1>
~~~~~

### 下一步建议
1. **编译检查**: 运行 `npm run check` 或 `npm run dev` 验证版本号注入是否生效且类型无误。
2. **Git 提交**: 在验证无误后，生成独立的 Git Commit 计划将变更纳入版本控制。
