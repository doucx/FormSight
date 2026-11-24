/**
 * Calibration protocol types.
 *
 * A protocol is a fixed, balanced level sequence. It deliberately does not use
 * the adaptive engine: calibration needs planned coverage, not convergence.
 */
export interface CalibrationProtocol {
  id: string;
  cardId: string;
  label: string;
  levels: number[];
  trialsPerLevel: number;
  seed: number;
  notes?: string;
}
