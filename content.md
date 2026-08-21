## [WIP] fix: 修复 TypeScript 编译构建错误

### 错误分析

在执行 `npm run build` 时，TypeScript 编译器抛出了以下 3 处类型检查错误：

1. **`src/components/common/StandardNafcView.tsx:67:30 - error TS2304: Cannot find name 'useCallback'`**
   - **原因**: 该组件中使用了 `useCallback` 钩子，但顶部从 `'preact/hooks'` 导入的符号中遗漏了 `useCallback`。
2. **`src/components/common/StandardNafcView.tsx:80:32 - error TS2304: Cannot find name 'useCallback'`**
   - **原因**: 同上，第 80 行同样调用了未导入的 `useCallback`。
3. **`src/components/settings/DynamicDomainSettings.tsx:1:1 - error TS6133: 'TrainingDomain' is declared but its value is never read`**
   - **原因**: 启用了 `noUnusedLocals`（或严格检查），导致文件中导入了未实际使用的 `TrainingDomain` 类型。

### 用户需求
修复 TypeScript 编译错误，确保 `npm run build` 能够干净、顺利地通过。

### 评论
这些是由于重构或新增组件时引入的小疏忽，通过补充导入和清理无用导入即可彻底解决。

### 目标
1. 修改 `src/components/common/StandardNafcView.tsx`，在导入列表中追加 `useCallback`。
2. 修改 `src/components/settings/DynamicDomainSettings.tsx`，移除未使用的 `TrainingDomain` 导入。
3. 验证构建产物。

### 基本原理
通过精确修复符号导入，满足 TypeScript 严格类型检查与 Biome/Lint 规范。

### 标签
#intent/fix #flow/ready #priority/critical #comp/build #scope/core #ai/instruct #task/domain/build #task/object/typescript-errors #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `StandardNafcView.tsx` 与 `DynamicDomainSettings.tsx` 的编译错误

我们将为 `StandardNafcView.tsx` 补上 `useCallback` 导入，并清理 `DynamicDomainSettings.tsx` 中无用的 `TrainingDomain` 导入。

~~~~~act
patch_file
src/components/common/StandardNafcView.tsx
~~~~~
~~~~~typescript.old
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ChoiceNafcContainer, type ChoiceNafcOption } from './ChoiceNafcContainer';
~~~~~
~~~~~typescript.new
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { ChoiceNafcContainer, type ChoiceNafcOption } from './ChoiceNafcContainer';
~~~~~

~~~~~act
patch_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript.old
import type { TrainingDomain } from '../../utils/db/index';
import type { TargetingMode } from '../../utils/settings';
~~~~~
~~~~~typescript.new
import type { TargetingMode } from '../../utils/settings';
~~~~~

### 下一步建议
- 建议在修复后立即运行 `npm run build` 验证是否全部通过。
