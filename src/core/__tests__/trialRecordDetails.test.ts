import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllData } from '../../storage/db';
import { getTrialRecordsByCard, saveTrialRecord } from '../../storage/db/queries';

/**
 * details 契约（G1-11 / docs/data-engine.md §4）
 *
 * `getTrialRecordsByCard` 把 details 平铺到记录根对象；
 * 若卡片把字段命名成 id/isHit/timestamp 等根字段，就会静默覆盖真实值。
 */

const cardSources = import.meta.glob<string>('../../cards/*/index.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const RESERVED_RECORD_KEYS = new Set([
  'id',
  'sessionId',
  'cardId',
  'domain',
  'timestamp',
  'difficultyLevel',
  'isHit',
  'responseTimeMs',
]);

const EXTRACT_PATTERN = /extractRecordDetails:\s*\([^)]*\)\s*=>\s*\(\{([\s\S]*?)\n\s{4,8}\}\),/;

function readExtractedKeys(modulePath: string): string[] | null {
  const source = cardSources[modulePath];
  if (!source.includes('extractRecordDetails')) return null;

  const match = EXTRACT_PATTERN.exec(source);
  if (!match) return null;

  return [...match[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((item) => item[1]);
}

const cardModules = Object.keys(cardSources).sort();

describe('extractRecordDetails 字段保留字契约 (G1-11)', () => {
  it('至少解析到一张卡的 details 字段（防止正则静默失效）', () => {
    const parsed = cardModules.filter((modulePath) => readExtractedKeys(modulePath) !== null);
    expect(parsed.length).toBeGreaterThan(20);
  });

  for (const modulePath of cardModules) {
    const keys = readExtractedKeys(modulePath);
    if (keys === null) continue;

    it(`card: ${modulePath} 的 details 不与记录根字段冲突`, () => {
      const collisions = keys.filter((key) => RESERVED_RECORD_KEYS.has(key));
      expect(collisions, `${modulePath} details collide: ${collisions.join(', ')}`).toEqual([]);
    });
  }
});

describe('details 平铺时根字段优先 (G1-11)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('details 中的同名字段不得覆盖记录根字段', async () => {
    await saveTrialRecord({
      id: 'record_true_id',
      sessionId: 'session_details',
      cardId: 'star_single',
      timestamp: 1_700_000_000_000,
      difficultyLevel: 8,
      isHit: true,
      responseTimeMs: 700,
      details: {
        id: 'shadow_id',
        isHit: false,
        timestamp: 0,
        userClick: [1, 2],
      },
    });

    const [record] = await getTrialRecordsByCard('star_single');

    expect(record.id).toBe('record_true_id');
    expect(record.isHit).toBe(true);
    expect(record.timestamp).toBe(1_700_000_000_000);
    expect(record.userClick).toEqual([1, 2]);
  });

  it('无 details 的记录保持原样', async () => {
    await saveTrialRecord({
      id: 'record_plain',
      sessionId: 'session_details',
      cardId: 'star_single',
      timestamp: 1_700_000_000_000,
      difficultyLevel: 5,
      isHit: false,
      responseTimeMs: 500,
    });

    const [record] = await getTrialRecordsByCard('star_single');
    expect(record.id).toBe('record_plain');
    expect(record.isHit).toBe(false);
  });
});
