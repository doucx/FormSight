import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllData, exportAllData, importAllData } from '../../storage/db/importExport';
import {
  clearCalibrationData,
  createCalibrationRun,
  getCalibrationRun,
  getCalibrationTrials,
  saveCalibrationTrial,
} from '../repository';
import type { CalibrationProtocol } from '../types';

const protocol: CalibrationProtocol = {
  id: 'backup-test',
  cardId: 'star_single',
  label: 'backup',
  levels: [10, 12],
  trialsPerLevel: 1,
  seed: 3,
};

describe('calibration backup roundtrip', () => {
  beforeEach(async () => {
    await clearAllData();
    await clearCalibrationData();
  });

  it('exports, clears and restores calibration runs/trials', async () => {
    const run = await createCalibrationRun(protocol);
    await saveCalibrationTrial(run.id, {
      index: 0,
      level: run.sequence[0],
      isHit: true,
      responseTimeMs: 1000,
      timestamp: 1,
    });

    const bundle = JSON.parse(await exportAllData()) as Record<string, unknown>;
    expect(Array.isArray(bundle.calibrationRuns)).toBe(true);
    expect(Array.isArray(bundle.calibrationTrials)).toBe(true);
    expect((bundle.calibrationRuns as unknown[]).length).toBe(1);
    expect((bundle.calibrationTrials as unknown[]).length).toBe(1);

    await clearAllData();
    expect(await getCalibrationRun(run.id)).toBeNull();

    expect(await importAllData(JSON.stringify(bundle))).toBe(true);
    expect((await getCalibrationRun(run.id))?.status).toBe('in-progress');
    expect(await getCalibrationTrials(run.id)).toHaveLength(1);
  });

  it('still accepts an old bundle without calibration fields', async () => {
    const bundle = JSON.parse(await exportAllData()) as Record<string, unknown>;
    bundle.calibrationRuns = undefined;
    bundle.calibrationTrials = undefined;
    expect(await importAllData(JSON.stringify(bundle))).toBe(true);
    expect(await getCalibrationRun('missing')).toBeNull();
  });
});
