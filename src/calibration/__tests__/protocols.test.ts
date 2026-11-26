import { describe, expect, it } from 'vitest';
import { PILOT_PROTOCOLS, buildCustomProtocol, resolveProtocol } from '../protocols';

describe('pilot v2 protocols', () => {
  it('contains the three pilot v4 cards and the expected 91 trials', () => {
    expect(PILOT_PROTOCOLS).toHaveLength(3);
    const total = PILOT_PROTOCOLS.reduce(
      (sum, protocol) => sum + protocol.levels.length * protocol.trialsPerLevel,
      0,
    );
    expect(total).toBe(91);
    expect(new Set(PILOT_PROTOCOLS.map((protocol) => protocol.id)).size).toBe(3);
  });

  it('builds and resolves an arbitrary QA protocol', () => {
    const protocol = buildCustomProtocol('star_single', [20, 10, 20, 15], 3, 42);
    expect(protocol.levels).toEqual([10, 15, 20]);
    expect(protocol.trialsPerLevel).toBe(3);
    const run = {
      protocolId: protocol.id,
      cardId: protocol.cardId,
      sequence: [10, 15, 20, 20, 15, 10, 10, 15, 20],
      seed: 42,
    };
    const resolved = resolveProtocol(run);
    expect(resolved?.levels).toEqual([10, 15, 20]);
    expect(resolved?.trialsPerLevel).toBe(3);
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
