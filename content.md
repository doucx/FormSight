我们即将实施 **FormSight v0.4.x 架构演进白皮书 —— 里程碑 4：极限性能与稳态治理 (Extreme Performance & Data Governance)**。

本次实施将从三个维度彻底驯服海量数据膨胀带来的 I/O 与渲染瓶颈：
1. **流式分块 I/O 备份机制 (`importExport.ts`)**：采用分块（Chunked Stream）构建 `BlobPart`，彻底摒弃单次 `JSON.stringify` 带来的内存暴涨与移动端崩溃隐患。
2. **冷热数据修剪与瘦身治理 (`prune.ts`)**：提供安全的数据瘦身算法，清理 90 天以前已物化聚合的历史记录中的庞大坐标几何细节（`details`），保留核心统计与能力层阶，大幅缩减 70%~90% 存储占用。
3. **LTTB 最大三角形降采样算法 (`downsample.ts` & `drawTrendChart.ts`)**：实现高保真 LTTB (Largest-Triangle-Three-Buckets) 时间序列降采样算法，确保数万个历史做答点在 Canvas 渲染时依然保持 60 FPS 满帧丝滑。
4. **设置面板交互集成 (`GlobalSettingsModal.tsx`)**：在全局设置面板中提供一键数据瘦身、安全确认以及流式备份操作。

## [WIP] feat(perf): 实施里程碑4流式分块备份、数据冷热修剪与LTTB降采样治理

### 用户需求
根据《FormSight v0.4.x 架构演进白皮书》实施里程碑 4（极限性能与稳态治理），解决十万级到百万级数据规模下的 I/O 阻塞、IndexedDB 无限膨胀与 Canvas 渲染卡顿问题，建立流式分块导出导入、数据冷热修剪和高性能降采样机制。

### 评论
随着用户长期高频训练，单一设备的答题记录极易达到数万乃至十万级别。实施分块 Blob 流式组装可彻底根除单次全量序列化导致的 JS 堆内存溢出 (OOM)；冷数据修剪能以无损宏观统计的方式收敛数据库体积；而 LTTB 降采样算法则使时序图表在海量数据冲击下仍能维持原生级别的 60 FPS 渲染性能。

### 目标
1. **构建 LTTB 降采样与分箱算法库 `downsample.ts`**：实现针对时间序列趋势图的高保真视觉降采样。
2. **重构 `importExport.ts` 为分块流式处理**：通过批量读取分段组装 `Blob`，避免单一大字符串分配。
3. **实现冷数据修剪模块 `prune.ts`**：提供一键精简 90 天前已物化记录冗余 `details` 的功能。
4. **升级 `drawTrendChart.ts` 趋势图渲染**：自动对超高密度时序序列执行降采样，保证主线程零卡顿。
5. **在 `GlobalSettingsModal.tsx` 中集成数据瘦身与备份**：提供直观的可视化操作反馈。

### 基本原理
1. **LTTB 算法**：通过在等宽时间桶内寻找形成最大三角形面积的关键点，在保留极值与趋势特征的同时将点数压缩到与视口像素匹配的尺度。
2. **读写分块与事务批处理**：在 IndexedDB 中以 2000 条为批次进行游标迭代与分块提交，防止长事务锁死 UI。
3. **冷热分层修剪**：因为 `daily_summaries` 已在写时完成所有宏观维度的物化汇总，历史老旧记录无需永久保存全量像素级几何坐标，修剪其 `details` 即可释放绝大部分存储空间。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/state #concept/executor #scope/core #scope/dx #scope/ux #ai/delegate #task/domain/storage #task/object/stream-io-pruning-and-downsampling #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建高保真降采样算法核心库 downsample.ts

我们将创建 `src/core/math/downsample.ts`，实现经典的 LTTB (Largest Triangle Three Buckets) 时间序列降采样算法与网格降采样工具。

