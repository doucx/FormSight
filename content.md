没问题，我已经为你制定了将用户偏好设置一并包含在全量 JSON 导出/导入数据中，并为此补齐单元测试与 Node 环境下 Web Storage 内存垫片的修改计划。

## [WIP] feat: 支撑偏好设置随全量 JSON 数据的导出与恢复

### 用户需求
在导出 JSON 备份时，将用户的偏好设置（如网格维度、自动翻页、弱点靶向、自适应模式等配置项）一并导出；在导入 JSON 数据时，自动还原恢复用户的偏好设置；同时编写对应的单元测试，且在轻量 Node 测试环境下增加 Web Storage API 内存键值持久化垫片。

### 评论
将偏好设置（`UserSettings`）同训练会话与日志一并纳入全量 JSON 备份中，能够确保用户在跨设备迁移或备份恢复后获得完全一致的使用体验。在单体测试层面，为缺乏 DOM 环境的 Node 测试上下文补充 `localStorage` 垫片，确保单元测试可以在无外置浏览器模拟器的环境下稳定高效运行。

### 目标
1. 修改 `src/utils/db.ts` 的 `exportAllData` 与 `importAllData` 函数，使其支持读取和写入用户偏好设置。
2. 在 `src/utils/__tests__/db.test.ts` 头部添加轻量级 `localStorage` 内存垫片。
3. 在 `src/utils/__tests__/db.test.ts` 中增加导出 JSON 备份包含偏好设置、清空后导入并成功还原偏好设置的断言测试。

### 基本原理
在 `exportAllData()` 执行时调用 `loadSettings()` 获取保存在 `localStorage` 中的用户偏好设置并打包进 JSON 根字段 `settings` 中；在 `importAllData()` 处理解析时，检测是否存在 `data.settings` 字段并调用 `saveSettings()` 恢复设置。在测试文件中准备内存 `localStorage` 对象作为缺失的 Web Storage 垫片，从而在 Node 测试环境下平滑支持偏好设置读写测试。

### 标签
#intent/build #flow/ready #priority/high #comp/storage #comp/tests #concept/config #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/settings-backup #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 修改 db.ts 以在全量 JSON 导出/导入中支持用户偏好设置

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { TrainingMode, TrialRecord } from '../types';

export interface SessionData {
~~~~~
~~~~~typescript.new
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { TrainingMode, TrialRecord } from '../types';
import { loadSettings, saveSettings } from './settings';

export interface SessionData {
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
~~~~~

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
    if (data.color_profiles) {
      for (const cp of data.color_profiles) {
        await tx.objectStore('color_profiles').put(cp);
      }
    }

    await tx.done;
    return true;
  } catch (err) {
~~~~~
~~~~~typescript.new
    if (data.color_profiles) {
      for (const cp of data.color_profiles) {
        await tx.objectStore('color_profiles').put(cp);
      }
    }

    await tx.done;

    if (data.settings) {
      saveSettings(data.settings);
    }

    return true;
  } catch (err) {
~~~~~

#### Acts 2: 更新 db.test.ts 补充 localStorage 内存垫片与偏好设置导出/导入测试

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

describe('db storage & import/export', () => {
  beforeEach(async () => {
    await clearAllData();
  });
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
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

const memoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    writable: true,
  });
}

describe('db storage & import/export', () => {
  beforeEach(async () => {
    await clearAllData();
    localStorage.clear();
  });
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

    const customSettings = { ...DEFAULT_SETTINGS, gridSize: 5, autoNext: false };
    saveSettings(customSettings);

    // 2. Export
    const exportedJson = await exportAllData();
    expect(exportedJson).toContain('star_1');
    expect(exportedJson).toContain('color_1');
    expect(exportedJson).toContain('"gridSize": 5');

    // 3. Clear DB & localStorage
    await clearAllData();
    localStorage.clear();
    const recordsEmpty = await getAllTrialRecords();
    expect(recordsEmpty.length).toBe(0);
    expect(loadSettings().gridSize).toBe(DEFAULT_SETTINGS.gridSize);

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
可以运行 `npm run test` 执行单体测试，验证包含偏好设置在内的所有数据库持久化与全量导出/导入测试是否顺利通过。
