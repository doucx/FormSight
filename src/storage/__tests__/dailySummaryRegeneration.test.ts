import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllData, importAllData } from '../../storage/db';
import { getDailySummaries } from '../../storage/db/queries';
import { DB_VERSION } from '../../storage/db/schema';

/**
 * 导入时重建日聚合契约（G1-05）
 *
 * 真实失败：旧实现用「与上一条相差 12 小时内就沿用上一条日期」的启发式，
 * 且假设记录按时间递增；导出按主键 id 排序，跨本地午夜的两条记录会被合并到前一天。
 */

function record(
  id: string,
  cardId: string,
  timestamp: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    sessionId: 'session_regen',
    cardId,
    timestamp,
    difficultyLevel: 5,
    isHit: true,
    responseTimeMs: 1000,
    ...overrides,
  };
}

function makeBundle(records: unknown[]) {
  return {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: '2026-11-24T00:00:00.000Z',
    sessions: [],
    records,
    profiles: [],
    settings: {},
  };
}

describe('导入时重建 daily_summaries (G1-05)', () => {
  // 失败路径用例会主动触发 importAllData 的错误日志；此处收口 stderr，
  // 断言本身不变。生产代码仍保留 console.error 供真实导入排查。
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await clearAllData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('跨本地午夜的两条记录分别落到各自日期', async () => {
    const dayOne = new Date(2026, 10, 24, 23, 30).getTime();
    const dayTwo = new Date(2026, 10, 25, 0, 30).getTime();

    expect(
      await importAllData(
        JSON.stringify(
          makeBundle([record('a', 'star_single', dayOne), record('b', 'star_single', dayTwo)]),
        ),
      ),
    ).toBe(true);

    const summaries = await getDailySummaries({ cardId: 'star_single' });
    expect(summaries.map((s) => s.id).sort()).toEqual([
      '2026-11-24_star_single',
      '2026-11-25_star_single',
    ]);
  });

  it('记录时间乱序时仍按各自时间戳归日', async () => {
    const dayOne = new Date(2026, 10, 24, 23, 30).getTime();
    const dayTwo = new Date(2026, 10, 25, 0, 30).getTime();

    expect(
      await importAllData(
        JSON.stringify(
          makeBundle([
            record('later', 'star_single', dayTwo),
            record('earlier', 'star_single', dayOne),
          ]),
        ),
      ),
    ).toBe(true);

    const summaries = await getDailySummaries({ cardId: 'star_single' });
    expect(summaries.map((s) => s.id).sort()).toEqual([
      '2026-11-24_star_single',
      '2026-11-25_star_single',
    ]);
  });

  it('同卡同日多条记录正确累计，lastLevel 取时间最新者', async () => {
    const base = new Date(2026, 10, 24, 9, 0).getTime();
    expect(
      await importAllData(
        JSON.stringify(
          makeBundle([
            record('r1', 'star_single', base + 0, { difficultyLevel: 7, isHit: true }),
            record('r2', 'star_single', base + 1000, { difficultyLevel: 3, isHit: false }),
            record('r3', 'star_single', base + 2000, { difficultyLevel: 9, isHit: true }),
          ]),
        ),
      ),
    ).toBe(true);

    const [summary] = await getDailySummaries({ cardId: 'star_single' });
    expect(summary.totalCount).toBe(3);
    expect(summary.hitCount).toBe(2);
    expect(summary.totalTimeMs).toBe(3000);
    expect(summary.maxLevel).toBe(9);
    expect(summary.minLevel).toBe(3);
    expect(summary.lastLevel).toBe(9);
  });

  it('缺失必填数值字段的备份被拒绝（ADR 0004 不保留读时垫片）', async () => {
    const ts = new Date(2026, 10, 24, 12, 0).getTime();
    expect(
      await importAllData(
        JSON.stringify(
          makeBundle([
            {
              id: 'missing',
              sessionId: 's',
              cardId: 'star_single',
              timestamp: ts,
              isHit: false,
            },
          ]),
        ),
      ),
    ).toBe(false);
  });

  it('不同卡片的记录互不合并', async () => {
    const ts = new Date(2026, 10, 24, 12, 0).getTime();
    expect(
      await importAllData(
        JSON.stringify(
          makeBundle([
            record('a', 'star_single', ts),
            record('b', 'color_hue', ts),
            record('c', 'star_single', ts + 1000),
          ]),
        ),
      ),
    ).toBe(true);

    const summaries = await getDailySummaries();
    expect(summaries.map((s) => s.id).sort()).toEqual([
      '2026-11-24_color_hue',
      '2026-11-24_star_single',
    ]);
    expect(summaries.find((s) => s.cardId === 'star_single')?.totalCount).toBe(2);
  });

  it('备份自带 dailySummaries 时以备份为准，不重算', async () => {
    const ts = new Date(2026, 10, 24, 12, 0).getTime();
    const bundle = {
      ...makeBundle([record('a', 'star_single', ts)]),
      dailySummaries: [
        {
          id: '2026-11-24_star_single',
          date: '2026-11-24',
          cardId: 'star_single',
          totalCount: 42,
          hitCount: 40,
          totalTimeMs: 42000,
          maxLevel: 20,
          minLevel: 1,
          lastLevel: 20,
          updatedAt: ts,
        },
      ],
    };

    expect(await importAllData(JSON.stringify(bundle))).toBe(true);
    await expect(getDailySummaries({ cardId: 'star_single' })).resolves.toHaveLength(1);
    const [summary] = await getDailySummaries({ cardId: 'star_single' });
    expect(summary.totalCount).toBe(42);
    expect(summary.maxLevel).toBe(20);
  });
});
