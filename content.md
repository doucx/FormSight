好的，用户自定义设置（全局设置及各模块卡片配置）也应在“清空所有数据”时彻底重置为系统出厂默认值（`DEFAULT_SETTINGS`）。

我已准备好更新计划，在 `src/utils/db/importExport.ts` 的 `clearAllData` 中增加对 `DEFAULT_SETTINGS` 的重置逻辑。

## [WIP] fix: 清空所有数据时同步重置用户自定义设置为默认值

### 错误分析
在执行 `clearAllData` 时，仅重置了数据库和训练计划，存储在 `localStorage` (`formsight_user_settings`) 中的用户自定义参数（包括全局防沉迷闲置时长、声音开关、容错带配置以及各模块卡片的独立设置等）未被清理，导致配置状态残留。

### 用户需求
在用户触发“清空所有数据”时，一并将用户的所有自定义设置重置回出厂默认状态（`DEFAULT_SETTINGS`）。

### 评论
将配置项重置纳入“清空所有数据”的生命周期中，能够保证应用完全回到最初的纯净状态，避免历史脏设置影响后续体验。

### 目标
1. 从 `../settings` 中导入 `DEFAULT_SETTINGS`。
2. 在 `clearAllData` 中调用 `saveSettings(DEFAULT_SETTINGS)`，重置所有卡片与全局配置。

### 基本原理
通过在 `clearAllData` 流程中调用 `saveSettings(DEFAULT_SETTINGS)`，将 `formsight_user_settings` 键覆盖为默认配置对象，实现前端数据与配置的彻底重置。

### 标签
#intent/fix #flow/ready #priority/medium #comp/build #concept/config #scope/core #ai/instruct #task/domain/storage #task/object/user-settings #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 在 `clearAllData` 中增加用户设置重置逻辑

我们将在 `importExport.ts` 中引入 `DEFAULT_SETTINGS` 并在 `clearAllData` 中调用 `saveSettings(DEFAULT_SETTINGS)`。

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript
import { loadSettings, saveSettings } from '../settings';
~~~~~
~~~~~typescript
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';
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

  resetPlansToDefault();
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
  saveSettings(DEFAULT_SETTINGS);
}
~~~~~

### 下一步建议
- 验证在全局设置面板中点击“清空所有数据”后，所有自适应参数、计划库以及全局偏好设置是否已全部恢复初始状态。
- 如果一切验证无误，可以生成提交计划（`[COMMIT]`）将本次重置逻辑固化入版本库。
