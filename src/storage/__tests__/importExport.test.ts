import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllData, exportAllData, importAllData } from '../../storage/db';
import { getTrialRecordsByCard, saveTrialRecord } from '../../storage/db/queries';
import { DB_VERSION, getDB } from '../../storage/db/schema';
import { DEFAULT_SETTINGS } from '../../storage/settings';

/**
 * 备份导入契约（G1-03 / ADR 0005）
 *
 * 真实失败：validateImportBundle 只检查 appName 与四个数组，
 * 非法元素在 clear() 已排队后才由 put() 抛出 DataError；
 * 同步异常不会中止事务，7 张表的清空照常提交，旧数据丢失。
 */

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeBundle(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: '2026-11-24T00:00:00.000Z',
    sessions: [],
    records: [],
    profiles: [],
    dailySummaries: [],
    settings: clone(DEFAULT_SETTINGS),
    ...overrides,
  };
}

function record(id: string, cardId = 'star_single', timestamp = 1_700_000_000_000) {
  return {
    id,
    sessionId: 'session_keep',
    cardId,
    timestamp,
    difficultyLevel: 5,
    isHit: true,
    responseTimeMs: 900,
  };
}

async function importRaw(bundle: unknown): Promise<boolean> {
  return importAllData(JSON.stringify(bundle));
}

async function seedRecord(): Promise<void> {
  await saveTrialRecord(record('keep'));
}

async function snapshot() {
  const db = await getDB();
  return {
    records: (await db.getAll('records')).length,
    sessions: (await db.getAll('sessions')).length,
    profiles: (await db.getAll('user_profiles')).length,
    summaries: (await db.getAll('daily_summaries')).length,
    plans: (await db.getAll('training_plans')).length,
  };
}

describe('importExport 备份导入契约 (G1-03)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('接受结构完整的备份并原样恢复记录', async () => {
    const ok = await importRaw(
      makeBundle({
        records: [record('r1'), record('r2', 'color_hue', 1_700_000_100_000)],
      }),
    );

    expect(ok).toBe(true);
    expect((await getTrialRecordsByCard('star_single')).map((r) => r.id)).toEqual(['r1']);
  });

  it('拒绝非 FormSight 备份', async () => {
    expect(await importRaw(makeBundle({ appName: 'OtherApp' }))).toBe(false);
  });

  it('拒绝非法 JSON 字符串', async () => {
    expect(await importAllData('{ not json')).toBe(false);
  });

  it('拒绝缺失 version 的备份', async () => {
    const bundle = makeBundle({ version: undefined });
    expect(await importRaw(bundle)).toBe(false);
  });

  it('拒绝高于当前 DB_VERSION 的未来版本', async () => {
    expect(await importRaw(makeBundle({ version: DB_VERSION + 1 }))).toBe(false);
    expect(await importRaw(makeBundle({ version: 999 }))).toBe(false);
  });

  it('拒绝非整数的 version', async () => {
    expect(await importRaw(makeBundle({ version: String(DB_VERSION) }))).toBe(false);
    expect(await importRaw(makeBundle({ version: 1.5 }))).toBe(false);
  });

  it('拒绝不是数组的表字段', async () => {
    expect(await importRaw(makeBundle({ sessions: {} }))).toBe(false);
    expect(await importRaw(makeBundle({ records: 'x' }))).toBe(false);
    expect(await importRaw(makeBundle({ profiles: 1 }))).toBe(false);
    expect(await importRaw(makeBundle({ dailySummaries: null }))).toBe(false);
  });

  it('拒绝缺少主键的记录元素', async () => {
    expect(await importRaw(makeBundle({ records: [{ cardId: 'star_single' }] }))).toBe(false);
    expect(
      await importRaw(makeBundle({ records: [{ ...record('r1'), timestamp: 'not-a-number' }] })),
    ).toBe(false);
    expect(await importRaw(makeBundle({ records: [{ ...record('r1'), isHit: 'yes' }] }))).toBe(
      false,
    );
  });

  it('拒绝缺少必填字段的会话、档案与日聚合元素', async () => {
    expect(await importRaw(makeBundle({ sessions: [{ id: 's1' }] }))).toBe(false);
    expect(await importRaw(makeBundle({ profiles: [{ cardId: 'star_single' }] }))).toBe(false);
    expect(
      await importRaw(makeBundle({ dailySummaries: [{ id: '2026-11-24_star_single' }] })),
    ).toBe(false);
  });

  it('拒绝非对象 settings 与非法 planStorageState', async () => {
    expect(await importRaw(makeBundle({ settings: 'broken' }))).toBe(false);
    expect(await importRaw(makeBundle({ planStorageState: { plans: [], activePlanId: 42 } }))).toBe(
      false,
    );
  });

  it('导入失败时不产生任何副作用：旧记录、设置与计划保持不变', async () => {
    await seedRecord();
    const before = await snapshot();

    const ok = await importRaw(makeBundle({ records: [{ cardId: 'star_single' }] }));

    expect(ok).toBe(false);
    expect(await snapshot()).toEqual(before);
    expect((await getTrialRecordsByCard('star_single')).map((r) => r.id)).toEqual(['keep']);
  });

  it('未知 cardId 归一化为 core 域，不静默丢弃备份', async () => {
    const ok = await importRaw(makeBundle({ records: [record('ghost', 'ghost_card')] }));

    expect(ok).toBe(true);
    const [ghost] = await getTrialRecordsByCard('ghost_card');
    expect(ghost.domain).toBe('core');
  });

  it('导出结果可被同一校验器接受', async () => {
    await seedRecord();
    const exported = await exportAllData();
    await clearAllData();

    expect(await importAllData(exported)).toBe(true);
    expect((await getTrialRecordsByCard('star_single')).map((r) => r.id)).toEqual(['keep']);
  });
});
