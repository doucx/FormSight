import type { CalibrationProtocol } from './types';

/**
 * Pilot v4 protocols (S02e). Only three cards remain:
 * - star_single ceilinged at 16 in v3;
 * - star_double_r needs confirmation around 21;
 * - color_val's L7 anomaly needs more low-end data.
 *
 * Star cards run first while fresh. The list is intentionally short: this is
 * the last pilot before the G1 decision.
 */
export const PILOT_PROTOCOLS: CalibrationProtocol[] = [
  {
    id: 'pilot-star-single',
    cardId: 'star_single',
    label: 'star_single · 16–35',
    levels: [16, 20, 24, 28, 32, 35],
    trialsPerLevel: 5,
    seed: 401,
  },
  {
    id: 'pilot-star-double-r',
    cardId: 'star_double_r',
    label: 'star_double_r · 19–27',
    levels: [19, 21, 23, 25, 27],
    trialsPerLevel: 5,
    seed: 402,
  },
  {
    id: 'pilot-color-val',
    cardId: 'color_val',
    label: 'color_val · 1–7',
    levels: [1, 2, 3, 4, 5, 7],
    trialsPerLevel: 6,
    seed: 403,
  },
];

export function getPilotProtocol(protocolId: string): CalibrationProtocol | undefined {
  return PILOT_PROTOCOLS.find((protocol) => protocol.id === protocolId);
}

/** Build a one-off QA protocol for an arbitrary card. */
export function buildCustomProtocol(
  cardId: string,
  levels: number[],
  trialsPerLevel: number,
  seed = Date.now() % 1_000_000,
): CalibrationProtocol {
  const sorted = [...new Set(levels)].sort((a, b) => a - b);
  return {
    id: `qa-${cardId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    cardId,
    label: `QA · ${cardId} · ${sorted[0] ?? '-'}–${sorted[sorted.length - 1] ?? '-'}`,
    levels: sorted,
    trialsPerLevel,
    seed,
  };
}

/**
 * Resolve a run back to a protocol. Presets win; arbitrary QA runs are
 * reconstructed from the stored sequence so old runs stay readable.
 */
export function resolveProtocol(run: {
  protocolId: string;
  cardId: string;
  sequence: number[];
  seed: number;
}): CalibrationProtocol | undefined {
  const preset = getPilotProtocol(run.protocolId);
  if (preset) return preset;
  const levels = [...new Set(run.sequence)].sort((a, b) => a - b);
  if (levels.length === 0) return undefined;
  const counts = new Map<number, number>();
  for (const level of run.sequence) counts.set(level, (counts.get(level) ?? 0) + 1);
  return {
    id: run.protocolId,
    cardId: run.cardId,
    label: `QA · ${run.cardId} · ${levels[0]}–${levels[levels.length - 1]}`,
    levels,
    trialsPerLevel: Math.max(...counts.values()),
    seed: run.seed,
  };
}