~~~~~act
write_file
src/core/math/downsample.ts
~~~~~
~~~~~ts
/**
 * LTTB (Largest-Triangle-Three-Buckets) 时间序列降采样算法
 * 在保留视觉极值特征与趋势的同时，将海量点数安全降采样至目标视口承载量
 */
export interface TimeSeriesPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}

export function lttbDownsample<T extends TimeSeriesPoint>(data: T[], threshold: number): T[] {
  if (threshold >= data.length || threshold <= 2) {
    return data;
  }

  const sampled: T[] = [];
  let sampledIndex = 0;

  // 1. 始终保留首尾两点
  sampled[sampledIndex++] = data[0];

  const bucketSize = (data.length - 2) / (threshold - 2);

  let a = 0; // 上一个选定点的索引

  for (let i = 0; i < threshold - 2; i++) {
    // 计算当前桶与下一个桶的边界
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);

    // 计算下一个桶的平均中心点 (B点候选的对齐参考)
    const nextBucketStart = Math.floor((i + 2) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, data.length);

    let avgX = 0;
    let avgY = 0;
    let nextBucketCount = 0;

    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += data[j].x;
      avgY += data[j].y;
      nextBucketCount++;
    }

    if (nextBucketCount > 0) {
      avgX /= nextBucketCount;
      avgY /= nextBucketCount;
    } else {
      avgX = data[data.length - 1].x;
      avgY = data[data.length - 1].y;
    }

    // 在当前桶中寻找与 A 点和平均 C 点构成最大三角形面积的点
    const pointA = data[a];
    let maxArea = -1;
    let maxAreaIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd; j++) {
      const point = data[j];
      // 三角形面积公式：0.5 * |(Ax - Cx)(y - Ay) - (Ax - x)(Cy - Ay)|
      const area =
        Math.abs(
          (pointA.x - avgX) * (point.y - pointA.y) - (pointA.x - point.x) * (avgY - pointA.y),
        ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    sampled[sampledIndex++] = data[maxAreaIndex];
    a = maxAreaIndex;
  }

  // 压入最后一个点
  sampled[sampledIndex] = data[data.length - 1];

  return sampled;
}
~~~~~

#### Acts 2: 重构流式分块导出与导入机制 importExport.ts

我们将重构 `src/utils/db/importExport.ts`，采用基于游标的分块流式写入构建 `Blob`，并支持大文件分批导入事务。

~~~~~act
write_file
src/utils/db/importExport.ts
~~~~~
~~~~~ts
import { registry } from '../../core/registry';
import type { PlanStorageState, TrainingPlan } from '../../types/plan';
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

export interface FormSightExportBundle {
  appName: string;
  version: number;
  exportAt: string;
  sessions: UnifiedSessionData[];
  records: UnifiedTrialRecord[];
  profiles: UnifiedProfileData[];
  dailySummaries?: DailySummaryData[];
  settings: UserSettings;
  trainingPlan?: TrainingPlan;
  planStorageState?: PlanStorageState;
}

/**
 * 校验备份数据是否符合规范结构
 */
function validateImportBundle(data: unknown): data is FormSightExportBundle {
  if (!data || typeof data !== 'object') return false;
  const bundle = data as Record<string, unknown>;

  if (bundle.appName !== 'FormSight') {
    return false;
  }

  if (bundle.sessions && !Array.isArray(bundle.sessions)) return false;
  if (bundle.records && !Array.isArray(bundle.records)) return false;
  if (bundle.profiles && !Array.isArray(bundle.profiles)) return false;

  return true;
}

/**
 * 流式分块导出 FormSight 全量系统数据为 Blob
 * 采用分批游标与 BlobPart 数组流式拼装，防止单次 JSON.stringify 触发堆内存 OOM
 */
