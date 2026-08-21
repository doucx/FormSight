/**
 * 轻量 2D 梯度噪声与分形布朗运动 (FBM) 工具集
 * 用于纯过程生成连续灰度场与视知觉噪波
 */

export type Noise2DFunction = (x: number, y: number) => number;

/**
 * 构造轻量确定性 2D 伪随机梯度噪声
 */
export function createNoise2D(seed = Math.random()): Noise2DFunction {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  let s = Math.floor(seed * 2147483647);
  if (s <= 0) s += 2147483646;

  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const n = s % (i + 1);
    const temp = p[i];
    p[i] = p[n];
    p[n] = temp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const grad = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);

  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const g00 = grad[perm[X + perm[Y]] % 8];
    const g10 = grad[perm[X + 1 + perm[Y]] % 8];
    const g01 = grad[perm[X + perm[Y + 1]] % 8];
    const g11 = grad[perm[X + 1 + perm[Y + 1]] % 8];

    const n00 = g00[0] * xf + g00[1] * yf;
    const n10 = g10[0] * (xf - 1) + g10[1] * yf;
    const n01 = g01[0] * xf + g01[1] * (yf - 1);
    const n11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);

    const x1 = lerp(n00, n10, u);
    const x2 = lerp(n01, n11, u);
    return (lerp(x1, x2, v) + 1) / 2; // 归一化到 0..1
  };
}

/**
 * 分形布朗运动 (FBM - Fractional Brownian Motion)
 */
export function fbm2D(
  x: number,
  y: number,
  octaves: number,
  noiseFunc: Noise2DFunction,
  gain = 0.5,
  lacunarity = 2.0,
): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let totalAmp = 0;

  for (let i = 0; i < octaves; i++) {
    value += noiseFunc(x * frequency, y * frequency) * amplitude;
    totalAmp += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return totalAmp > 0 ? value / totalAmp : 0;
}

/**
 * 使用大津法 (Otsu's Method) 计算灰度图的最优二值化分割阈值 (0..255)
 */
export function calculateOtsuThreshold(buffer: Uint8Array | number[]): number {
  const histogram = new Int32Array(256);
  const total = buffer.length;

  for (let i = 0; i < total; i++) {
    const val = buffer[i];
    histogram[val]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let optimalThreshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    // 类间方差
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      optimalThreshold = t;
    }
  }

  return optimalThreshold;
}