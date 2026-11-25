import { describe, expect, it } from 'vitest';
import { PILOT_PROTOCOLS } from '../protocols';

describe('pilot v2 protocols', () => {
  it('contains the five pilot cards and the expected 156 trials', () => {
    expect(PILOT_PROTOCOLS).toHaveLength(5);
    const total = PILOT_PROTOCOLS.reduce(
      (sum, protocol) => sum + protocol.levels.length * protocol.trialsPerLevel,
      0,
    );
    expect(total).toBe(156);
    expect(new Set(PILOT_PROTOCOLS.map((protocol) => protocol.id)).size).toBe(5);
  });

  it('keeps levels sorted and inside the card range', () => {
    for (const protocol of PILOT_PROTOCOLS) {
      const sorted = [...protocol.levels].sort((a, b) => a - b);
      expect(protocol.levels).toEqual(sorted);
      for (const level of protocol.levels) {
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(35);
      }
    }
  });
});