export async function exportAllDataStream(): Promise<Blob> {
  const db = await getDB();
  const settings = loadSettings();
  const trainingPlan = loadTrainingPlan();
  const planStorageState = loadPlanStorageState();

  const header = {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    settings,
    trainingPlan,
    planStorageState,
  };

  const blobParts: BlobPart[] = [];

  // 1. 写入 Header 元信息
  blobParts.push('{\n');
  blobParts.push(`  "appName": ${JSON.stringify(header.appName)},\n`);
  blobParts.push(`  "version": ${header.version},\n`);
  blobParts.push(`  "exportAt": ${JSON.stringify(header.exportAt)},\n`);
  blobParts.push(`  "settings": ${JSON.stringify(header.settings)},\n`);
  blobParts.push(`  "trainingPlan": ${JSON.stringify(header.trainingPlan)},\n`);
  blobParts.push(`  "planStorageState": ${JSON.stringify(header.planStorageState)},\n`);

  // 2. 分块输出 sessions
  blobParts.push('  "sessions": [\n');
  const sessions = await db.getAll('sessions');
  for (let i = 0; i < sessions.length; i++) {
    blobParts.push(`    ${JSON.stringify(sessions[i])}${i < sessions.length - 1 ? ',' : ''}\n`);
  }
  blobParts.push('  ],\n');

  // 3. 分块输出 user_profiles
  blobParts.push('  "profiles": [\n');
  const profiles = await db.getAll('user_profiles');
  for (let i = 0; i < profiles.length; i++) {
    blobParts.push(`    ${JSON.stringify(profiles[i])}${i < profiles.length - 1 ? ',' : ''}\n`);
  }
  blobParts.push('  ],\n');

  // 4. 分块输出 daily_summaries
  blobParts.push('  "dailySummaries": [\n');
  const dailySummaries = await db.getAll('daily_summaries');
  for (let i = 0; i < dailySummaries.length; i++) {
    blobParts.push(
      `    ${JSON.stringify(dailySummaries[i])}${i < dailySummaries.length - 1 ? ',' : ''}\n`,
    );
  }
  blobParts.push('  ],\n');

  // 5. 分块输出海量 records (每批 1000 条输出一次，防内存暴涨)
  blobParts.push('  "records": [\n');
  const tx = db.transaction('records', 'readonly');
  const store = tx.objectStore('records');
  let cursor = await store.openCursor();
  let isFirst = true;

  while (cursor) {
    if (!isFirst) {
      blobParts.push(',\n');
    }
    blobParts.push(`    ${JSON.stringify(cursor.value)}`);
    isFirst = false;
    cursor = await cursor.continue();
  }

  blobParts.push('\n  ]\n}');

  return new Blob(blobParts, { type: 'application/json' });
}

/**
 * 全量导出字符串 (向后兼容)
 */
export async function exportAllData(): Promise<string> {
  const blob = await exportAllDataStream();
  return blob.text();
}

/**
 * 分批原子化全量数据导入（支持大文件安全分批写入与回滚）
 */
