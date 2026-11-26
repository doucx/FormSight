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
