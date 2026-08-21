用户反馈在执行“清空所有数据”操作时，训练计划未被一并清空或重置。

经排查，`src/utils/db/importExport.ts` 中的 `clearAllData` 函数目前仅清除了 IndexedDB 中的 `sessions`、`records` 与 `user_profiles` 存储库，未对存储在 `localStorage` 中的训练计划状态（`resetPlansToDefault`）进行重置。

我已准备好修复方案，将 `clearAllData` 补充上训练计划的重置逻辑。

## [WIP] fix: 修复清空所有数据时未重置训练计划的问题

### 错误分析
在 `src/utils/db/importExport.ts` 中，`clearAllData` 函数仅清空了 IndexedDB 实例中的三大对象仓库（`sessions`、`records`、`user_profiles`），未处理保存在 `localStorage` 中的训练计划存储。导致用户在全局设置中触发“清空所有数据”后，自定义训练计划和计划库依然残留。

### 用户需求
执行“清空所有数据”时，应同步清空/重置用户的训练计划数据，使其恢复至系统默认预设状态。

### 评论
“清空所有数据”应具备彻底性和一致性。导出与导入功能已经涵盖了计划数据，清空操作同样需要覆盖计划状态，避免遗留脏数据或与清空预期不符。

### 目标
1. 在 `src/utils/db/importExport.ts` 中引入 `resetPlansToDefault`。
2. 在 `clearAllData` 执行过程中调用 `resetPlansToDefault()`，使训练计划恢复至默认官方状态。

### 基本原理
通过在 `clearAllData` 中调用 `resetPlansToDefault()`，清除 localStorage 中用户创建的自定义计划并重置为默认预设，确保 IndexedDB 与本地存储数据的一致性清理。

### 标签
#intent/fix #flow/ready #priority/medium #comp/build #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/plan-storage #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 更新 `clearAllData` 以重置训练计划

我们将引入 `resetPlansToDefault` 并在 `clearAllData` 内调用以重置计划数据。

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript
import {
  loadPlanStorageState,
  loadTrainingPlan,
  savePlanStorageState,
  saveTrainingPlan,
} from '../planStorage';
~~~~~
~~~~~typescript
import {
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
} from '../planStorage';
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.done;
}
~~~~~
~~~~~typescript
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.done;

  resetPlansToDefault();
}
~~~~~

### 下一步建议
- 测试全局设置中的“清空所有数据”功能，确认在触发后计划库是否成功恢复为默认预设计划。
- 确认用户自定义设置（GlobalSettings / CardSettings）在清空数据时是否也需要一并重置为初始默认配置。
