import { describe, expect, it } from 'vitest';
import type { CalibrationRunData, CalibrationTrialData } from '../../storage/db/schema';
import {
  CALIBRATION_EXPORT_FORMAT,
  buildExportBundle,
  buildRunExport,
  summarizeTrials,
} from '../export';

const run: CalibrationRunData = {
  id: 'cal_1',
  protocolId: 'test',
  cardId: 'star_single',
  sequence: [10, 12, 14, 16, 18],
  seed: 1,
  index: 5,
  status: 'completed',
  startedAt: 1,
  finishedAt: 2,
  trialCount: 5,
  hitCount: 3,
};

function trial(index: number, level: number, isHit: boolean): CalibrationTrialData {
  return {
    id: `cal_1:${index}`,
    runId: 'cal_1',
    index,
    level,
    isHit,
    responseTimeMs: 1000,
    timestamp: 1,
  };
}

describe('calibration export', () => {
  it('summarizes by level', () => {
    const summary = summarizeTrials([trial(0, 10, true), trial(1, 10, false), trial(2, 12, true)]);
    expect(summary.n).toBe(3);
    expect(summary.hits).toBe(2);
    expect(summary.byLevel).toEqual([
      { level: 10, n: 2, hits: 1, accuracy: 0.5 },
      { level: 12, n: 1, hits: 1, accuracy: 1 },
    ]);
  });

  it('builds a self-describing bundle with sequence and trials', () => {
    const payload = buildExportBundle([
      buildRunExport(run, [trial(0, 10, true)], {
        id: 'test',
        cardId: 'star_single',
        label: 'test',
        levels: [10, 12, 14, 16, 18],
        trialsPerLevel: 1,
        seed: 1,
      }),
    ]);
    expect(payload.format).toBe(CALIBRATION_EXPORT_FORMAT);
    expect(payload.runs[0].sequence).toEqual([10, 12, 14, 16, 18]);
    expect(payload.runs[0].summary.n).toBe(1);
    expect(payload.runs[0].trials[0].level).toBe(10);
  });
});
