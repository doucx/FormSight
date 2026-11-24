import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllData, exportAllData } from '../../storage/db';
import { saveTrialRecord } from '../../storage/db/queries';
import { DB_VERSION, getLocalDateString } from '../../storage/db/schema';

/**
 * 备份顶层形状黄金（G1-11 / ADR 0005）
 *
 * 只钉顶层键集合与关键标量，不做整包快照：任何无关字段变化不应造成红灯，
 * 但版本语义与审计字段一旦漂移必须被看见。
 */

const EXPECTED_TOP_LEVEL_KEYS = [
  'appName',
  'dailySummaries',
  'exportAt',
  'planStorageState',
  'profiles',
  'records',
  'sessions',
  'settings',
  'trainingPlan',
  'version',
].sort();

describe('备份导出形状 (G1-11)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('顶层键集合稳定，版本等于 DB_VERSION', async () => {
    await saveTrialRecord({
      id: 'shape_record',
      sessionId: 'shape_session',
      cardId: 'star_single',
      timestamp: 1_700_000_000_000,
      difficultyLevel: 5,
      isHit: true,
      responseTimeMs: 800,
    });

    const bundle = JSON.parse(await exportAllData()) as Record<string, unknown>;

    expect(Object.keys(bundle).sort()).toEqual(EXPECTED_TOP_LEVEL_KEYS);
    expect(bundle.appName).toBe('FormSight');
    expect(bundle.version).toBe(DB_VERSION);
    expect(new Date(bundle.exportAt as string).toISOString()).toBe(bundle.exportAt);
    expect(bundle.sessions).toEqual([]);
    expect(bundle.records).toHaveLength(1);
    expect(bundle.dailySummaries).toHaveLength(1);
    expect(bundle.planStorageState).toBeTypeOf('object');
    expect(bundle.trainingPlan).toBeTypeOf('object');
    expect(bundle.settings).toBeTypeOf('object');
  });

  it('日聚合 id 使用本地日期 + cardId 组合', async () => {
    const timestamp = new Date(2026, 10, 24, 23, 30).getTime();
    await saveTrialRecord({
      id: 'shape_record',
      sessionId: 'shape_session',
      cardId: 'star_single',
      timestamp,
      difficultyLevel: 5,
      isHit: true,
      responseTimeMs: 800,
    });

    const bundle = JSON.parse(await exportAllData()) as {
      dailySummaries: Array<{ id: string; date: string }>;
    };

    expect(bundle.dailySummaries[0].date).toBe(getLocalDateString(timestamp));
    expect(bundle.dailySummaries[0].id).toBe(`${getLocalDateString(timestamp)}_star_single`);
  });
});
