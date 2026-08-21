你的分析完全正确。

项目在执行 `npm run build` 和 `npm run check` 时暴露了以下三类问题：
1. `src/config/trainingPlugins.tsx:3:1`: 引入了未使用的 `CardDefinition`。
2. `src/utils/db/repository.ts:2:15`: 引入了未使用的 `PlanStorageState`。
3. `src/utils/db/repository.ts:18:3`: 引入了未使用的 `DEFAULT_SETTINGS`。

我将生成一个计划来精确移除这三处冗余引入，确保构建和类型检查完全通过。

## [WIP] fix(build): 修复 TypeScript 编译与 lint 发现的未使用导入

### 错误分析

TypeScript 在编译时开启了 `noUnusedLocals` 和 `noUnusedParameters` 严格校验，而某些模块在重构后留下了死代码导入。清理这些无用导入是保持代码整洁和确保 CI 通过的必要步骤。

### 用户需求
修复 TypeScript 编译错误和 Linter 警告，使 `npm run build` 和 `npm run check` 能够 100% 干净通过。

### 评论
这是一个常规的维护与代码清洗步骤，确保了代码库的高标准质量。

### 目标
1. 移除 `src/config/trainingPlugins.tsx` 中未使用的 `CardDefinition` 导入。
2. 移除 `src/utils/db/repository.ts` 中未使用的 `PlanStorageState` 和 `DEFAULT_SETTINGS` 导入。

### 基本原理
通过精确的 `patch_file` 操作，只删除未使用的 `import` 项，不触及任何核心业务逻辑，确保高安全性。

### 标签
#intent/fix #flow/ready #priority/medium #comp/build #scope/dx #ai/instruct #task/domain/testing #task/object/build-fix #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修补 `trainingPlugins.tsx` 与 `repository.ts` 的冗余导入

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
import type { Point } from '../types';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/index';
~~~~~
~~~~~typescript.new
import type { Point } from '../types';
import type { TrainingDomain } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/utils/db/repository.ts
~~~~~
~~~~~typescript.old
import { registry } from '../../core/registry';
import type { PlanStorageState, TrainingPlan } from '../../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
  setActivePlan,
  togglePlanFavorite,
} from '../planStorage';
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
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
  setActivePlan,
  togglePlanFavorite,
} from '../planStorage';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  loadSettings,
  saveSettings,
} from '../settings';
~~~~~

### 下一步建议
修改完成后，建议执行 `npm run build` 和 `npm run check` 验证构建与类型检查是否完全通过。