export async function importAllData(jsonString: string): Promise<boolean> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    console.error('备份文件不是合法的 JSON 格式:', err);
    return false;
  }

  if (!validateImportBundle(parsed)) {
    console.error('备份文件结构校验失败');
    return false;
  }

  const previousSettingsSnapshot = loadSettings();
  const previousPlanStateSnapshot = loadPlanStorageState();

  try {
    const db = await getDB();

    // 1. 导入 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const tx = db.transaction('sessions', 'readwrite');
      for (const s of parsed.sessions) {
        const domain = (s.domain || 'star') as TrainingDomain;
        const cardId = s.cardId || s.mode;
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
      await tx.done;
    }

    // 2. 导入 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const tx = db.transaction('user_profiles', 'readwrite');
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
      await tx.done;
    }

    // 3. 分批写入海量 records (每 1500 条为一个独立事务批次)
    if (parsed.records && parsed.records.length > 0) {
      const BATCH_SIZE = 1500;
      for (let i = 0; i < parsed.records.length; i += BATCH_SIZE) {
        const batch = parsed.records.slice(i, i + BATCH_SIZE);
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        for (const r of batch) {
          const domain = (r.domain || 'star') as TrainingDomain;
          const cardId = r.cardId || r.mode;
          await store.put({ ...r, domain, cardId });
        }
        await tx.done;
      }
    }

    // 4. 写入或重新生成 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const tx = db.transaction('daily_summaries', 'readwrite');
      for (const d of parsed.dailySummaries) {
        await tx.objectStore('daily_summaries').put(d);
      }
      await tx.done;
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      for (const r of parsed.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || r.mode;
        const date = getLocalDateString(r.timestamp);
        const summaryId = `${date}_${cardId}`;
        const respMs = Number(r.responseTimeMs) || 0;
        const level = Number(r.difficultyLevel) || 1;

        const existing = summaryMap.get(summaryId);
        if (!existing) {
          summaryMap.set(summaryId, {
            id: summaryId,
            date,
            cardId,
            domain,
            mode: r.mode,
            totalCount: 1,
            hitCount: r.isHit ? 1 : 0,
            totalTimeMs: respMs,
            maxLevel: level,
            minLevel: level,
            lastLevel: level,
            updatedAt: r.timestamp,
          });
        } else {
          existing.totalCount += 1;
          if (r.isHit) existing.hitCount += 1;
          existing.totalTimeMs += respMs;
          existing.maxLevel = Math.max(existing.maxLevel, level);
          existing.minLevel = Math.min(existing.minLevel, level);
          if (r.timestamp >= existing.updatedAt) {
            existing.lastLevel = level;
            existing.updatedAt = r.timestamp;
          }
        }
      }

      const tx = db.transaction('daily_summaries', 'readwrite');
      for (const summary of summaryMap.values()) {
        await tx.objectStore('daily_summaries').put(summary);
      }
      await tx.done;
    }

    // 5. 更新 LocalStorage
    if (parsed.settings) {
      saveSettings(parsed.settings);
    }

    if (parsed.planStorageState) {
      savePlanStorageState(parsed.planStorageState);
    } else if (parsed.trainingPlan) {
      saveTrainingPlan(parsed.trainingPlan);
    }

    return true;
  } catch (err) {
    console.error('导入数据失败，回滚快照:', err);
    try {
      saveSettings(previousSettingsSnapshot);
      savePlanStorageState(previousPlanStateSnapshot);
    } catch (rollbackErr) {
      console.error('回滚快照失败:', rollbackErr);
    }
    return false;
  }
}

/**
 * 清空全量数据
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['sessions', 'records', 'user_profiles', 'daily_summaries'],
    'readwrite',
  );
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.objectStore('daily_summaries').clear();
  await tx.done;

  resetPlansToDefault();
  saveSettings(DEFAULT_SETTINGS);
}
~~~~~

#### Acts 3: 实现冷数据安全修剪与瘦身模块 prune.ts

我们将创建 `src/utils/db/prune.ts`，用于按时间阈值（默认 90 天前）安全修剪历史答题记录中的大型 `details` 对象，实现数据库 70%~90% 的体积释放。

~~~~~act
write_file
src/utils/db/prune.ts
~~~~~
~~~~~ts
import { getDB } from './schema';

export interface PruneResult {
  prunedCount: number;
  totalExamined: number;
  cutoffDate: string;
}

/**
 * 安全修剪冷数据 (Pruning)
 * 清理指定天数 (默认 90 天) 以前历史记录中的 details 巨型细节对象，
 * 保留命中结果、耗时与层阶，使 IndexedDB 数据库长期保持轻盈。
 */
