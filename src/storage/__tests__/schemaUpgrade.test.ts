import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { afterEach, describe, expect, it } from 'vitest';
import { DB_NAME, DB_VERSION, getDB } from '../../storage/db/schema';

/**
 * IndexedDB 升级路径契约（G1-11 / ADR 0004）
 *
 * `upgrade` 只创建缺失的表与索引；这里验证旧版本库打开后：
 * 7 张表齐全、records 的业务索引补齐、旧记录不丢。
 */

const ALL_STORES = [
  'sessions',
  'records',
  'user_profiles',
  'daily_summaries',
  'app_settings',
  'training_plans',
  'app_metadata',
];

describe('IndexedDB 版本升级路径 (G1-11)', () => {
  afterEach(async () => {
    const db = await getDB();
    db.close();
    await indexedDB.deleteDatabase(DB_NAME);
  });

  it('v1 旧库升级到当前版本：表/索引齐全且旧记录保留', async () => {
    // 1. 以 v1 形状预置旧库（只有 records 表与 by-card 索引）
    const legacy = await openDB(DB_NAME, 1, {
      upgrade(database) {
        const records = database.createObjectStore('records', { keyPath: 'id' });
        records.createIndex('by-card', 'cardId');
      },
    });
    await legacy.put('records', {
      id: 'legacy_record',
      sessionId: 'legacy_session',
      cardId: 'star_single',
      timestamp: 1_700_000_000_000,
      difficultyLevel: 5,
      isHit: true,
      responseTimeMs: 800,
    });
    legacy.close();

    // 2. 用当前 getDB 打开，触发 upgrade
    const db = await getDB();

    expect(db.version).toBe(DB_VERSION);
    for (const store of ALL_STORES) {
      expect(db.objectStoreNames.contains(store as never), `missing store: ${store}`).toBe(true);
    }

    const tx = db.transaction('records');
    const indexNames = Array.from(tx.store.indexNames).sort();
    expect(indexNames).toEqual(
      ['by-card', 'by-card-timestamp', 'by-domain', 'by-session', 'by-timestamp'].sort(),
    );
    await tx.done;

    const preserved = await db.get('records', 'legacy_record');
    expect(preserved?.id).toBe('legacy_record');
  });
});
