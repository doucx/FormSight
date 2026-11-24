import { ChevronLeft, Download, FlaskConical, Play, RotateCcw, Trash2 } from 'lucide-preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { Button } from '../components/ui/button';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CalibrationRunData } from '../storage/db/schema';
import type { GlobalSettings, UserSettings } from '../storage/settings';
import { showToast } from '../stores/toastStore';
import { CalibrationRunner } from './CalibrationRunner';
import {
  type CalibrationRunExport,
  buildExportBundle,
  buildRunExport,
  calibrationExportFilename,
  downloadJson,
} from './export';
import { PILOT_PROTOCOLS } from './protocols';
import {
  clearCalibrationData,
  createCalibrationRun,
  getCalibrationTrials,
  listCalibrationRuns,
} from './repository';

interface CalibrationViewProps {
  runId?: string;
  settings: UserSettings;
  globalSettings: GlobalSettings;
  onNavigate: (runId?: string) => void;
  onExit: () => void;
}

export function CalibrationView({
  runId,
  settings,
  globalSettings,
  onNavigate,
  onExit,
}: CalibrationViewProps) {
  const { t } = useTranslation();
  const [runs, setRuns] = useState<CalibrationRunData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setRuns(await listCalibrationRuns());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const latestByProtocol = useMemo(() => {
    const map = new Map<string, CalibrationRunData>();
    for (const run of runs) {
      if (!map.has(run.protocolId)) map.set(run.protocolId, run);
    }
    return map;
  }, [runs]);

  const handleStart = async (protocolId: string) => {
    const protocol = PILOT_PROTOCOLS.find((item) => item.id === protocolId);
    if (!protocol) return;
    setBusy(true);
    try {
      const run = await createCalibrationRun(protocol);
      await refresh();
      onNavigate(run.id);
    } catch (err) {
      console.error('Failed to create calibration run:', err);
      showToast('创建校准 run 失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (run: CalibrationRunData) => {
    const protocol = PILOT_PROTOCOLS.find((item) => item.id === run.protocolId) ?? null;
    const trials = await getCalibrationTrials(run.id);
    const payload = buildExportBundle([buildRunExport(run, trials, protocol)]);
    downloadJson(calibrationExportFilename(`formsight_calibration_${run.protocolId}`), payload);
  };

  const handleExportAll = async () => {
    if (runs.length === 0) return;
    const payload: CalibrationRunExport[] = [];
    for (const run of runs) {
      const protocol = PILOT_PROTOCOLS.find((item) => item.id === run.protocolId) ?? null;
      const trials = await getCalibrationTrials(run.id);
      payload.push(buildRunExport(run, trials, protocol));
    }
    downloadJson(
      calibrationExportFilename('formsight_calibration_all'),
      buildExportBundle(payload),
    );
  };

  const handleClear = async () => {
    if (!window.confirm('清空所有校准 run 与 trial？此操作不可撤销。')) return;
    await clearCalibrationData();
    await refresh();
    showToast('校准数据已清空', 'info');
  };

  if (runId) {
    return (
      <CalibrationRunner
        runId={runId}
        settings={settings}
        globalSettings={globalSettings}
        onBack={() => {
          refresh();
          onNavigate(undefined);
        }}
        onFinished={refresh}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="iconSm" onClick={onExit} title="返回">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-black flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                Calibration v1
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                固定水平序列；只做题，自动记录与导出。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              disabled={runs.length === 0}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export all
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={runs.length === 0}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-3">
            {PILOT_PROTOCOLS.map((protocol) => {
              const card = registry.getCardById(protocol.cardId);
              const latest = latestByProtocol.get(protocol.id);
              const total = protocol.levels.length * protocol.trialsPerLevel;
              const done = latest?.trialCount ?? 0;
              const isRunning = latest?.status === 'in-progress';
              const isCompleted = latest?.status === 'completed';
              return (
                <div
                  key={protocol.id}
                  className="rounded-2xl border border-border bg-card/60 p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">
                        {card ? getCardTitle(card, t) : protocol.cardId}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {protocol.levels.join(' / ')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {protocol.label} · {done}/{total}
                      {isCompleted ? ' · completed' : isRunning ? ' · in progress' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isRunning ? (
                      <Button size="sm" onClick={() => onNavigate(latest?.id)}>
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant={isCompleted ? 'outline' : 'default'}
                        onClick={() => handleStart(protocol.id)}
                        disabled={busy}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        {isCompleted ? 'Run again' : 'Start'}
                      </Button>
                    )}
                    {latest && (
                      <>
                        {isCompleted && (
                          <Button size="sm" variant="ghost" onClick={() => onNavigate(latest.id)}>
                            View
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExport(latest)}
                          title="Export this run"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
