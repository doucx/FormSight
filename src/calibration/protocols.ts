import type { CalibrationProtocol } from './types';

/**
 * Pilot v2 protocols (S02c), after pilot v1 showed the windows were too narrow:
 * angle 6–14 was a ceiling, persp 9–17 was flat, star 10–26 was confounded by R.
 *
 * Star cards must be recalibrated only after the angular-spacing fix; their
 * levels now refer to angular precision, not pixel spacing.
 */
export const PILOT_PROTOCOLS: CalibrationProtocol[] = [
  {
    id: 'pilot-color-hue',
    cardId: 'color_hue',
    label: 'color_hue · 9–17',
    levels: [9, 11, 13, 15, 17],
    trialsPerLevel: 4,
    seed: 201,
  },
  {
    id: 'pilot-color-val',
    cardId: 'color_val',
    label: 'color_val · 5–13',
    levels: [5, 7, 9, 11, 13],
    trialsPerLevel: 4,
    seed: 202,
  },
  {
    id: 'pilot-angle-parallel',
    cardId: 'angle_parallel_2afc',
    label: 'angle_parallel_2afc · 16–32',
    levels: [16, 20, 24, 28, 32],
    trialsPerLevel: 4,
    seed: 203,
  },
  {
    id: 'pilot-angle-comparison',
    cardId: 'angle_comparison_2afc',
    label: 'angle_comparison_2afc · 14–30',
    levels: [14, 18, 22, 26, 30],
    trialsPerLevel: 4,
    seed: 204,
  },
  {
    id: 'pilot-persp-prop-division',
    cardId: 'persp_prop_division',
    label: 'persp_prop_division · 5–25',
    levels: [5, 9, 13, 17, 21, 25],
    trialsPerLevel: 4,
    seed: 205,
  },
  {
    id: 'pilot-persp-prop-migration',
    cardId: 'persp_prop_migration',
    label: 'persp_prop_migration · 8–24',
    levels: [8, 12, 16, 20, 24],
    trialsPerLevel: 4,
    seed: 206,
  },
  {
    id: 'pilot-star-single',
    cardId: 'star_single',
    label: 'star_single · 1–16',
    levels: [1, 4, 7, 10, 13, 16],
    trialsPerLevel: 5,
    seed: 207,
  },
  {
    id: 'pilot-star-double-r',
    cardId: 'star_double_r',
    label: 'star_double_r · 1–21',
    levels: [1, 5, 9, 13, 17, 21],
    trialsPerLevel: 5,
    seed: 208,
  },
];

export function getPilotProtocol(protocolId: string): CalibrationProtocol | undefined {
  return PILOT_PROTOCOLS.find((protocol) => protocol.id === protocolId);
}
