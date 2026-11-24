import type { CalibrationProtocol } from './types';

/**
 * Deterministic PRNG. We record the seed and the resulting sequence so a run
 * can be audited even if the protocol definition changes later.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build a balanced sequence: one trial per level in every block, level order
 * shuffled inside the block. Stopping mid-run still leaves roughly balanced
 * exposure across levels.
 */
export function buildSequence(protocol: CalibrationProtocol): number[] {
  const rng = mulberry32(protocol.seed);
  const sequence: number[] = [];
  for (let block = 0; block < protocol.trialsPerLevel; block++) {
    sequence.push(...shuffle(protocol.levels, rng));
  }
  return sequence;
}

export function getScheduledLevel(sequence: number[], index: number): number | undefined {
  return sequence[index];
}

export function getRemainingSequence(sequence: number[], index: number): number[] {
  return sequence.slice(Math.max(0, index));
}

export function formatLevelWindow(levels: number[]): string {
  if (levels.length === 0) return '—';
  return `${levels[0]}–${levels[levels.length - 1]}`;
}
