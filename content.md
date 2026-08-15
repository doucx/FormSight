好的，我已为你制定了在全量 JSON 数据导出与导入流程中包含偏好设置（`UserSettings`）并补充单元测试的计划。

## [WIP] feat: 在全量 JSON 导出与导入中支持偏好设置 (UserSettings)

### 用户需求
在导出 JSON 备份时，将用户的偏好设置（如网格维度、自动翻页、弱点靶向、自适应模式等配置项）一并导出，并在导入数据时成功还原偏好设置，同时添加相应的单元测试。

### 评论
当前系统的导出与导入功能仅涵盖 IndexedDB 中的练习记录与能力看板，偏好设置存储在 `localStorage` 中且未参与备份。导出/导入时同步备份和恢复偏好设置，能极大提升用户在更换设备或备份恢复时的体验与一致性。

### 目标
1. 修改 `src/utils/db.ts` 中的 `exportAllData` 函数，使其包含从 `loadSettings()` 读取的当前偏好设置对象 `settings`。
2. 修改 `src/utils/db.ts` 中的 `importAllData` 函数，使其在解析 JSON 时，若存在 `data.settings` 字段，调用 `saveSettings` 将偏好设置写回 `localStorage`。
3. 在 `src/utils/__tests__/db.test.ts` 中更新 `exportAllData` 和 `importAllData` 的单元测试，验证导出 JSON 中包含偏好设置字段，且导入时能正确还原偏好设置。

### 基本原理
偏好设置由 `src/utils/settings.ts` 中的 `loadSettings` / `saveSettings` 管理（底层为 `localStorage`）。在 `db.ts` 中导入并接入这两个 API，扩展导出 JSON 的顶层对象字段（新增 `settings` 键），导入时尝试读取并调用 `saveSettings` 持久化，保持无缝向前兼容。

### 标签
#intent/build #flow/ready #priority/medium #comp/engine #concept/config #scope/core #ai/instruct #task/domain/storage #task/object/export-import-settings #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在 `src/utils/db.ts` 中接入偏好设置导出与导入逻辑

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { TrainingMode, TrialRecord } from '../types';
~~~~~
~~~~~typescript.new
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { TrainingMode, TrialRecord } from '../types';
import { loadSettings, saveSettings } from './settings';
~~~~~

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
// === API 5: 全量 JSON 数据导出 ===
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const colorSessions = await db.getAll('color_sessions');
  const colorRecords = await db.getAll('color_records');
  const colorProfiles = await db.getAll('color_profiles');

  const exportObject = {
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    color_sessions: colorSessions,
    color_records: colorRecords,
    color_profiles: colorProfiles,
  };

  return JSON.stringify(exportObject, null, 2);
}

// === API 6: 全量 JSON 数据导入 ===
export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);

    const db = await getDB();
    const tx = db.transaction(
      ['sessions', 'records', 'user_profiles', 'color_sessions', 'color_records', 'color_profiles'],
      'readwrite',
    );

    if (data.sessions) {
      for (const s of data.sessions) {
        await tx.objectStore('sessions').put(s);
      }
    }
    if (data.records) {
      for (const r of data.records) {
        await tx.objectStore('records').put(r);
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        await tx.objectStore('user_profiles').put(p);
      }
    }

    if (data.color_sessions) {
      for (const cs of data.color_sessions) {
        await tx.objectStore('color_sessions').put(cs);
      }
    }
    if (data.color_records) {
      for (const cr of data.color_records) {
        await tx.objectStore('color_records').put(cr);
      }
    }
    if (data.color_profiles) {
      for (const cp of data.color_profiles) {
        await tx.objectStore('color_profiles').put(cp);
      }
    }

    await tx.done;
    return true;
  } catch (err) {
    console.error('导入寻星与色感数据失败:', err);
    return false;
  }
}
~~~~~
~~~~~typescript.new
// === API 5: 全量 JSON 数据导出 ===
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const colorSessions = await db.getAll('color_sessions');
  const colorRecords = await db.getAll('color_records');
  const colorProfiles = await db.getAll('color_profiles');
  const settings = loadSettings();

  const exportObject = {
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    color_sessions: colorSessions,
    color_records: colorRecords,
    color_profiles: colorProfiles,
    settings,
  };

  return JSON.stringify(exportObject, null, 2);
}

// === API 6: 全量 JSON 数据导入 ===
export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);

    const db = await getDB();
    const tx = db.transaction(
      ['sessions', 'records', 'user_profiles', 'color_sessions', 'color_records', 'color_profiles'],
      'readwrite',
    );

    if (data.sessions) {
      for (const s of data.sessions) {
        await tx.objectStore('sessions').put(s);
      }
    }
    if (data.records) {
      for (const r of data.records) {
        await tx.objectStore('records').put(r);
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        await tx.objectStore('user_profiles').put(p);
      }
    }

    if (data.color_sessions) {
      for (const cs of data.color_sessions) {
        await tx.objectStore('color_sessions').put(cs);
      }
    }
    if (data.color_records) {
      for (const cr of data.color_records) {
        await tx.objectStore('color_records').put(cr);
      }
    }
    if (data.color_profiles) {
      for (const cp of data.color_profiles) {
        await tx.objectStore('color_profiles').put(cp);
      }
    }

    if (data.settings) {
      saveSettings(data.settings);
    }

    await tx.done;
    return true;
  } catch (err) {
    console.error('导入寻星与色感数据失败:', err);
    return false;
  }
}
~~~~~

