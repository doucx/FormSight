import { describe, expect, it } from 'vitest';
import { type TimeSeriesPoint, lttbDownsample } from '../downsample';

/**
 * LTTB 降采样数学性质（G1-12 / docs/data-engine.md §5）
 *
 * 只影响「画出来的点」，不得抛错、不得改变首尾、不得产生 NaN 或乱序。
 */

function series(count: number): TimeSeriesPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    x: index,
    y: Math.sin(index / 10) * 100,
  }));
}

describe('lttbDownsample', () => {
  it('阈值不小于点数时原样返回', () => {
    const data = series(10);
    expect(lttbDownsample(data, 10)).toBe(data);
    expect(lttbDownsample(data, 100)).toBe(data);
  });

  it('阈值不大于 2 时原样返回（无法构成三角形）', () => {
    const data = series(10);
    expect(lttbDownsample(data, 2)).toBe(data);
    expect(lttbDownsample(data, 1)).toBe(data);
  });

  it('返回长度等于阈值', () => {
    const data = series(1000);
    expect(lttbDownsample(data, 100)).toHaveLength(100);
    expect(lttbDownsample(data, 3)).toHaveLength(3);
  });

  it('始终保留首尾点', () => {
    const data = series(500);
    const sampled = lttbDownsample(data, 50);

    expect(sampled[0]).toBe(data[0]);
    expect(sampled[sampled.length - 1]).toBe(data[data.length - 1]);
  });

  it('x 单调不减且无 NaN', () => {
    const sampled = lttbDownsample(series(1000), 73);

    for (let index = 1; index < sampled.length; index++) {
      expect(sampled[index].x).toBeGreaterThanOrEqual(sampled[index - 1].x);
    }
    for (const point of sampled) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });

  it('保留原始对象引用（不复制、不改写）', () => {
    const data = series(300);
    const sampled = lttbDownsample(data, 30);

    for (const point of sampled) {
      expect(data).toContain(point);
    }
  });

  it('极值点不会导致空桶越界（n=3 边界）', () => {
    const data = series(3);
    const sampled = lttbDownsample(data, 3);

    expect(sampled).toHaveLength(3);
    expect(sampled[0]).toBe(data[0]);
    expect(sampled[2]).toBe(data[2]);
  });
});
