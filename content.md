## [WIP] fix: 修复构建过程中的 TypeScript 编译错误

### 用户需求
修复 `npm run build` 时发现的两个 TypeScript 错误：
1. `src/config/registry.ts` 中引用的 `DomainPlugin` 在 `src/core/contracts.ts` 中未导出。
2. `src/core/contracts.ts` 中导入了未使用的 `ComponentChildren`。

### 错误分析
- 错误 1：我们在 `src/config/registry.ts` 桥接文件中导出了 `DomainPlugin` 类型，但它在新的 `src/core/contracts.ts` 契约中被重命名或未被显式导出（当前使用的是 `DomainManifest`）。我们需要在 `src/core/contracts.ts` 中显式导出 `DomainPlugin`（或定义 `export type DomainPlugin = DomainManifest;` 兼容别名）。
- 错误 2：`src/core/contracts.ts` 顶层导入了 `ComponentChildren`，但在文件中没有使用，触发了 `noUnusedLocals` 编译检查。

### 目标
1. 在 `src/core/contracts.ts` 中移除未使用的 `ComponentChildren` 导入，并导出 `DomainPlugin` 兼容别名。
2. 确保 `npm run build` (`tsc && vite build`) 能够 100% 成功通过。

### 基本原理
通过在核心契约中补齐向后兼容的类型别名并清理冗余导入，保持严格的 TypeScript 编译通过率。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/typescript-fix #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `src/core/contracts.ts` 的类型导出与未引用导入

~~~~~act
write_file
src/core/contracts.ts
~~~~~
~~~~~typescript
import type { CardAnalyticsPlugin } from '../config/analyticsPlugins';
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { BaseModuleSettings } from '../utils/settings';

/**
 * 领域包清单 (Domain Manifest)
 * 每一个垂直领域模块 (如 angle, star, color) 必须在 index.ts 中默认导出此对象
 */
export interface DomainManifest {
  domain: TrainingDomain;
  meta: DomainMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}

/**
 * 向后兼容的 DomainPlugin 别名
 */
export type DomainPlugin = DomainManifest;
~~~~~

### 下一步建议
运行 `npm run build` 验证构建是否完全通过。如果顺利，您可以指示我执行 Git 提交。
