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
      (self as unknown as Worker).postMessage({ id, success: true, data: res } as WorkerResponse, [
        res.bins.buffer,
      ]);
    } else if (action === 'hueBiasAnalysis') {
      const res = hueBiasCompute(payload as HueBiasAnalysisInput);
      self.postMessage({ id, success: true, data: res } as WorkerResponse);
    } else {
      self.postMessage({
        id,
        success: false,
        error: `Unknown action: ${action}`,
      } as WorkerResponse);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, success: false, error: message } as WorkerResponse);
  }
};
