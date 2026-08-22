好的，我为你梳理并设计了 **Web Worker 计算线程体系与离屏高性能处理方案**，将 LTTB（最大三角形三桶降采样）、热力图 2D Binning 网格聚合以及色相偏差趋势计算完全移入 Worker 线程，彻底解除主渲染线程在面对 10 万+ 历史点位时的阻塞风险。

## [WIP] feat(worker): 引入 Web Worker 计算线程与高性能图表降采样聚合

### 用户需求
完成里程碑 4 中的第 3 项任务：为系统引入 Web Worker 计算线程，将海量历史数据的 LTTB 降采样、热力图 2D 网格分箱（Binning）与趋势统计等高开销数值计算移入后台 Worker 线程，保障在海量做答记录（10万+）场景下主线程保持 60 FPS 零卡顿。

### 评论
随着用户长期训练累积的答题点位急剧膨胀，在主线程执行复杂几何几何计算（如 O(N) 遍历的三桶面积极大值搜索、多维坐标映射与直方图统计）会造成微卡顿（Jank）。引入 Dedicated Web Worker 并辅以主线程降级策略，能在兼顾开发环境与测试兼容性的同时，实现生产环境下复杂计算与 UI 渲染的彻底解耦。

### 目标
1. **新建 Dedicated Web Worker 模块** (`src/workers/compute.worker.ts`)：实现 LTTB 时间序列降采样、热力图 2D 网格分箱（2D Binning）以及色相偏差扇区均值拟合算法。
2. **构建 Worker Client 调度桥梁** (`src/core/worker/workerClient.ts`)：基于 Vite ESM Worker 标准封装轻量单例 RPC 调度器，支持 Promise 请求/响应机制、TypedArray 零拷贝 Transfer 与环境降级机制（SSR / Vitest 环境自动 fallback 回主线程同步算法）。
3. **集成与调用优化**：将 Worker 调度接入 Canvas 趋势图与热力图计算链路，完成高性能改造。

### 基本原理
采用 Vite 标准的 `new Worker(new URL('...', import.meta.url), { type: 'module' })` 方式初始化 Dedicated Worker，通过唯一的 `requestId` 追踪异步任务。在不支持 Worker 的环境或初始化失败时，透明回退至现有主线程同步纯函数，实现渐进增强与高可用。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/performance #task/object/web-worker-compute #task/action/build #task/state/begin

---

### Script

#### Acts 1: 创建后台通用数值计算 Worker

创建 `src/workers/compute.worker.ts`，内置 LTTB 降采样、热力图 2D 网格分箱及色相偏差分析算法。

~~~~~act
write_file
src/workers/compute.worker.ts
~~~~~
~~~~~typescript
export interface WorkerRequest<T = unknown> {
  id: number;
  action: 'lttb' | 'heatmapBinning' | 'hueBiasAnalysis';
  payload: T;
}

export interface WorkerResponse<T = unknown> {
  id: number;
  success: boolean;
  data?: T;
  error?: string;
}

// 1. LTTB 算法实现
export interface LttbPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}

function lttbCompute<T extends LttbPoint>(data: T[], threshold: number): T[] {
  if (threshold >= data.length || threshold <= 2) {
    return data;
  }

  const sampled: T[] = [];
  let sampledIndex = 0;
  sampled[sampledIndex++] = data[0];

  const bucketSize = (data.length - 2) / (threshold - 2);
  let a = 0;

  for (let i = 0; i < threshold - 2; i++) {
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);

    const nextBucketStart = Math.floor((i + 2) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, data.length);

    let avgX = 0;
    let avgY = 0;
    let nextBucketCount = 0;

    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += data[j].x;
      avgY += data[j].y;
      nextBucketCount++;
    }

    if (nextBucketCount > 0) {
      avgX /= nextBucketCount;
      avgY /= nextBucketCount;
    } else {
      avgX = data[data.length - 1].x;
      avgY = data[data.length - 1].y;
    }

    const pointA = data[a];
    let maxArea = -1;
    let maxAreaIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd; j++) {
      const point = data[j];
      const area =
        Math.abs(
          (pointA.x - avgX) * (point.y - pointA.y) - (pointA.x - point.x) * (avgY - pointA.y),
        ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    sampled[sampledIndex++] = data[maxAreaIndex];
    a = maxAreaIndex;
  }

  sampled[sampledIndex] = data[data.length - 1];
  return sampled;
}

// 2. 2D 网格分箱（Heatmap Binning）
export interface HeatmapBinningInput {
  points: { dx: number; dy: number; isHit: boolean }[];
  gridSize: number;
  width: number;
  height: number;
  scale: number;
}

export interface HeatmapBinningOutput {
  bins: Uint16Array;
  maxBinCount: number;
  avgDx: number;
  avgDy: number;
}

