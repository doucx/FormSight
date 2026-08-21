## ## [WIP] fix(core): 修复 registry.ts 中的重复导入声明

### 错误分析

在 `./src/core/registry.ts` 文件中，由于某些原因（可能是不小心合并或重复编写），以下类型被重复导入了两次：
1. `AnyTrainingPlugin` (来自 `../config/trainingPlugins`)
2. `CardDefinition` (来自 `../types/card`)
3. `TrainingDomain` (来自 `../utils/db/schema`)
4. `DomainManifest` (来自 `./contracts`)

Biome 的检查器检测到了这些重复声明，并触发了 `lint/suspicious/noRedeclare` 错误，导致 `npm run checkf` 失败。

### 用户需求
修复 `src/core/registry.ts` 文件中的重复导入错误，使项目可以通过 Biome 的检查。

### 评论
这是一个典型的由于代码合并或编写失误导致的重复导入问题，修复起来非常直接，只需清理掉重复的行即可。

### 目标
1. 检查并移除 `src/core/registry.ts` 中重复的导入语句。
2. 保持所有必要的类型导入完好无损。

### 基本原理
通过精确的 `patch_file` 操作，删除冗余的导入行，确保每个类型只从对应的模块导入一次，从而满足 TypeScript 和 Biome 的语法与静态分析规则。

### 标签
#intent/fix #flow/ready #priority/high #comp/engine #concept/config #scope/core #ai/instruct #task/domain/core #task/object/registry-imports #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 清理 `src/core/registry.ts` 中的重复导入

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition } from '../types/card';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { TrainingDomain } from '../utils/db/schema';
import type { CardAnalyticsPlugin, DomainManifest } from './contracts';
import type { DomainManifest } from './contracts';
~~~~~
~~~~~typescript.new
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { CardAnalyticsPlugin, DomainManifest } from './contracts';
~~~~~

### 下一步建议

修复完成后，建议再次运行 `npm run checkf` 以验证所有重复声明错误是否已成功消除。
