import type { CalibrationProtocol } from './types';

/**
 * Pilot v3 protocols (S02d), after v2 showed:
 * - 4 trials/level is too noisy (color/angle alternated);
 * - color_val window was too hard;
 * - star_double_r ceilinged at 21;
 * - star_single hit a floor at L1 in both runs.
 *
 * Star runs are first: run them while fresh. Every level gets 6 trials except
 * star_double_r, which uses 5 to keep the run at 30.
 */
export const PILOT_PROTOCOLS: CalibrationProtocol[] = [
  {
    id: 'pilot-star-single',
    cardId: 'star_single',
    label: 'star_single · 1–16',
    levels: [1, 4, 7, 10, 13, 16],
    trialsPerLevel: 6,
    seed: 304,
  },
  {
    id: 'pilot-star-double-r',
    cardId: 'star_double_r',
    label: 'star_double_r · 17–35',
    levels: [17, 21, 25, 29, 33, 35],
    trialsPerLevel: 5,
    seed: 305,
  },
  {
    id: 'pilot-color-val',
    cardId: 'color_val',
    label: 'color_val · 1–9',
    levels: [1, 3, 5, 7, 9],
    trialsPerLevel: 6,
    seed: 301,
  },
  {
    id: 'pilot-color-hue',
    cardId: 'color_hue',
    label: 'color_hue · 9–17',
    levels: [9, 11, 13, 15, 17],
    trialsPerLevel: 6,
    seed: 302,
  },
  {
    id: 'pilot-angle-comparison',
    cardId: 'angle_comparison_2afc',
    label: 'angle_comparison_2afc · 14–30',
    levels: [14, 18, 22, 26, 30],
    trialsPerLevel: 6,
    seed: 303,
  },
];

export function getPilotProtocol(protocolId: string): CalibrationProtocol | undefined {
  return PILOT_PROTOCOLS.find((protocol) => protocol.id === protocolId);
}
