我已定位并分析了报错原因：
1. `src/config/trainingPlugins.tsx` 与 `src/views/GenericTrainingView.tsx` 中使用了 `any` 作为泛型默认参数，触发了 Biome 的 `noExplicitAny` 检查规则；同时 `trainingPlugins.tsx` 中导入了未使用的 `CardDefinition`。
2. `src/utils/db/repository.ts` 中声明了未使用的导入 `PlanStorageState` 和 `DEFAULT_SETTINGS`，触发了 TypeScript 的严格未使用项检查 (`TS6133` 与 `TS6196`)。

我将通过以下计划修复这些代码问题。

## [WIP] fix: 消除未使用的导入与 any 类型标注以通过构建检查

### 错误分析
1. **Biome Linter 违规 (`lint/suspicious/noExplicitAny`)**:
   - `src/config/trainingPlugins.tsx` 中的 `AnyTrainingPlugin` 类型使用了 4 个 `any` 参数。
   - `src/views/GenericTrainingView.tsx` 中的组件 Props 与函数签名将泛型默认值定义为 `any`。
2. **TypeScript 编译报错 (`TS6133`, `TS6196`)**:
   - `src/config/trainingPlugins.tsx` 存在未使用的类型导入 `CardDefinition`。
   - `src/utils/db/repository.ts` 存在未使用的导入 `PlanStorageState` 与 `DEFAULT_SETTINGS`。

### 用户需求
修复代码中的所有 lint 错误及 TypeScript 编译报错，确保 `npm run checkf` 和 `npm run build` 顺利通过。

### 评论
通过将宽松的 `any` 替换为安全的 `unknown` 及利用泛型默认参数，不仅能满足 linter 约束，还能提高系统整体的类型安全性。清理死导入也有利于打包树摇优化与代码整洁。

### 目标
1. 移除 `src/config/trainingPlugins.tsx` 中无用的 `CardDefinition` 导入，并将 `AnyTrainingPlugin` 重构为默认使用 `unknown` 的安全泛型。
2. 将 `src/views/GenericTrainingView.tsx` 中的泛型默认参数从 `any` 替换为 `unknown`。
3. 清理 `src/utils/db/repository.ts` 中的冗余导入 `PlanStorageState` 与 `DEFAULT_SETTINGS`。

### 基本原理
利用 TypeScript 的 `unknown` 顶层类型替代 `any`，既能消除 linter 报错，又不会破坏类型推导；同时根据 TS 规范清理未引用的变量和接口导入。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #scope/dx #ai/instruct #task/domain/cli #task/object/type-safety #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 `src/config/trainingPlugins.tsx` 中的无用导入与 any 类型定义

移除未使用的 `CardDefinition` 导入，并将 `AnyTrainingPlugin` 改为引用带安全默认泛型的 `TrainingPlugin`。

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
import type { ComponentChildren } from 'preact';
import type { Point } from '../types';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/index';
~~~~~
~~~~~typescript.new
import type { ComponentChildren } from 'preact';
import type { Point } from '../types';
import type { TrainingDomain } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;
~~~~~
~~~~~typescript.new
export type AnyTrainingPlugin = TrainingPlugin;
~~~~~

#### Acts 2: 修复 `src/views/GenericTrainingView.tsx` 中的 any 泛型默认值

将 `GenericTrainingViewProps` 接口以及 `GenericTrainingView` 组件的泛型默认值由 `any` 替换为 `unknown`。

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
export interface GenericTrainingViewProps<
  TQuestion = any,
  THitResult = any,
  TAnswerVal = any,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
~~~~~
~~~~~typescript.new
export interface GenericTrainingViewProps<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
export function GenericTrainingView<
  TQuestion = any,
  THitResult = any,
  TAnswerVal = any,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
>({
~~~~~
~~~~~typescript.new
export function GenericTrainingView<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
>({
~~~~~

#### Acts 3: 清理 `src/utils/db/repository.ts` 中的未引用导入

移除未使用的 `PlanStorageState` 与 `DEFAULT_SETTINGS` 导入项。

~~~~~act
patch_file
src/utils/db/repository.ts
~~~~~
~~~~~typescript.old
import { registry } from '../../core/registry';
import type { PlanStorageState, TrainingPlan } from '../../types/plan';
import {
~~~~~
~~~~~typescript.new
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';
import {
~~~~~

~~~~~act
patch_file
src/utils/db/repository.ts
~~~~~
~~~~~typescript.old
import {
  type BaseModuleSettings,
  DEFAULT_SETTINGS,
  type UserSettings,
  getCardSettings,
  loadSettings,
  saveSettings,
} from '../settings';
~~~~~
~~~~~typescript.new
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  loadSettings,
  saveSettings,
} from '../settings';
~~~~~

### 下一步建议
1. 运行 `npm run check` 验证 Biome linter 与格式化是否已全部通过。
2. 运行 `npm run build` 验证 TypeScript 编译与 Vite 打包构建流程。
3. 运行 `npm run test` 确保各项单元测试正常运行。