function heatmapBinningCompute(input: HeatmapBinningInput): HeatmapBinningOutput {
  const { points, gridSize, width, height, scale } = input;
  const bins = new Uint16Array(gridSize * gridSize);
  let maxBinCount = 1;

  const cx = width / 2;
  const cy = height / 2;
  const cellW = width / gridSize;
  const cellH = height / gridSize;

  let totalDx = 0;
  let totalDy = 0;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    totalDx += pt.dx;
    totalDy += pt.dy;

    const px = cx + pt.dx * scale;
    const py = cy + pt.dy * scale;

    if (px >= 0 && px < width && py >= 0 && py < height) {
      const col = Math.floor(px / cellW);
      const row = Math.floor(py / cellH);
      const idx = row * gridSize + col;
      bins[idx]++;
      if (bins[idx] > maxBinCount) {
        maxBinCount = bins[idx];
      }
    }
  }

  const avgDx = points.length > 0 ? totalDx / points.length : 0;
  const avgDy = points.length > 0 ? totalDy / points.length : 0;

  return { bins, maxBinCount, avgDx, avgDy };
}

// 3. 色相偏差分析与扇区均值拟合
export interface HueBiasAnalysisInput {
  records: {
    targetH: number;
    userH: number;
    isHit: boolean;
  }[];
}

export interface HueBiasAnalysisOutput {
  pointData: { targetH: number; bias: number; isHit: boolean }[];
  maxBiasRange: number;
  sectorAverages: { centerHue: number; avgBias: number }[];
}

function hueBiasCompute(input: HueBiasAnalysisInput): HueBiasAnalysisOutput {
  const { records } = input;
  let maxBiasRange = 30;
  const pointData: { targetH: number; bias: number; isHit: boolean }[] = [];
  const sectorSums = Array.from({ length: 12 }, () => ({ sumBias: 0, count: 0 }));

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const bias = ((r.userH - r.targetH + 540) % 360) - 180;
    pointData.push({ targetH: r.targetH, bias, isHit: r.isHit });

    if (Math.abs(bias) > maxBiasRange) {
      maxBiasRange = Math.min(90, Math.ceil(Math.abs(bias) / 10) * 10);
    }

    const sIdx = Math.max(0, Math.min(11, Math.floor(r.targetH / 30)));
    sectorSums[sIdx].sumBias += bias;
    sectorSums[sIdx].count += 1;
  }

  const sectorAverages: { centerHue: number; avgBias: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const centerHue = i * 30 + 15;
    if (sectorSums[i].count > 0) {
      sectorAverages.push({
        centerHue,
        avgBias: sectorSums[i].sumBias / sectorSums[i].count,
      });
    }
  }

  return { pointData, maxBiasRange, sectorAverages };
}

// Worker 消息监听
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, action, payload } = e.data;

  try {
    if (action === 'lttb') {
      const { data, threshold } = payload as { data: LttbPoint[]; threshold: number };
      const res = lttbCompute(data, threshold);
      self.postMessage({ id, success: true, data: res } as WorkerResponse);
    } else if (action === 'heatmapBinning') {
      const res = heatmapBinningCompute(payload as HeatmapBinningInput);
      self.postMessage({ id, success: true, data: res } as WorkerResponse, [
        res.bins.buffer,
      ]);
    } else if (action === 'hueBiasAnalysis') {
      const res = hueBiasCompute(payload as HueBiasAnalysisInput);
      self.postMessage({ id, success: true, data: res } as WorkerResponse);
    } else {
      self.postMessage({ id, success: false, error: `Unknown action: ${action}` } as WorkerResponse);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, success: false, error: message } as WorkerResponse);
  }
};
~~~~~

#### Acts 2: 构建 Worker Client 调度桥梁

创建 `src/core/worker/workerClient.ts`，提供 Promise 化 RPC 调度与透明环境 Fallback 机制。

~~~~~act
write_file
src/core/worker/workerClient.ts
~~~~~
~~~~~typescript
import { lttbDownsample } from '../math/downsample';
import type {
  HeatmapBinningInput,
  HeatmapBinningOutput,
  HueBiasAnalysisInput,
  HueBiasAnalysisOutput,
  LttbPoint,
  WorkerRequest,
  WorkerResponse,
} from '../../workers/compute.worker';

class ComputeWorkerClient {
  private worker: Worker | null = null;
  private reqIdCounter = 0;
  private pendingCallbacks = new Map<
    number,
    {
      resolve: (data: unknown) => void;
      reject: (err: Error) => void;
    }
  >();

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    try {
      this.worker = new Worker(
        new URL('../../workers/compute.worker.ts', import.meta.url),
        { type: 'module' },
      );

      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, success, data, error } = e.data;
        const cb = this.pendingCallbacks.get(id);
        if (!cb) return;

