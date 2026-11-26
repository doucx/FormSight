import { describe, expect, it } from 'vitest';
import type { CalibrationRunData, CalibrationTrialData } from '../../storage/db/schema';
import { analyzeCalibrationRun } from '../health';

const run: CalibrationRunData = {
  id: 'run',
  protocolId: 'qa',
  cardId: 'star_single',
  sequence: [],
  seed: 1,
  index: 0,
  status: 'completed',
  startedAt: 1,
  finishedAt: 2,
  trialCount: 0,
  hitCount: 0,
};

function trials(byLevel: Record<number, number>, perLevel = 6): CalibrationTrialData[] {
  const out: CalibrationTrialData[] = [];
  let index = 0;
  for (const [level, accuracy] of Object.entries(byLevel)) {
    const hits = Math.round(accuracy * perLevel);
    for (let i = 0; i < perLevel; i++) {
      out.push({
        id: `run:${index}`,
        runId: 'run',
        index,
        level: Number(level),
        isHit: i < hits,
        responseTimeMs: 1000,
        timestamp: 1,
      });
      index += 1;
    }
  }
  return out;
}

describe('calibration health', () => {
  it('classifies a monotone, centered curve as healthy', () => {
    const health = analyzeCalibrationRun(
      run,
      trials({ 10: 1, 12: 0.9, 14: 0.8, 16: 0.6, 18: 0.4, 20: 0.2 }),
    );
    expect(health.status).toBe('healthy');
    expect(health.t80).toBeGreaterThanOrEqual(13);
    expect(health.t80).toBeLessThanOrEqual(16);
    expect(health.monotonicViolations).toBe(0);
  });

  it('flags a ceiling curve as too-easy', () => {
    const health = analyzeCalibrationRun(
      run,
      trials({ 10: 0.9, 12: 0.9, 14: 0.9, 16: 0.9, 18: 0.9 }),
    );
    expect(health.status).toBe('too-easy');
  });

  it('flags a floor curve as too-hard', () => {
    const health = analyzeCalibrationRun(
      run,
      trials({ 16: 0.4, 20: 0.4, 24: 0.3, 28: 0.2, 32: 0.1 }),
    );
    expect(health.status).toBe('too-hard');
  });

  it('flags invalid runs by RT or completion', () => {
    const fast = trials({ 10: 1, 12: 0.8, 14: 0.5 }).map((trial) => ({
      ...trial,
      responseTimeMs: 100,
    }));
    expect(analyzeCalibrationRun(run, fast).status).toBe('invalid');
    expect(
      analyzeCalibrationRun({ ...run, status: 'in-progress' }, trials({ 10: 1, 12: 0.8, 14: 0.5 }))
        .status,
    ).toBe('invalid');
  });
});
