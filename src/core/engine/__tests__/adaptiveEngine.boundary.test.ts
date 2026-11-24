import { describe, expect, it } from 'vitest';
import { AdaptiveEngine, MAX_LEVEL } from '../adaptiveEngine';

/**
 * 自适应引擎边界（G1-20 / docs/training-methodology.md）
 *
 * 层阶上限、Block 正确率区间与 setLevel 重置是最容易在重构中静默漂移的部分。
 */

describe('AdaptiveEngine 边界', () => {
  it('staircase 在 MAX_LEVEL 时不再上移', () => {
    const engine = new AdaptiveEngine(MAX_LEVEL, false, 'staircase');

    for (let index = 0; index < 9; index++) {
      expect(engine.recordResult(true).change).toBe('same');
    }
    expect(engine.getCurrentLevel()).toBe(MAX_LEVEL);
  });

  it('staircase 在 level 1 时不再下移', () => {
    const engine = new AdaptiveEngine(1, false, 'staircase');

    const result = engine.recordResult(false);

    expect(result.change).toBe('same');
    expect(engine.getCurrentLevel()).toBe(1);
  });

  it('block 正确率落在 [0.5, targetAccuracy) 时保持层阶', () => {
    const engine = new AdaptiveEngine(5, false, 'block', 0.8, 10);

    for (let index = 0; index < 5; index++) engine.recordResult(true);
    for (let index = 0; index < 4; index++) engine.recordResult(false);

    const completed = engine.recordResult(false);
    expect(completed.isBlockComplete).toBe(true);
    expect(completed.change).toBe('same');
    expect(engine.getCurrentLevel()).toBe(5);
  });

  it('block 正确率低于 0.5 时下移', () => {
    const engine = new AdaptiveEngine(10, false, 'block', 0.8, 10);

    for (let index = 0; index < 4; index++) engine.recordResult(true);
    for (let index = 0; index < 5; index++) engine.recordResult(false);

    const completed = engine.recordResult(false);
    expect(completed.isBlockComplete).toBe(true);
    expect(completed.change).toBe('down');
    expect(engine.getCurrentLevel()).toBe(7);
  });

  it('block 完成后进度归零', () => {
    const engine = new AdaptiveEngine(5, false, 'block', 0.8, 3);
    engine.recordResult(true);
    engine.recordResult(true);
    engine.recordResult(true);

    expect(engine.getBlockProgress()).toEqual({ current: 0, total: 3, hits: 0 });
  });

  it('fine 粒度步长为 1，standard 为 3', () => {
    const fine = new AdaptiveEngine(5, true, 'staircase');
    for (let index = 0; index < 3; index++) fine.recordResult(true);
    expect(fine.getCurrentLevel()).toBe(6);

    const standard = new AdaptiveEngine(5, false, 'staircase');
    for (let index = 0; index < 3; index++) standard.recordResult(true);
    expect(standard.getCurrentLevel()).toBe(8);
  });

  it('setLevel 夹取范围并清空累计状态', () => {
    const engine = new AdaptiveEngine(5, false, 'block', 0.8, 3);
    engine.recordResult(true);

    engine.setLevel(MAX_LEVEL + 100);

    expect(engine.getCurrentLevel()).toBe(MAX_LEVEL);
    expect(engine.getBlockProgress()).toEqual({ current: 0, total: 3, hits: 0 });
  });

  it('构造时 initialLevel 越界被夹取', () => {
    expect(new AdaptiveEngine(0).getCurrentLevel()).toBe(1);
    expect(new AdaptiveEngine(999).getCurrentLevel()).toBe(MAX_LEVEL);
  });

  it('非 block 模式没有 block 进度', () => {
    expect(new AdaptiveEngine(5, false, 'staircase').getBlockProgress()).toBeNull();
  });
});
