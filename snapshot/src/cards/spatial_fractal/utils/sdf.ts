export function hash3D(x: number, y: number, z: number, seed: number) {
  const s = seed ?? 42;
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s) * 43758.5453123;
  return n - Math.floor(n);
}

export function smoothNoise3D(x: number, y: number, z: number, seed: number) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const k = Math.floor(z);
  const fx = x - i;
  const fy = y - j;
  const fz = z - k;

  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const w = fz * fz * fz * (fz * (fz * 6 - 15) + 10);

  const x00 = (1 - u) * hash3D(i, j, k, seed) + u * hash3D(i + 1, j, k, seed);
  const x01 = (1 - u) * hash3D(i, j, k + 1, seed) + u * hash3D(i + 1, j, k + 1, seed);
  const x10 = (1 - u) * hash3D(i, j + 1, k, seed) + u * hash3D(i + 1, j + 1, k, seed);
  const x11 = (1 - u) * hash3D(i, j + 1, k + 1, seed) + u * hash3D(i + 1, j + 1, k + 1, seed);

  const y0 = (1 - v) * x00 + v * x10;
  const y1 = (1 - v) * x01 + v * x11;

  return (1 - w) * y0 + w * y1;
}

export function fbm3D(x: number, y: number, z: number, octaves: number, seed: number) {
  let val = 0;
  let amp = 0.55;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise3D(x * freq, y * freq, z * freq, seed);
    freq *= 2.05;
    amp *= 0.48;
  }
  return val;
}

export function evaluateSDF(x: number, y: number, z: number, level: number, seed: number) {
  const s = seed ?? 42;
  const lvl = level ?? 1;
  const r = Math.sqrt(x * x + y * y + z * z);

  const macroNoise =
    (smoothNoise3D(x * 0.85 + 1.2, y * 0.85 + 1.2, z * 0.85 + 1.2, s) - 0.5) * 0.65;
  let dist = r - 1.15 - macroNoise;

  if (lvl <= 8) return dist;

  const facetWeight = Math.min(1.0, (lvl - 8) / 10);
  const facetNoise =
    Math.abs(smoothNoise3D(x * 1.6 + 3.0, y * 1.6 + 3.0, z * 1.6 + 3.0, s) - 0.5) * 0.85;
  dist = dist - facetWeight * facetNoise;

  if (lvl <= 18) return dist;

  const chaosWeight = Math.min(1.0, (lvl - 18) / 17);
  const fineNoise = (fbm3D(x * 3.0, y * 3.0, z * 3.0, 3, s) - 0.5) * 0.65 * chaosWeight;
  dist = dist - fineNoise;

  return dist;
}