#### Acts 2: 补充偏好设置导出与导入的单元测试

~~~~~act
patch_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript.old
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllColorProfiles,
  getAllColorTrialRecords,
  getAllTrialRecords,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
  getTotalTrainingTimeMs,
  getUserProfile,
  importAllData,
  saveColorSession,
  saveColorTrialRecord,
  saveSession,
  saveTrialRecord,
} from '../db';
~~~~~
~~~~~typescript.new
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllColorProfiles,
  getAllColorTrialRecords,
  getAllTrialRecords,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
  getTotalTrainingTimeMs,
  getUserProfile,
  importAllData,
  saveColorSession,
  saveColorTrialRecord,
  saveSession,
  saveTrialRecord,
} from '../db';
import { loadSettings, saveSettings } from '../settings';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript.old
  it('exportAllData and importAllData - should correctly export and restore data', async () => {
    // 1. Prepare initial data
    await saveTrialRecord({
      id: 'star_1',
      sessionId: 's1',
      mode: 'single',
      timestamp: 1000,
      difficultyLevel: 10,
      anchorA: [100, 100],
      targetB: [200, 200],
      userClick: [200, 200],
      angleDegree: 45,
      distanceRatio: 100,
      isHit: true,
      errorPixelDistance: 0,
      responseTimeMs: 300,
    });

    await saveColorTrialRecord({
      id: 'color_1',
      sessionId: 'cs1',
      mode: 'H',
      timestamp: 1000,
      difficultyLevel: 8,
      targetHSV: [120, 100, 100],
      userHSV: [120, 100, 100],
      isHit: true,
      errorValue: 0,
      responseTimeMs: 400,
    });

    // 2. Export
    const exportedJson = await exportAllData();
    expect(exportedJson).toContain('star_1');
    expect(exportedJson).toContain('color_1');

    // 3. Clear DB
    await clearAllData();
    const recordsEmpty = await getAllTrialRecords();
    expect(recordsEmpty.length).toBe(0);

    // 4. Import
    const success = await importAllData(exportedJson);
    expect(success).toBe(true);

    // 5. Verify restored data
    const recordsRestored = await getAllTrialRecords('single');
    expect(recordsRestored.length).toBe(1);
    expect(recordsRestored[0].id).toBe('star_1');

    const colorProfiles = await getAllColorProfiles();
    expect(colorProfiles.H?.totalTrainedCards).toBe(1);
  });
~~~~~
~~~~~typescript.new
  it('exportAllData and importAllData - should correctly export and restore data and settings', async () => {
    // 1. Prepare initial data and custom settings
    saveSettings({ ...loadSettings(), gridSize: 5, autoNext: false });

    await saveTrialRecord({
      id: 'star_1',
      sessionId: 's1',
      mode: 'single',
      timestamp: 1000,
      difficultyLevel: 10,
      anchorA: [100, 100],
      targetB: [200, 200],
      userClick: [200, 200],
      angleDegree: 45,
      distanceRatio: 100,
      isHit: true,
      errorPixelDistance: 0,
      responseTimeMs: 300,
    });

    await saveColorTrialRecord({
      id: 'color_1',
      sessionId: 'cs1',
      mode: 'H',
      timestamp: 1000,
      difficultyLevel: 8,
      targetHSV: [120, 100, 100],
      userHSV: [120, 100, 100],
      isHit: true,
      errorValue: 0,
      responseTimeMs: 400,
    });

    // 2. Export
    const exportedJson = await exportAllData();
    expect(exportedJson).toContain('star_1');
    expect(exportedJson).toContain('color_1');
    expect(exportedJson).toContain('"gridSize": 5');

    // 3. Clear DB & reset settings
    await clearAllData();
    saveSettings({ ...loadSettings(), gridSize: 3, autoNext: true });
    const recordsEmpty = await getAllTrialRecords();
    expect(recordsEmpty.length).toBe(0);

    // 4. Import
    const success = await importAllData(exportedJson);
    expect(success).toBe(true);

    // 5. Verify restored data and settings
    const recordsRestored = await getAllTrialRecords('single');
    expect(recordsRestored.length).toBe(1);
    expect(recordsRestored[0].id).toBe('star_1');

    const colorProfiles = await getAllColorProfiles();
    expect(colorProfiles.H?.totalTrainedCards).toBe(1);

    const restoredSettings = loadSettings();
    expect(restoredSettings.gridSize).toBe(5);
    expect(restoredSettings.autoNext).toBe(false);
  });
~~~~~

### 下一步建议
可以运行 `npm test` 命令校验单元测试结果。
