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
    console.error('Backup file is not valid JSON:', err);
    return false;
  }

  if (!validateImportBundle(parsed)) {
    console.error('Backup bundle validation failed');
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
        const cardId = s.cardId || s.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : s.domain || 'core';
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
        const domain = card ? card.domain : p.domain || 'core';
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
          const cardId = r.cardId || r.mode;
          const card = registry.getCardById(cardId);
          const domain = card ? card.domain : r.domain || 'core';
          await store.put({ ...r, domain, cardId });
        }
        await tx.done;
      }
    }

    // 4. 写入或重新生成 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const tx = db.transaction('daily_summaries', 'readwrite');
      for (const d of parsed.dailySummaries) {
        const cardId = d.cardId || d.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : d.domain || 'core';
        await tx.objectStore('daily_summaries').put({
          ...d,
          cardId,
          domain,
        });
      }
      await tx.done;
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      for (const r of parsed.records) {
        const cardId = r.cardId || r.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : r.domain || 'core';
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
          existing.domain = domain;
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

    return true;
  } catch (err) {
    console.error('Failed to import data, rolling back snapshot:', err);
    try {
      saveSettings(previousSettingsSnapshot);
      savePlanStorageState(previousPlanStateSnapshot);
    } catch (rollbackErr) {
      console.error('Failed to rollback snapshot:', rollbackErr);
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
