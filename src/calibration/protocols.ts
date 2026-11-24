import type { CalibrationProtocol } from './types';

/**
 * S02 / S02b pilot protocols.
 *
 * Levels come from the pilot prior windows in
 * `docs/plan/calibration-v1/07_validation_report.md`. Keep this list small:
 * every run is 20–30 trials and is meant to be finished in one sitting.
 */
export const PILOT_PROTOCOLS: CalibrationProtocol[] = [
  {
    id: 'pilot-star-single',
    cardId: 'star_single',
    label: 'star_single · 10–18',
    levels: [10, 12, 14, 16, 18],
    trialsPerLevel: 6,
    seed: 101,
  },
  {
    id: 'pilot-star-double-r',
    cardId: 'star_double_r',
    label: 'star_double_r · 20–26',
    levels: [20, 21, 23, 25, 26],
    trialsPerLevel: 6,
    seed: 102,
  },
  {
    id: 'pilot-color-val',
    cardId: 'color_val',
    label: 'color_val · 3–9',
    levels: [3, 5, 7, 9],
    trialsPerLevel: 5,
    seed: 103,
  },
  {
    id: 'pilot-angle-parallel',
    cardId: 'angle_parallel_2afc',
    label: 'angle_parallel_2afc · 6–14',
    levels: [6, 8, 10, 12, 14],
    trialsPerLevel: 4,
    seed: 104,
  },
  {
    id: 'pilot-persp-prop-division',
    cardId: 'persp_prop_division',
    label: 'persp_prop_division · 9–17',
    levels: [9, 11, 13, 15, 17],
    trialsPerLevel: 4,
    seed: 105,
  },
];

export function getPilotProtocol(protocolId: string): CalibrationProtocol | undefined {
  return PILOT_PROTOCOLS.find((protocol) => protocol.id === protocolId);
}