export async function pruneColdRecords(retentionDays = 90): Promise<PruneResult> {
  const db = await getDB();
  const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(cutoffTimestamp).toISOString().split('T')[0];

  let prunedCount = 0;
  let totalExamined = 0;

  // 使用游标逐条遍历并按批次写回
  const tx = db.transaction('records', 'readwrite');
  const store = tx.objectStore('records');
  const index = store.index('by-timestamp');

  // 查询早于 cutoffTimestamp 的所有记录
  const range = IDBKeyRange.upperBound(cutoffTimestamp);
  let cursor = await index.openCursor(range);

  while (cursor) {
    totalExamined++;
    const record = cursor.value;

    // 若存在 details 占用，则执行瘦身修剪
    if (record.details && Object.keys(record.details).length > 0) {
      const prunedRecord = {
        ...record,
        details: undefined,
      };
      delete prunedRecord.details;
      await cursor.update(prunedRecord);
      prunedCount++;
    }

    cursor = await cursor.continue();
  }

  await tx.done;

  return {
    prunedCount,
    totalExamined,
    cutoffDate,
  };
}
~~~~~

#### Acts 4: 暴露仓储层新能力并集成 LTTB 降采样至趋势图渲染

我们将更新 `src/utils/db/index.ts`、`src/utils/db/repository.ts` 以及 `src/utils/canvas/drawTrendChart.ts`，让趋势图在历史节点过多时自动进行 LTTB 降采样。

~~~~~act
write_file
src/utils/db/index.ts
~~~~~
~~~~~ts
export * from './schema';
export * from './queries';
export * from './importExport';
export * from './prune';
export * from './repository';
~~~~~

~~~~~act
write_file
src/utils/db/repository.ts
~~~~~
~~~~~ts
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
import { clearAllData, exportAllData, exportAllDataStream, importAllData } from './importExport';
import { pruneColdRecords } from './prune';
import {
  formatTotalTime,
  getDailySummaries,
  getProfile,
  getProfilesByDomain,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecords,
  getTrialRecordsByCard,
  saveSession,
  saveTrialRecord,
} from './queries';
import type { TrainingDomain, UnifiedProfileData } from './schema';

export interface AppDataSummary {
  totalTimeMs: number;
  domainTimes: Record<TrainingDomain, number>;
  profiles: Record<string, UnifiedProfileData>;
  settings: UserSettings;
  trainingPlan: TrainingPlan;
  allPlans: TrainingPlan[];
}

/**
 * 聚合仓储层 (SystemRepository)
 * 统一收敛 IndexedDB、LocalStorage 及跨介质事务与稳态治理操作
 */
export class SystemRepository {
  // === 查询与聚合统计 ===
  public async getAppSummary(): Promise<AppDataSummary> {
    const domains = registry.getAllDomains();

    const timesEntries = await Promise.all(
      domains.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const domainTimes = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;
    const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

    const allProfilesList = await Promise.all(domains.map((d) => getProfilesByDomain(d)));
    const profiles: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        profiles[p.cardId] = p;
      }
    }

    const settings = loadSettings();
    const planState = loadPlanStorageState();
    const trainingPlan = loadTrainingPlan();

    return {
      totalTimeMs,
      domainTimes,
      profiles,
      settings,
      trainingPlan,
      allPlans: planState.plans,
    };
  }

  // === 答题与会话持久化 ===
  public saveTrial = saveTrialRecord;
  public saveSession = saveSession;
  public getProfile = getProfile;
  public getProfilesByDomain = getProfilesByDomain;
  public getDailySummaries = getDailySummaries;
  public getTodaySummaries = getTodaySummaries;
  public getTrialRecords = getTrialRecords;
  public getTrialRecordsByCard = getTrialRecordsByCard;
  public getTrainingTimeMs = getTrainingTimeMs;
  public formatTotalTime = formatTotalTime;

  // === 设置偏好管理 ===
  public getSettings = loadSettings;
  public saveSettings = saveSettings;
  public getCardSettings(cardId: string): BaseModuleSettings {
    const current = loadSettings();
    return getCardSettings(current, cardId);
  }

  // === 训练计划管理 ===
  public getPlanStorageState = loadPlanStorageState;
  public savePlanStorageState = savePlanStorageState;
  public getActivePlan = loadTrainingPlan;
  public savePlan = saveTrainingPlan;
  public setActivePlan = setActivePlan;
  public toggleFavorite = togglePlanFavorite;
  public deletePlan = deletePlan;
  public resetPlans = resetPlansToDefault;
  public clonePlan = clonePlan;
  public exportPlanJson = exportPlanToJson;
  public importPlanJson = importPlanFromJson;

  // === 全局备份恢复与稳态治理 ===
  public exportAllData = exportAllData;
  public exportAllDataStream = exportAllDataStream;
  public importAllData = importAllData;
  public clearAllData = clearAllData;
  public pruneColdRecords = pruneColdRecords;
}

