import type {
  HeatmapBinningInput,
  HeatmapBinningOutput,
  HueBiasAnalysisInput,
  HueBiasAnalysisOutput,
  LttbPoint,
  WorkerRequest,
  WorkerResponse,
} from '../../workers/compute.worker';
import { lttbDownsample } from '../math/downsample';

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
      this.worker = new Worker(new URL('../../workers/compute.worker.ts', import.meta.url), {
        type: 'module',
      });

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

  private sendRequest<TResult>(
    action: WorkerRequest['action'],
    payload: unknown,
  ): Promise<TResult> {
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
