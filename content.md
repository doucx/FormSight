我们将把数据导入逻辑彻底明确为“**还原备份 (Restore Backup)**”语义：在写入备份数据之前，先原子化清空旧数据库（`sessions`、`records`、`user_profiles`、`daily_summaries`），并完全以备份中的设置与计划状态覆盖本地存储，同时同步更新多语言提示。

## [WIP] feat(storage): 明确数据导入为全量备份还原语义

### 用户需求
将数据导入功能明确定义并重构为“**还原备份 (Restore)**”：导入时先完全清空旧数据库与残留记录，再写入备份数据，避免本地与备份数据混合导致的脏数据、能力层阶覆盖不一致或日历统计错乱。

### 评论
将导入从模糊的“合并（Merge）”变更为明确的“还原（Restore）”是一个关键的架构收敛。由于能力层阶、作答记录、训练计划具有严格的时间序列与上下文依赖，混合合并极易导致孤儿记录。通过在写入前执行原子清空并重置设置，能确保备份还原后的系统状态 100% 还原至备份时刻。

### 目标
1. 在 `src/storage/db/importExport.ts` 的 `importAllData` 中，在写入备份数据前清空所有 Object Stores（`sessions`, `records`, `user_profiles`, `daily_summaries`）。
2. 在 LocalStorage 层将设置与训练计划完整置换为备份中的状态。
3. 更新中英文多语言文案，将“导入/合并”统一调整为“还原备份”。

### 基本原理
在同一个 IndexedDB 实例中，先通过读写事务执行 `clear()` 操作清空全部表，随后将备份中的数据批量流式推入。这样既保证了还原后数据库的纯净性，又杜绝了新旧主键碰撞或未被覆盖的历史孤儿记录。

### 标签
#intent/build #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/ux #ai/instruct #task/domain/storage #task/object/backup-restore-semantics #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 在 `importExport.ts` 中实现全量备份还原（清空旧数据后写入）

导入 `buildDefaultCardSettings`，在导入写入前先调用 `clear()` 清空四张表，并将设置完整还原。

~~~~~act
patch_file
src/storage/db/importExport.ts
~~~~~
~~~~~typescript.old
import {
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
} from '../planStorage';
import { DEFAULT_SETTINGS, type UserSettings, loadSettings, saveSettings } from '../settings';
import {
  DB_VERSION,
  type DailySummaryData,
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
  getLocalDateString,
} from './schema';
~~~~~
~~~~~typescript.new
import {
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
} from '../planStorage';
import {
  DEFAULT_SETTINGS,
  type UserSettings,
  buildDefaultCardSettings,
  loadSettings,
  saveSettings,
} from '../settings';
import {
  DB_VERSION,
  type DailySummaryData,
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
  getLocalDateString,
} from './schema';
~~~~~

~~~~~act
patch_file
src/storage/db/importExport.ts
~~~~~
~~~~~typescript.old
  try {
    const db = await getDB();

    // 1. 导入 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      for (const s of parsed.sessions) {
        const cardId = s.cardId || s.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : s.domain || 'core';
        store.put({ ...s, domain, cardId });
      }
      await tx.done;
    }
~~~~~
~~~~~typescript.new
  try {
    const db = await getDB();

    // 0. 清空现有数据库，实现纯净全量还原 (Restore)
    const clearTx = db.transaction(
      ['sessions', 'records', 'user_profiles', 'daily_summaries'],
      'readwrite',
    );
    await clearTx.objectStore('sessions').clear();
    await clearTx.objectStore('records').clear();
    await clearTx.objectStore('user_profiles').clear();
    await clearTx.objectStore('daily_summaries').clear();
    await clearTx.done;

    // 1. 导入 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      for (const s of parsed.sessions) {
        const cardId = s.cardId || s.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : s.domain || 'core';
        store.put({ ...s, domain, cardId });
      }
      await tx.done;
    }
~~~~~

~~~~~act
patch_file
src/storage/db/importExport.ts
~~~~~
~~~~~typescript.old
    // 5. 更新 LocalStorage (深度合并保障新增卡片配置)
    if (parsed.settings) {
      const current = loadSettings();
      const mergedSettings: UserSettings = {
        global: { ...current.global, ...(parsed.settings.global || {}) },
        cards: { ...current.cards, ...(parsed.settings.cards || {}) },
      };
      saveSettings(mergedSettings);
    }

    if (parsed.planStorageState) {
      savePlanStorageState(parsed.planStorageState);
    } else if (parsed.trainingPlan) {
      saveTrainingPlan(parsed.trainingPlan);
    }