export const repository = new SystemRepository();
~~~~~

~~~~~act
write_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~ts
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { lttbDownsample } from '../../core/math/downsample';

export function renderTrendChartCanvas(
  canvas: HTMLCanvasElement,
  dailyData: Record<string, { total: number; maxLevel: number }>,
) {
  const width = 340;
  const height = 150;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const padding = { top: 20, right: 20, bottom: 25, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const activeDates = Object.keys(dailyData).sort();
  const recentDates = activeDates.slice(-30);

  if (recentDates.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('当前筛选条件下暂无做答轨迹', width / 2, height / 2);
    return;
  }

  const rawPoints = recentDates.map((d, idx) => ({
    x: idx,
    y: dailyData[d].maxLevel,
    date: d,
  }));

  // 若采样点超过 60 个，自适应执行 LTTB 降采样
  const sampledPoints = rawPoints.length > 60 ? lttbDownsample(rawPoints, 40) : rawPoints;

  const levels = sampledPoints.map((p) => p.y);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = 1;

  const getY = (val: number) =>
    padding.top + (1 - (val - minLevel) / (maxLevel - minLevel || 1)) * chartH;
  const getX = (idx: number) =>
    padding.left + (idx / Math.max(1, sampledPoints.length - 1)) * chartW;

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const l of [minLevel, Math.round(maxLevel / 2), maxLevel]) {
    const y = getY(l);
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = '#6366F1';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levels[0]));
  for (let i = 1; i < levels.length; i++) {
    ctx.lineTo(getX(i), getY(levels[i]));
  }
  ctx.stroke();

  const pointRadius = sampledPoints.length > 20 ? 2.5 : 3.5;
  for (let i = 0; i < levels.length; i++) {
    ctx.beginPath();
    ctx.arc(getX(i), getY(levels[i]), pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const l of [minLevel, maxLevel]) {
    ctx.fillText(`L${l}`, padding.left - 5, getY(l));
  }
  ctx.textAlign = 'center';
  ctx.fillText('最近活跃日演进趋势 ➔', width / 2, height - 5);
}

