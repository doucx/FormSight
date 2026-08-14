import { describe, expect, it } from 'vitest';
import { AdaptiveEngine } from '../adaptiveEngine';

describe('AdaptiveEngine', () => {
  it('staircase mode - should increase level after 3 consecutive hits', () => {
    const engine = new AdaptiveEngine(5, true, 'staircase');
    expect(engine.recordResult(true).change).toBe('same');
    expect(engine.recordResult(true).change).toBe('same');
    const res3 = engine.recordResult(true);
    expect(res3.change).toBe('up');
    expect(res3.newLevel).toBe(6);
  });

  it('staircase mode - should decrease level immediately on miss', () => {
    const engine = new AdaptiveEngine(5, true, 'staircase');
    engine.recordResult(true);
    const resMiss = engine.recordResult(false);
    expect(resMiss.change).toBe('down');
    expect(resMiss.newLevel).toBe(4);
  });

  it('block mode - should evaluate and change level after full block', () => {
    const engine = new AdaptiveEngine(5, true, 'block', 0.8, 5); // 5 items/block
    for (let i = 0; i < 4; i++) {
      const res = engine.recordResult(true);
      expect(res.isBlockComplete).toBe(false);
      expect(res.change).toBe('same');
    }
    // 5th trial - 100% accuracy >= 80%
    const finalRes = engine.recordResult(true);
    expect(finalRes.isBlockComplete).toBe(true);
    expect(finalRes.change).toBe('up');
    expect(finalRes.newLevel).toBe(6);
  });

  it('setLevel - should constrain level within valid range (1..35)', () => {
    const engine = new AdaptiveEngine(5);
    engine.setLevel(100);
    expect(engine.getCurrentLevel()).toBe(35);

    engine.setLevel(-10);
    expect(engine.getCurrentLevel()).toBe(1);
  });

  it('getBlockProgress - should return correct progress in block mode', () => {
    const engine = new AdaptiveEngine(5, false, 'block', 0.8, 10);
    engine.recordResult(true);
    engine.recordResult(false);
    const progress = engine.getBlockProgress();
    expect(progress).toEqual({ current: 2, total: 10, hits: 1 });
  });
});