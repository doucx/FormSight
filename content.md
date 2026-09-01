我已分析这三处 TypeScript 类型检查与未引用导出的问题，并将为您生成对应的修复计划。

## [WIP] fix: 修复未使用的导入、异步设置读取与测试用例类型导入

### 错误分析

1. **`useAppBootstrap.ts` 存在冗余导入**: 引入了 `loadPlanStorageState`, `loadTrainingPlan`, `loadSettings`, `DEFAULT_SETTINGS` 但未在组件中使用，触发 TS6133 警告。
2. **`useTrainingSession.ts` 同步解构 Promise 属性**: 在计算 `effectiveIdleTimeout` 时调用了异步函数 `loadSettings()` 并直接访问 `.global` 属性，导致运行时错误和 TS2339 类型不匹配，应改用同步读取内存快照 `getSettingsSnapshot()`。
3. **`settings.test.ts` 缺少类型导入**: 测试用例中对 `partialSettings` 进行了 `as unknown as UserSettings` 类型断言，但未在头部 `import` 语句中引入 `UserSettings` 类型，触发 TS2304 报错。

### 用户需求

修复上述三处 TypeScript 错误，保证类型检查无报错，且运行时配置读取逻辑正确。

### 评论

这些属于重构为 IndexedDB 异步化与同步快照混合架构后的遗留类型和导入瑕疵，修复后能够确保静态检查与单元测试平稳通过。

### 目标

1. 在 `src/hooks/useAppBootstrap.ts` 中清理未使用的导入。
2. 在 `src/hooks/useTrainingSession.ts` 中将 `loadSettings` 替换为 `getSettingsSnapshot`。
3. 在 `src/utils/__tests__/settings.test.ts` 中补充 `UserSettings` 类型导入。

### 基本原理

通过 `patch_file` 精准替换存在类型或引用问题的代码片段，确保零运行时副作用和代码库整洁。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/config #scope/core #ai/instruct #task/domain/testing #task/object/type-fixes #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 清理 `useAppBootstrap.ts` 未使用的导入

~~~~~act
patch_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript.old
import { type UnifiedProfileData, repository } from '../storage/index';
import { loadPlanStorageState, loadTrainingPlan, setActivePlan } from '../storage/planStorage';
import { type UserSettings, loadSettings } from '../storage/settings';
import type { TrainingPlan } from '../types/plan';
import type { RouteLocation } from './useHashRoute';

import { EMPTY_TRAINING_PLAN, getPlanStorageStateSnapshot } from '../storage/planStorage';
import { DEFAULT_SETTINGS, getSettingsSnapshot } from '../storage/settings';
~~~~~
~~~~~typescript.new
import { type UnifiedProfileData, repository } from '../storage/index';
import { EMPTY_TRAINING_PLAN, getPlanStorageStateSnapshot, setActivePlan } from '../storage/planStorage';
import { type UserSettings, getSettingsSnapshot } from '../storage/settings';
import type { TrainingPlan } from '../types/plan';
import type { RouteLocation } from './useHashRoute';
~~~~~

#### Acts 2: 修复 `useTrainingSession.ts` 中闲置超时的同步快照读取

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
import { type AdaptiveMode, type StepGranularity, loadSettings } from '../storage/settings';
~~~~~
~~~~~typescript.new
import { type AdaptiveMode, type StepGranularity, getSettingsSnapshot } from '../storage/settings';
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
  const effectiveIdleTimeout =
    typeof optionsIdleTimeout === 'number'
      ? optionsIdleTimeout
      : (loadSettings().global.idleTimeout ?? 60);
~~~~~
~~~~~typescript.new
  const effectiveIdleTimeout =
    typeof optionsIdleTimeout === 'number'
      ? optionsIdleTimeout
      : (getSettingsSnapshot().global.idleTimeout ?? 60);
~~~~~

#### Acts 3: 补充 `settings.test.ts` 中缺失的 `UserSettings` 类型导入

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript.old
import {
  DEFAULT_SETTINGS,
  getCardSettings,
  loadSettings,
  saveSettings,
} from '../../storage/settings';
~~~~~
~~~~~typescript.new
import {
  DEFAULT_SETTINGS,
  type UserSettings,
  getCardSettings,
  loadSettings,
  saveSettings,
} from '../../storage/settings';
~~~~~

### 下一步建议

执行完上述指令后，建议运行 `npm run check`（或 `npx tsc --noEmit`）及 `npm test` 来验证所有类型检查与单元测试是否全部顺利通过。
