import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearCalibrationData,
  completeCalibrationRun,
  createCalibrationRun,
  getCalibrationRun,
  getCalibrationTrials,
  saveCalibrationTrial,
} from '../repository';
import type { CalibrationProtocol } from '../types';

const protocol: CalibrationProtocol = {
  id: 'test-protocol',
  cardId: 'star_single',
  label: 'test',
  levels: [10, 12],
  trialsPerLevel: 2,
  seed: 7,
};

describe('calibration repository', () => {
  beforeEach(async () => {
    await clearCalibrationData();
  });

  it('creates a run with a balanced sequence', async () => {
    const run = await createCalibrationRun(protocol);
    expect(run.sequence).toHaveLength(4);
    expect(run.index).toBe(0);
    expect(run.status).toBe('in-progress');
    expect(await getCalibrationRun(run.id)).toEqual(run);
  });

  it('writes trials idempotently and advances the run index', async () => {
    const run = await createCalibrationRun(protocol);
    const updated = await saveCalibrationTrial(run.id, {
      index: 0,
      level: run.sequence[0],
      isHit: true,
      responseTimeMs: 1200,
      timestamp: 1,
    });
    expect(updated?.index).toBe(1);
    expect(updated?.trialCount).toBe(1);
    expect(updated?.hitCount).toBe(1);

    // duplicate write must not double count
    const duplicate = await saveCalibrationTrial(run.id, {
      index: 0,
      level: run.sequence[0],
      isHit: true,
      responseTimeMs: 1200,
      timestamp: 1,
    });
    expect(duplicate?.trialCount).toBe(1);
    expect(duplicate?.hitCount).toBe(1);

    const afterMiss = await saveCalibrationTrial(run.id, {
      index: 1,
      level: run.sequence[1],
      isHit: false,
      responseTimeMs: 900,
      timestamp: 2,
    });
    expect(afterMiss?.index).toBe(2);
    expect(afterMiss?.hitCount).toBe(1);

    const trials = await getCalibrationTrials(run.id);
    expect(trials.map((trial) => trial.index)).toEqual([0, 1]);
  });

  it('marks a run complete', async () => {
    const run = await createCalibrationRun(protocol);
    await completeCalibrationRun(run.id);
    const loaded = await getCalibrationRun(run.id);
    expect(loaded?.status).toBe('completed');
    expect(loaded?.finishedAt).toBeTypeOf('number');
  });
});
