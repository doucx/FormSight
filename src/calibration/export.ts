import type { CalibrationRunData, CalibrationTrialData } from '../storage/db/schema';
import type { CalibrationProtocol } from './types';

export const CALIBRATION_EXPORT_FORMAT = 'formsight-calibration-runs';
export const CALIBRATION_EXPORT_VERSION = 1;

export interface CalibrationLevelSummary {
  level: number;
  n: number;
  hits: number;
  accuracy: number;
}

export interface CalibrationRunExport {
  run: CalibrationRunData;
  protocolId: string;
  protocol: CalibrationProtocol | null;
  sequence: number[];
  summary: {
    n: number;
    hits: number;
    accuracy: number;
    byLevel: CalibrationLevelSummary[];
  };
  trials: CalibrationTrialData[];
}

export interface CalibrationExportBundle {
  format: typeof CALIBRATION_EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  runs: CalibrationRunExport[];
}

export function summarizeTrials(trials: CalibrationTrialData[]): CalibrationRunExport['summary'] {
  const byLevel = new Map<number, { n: number; hits: number }>();
  let hits = 0;
  for (const trial of trials) {
    const bucket = byLevel.get(trial.level) ?? { n: 0, hits: 0 };
    bucket.n += 1;
    if (trial.isHit) {
      bucket.hits += 1;
      hits += 1;
    }
    byLevel.set(trial.level, bucket);
  }

  return {
    n: trials.length,
    hits,
    accuracy: trials.length > 0 ? hits / trials.length : 0,
    byLevel: [...byLevel.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, bucket]) => ({
        level,
        n: bucket.n,
        hits: bucket.hits,
        accuracy: bucket.n > 0 ? bucket.hits / bucket.n : 0,
      })),
  };
}

export function buildRunExport(
  run: CalibrationRunData,
  trials: CalibrationTrialData[],
  protocol: CalibrationProtocol | null,
): CalibrationRunExport {
  return {
    run,
    protocolId: run.protocolId,
    protocol,
    sequence: run.sequence,
    summary: summarizeTrials(trials),
    trials,
  };
}

export function buildExportBundle(runs: CalibrationRunExport[]): CalibrationExportBundle {
  return {
    format: CALIBRATION_EXPORT_FORMAT,
    version: CALIBRATION_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    runs,
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function calibrationExportFilename(prefix: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${prefix}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
    now.getHours(),
  )}-${pad(now.getMinutes())}.json`;
}

export async function copyJson(data: unknown): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
}
