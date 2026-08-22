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
      prunedRecord.details = undefined;
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
