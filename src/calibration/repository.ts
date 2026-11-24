import { type CalibrationRunData, type CalibrationTrialData, getDB } from '../storage/db/schema';
import { buildSequence } from './sequence';
import type { CalibrationProtocol } from './types';

function makeRunId(): string {
  return `cal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createCalibrationRun(
  protocol: CalibrationProtocol,
): Promise<CalibrationRunData> {
  const db = await getDB();
  const sequence = buildSequence(protocol);
  const run: CalibrationRunData = {
    id: makeRunId(),
    protocolId: protocol.id,
    cardId: protocol.cardId,
    sequence,
    seed: protocol.seed,
    index: 0,
    status: 'in-progress',
    startedAt: Date.now(),
    trialCount: 0,
    hitCount: 0,
  };
  await db.put('calibration_runs', run);
  return run;
}

export async function getCalibrationRun(runId: string): Promise<CalibrationRunData | null> {
  const db = await getDB();
  return (await db.get('calibration_runs', runId)) ?? null;
}

export async function listCalibrationRuns(): Promise<CalibrationRunData[]> {
  const db = await getDB();
  const runs = await db.getAll('calibration_runs');
  return runs.sort((a, b) => b.startedAt - a.startedAt);
}

export async function getCalibrationTrials(runId: string): Promise<CalibrationTrialData[]> {
  const db = await getDB();
  const trials = await db.getAllFromIndex('calibration_trials', 'by-run', runId);
  return trials.sort((a, b) => a.index - b.index);
}

/**
 * Idempotent trial write + run progress update in one transaction.
 *
 * The trial id is `runId:index`, so a retry after a crash cannot double-count.
 */
export async function saveCalibrationTrial(
  runId: string,
  trial: Omit<CalibrationTrialData, 'id' | 'runId'>,
): Promise<CalibrationRunData | null> {
  const db = await getDB();
  const tx = db.transaction(['calibration_runs', 'calibration_trials'], 'readwrite');
  const runStore = tx.objectStore('calibration_runs');
  const trialStore = tx.objectStore('calibration_trials');

  const run = await runStore.get(runId);
  if (!run) {
    await tx.done;
    return null;
  }

  const id = `${runId}:${trial.index}`;
  const existing = await trialStore.get(id);
  if (!existing) {
    await trialStore.put({ ...trial, id, runId });
    run.index = Math.max(run.index, trial.index + 1);
    run.trialCount = Math.max(run.trialCount, trial.index + 1);
    if (trial.isHit) run.hitCount += 1;
    await runStore.put(run);
  }

  await tx.done;
  return run;
}

export async function completeCalibrationRun(runId: string): Promise<void> {
  const db = await getDB();
  const run = await db.get('calibration_runs', runId);
  if (!run) return;
  run.status = 'completed';
  run.finishedAt = Date.now();
  await db.put('calibration_runs', run);
}

export async function abortCalibrationRun(runId: string): Promise<void> {
  const db = await getDB();
  const run = await db.get('calibration_runs', runId);
  if (!run) return;
  run.status = 'aborted';
  run.finishedAt = Date.now();
  await db.put('calibration_runs', run);
}

export async function deleteCalibrationRun(runId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['calibration_runs', 'calibration_trials'], 'readwrite');
  await tx.objectStore('calibration_runs').delete(runId);
  const trials = await tx.objectStore('calibration_trials').index('by-run').getAllKeys(runId);
  for (const key of trials) {
    await tx.objectStore('calibration_trials').delete(key);
  }
  await tx.done;
}

export async function clearCalibrationData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['calibration_runs', 'calibration_trials'], 'readwrite');
  await tx.objectStore('calibration_runs').clear();
  await tx.objectStore('calibration_trials').clear();
  await tx.done;
}