~~~~~
~~~~~typescript.new
    // 5. 还原 LocalStorage 设置与训练计划（基于备份完全置换）
    if (parsed.settings) {
      const defaultCards = buildDefaultCardSettings();
      const restoredSettings: UserSettings = {
        global: { ...DEFAULT_SETTINGS.global, ...(parsed.settings.global || {}) },
        cards: { ...defaultCards, ...(parsed.settings.cards || {}) },
      };
      saveSettings(restoredSettings);
    }

    if (parsed.planStorageState) {
      savePlanStorageState(parsed.planStorageState);
    } else if (parsed.trainingPlan) {
      saveTrainingPlan(parsed.trainingPlan);
    }
~~~~~

#### Acts 2: 更新多语言文案为“还原备份”

更新中文和英文语言包中的相关文案。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "exportStream": "流式导出 JSON",
    "exporting": "正在流式打包...",
    "importBackup": "导入 JSON 备份",
    "importing": "正在导入...",
    "importingTitle": "正在恢复数据备份",
    "importingDesc": "正在写入海量训练记录与聚合档案，请稍候且勿关闭窗口...",
    "pruneTitle": "数据库瘦身与修剪",
    "pruneDesc": "清理 90 天以前的高开销图形几何细节",
    "pruneBtn": "安全瘦身",
    "pruneSuccessToast": "已修剪 {{count}} 条 90 天前记录中的多边形/点阵细节，释放了海量存储空间！",
    "pruneFailToast": "修剪操作失败",
    "pruneConfirmMessage": "确定要清理 90 天前记录中的多边形/点阵冗余图形细节吗？此操作将大幅压缩存储空间，且完全保留您的总做答数、打卡日历、正确率与能力层阶！",
    "resetPlansTitle": "恢复官方训练计划",
    "resetPlansDesc": "清空自定义计划，恢复官方预设",
    "resetPlansBtn": "重置计划",
    "resetPlansSuccessToast": "所有训练计划已恢复为官方预设推荐",
    "resetPlansConfirmMessage": "确定要清除所有自定义计划并恢复官方默认推荐训练流吗？此操作不会影响您的历史答题数据与能力层阶。",
    "clearDataTitle": "删除所有数据",
    "clearDataDesc": "清空所有模块的本地练习记录",
    "clearDataBtn": "清空数据",
    "clearDataSuccessToast": "所有训练数据已清空",
    "clearDataConfirmMessage": "确定要清空 FormSight 所有训练日志、历史会话与能力评级数据吗？此操作无法撤销！",
    "exportSuccessToast": "全量数据已流式导出为 JSON 备份",
    "exportFailToast": "导出失败，请重试",
    "importSuccessToast": "数据已成功分批导入并合并！",
    "importInvalidToast": "导入失败，备份文件格式不匹配",
