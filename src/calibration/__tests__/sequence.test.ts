import { describe, expect, it } from 'vitest';
import { buildSequence, getRemainingSequence, getScheduledLevel } from '../sequence';
import type { CalibrationProtocol } from '../types';

const protocol: CalibrationProtocol = {
  id: 'test',
  cardId: 'star_single',
  label: 'test',
  levels: [10, 12, 14, 16, 18],
  trialsPerLevel: 6,
  seed: 123,
};

describe('calibration sequence', () => {
  it('balances every level in every block', () => {
    const sequence = buildSequence(protocol);
    expect(sequence).toHaveLength(30);
    for (let block = 0; block < 6; block++) {
      const slice = sequence.slice(block * 5, block * 5 + 5);
      expect([...slice].sort((a, b) => a - b)).toEqual([10, 12, 14, 16, 18]);
    }
  });

  it('is deterministic for a seed', () => {
    expect(buildSequence(protocol)).toEqual(buildSequence(protocol));
    expect(buildSequence({ ...protocol, seed: 124 })).not.toEqual(buildSequence(protocol));
  });

  it('resumes from an index without skipping levels', () => {
    const sequence = buildSequence(protocol);
    const remaining = getRemainingSequence(sequence, 7);
    expect(remaining).toEqual(sequence.slice(7));
    expect(getScheduledLevel(sequence, 7)).toBe(sequence[7]);
    expect(getScheduledLevel(sequence, 30)).toBeUndefined();
  });
});
