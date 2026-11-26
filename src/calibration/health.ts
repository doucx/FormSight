import type { CalibrationRunData, CalibrationTrialData } from '../storage/db/schema';

export type CalibrationHealthStatus =
  | 'healthy'
  | 'too-easy'
  | 'too-hard'
  | 'flat'
  | 'noisy'
  | 'review'
  | 'invalid'
  | 'insufficient';

export interface CalibrationLevelHealth {
  level: number;
  n: number;
  hits: number;
  accuracy: number;
}

export interface CalibrationHealth {
  status: CalibrationHealthStatus;
  t80: number | null;
  ci: [number, number] | null;
  position: 'inside' | 'below-range' | 'above-range' | 'none';
  byLevel: CalibrationLevelHealth[];
  firstAccuracy: number;
  lastAccuracy: number;
  monotonicViolations: number;
  noiseRms: number;
  medianResponseTimeMs: number;
  invalid: boolean;
  notes: string[];
}

/** Weighted pool-adjacent-violators for a decreasing sequence. */
function pava(values: number[], weights: number[]): number[] {
  const y = values.map((value) => -value);
  const w = [...weights];
  const blocks: number[][] = y.map((_, index) => [index]);
  let i = 0;
  while (i < y.length - 1) {
    if (y[i] > y[i + 1] + 1e-12) {
      const totalWeight = w[i] + w[i + 1];
      const merged = (y[i] * w[i] + y[i + 1] * w[i + 1]) / totalWeight;
      y[i] = merged;
      w[i] = totalWeight;
      y.splice(i + 1, 1);
      w.splice(i + 1, 1);
      blocks[i].push(...blocks.splice(i + 1, 1)[0]);
      if (i > 0) i -= 1;
    } else {
      i += 1;
    }
  }
  const out = new Array<number>(blocks.reduce((sum, block) => sum + block.length, 0));
  blocks.forEach((block, index) => {
    for (const position of block) out[position] = -y[index];
  });
  return out;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function buildLevels(trials: CalibrationTrialData[]): CalibrationLevelHealth[] {
  const map = new Map<number, { n: number; hits: number }>();
  for (const trial of trials) {
    const bucket = map.get(trial.level) ?? { n: 0, hits: 0 };
    bucket.n += 1;
    if (trial.isHit) bucket.hits += 1;
    map.set(trial.level, bucket);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, bucket]) => ({
      level,
      n: bucket.n,
      hits: bucket.hits,
      accuracy: bucket.n > 0 ? bucket.hits / bucket.n : 0,
    }));
}

function crossing(levels: CalibrationLevelHealth[]): {
  t80: number | null;
  position: CalibrationHealth['position'];
  fitted: number[];
} {
  const usable = levels.filter((item) => item.n >= 3);
  if (usable.length < 3) {
    return { t80: null, position: 'none', fitted: [] };
  }
  const fitted = pava(
    usable.map((item) => item.accuracy),
    usable.map((item) => item.n),
  );
  if (fitted[0] <= 0.8) {
    return { t80: null, position: 'below-range', fitted };
  }
  for (let i = 1; i < usable.length; i++) {
    if (fitted[i] <= 0.8) {
      const p0 = fitted[i - 1];
      const p1 = fitted[i];
      const l0 = usable[i - 1].level;
      const l1 = usable[i].level;
      if (Math.abs(p0 - p1) < 1e-9) {
        return { t80: l1, position: 'inside', fitted };
      }
      return {
        t80: l0 + ((p0 - 0.8) / (p0 - p1)) * (l1 - l0),
        position: 'inside',
        fitted,
      };
    }
  }
  return { t80: null, position: 'above-range', fitted };
}

function bootstrapCi(trials: CalibrationTrialData[], reps = 200): [number, number] | null {
  if (trials.length < 10) return null;
  const estimates: number[] = [];
  for (let rep = 0; rep < reps; rep++) {
    const sample: CalibrationTrialData[] = [];
    for (let i = 0; i < trials.length; i++) {
      const pick = trials[Math.floor(Math.random() * trials.length)];
      sample.push(pick);
    }
    const result = crossing(buildLevels(sample));
    if (result.t80 !== null) estimates.push(result.t80);
  }
  if (estimates.length < 20) return null;
  estimates.sort((a, b) => a - b);
  const low = estimates[Math.floor(estimates.length * 0.05)];
  const high = estimates[Math.floor(estimates.length * 0.95)];
  return [low, high];
}

export function analyzeCalibrationRun(
  run: CalibrationRunData,
  trials: CalibrationTrialData[],
): CalibrationHealth {
  const byLevel = buildLevels(trials);
  const medianResponseTimeMs = median(trials.map((trial) => trial.responseTimeMs));
  const invalid = run.status !== 'completed' || trials.length === 0 || medianResponseTimeMs < 300;
  const firstAccuracy = byLevel[0]?.accuracy ?? 0;
  const lastAccuracy = byLevel[byLevel.length - 1]?.accuracy ?? 0;
  let monotonicViolations = 0;
  for (let i = 1; i < byLevel.length; i++) {
    if (byLevel[i].accuracy > byLevel[i - 1].accuracy + 0.2) monotonicViolations += 1;
  }
  const { t80, position, fitted } = crossing(byLevel);
  const noiseRms =
    fitted.length === byLevel.filter((item) => item.n >= 3).length
      ? Math.sqrt(
          byLevel
            .filter((item) => item.n >= 3)
            .reduce((sum, item, index) => sum + (item.accuracy - fitted[index]) ** 2, 0) /
            Math.max(1, fitted.length),
        )
      : 0;
  const notes: string[] = [];

  let status: CalibrationHealthStatus = 'review';
  if (invalid) {
    status = 'invalid';
    notes.push('run 未完成或中位 RT <300ms');
  } else if (byLevel.length < 3 || trials.length < 15) {
    status = 'insufficient';
    notes.push('levels <3 或题数 <15');
  } else if (firstAccuracy <= 0.8) {
    status = 'too-hard';
    notes.push('最低 level 已低于 80%，需要更简单的档位');
  } else if (lastAccuracy >= 0.8 || byLevel.every((item) => item.accuracy >= 0.8)) {
    status = 'too-easy';
    notes.push('最高 level 仍 ≥80%，需要更难的档位');
  } else if (
    Math.max(...byLevel.map((item) => item.accuracy)) -
      Math.min(...byLevel.map((item) => item.accuracy)) <
    0.12
  ) {
    status = 'flat';
    notes.push('各 level 正确率几乎不变，难度轴可能失效');
  } else if (monotonicViolations > 1 || noiseRms > 0.22) {
    status = 'noisy';
    notes.push('非单调/残差大；增加每级题数或检查刺激方差');
  } else if (t80 === null) {
    status = 'noisy';
    notes.push('无法定位 80% 穿越点');
  } else if (t80 < 8 || t80 > 28 || firstAccuracy < 0.85 || lastAccuracy > 0.3) {
    status = 'review';
    notes.push('阈值落在边界或少见区间，需要人工复核');
  } else {
    status = 'healthy';
    notes.push('曲线单调、阈值居中、首尾表现符合预期');
  }

  return {
    status,
    t80,
    ci: bootstrapCi(trials),
    position,
    byLevel,
    firstAccuracy,
    lastAccuracy,
    monotonicViolations,
    noiseRms,
    medianResponseTimeMs,
    invalid,
    notes,
  };
}