~~~~~
~~~~~json.new
    "exportStream": "导出 JSON 备份",
    "exporting": "正在流式打包...",
    "importBackup": "还原 JSON 备份",
    "importing": "正在还原...",
    "importingTitle": "正在还原数据备份",
    "importingDesc": "正在清空旧数据并写入备份记录与档案，请稍候且勿关闭窗口...",
    "pruneTitle": "数据库瘦身与修剪",
    "pruneDesc": "清理 90 天以前的高开销图形几何细节",
    "pruneBtn": "安全瘦身",
    "pruneSuccessToast": "已修剪 {{count}} 条 90 天前记录中的多边形/点阵细节，释放了海量存储空间！",
    "pruneFailToast": "修剪操作失败",
    "pruneConfirmMessage": "确定要清理 90 天前记录中的多边形/点阵冗余图形细节吗？此操作将大幅压缩存储空间，且完全保留您的总做答数、打卡日历、正确率与能力层阶！",
    "resetPlansTitle": "恢复官方训练计划",
    "resetPlansDesc": "清空自定义计划，恢复官方预设",
    "resetPlansBtn": "重置计划",
    "resetPlansSuccessToast": "所有训练计划已恢复为官方预设推荐",
    "resetPlansConfirmMessage": "确定要清除所有自定义计划并恢复官方默认推荐训练流吗？此操作不会影响您的历史答题数据与能力层阶。",
    "clearDataTitle": "删除所有数据",
    "clearDataDesc": "清空所有模块的本地练习记录",
    "clearDataBtn": "清空数据",
    "clearDataSuccessToast": "所有训练数据已清空",
    "clearDataConfirmMessage": "确定要清空 FormSight 所有训练日志、历史会话与能力评级数据吗？此操作无法撤销！",
    "exportSuccessToast": "全量数据已流式导出为 JSON 备份",
    "exportFailToast": "导出失败，请重试",
    "importSuccessToast": "备份数据已成功完整还原！",
    "importInvalidToast": "还原失败，备份文件格式不匹配",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "exportStream": "Stream Export JSON",
    "exporting": "Streaming backup...",
    "importBackup": "Import JSON Backup",
    "importing": "Importing...",
    "importingTitle": "Restoring Data Backup",
    "importingDesc": "Writing training records and aggregated profiles, please wait and do not close the window...",
    "pruneTitle": "Database Prune & Clean",
    "pruneDesc": "Prune polygon/grid geometry details older than 90 days",
    "pruneBtn": "Safe Prune",
    "pruneSuccessToast": "Pruned {{count}} cold records older than 90 days, storage reclaimed!",
    "pruneFailToast": "Prune operation failed",
    "pruneConfirmMessage": "Are you sure you want to prune geometry details from records older than 90 days? Your total trial counts, attendance calendar, and skill levels will be 100% preserved.",
    "resetPlansTitle": "Reset Official Plans",
    "resetPlansDesc": "Clear custom plans and restore official presets",
    "resetPlansBtn": "Reset Plans",
    "resetPlansSuccessToast": "All plans restored to official presets",
    "resetPlansConfirmMessage": "Are you sure you want to clear all custom plans and restore official presets? This will not affect your trial history or skill levels.",
    "clearDataTitle": "Delete All Data",
    "clearDataDesc": "Clear all local logs and career profile statistics",
    "clearDataBtn": "Clear All",
    "clearDataSuccessToast": "All training data cleared",
    "clearDataConfirmMessage": "Are you sure you want to clear all logs, sessions, and skill profiles? This action cannot be undone!",
    "exportSuccessToast": "Backup exported streamingly as JSON",
    "exportFailToast": "Export failed, please retry",
    "importSuccessToast": "Data imported and merged successfully!",
    "importInvalidToast": "Import failed, invalid backup file format",
~~~~~
~~~~~json.new
    "exportStream": "Export JSON Backup",
    "exporting": "Streaming backup...",
    "importBackup": "Restore JSON Backup",
    "importing": "Restoring...",
    "importingTitle": "Restoring Data Backup",
    "importingDesc": "Clearing old data and writing backup records and profiles, please wait and do not close the window...",
    "pruneTitle": "Database Prune & Clean",
    "pruneDesc": "Prune polygon/grid geometry details older than 90 days",
    "pruneBtn": "Safe Prune",
    "pruneSuccessToast": "Pruned {{count}} cold records older than 90 days, storage reclaimed!",
    "pruneFailToast": "Prune operation failed",
    "pruneConfirmMessage": "Are you sure you want to prune geometry details from records older than 90 days? Your total trial counts, attendance calendar, and skill levels will be 100% preserved.",
    "resetPlansTitle": "Reset Official Plans",
    "resetPlansDesc": "Clear custom plans and restore official presets",
    "resetPlansBtn": "Reset Plans",
    "resetPlansSuccessToast": "All plans restored to official presets",
    "resetPlansConfirmMessage": "Are you sure you want to clear all custom plans and restore official presets? This will not affect your trial history or skill levels.",
    "clearDataTitle": "Delete All Data",
    "clearDataDesc": "Clear all local logs and career profile statistics",
    "clearDataBtn": "Clear All",
    "clearDataSuccessToast": "All training data cleared",
    "clearDataConfirmMessage": "Are you sure you want to clear all logs, sessions, and skill profiles? This action cannot be undone!",
    "exportSuccessToast": "Backup exported streamingly as JSON",
    "exportFailToast": "Export failed, please retry",
    "importSuccessToast": "Backup data successfully restored!",
    "importInvalidToast": "Restore failed, invalid backup file format",
~~~~~

### 下一步建议

1. **实测还原流程**：
   - 导出当前数据作为备份文件。
   - 做几道新题或修改某些模块设置。
   - 点击“还原 JSON 备份”重新载入刚导出的文件，验证数据是否纯净恢复至导出时刻的状态。
2. **提交变更**：测试无误后告诉我，我将为你生成 Git 提交计划。
