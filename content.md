你的敏锐排查非常准确！排查后确认：**之前的 `exportAllData` 函数确实遗漏了色感训练相关的 3 张数据库表**（`color_sessions`、`color_records`、`color_profiles`），只导出了寻星练习的数据。

我将立即修正 `src/utils/db.ts` 中的导出与导入函数，将色感表包含进去。

## [WIP] fix(db): 补全 exportAllData 与 importAllData 中色感训练表的数据

### 错误分析
在 v3 版本引入色感训练模块（Hue / Value / Saturation）时，数据库 Schema 新增了 `color_sessions`、`color_records` 和 `color_profiles` 三张表。但在 `src/utils/db.ts` 的 `exportAllData` 与 `importAllData` 函数中，导出与导入逻辑仍仅针对旧有的寻星练习三张表（`sessions`、`records`、`user_profiles`）。

这导致用户在全局设置中导出全量 JSON 时，导出的文件里缺失 `color_records` 数据，致使 Python 分析脚本提示未找到色感训练日志。

### 用户需求
修复 `src/utils/db.ts` 中的 `exportAllData()` 和 `importAllData()`，使其完整导出与导入寻星练习和色感训练的全量数据。

### 评论
修复该问题后，用户的全量数据备份与 Python 离线分析脚本将能无缝对接，确保数据的完整性。

### 目标
1. 修改 `exportAllData()`：增加读取并导出 `color_sessions`、`color_records`、`color_profiles` 的逻辑。
2. 修改 `importAllData()`：增加在事务中恢复 `color_sessions`、`color_records`、`color_profiles` 的逻辑。

### 基本原理
IndexedDB 数据库在 `DB_VERSION = 3` 中共有 6 个 ObjectStores。修改事务范围至包含所有 6 个 ObjectStores，确保数据导出与导入对整个数据库生效。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/indexeddb-export #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `src/utils/db.ts` 中的导出与导入函数

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

  const exportObject = {
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
  };

  return JSON.stringify(exportObject, null, 2);
}

// === API 6: 全量 JSON 数据导入 ===
export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.records || !Array.isArray(data.records)) {
      throw new Error('无效的寻星练习导出格式');
    }

    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

    if (data.sessions) {
      for (const s of data.sessions) {
        await tx.objectStore('sessions').put(s);
      }
    }
    for (const r of data.records) {
      await tx.objectStore('records').put(r);
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        await tx.objectStore('user_profiles').put(p);
      }
    }

    await tx.done;
    return true;
  } catch (err) {
    console.error('导入寻星数据失败:', err);
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

### 下一步建议

代码更新后：
1. 重新在前端页面（如刷新页面）进入**“全局设置” $\rightarrow$ 点击“导出全量 JSON”**。
2. 将最新下载的 JSON 文件重新放置在根目录或 `analysis/` 目录下。
3. 再次运行 `python analyze_color.py`，即可顺利解析色相做答日志并生成多维度归因分析报告。
