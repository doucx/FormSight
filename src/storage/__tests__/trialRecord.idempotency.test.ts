import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllData } from '../../storage/db';
import {
  DuplicateTrialRecordError,
  getDailySummaries,
  getProfile,
  getTrialRecordsByCard,
  isDuplicateTrialRecordError,
  saveTrialRecord,
} from '../../storage/db/queries';
import type { UnifiedTrialRecord } from '../../storage/db/schema';

/**
 * 答题记录幂等契约（G1-04 / ADR 0006）
 *
 * 真实失败：saveTrialRecord 对 records 是 put（幂等），
 * 但 daily_summaries 与 user_profiles 是累加；同一 record.id 重放会双计。
 */

function makeRecord(id: string, cardId = 'star_single', timestamp = 1_700_000_000_000) {
  return {
    id,
    sessionId: 'session_idempotency',
    cardId,
    timestamp,
    difficultyLevel: 5,
    isHit: true,
    responseTimeMs: 900,
  } satisfies UnifiedTrialRecord;
}

describe('saveTrialRecord 幂等契约 (G1-04)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('同一 record.id 重放抛出 DuplicateTrialRecordError', async () => {
    await saveTrialRecord(makeRecord('dup'));

    await expect(saveTrialRecord(makeRecord('dup'))).rejects.toBeInstanceOf(
      DuplicateTrialRecordError,
    );
  });

  it('拒绝后明细、日聚合与档案均不重复计数', async () => {
    await saveTrialRecord(makeRecord('dup'));
    await expect(saveTrialRecord(makeRecord('dup'))).rejects.toBeInstanceOf(
      DuplicateTrialRecordError,
    );

    expect((await getTrialRecordsByCard('star_single')).length).toBe(1);

    const [summary] = await getDailySummaries({ cardId: 'star_single' });
    expect(summary.totalCount).toBe(1);
    expect(summary.hitCount).toBe(1);
    expect(summary.totalTimeMs).toBe(900);

    const profile = await getProfile('star_single');
    expect(profile?.totalTrials).toBe(1);
    expect(profile?.totalHits).toBe(1);
  });

  it('不同 record.id 正常累加，避免误拒绝', async () => {
    await saveTrialRecord(makeRecord('a'));
    await saveTrialRecord(makeRecord('b', 'star_single', 1_700_000_001_000));

    expect((await getTrialRecordsByCard('star_single')).map((r) => r.id).sort()).toEqual([
      'a',
      'b',
    ]);
    const [summary] = await getDailySummaries({ cardId: 'star_single' });
    expect(summary.totalCount).toBe(2);
  });

  it('isDuplicateTrialRecordError 只识别该类型', () => {
    expect(isDuplicateTrialRecordError(new DuplicateTrialRecordError('x'))).toBe(true);
    expect(isDuplicateTrialRecordError(new Error('x'))).toBe(false);
    expect(isDuplicateTrialRecordError('x')).toBe(false);
  });

  it('错误对象携带 recordId，便于调用方定位', async () => {
    await saveTrialRecord(makeRecord('dup'));

    await saveTrialRecord(makeRecord('dup')).catch((err: unknown) => {
      expect(isDuplicateTrialRecordError(err)).toBe(true);
      if (isDuplicateTrialRecordError(err)) {
        expect(err.recordId).toBe('dup');
      }
    });
  });
});