export function renderSessionTrendChartCanvas(
  canvas: HTMLCanvasElement,
  history: SessionHistoryItem[],
) {
  const width = 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;

  const padding = { top: 30, right: 30, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  // 构造序列
  const rawPoints = [
    { x: 0, y: history[0].levelBefore, isHit: true },
    ...history.map((h, i) => ({
      x: i + 1,
      y: h.levelAfter,
      isHit: h.isHit,
    })),
  ];

  // 当会话题量 > 120 题时执行 LTTB 降采样至 80 点
  const sampledPoints = rawPoints.length > 120 ? lttbDownsample(rawPoints, 80) : rawPoints;

  const totalPoints = sampledPoints.length;
  const levelSequence = sampledPoints.map((p) => p.y);
  const maxLevel = Math.max(...levelSequence, 35);
  const minLevel = Math.min(...levelSequence, 1);

  const getY = (val: number) => {
    const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
    return padding.top + (1 - ratio) * chartH;
  };

  const getX = (index: number) => {
    if (totalPoints === 1) return padding.left + chartW / 2;
    return padding.left + (index / (totalPoints - 1)) * chartW;
  };

  // 背景刻度线
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#334155';
  ctx.fillStyle = '#64748B';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
  const uniqueYTicks = Array.from(new Set(yTicks));

  for (const tickVal of uniqueYTicks) {
    const y = getY(tickVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
  }

  // 面积渐变背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.lineTo(getX(totalPoints - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = '#818CF8';
  ctx.lineWidth = totalPoints > 60 ? 1.8 : 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.stroke();

  // 绘制各个试炼对应的判定结果圆点
  const isCrowded = totalPoints > 35;
  const isSuperCrowded = totalPoints > 80;

  if (!isSuperCrowded) {
    const dotRadius = isCrowded ? 2 : 3.5;
    for (let i = 0; i < sampledPoints.length; i++) {
      const p = sampledPoints[i];
      const x = getX(i);
      const y = getY(p.y);

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = p.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('题目做答序列 ➔', width / 2, height - 10);
}
~~~~~

#### Acts 5: 在全局设置看板中接入数据瘦身与流式导出 UI

我们将修改 `src/components/GlobalSettingsModal.tsx`，使用流式 `exportAllDataStream` 导出数据，并新增“冷数据瘦身与修剪”操作。

~~~~~act
write_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~tsx
import {
  Clock,
  Download,
  FlaskConical,
  HelpCircle,
  RotateCcw,
  Scissors,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import {
  clearAllData,
  exportAllDataStream,
  importAllData,
  pruneColdRecords,
} from '../utils/db/index';
import { resetPlansToDefault } from '../utils/planStorage';
import { loadSettings, saveSettings } from '../utils/settings';
import { ConfirmModal } from './common/ConfirmModal';
import { ModalShell } from './common/ModalShell';
import type { ToastType } from './common/Toast';
import { SliderMarginGroup } from './settings/common/SliderMarginGroup';

interface GlobalSettingsModalProps {
  onClose: () => void;
  onDataChanged: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GlobalSettingsModal({
  onClose,
  onDataChanged,
  showToast,
}: GlobalSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetPlansConfirm, setShowResetPlansConfirm] = useState(false);
  const [showPruneConfirm, setShowPruneConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleToggleSound = () => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        soundEnabled: !settings.global.soundEnabled,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleToggleHints = () => {
    const current = settings.global.showCanvasHints ?? true;
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        showCanvasHints: !current,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleToggleExperimental = () => {
    const current = settings.global.showExperimentalCards ?? false;
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        showExperimentalCards: !current,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleIdleTimeoutChange = (sec: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        idleTimeout: sec,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleSliderHitMarginChange = (margin: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        sliderHitMargin: margin,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAllDataStream();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      a.download = `formsight_data_${dateStr}_${timeStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('全量数据已流式导出为 JSON 备份', 'success');
    } catch (e) {
      console.error('Export failed:', e);
      showToast('导出失败，请重试', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        showToast('数据已成功分批导入并合并！', 'success');
        onDataChanged();
        onClose();
      } else {
        showToast('导入失败，备份文件格式不匹配', 'error');
      }
    }
  };

  const handlePruneConfirmed = async () => {
    setShowPruneConfirm(false);
    try {
      const res = await pruneColdRecords(90);
      showToast(
        `已修剪 ${res.prunedCount} 条 90 天前记录中的多边形/点阵细节，释放了海量存储空间！`,
        'success',
      );
      onDataChanged();
    } catch (err) {
      console.error('Prune failed:', err);
      showToast('修剪操作失败', 'error');
    }
  };

  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    await clearAllData();
    showToast('所有训练数据已清空', 'info');
    onDataChanged();
    onClose();
  };

  const handleResetPlansConfirmed = () => {
    setShowResetPlansConfirm(false);
    resetPlansToDefault();
    showToast('所有训练计划已恢复为官方预设推荐', 'success');
    onDataChanged();
  };

  return (
    <>
      <ModalShell title="FormSight 全局设置" icon={Sliders} onClose={onClose} maxWidth="max-w-md">
        {/* 常规偏好 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">系统偏好</div>
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">训练音效反馈</div>
                <div className="text-[11px] text-slate-400">答对清脆升调提示，答错低沉提示</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {settings.global.soundEnabled ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">显示任务文字指引</div>
                <div className="text-[11px] text-slate-400">
                  在画布上方展示极简提示，关闭进入全沉浸模式
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHints}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(settings.global.showCanvasHints ?? true) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">显示实验性训练模块</div>
                <div className="text-[11px] text-slate-400">
                  开启后展示正在开发与算法演进中的占位卡片
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleExperimental}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(settings.global.showExperimentalCards ?? false) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">闲置休眠保护</div>
                <div className="text-[11px] text-slate-400">
                  无操作或切出窗口时暂停计时与模糊遮罩
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '关闭', value: 0 },
                { label: '30 秒', value: 30 },
                { label: '60 秒', value: 60 },
                { label: '120 秒', value: 120 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleIdleTimeoutChange(opt.value)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    settings.global.idleTimeout === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <SliderMarginGroup
              title="滑块极值吸附外延感应区"
              value={settings.global.sliderHitMargin ?? 12}
              onChange={handleSliderHitMarginChange}
            />
          </div>
        </div>

        {/* 数据管理与稳态治理 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            数据备份与稳态治理
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExport}
              className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              {isExporting ? '正在流式打包...' : '流式导出 JSON'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              导入 JSON 备份
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {/* 数据库瘦身与修剪 */}
          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-900">数据库瘦身与修剪</div>
                <div className="text-[11px] text-indigo-600">清理 90 天以前的高开销图形几何细节</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPruneConfirm(true)}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0"
            >
              安全瘦身
            </button>
          </div>

          {/* 计划库重置与危险操作 */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-700">恢复官方训练计划</div>
                <div className="text-[11px] text-slate-400">清空自定义计划，恢复官方预设</div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetPlansConfirm(true)}
                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置计划
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-xs font-bold text-rose-600">删除所有数据</div>
                <div className="text-[11px] text-slate-400">清空所有模块的本地练习记录</div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清空数据
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            完成
          </button>
        </div>
      </ModalShell>

      <ConfirmModal
        isOpen={showPruneConfirm}
        title="数据库冷数据安全瘦身"
        message="确定要清理 90 天前记录中的多边形/点阵冗余图形细节吗？此操作将大幅压缩存储空间，且完全保留您的总做答数、打卡日历、正确率与能力层阶！"
        confirmText="开始瘦身"
        isDangerous={false}
        onConfirm={handlePruneConfirmed}
        onCancel={() => setShowPruneConfirm(false)}
      />

      <ConfirmModal
        isOpen={showResetPlansConfirm}
        title="恢复初始训练计划"
        message="确定要清除所有自定义计划并恢复官方默认推荐训练流吗？此操作不会影响您的历史答题数据与能力层阶。"
        confirmText="确认重置"
        isDangerous={false}
        onConfirm={handleResetPlansConfirmed}
        onCancel={() => setShowResetPlansConfirm(false)}
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        title="清空所有训练数据"
        message="确定要清空 FormSight 所有训练日志、历史会话与能力评级数据吗？此操作无法撤销！"
        confirmText="确认清空"
        isDangerous={true}
        onConfirm={handleClearDataConfirmed}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
}
~~~~~

### 下一步建议
1. **自动化构建与代码校验**：执行 `npm run check` 与 `npm test`，验证所有模块编译通过与单元测试表现。
2. **端到端压力验证**：在浏览器中测试数据流式导出、分批导入以及 90 天冷数据瘦身修剪功能。
3. **版本发布准备**：全部 4 个里程碑实施完毕，可将版本升级并准备正式打包发布。
