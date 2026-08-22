/**
 * LTTB (Largest-Triangle-Three-Buckets) 时间序列降采样算法
 * 在保留视觉极值特征与趋势的同时，将海量点数安全降采样至目标视口承载量
 */
export interface TimeSeriesPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}

export function lttbDownsample<T extends TimeSeriesPoint>(data: T[], threshold: number): T[] {
  if (threshold >= data.length || threshold <= 2) {
    return data;
  }

  const sampled: T[] = [];
  let sampledIndex = 0;

  // 1. 始终保留首尾两点
  sampled[sampledIndex++] = data[0];

  const bucketSize = (data.length - 2) / (threshold - 2);

  let a = 0; // 上一个选定点的索引

  for (let i = 0; i < threshold - 2; i++) {
    // 计算当前桶与下一个桶的边界
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);

    // 计算下一个桶的平均中心点 (B点候选的对齐参考)
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

    // 在当前桶中寻找与 A 点和平均 C 点构成最大三角形面积的点
    const pointA = data[a];
    let maxArea = -1;
    let maxAreaIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd; j++) {
      const point = data[j];
      // 三角形面积公式：0.5 * |(Ax - Cx)(y - Ay) - (Ax - x)(Cy - Ay)|
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

  // 压入最后一个点
  sampled[sampledIndex] = data[data.length - 1];

  return sampled;
}
