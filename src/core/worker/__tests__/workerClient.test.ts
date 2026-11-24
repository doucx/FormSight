import { afterEach, describe, expect, it, vi } from 'vitest';
import { lttbDownsample } from '../../math/downsample';

/**
 * Worker 协议与降级等价契约（G1-12 / docs/data-engine.md §5）
 *
 * 主线程降级与 Worker 结果必须同构；worker 错误事件必须拒绝所有 pending，
 * 否则调用方会永久挂起。
 */

interface FakeWorkerInstance {
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  postMessage: (message: { id: number; action: string; payload: unknown }) => void;
}

class EchoWorker implements FakeWorkerInstance {
  static instances: EchoWorker[] = [];

  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor() {
    EchoWorker.instances.push(this);
  }

  postMessage(message: { id: number; action: string; payload: unknown }): void {
    setTimeout(() => {
      this.onmessage?.({
        data: { id: message.id, success: true, data: { action: message.action } },
      });
    }, 0);
  }
}

class HangingWorker implements FakeWorkerInstance {
  static instances: HangingWorker[] = [];

  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor() {
    HangingWorker.instances.push(this);
  }

  postMessage(): void {
    // 永不响应
  }
}

async function loadClient() {
  vi.resetModules();
  return (await import('../workerClient')).computeWorkerClient;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  EchoWorker.instances = [];
  HangingWorker.instances = [];
});

describe('workerClient 主线程降级', () => {
  it('无 Worker 环境时 LTTB 与本地实现一致', async () => {
    const client = await loadClient();
    const data = Array.from({ length: 200 }, (_, index) => ({ x: index, y: index * 2 }));

    await expect(client.runLttb(data, 20)).resolves.toEqual(lttbDownsample(data, 20));
  });

  it('无 Worker 环境时热力图分箱结果正确', async () => {
    const client = await loadClient();

    const result = await client.runHeatmapBinning({
      points: [
        { dx: 0, dy: 0, isHit: true },
        { dx: 2, dy: 2, isHit: true },
        { dx: 100, dy: 100, isHit: false },
      ],
      gridSize: 2,
      width: 10,
      height: 10,
      scale: 1,
    });

    expect(Array.from(result.bins)).toEqual([0, 0, 0, 2]);
    expect(result.maxBinCount).toBe(2);
    expect(result.avgDx).toBeCloseTo(34);
    expect(result.avgDy).toBeCloseTo(34);
  });

  it('无 Worker 环境时色相偏差分析结果正确', async () => {
    const client = await loadClient();

    const result = await client.runHueBiasAnalysis({
      records: [
        { targetH: 0, userH: 10, isHit: true },
        { targetH: 0, userH: 350, isHit: false },
        { targetH: 180, userH: 170, isHit: true },
      ],
    });

    expect(result.pointData.map((point) => point.bias)).toEqual([10, -10, -10]);
    expect(result.maxBiasRange).toBe(30);
    expect(result.sectorAverages).toEqual([
      { centerHue: 15, avgBias: 0 },
      { centerHue: 195, avgBias: -10 },
    ]);
  });

  it('空记录不抛错', async () => {
    const client = await loadClient();
    const result = await client.runHueBiasAnalysis({ records: [] });

    expect(result.pointData).toEqual([]);
    expect(result.sectorAverages).toEqual([]);
  });
});

describe('workerClient Worker 路径', () => {
  it('通过 postMessage 发送 action 并解析响应', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', EchoWorker);
    const client = await loadClient();

    await expect(client.runLttb([], 2)).resolves.toEqual({ action: 'lttb' });
    expect(EchoWorker.instances).toHaveLength(1);
  });

  it('worker 错误事件拒绝所有 pending，避免永久挂起', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', HangingWorker);
    const client = await loadClient();

    const pending = client.runLttb([{ x: 0, y: 0 }], 2);
    const worker = HangingWorker.instances[0];

    // 触发错误事件（实现修复前 pending 会一直挂起）
    worker.onerror?.({ message: 'boom' });
    const outcome = await Promise.race([
      pending.then(
        () => 'resolved',
        () => 'rejected',
      ),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 100)),
    ]);

    expect(outcome).toBe('rejected');
  });
});