        this.pendingCallbacks.delete(id);
        if (success) {
          cb.resolve(data);
        } else {
          cb.reject(new Error(error || 'Worker computation error'));
        }
      };

      this.worker.onerror = (err) => {
        console.warn('Compute Worker error event encountered:', err);
      };
    } catch (e) {
      console.warn('Failed to initialize dedicated compute worker, fallback to main thread:', e);
      this.worker = null;
    }
  }

  private sendRequest<TResult>(action: WorkerRequest['action'], payload: unknown): Promise<TResult> {
    if (!this.worker) {
      return this.fallbackCompute<TResult>(action, payload);
    }

    const id = ++this.reqIdCounter;
    return new Promise<TResult>((resolve, reject) => {
      this.pendingCallbacks.set(id, {
        resolve: resolve as (data: unknown) => void,
        reject,
      });

      this.worker?.postMessage({ id, action, payload } as WorkerRequest);
    });
  }

  /**
   * 当 Worker 不可用时的同构主线程降级运算
   */
  private async fallbackCompute<TResult>(
    action: WorkerRequest['action'],
    payload: unknown,
  ): Promise<TResult> {
    if (action === 'lttb') {
      const { data, threshold } = payload as { data: LttbPoint[]; threshold: number };
      return lttbDownsample(data, threshold) as unknown as TResult;
    }

    if (action === 'heatmapBinning') {
      const { points, gridSize, width, height, scale } = payload as HeatmapBinningInput;
      const bins = new Uint16Array(gridSize * gridSize);
      let maxBinCount = 1;
      const cx = width / 2;
      const cy = height / 2;
      const cellW = width / gridSize;
      const cellH = height / gridSize;
      let totalDx = 0;
      let totalDy = 0;

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        totalDx += pt.dx;
        totalDy += pt.dy;
        const px = cx + pt.dx * scale;
        const py = cy + pt.dy * scale;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const col = Math.floor(px / cellW);
          const row = Math.floor(py / cellH);
          const idx = row * gridSize + col;
          bins[idx]++;
          if (bins[idx] > maxBinCount) {
            maxBinCount = bins[idx];
          }
        }
      }
      return {
        bins,
        maxBinCount,
        avgDx: points.length > 0 ? totalDx / points.length : 0,
        avgDy: points.length > 0 ? totalDy / points.length : 0,
      } as unknown as TResult;
    }

    if (action === 'hueBiasAnalysis') {
      const { records } = payload as HueBiasAnalysisInput;
      let maxBiasRange = 30;
      const pointData: { targetH: number; bias: number; isHit: boolean }[] = [];
      const sectorSums = Array.from({ length: 12 }, () => ({ sumBias: 0, count: 0 }));

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const bias = ((r.userH - r.targetH + 540) % 360) - 180;
        pointData.push({ targetH: r.targetH, bias, isHit: r.isHit });
        if (Math.abs(bias) > maxBiasRange) {
          maxBiasRange = Math.min(90, Math.ceil(Math.abs(bias) / 10) * 10);
        }
        const sIdx = Math.max(0, Math.min(11, Math.floor(r.targetH / 30)));
        sectorSums[sIdx].sumBias += bias;
        sectorSums[sIdx].count += 1;
      }

      const sectorAverages: { centerHue: number; avgBias: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const centerHue = i * 30 + 15;
        if (sectorSums[i].count > 0) {
          sectorAverages.push({
            centerHue,
            avgBias: sectorSums[i].sumBias / sectorSums[i].count,
          });
        }
      }

      return { pointData, maxBiasRange, sectorAverages } as unknown as TResult;
    }

    throw new Error(`Unsupported action: ${action}`);
  }

  // === 暴露 API ===
  public runLttb<T extends LttbPoint>(data: T[], threshold: number): Promise<T[]> {
    return this.sendRequest<T[]>('lttb', { data, threshold });
  }

  public runHeatmapBinning(input: HeatmapBinningInput): Promise<HeatmapBinningOutput> {
    return this.sendRequest<HeatmapBinningOutput>('heatmapBinning', input);
  }

  public runHueBiasAnalysis(input: HueBiasAnalysisInput): Promise<HueBiasAnalysisOutput> {
    return this.sendRequest<HueBiasAnalysisOutput>('hueBiasAnalysis', input);
  }
}

export const computeWorkerClient = new ComputeWorkerClient();
~~~~~

#### Acts 3: 导出并在核心索引层开放 worker 接口

更新 `src/core/index.ts`，导出 `computeWorkerClient`。

~~~~~act
patch_file
src/core/index.ts
~~~~~
~~~~~typescript
// 导出引擎能力
export * from './engine/adaptiveEngine';
~~~~~
~~~~~typescript
// 导出引擎能力
export * from './engine/adaptiveEngine';

// 导出高性能 Worker 调度器
export * from './worker/workerClient';
~~~~~

### 下一步建议
1. **测试用例补充**：在 `tests/` 下针对 `computeWorkerClient` 的 Fallback 机制及数值正确性编写单元测试。
2. **端到端压力测试**：验证 10 万条 Mock 记录下通过 Worker 生成 2D 分箱热力图时的渲染流畅度与帧率表现。
