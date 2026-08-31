这两个问题非常明确：
1. `src/components/modals/SettingsModal.tsx` 中重复导入了 `ModalShell`。
2. `src/storage/repository.ts` 位于 `src/storage/` 目录下，但由于迁移自 `src/utils/db/`，其导入仍保留了原先的相对层级（例如 `../planStorage` 应为 `./planStorage`、`./importExport` 应为 `./db/importExport`）。

我们立即修正这两处引用并再次运行 `npm run checkf` 校验。

## [WIP] fix: 修复 SettingsModal 重复导入与 repository 相对路径

### 错误分析
1. **重复导入**：`SettingsModal.tsx` 在第 11 与 12 行重复声明了 `import { ModalShell } from '../common/ModalShell'`。
2. **同级模块相对路径**：`src/storage/repository.ts` 与 `planStorage.ts`、`settings.ts` 同在 `src/storage/` 下，应使用 `./planStorage` 与 `./settings`；其引用的数据库子模块（`importExport`、`prune`、`queries`、`schema`）位于 `./db/` 子目录中。

### 用户需求
消除代码检查错误与 Vite 导入解析错误，确保 `npm run checkf` 完全通过。

### 评论
路径对齐后，`src/storage/` 层的内部聚合结构将彻底稳定并恢复自洽。

### 目标
1. 移除 `src/components/modals/SettingsModal.tsx` 中的重复导入。
2. 修正 `src/storage/repository.ts` 的内部导入路径。
3. 执行 `npm run checkf` 验证无报错。

### 基本原理
通过精确补丁更新文件导入头，使相对路径与真实目录层级 100% 对齐。

### 标签
#intent/fix #flow/ready #priority/critical #comp/core #concept/state #scope/core #ai/instruct #task/domain/architecture #task/object/project-structure #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 修复 `src/components/modals/SettingsModal.tsx`

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript.old
import { getCardTitle, useTranslation } from '../../core/i18n';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  saveSettings,
} from '../../storage/settings';
import type { CardDefinition } from '../../types/card';
import { ModalShell } from '../common/ModalShell';
import { ModalShell } from '../common/ModalShell';
import { DynamicDomainSettings } from '../settings/DynamicDomainSettings';
~~~~~
~~~~~typescript.new
import { getCardTitle, useTranslation } from '../../core/i18n';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  saveSettings,
} from '../../storage/settings';
import type { CardDefinition } from '../../types/card';
import { ModalShell } from '../common/ModalShell';
import { DynamicDomainSettings } from '../settings/DynamicDomainSettings';
~~~~~

#### Acts 2: 修复 `src/storage/repository.ts` 内部导入路径

~~~~~act
patch_file
src/storage/repository.ts
~~~~~
~~~~~typescript.old
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
import { clearAllData, exportAllData, exportAllDataStream, importAllData } from './importExport';
import { pruneColdRecords } from './prune';
import {
  formatTotalTime,
  getAllProfiles,
  getDailySummaries,
  getProfile,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecordsByCard,
  saveSession,
  saveTrialRecord,
} from './queries';
import type { UnifiedProfileData } from './schema';
~~~~~
~~~~~typescript.new
import type { TrainingPlan } from '../types/plan';
import {
  clearAllData,
  exportAllData,
  exportAllDataStream,
  importAllData,
} from './db/importExport';
import { pruneColdRecords } from './db/prune';
import {
  formatTotalTime,
  getAllProfiles,
  getDailySummaries,
  getProfile,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecordsByCard,
  saveSession,
  saveTrialRecord,
} from './db/queries';
import type { UnifiedProfileData } from './db/schema';
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
} from './planStorage';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  loadSettings,
  saveSettings,
} from './settings';
~~~~~

### 下一步建议
1. **测试与体验**：启动 `npm run dev` 在浏览器中验证所有扩展包和页面流转（主页、探索大盘、数据统计看板、计划编排与训练流）。
2. **提交与归档**：在完成测试后，可向我发送提交指令，我将生成 `[COMMIT]` 计划以归档此次重构成果。
