import { ChevronLeft } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '../components/ui/button';
import { registry } from '../core/registry';
import type { CalibrationRunData, CalibrationTrialData } from '../storage/db/schema';
import { getCardSettings } from '../storage/settings';
import type { GlobalSettings, UserSettings } from '../storage/settings';
import { GenericTrainingView } from '../views/GenericTrainingView';
import { CalibrationSummary } from './CalibrationSummary';
import {
  buildExportBundle,
  buildRunExport,
  calibrationExportFilename,
  copyJson,
  downloadJson,
} from './export';
import { resolveProtocol } from './protocols';
import {
  completeCalibrationRun,
  getCalibrationRun,
  getCalibrationTrials,
  saveCalibrationTrial,
} from './repository';

interface CalibrationRunnerProps {
  runId: string;
  settings: UserSettings;
  globalSettings: GlobalSettings;
  onBack: () => void;
  onFinished: () => void;
}

interface TrialCompletion {
  sessionId: string;
  question: unknown;
  hitResult: unknown;
  responseTimeMs: number;
  userVal: unknown;
  level: number;
}

export function CalibrationRunner({
  runId,
  settings,
  globalSettings,
  onBack,
  onFinished,
}: CalibrationRunnerProps) {
  const [run, setRun] = useState<CalibrationRunData | null>(null);
  const [trials, setTrials] = useState<CalibrationTrialData[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const runRef = useRef<CalibrationRunData | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let loaded = await getCalibrationRun(runId);
      if (loaded && loaded.status === 'in-progress' && loaded.index >= loaded.sequence.length) {
        await completeCalibrationRun(loaded.id);
        loaded = await getCalibrationRun(loaded.id);
      }
      if (!alive) return;
      setRun(loaded);
      runRef.current = loaded;
      setStartIndex(loaded?.index ?? 0);
      setTrials(await getCalibrationTrials(runId));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [runId]);

  const protocol = run ? resolveProtocol(run) : null;
  const card = run ? registry.getCardById(run.cardId) : null;
  const manifest = run ? registry.getCardManifest(run.cardId) : null;

  const handleTrialCompleted = useCallback(
    async (params: TrialCompletion) => {
      const current = runRef.current;
      if (!current || !manifest) return;
      try {
        const updated = await saveCalibrationTrial(current.id, {
          index: current.index,
          level: params.level,
          isHit: manifest.engine.isHit(params.hitResult),
          responseTimeMs: params.responseTimeMs,
          timestamp: Date.now(),
          details:
            manifest.engine.extractRecordDetails?.(
              params.question,
              params.hitResult,
              params.userVal,
            ) ?? {},
        });
        if (updated) {
          runRef.current = updated;
          setRun(updated);
        } else {
          setFailed('run 不存在或已被清空；请返回列表并导出已有数据。');
        }
      } catch (err) {
        console.error('Failed to save calibration trial:', err);
        setFailed('校准记录写入失败；请返回列表并导出已有数据。');
      }
    },
    [manifest],
  );

  const handleComplete = useCallback(async () => {
    const current = runRef.current;
    if (!current) return;
    await completeCalibrationRun(current.id);
    const updated = await getCalibrationRun(current.id);
    if (updated) {
      runRef.current = updated;
      setRun(updated);
    }
    setTrials(await getCalibrationTrials(current.id));
    onFinished();
  }, [onFinished]);

  const handleExport = async () => {
    if (!run) return;
    const freshTrials = await getCalibrationTrials(run.id);
    const payload = buildExportBundle([buildRunExport(run, freshTrials, protocol ?? null)]);
    downloadJson(calibrationExportFilename(`formsight_calibration_${run.protocolId}`), payload);
  };

  const handleCopy = async () => {
    if (!run) return;
    const freshTrials = await getCalibrationTrials(run.id);
    await copyJson(buildExportBundle([buildRunExport(run, freshTrials, protocol ?? null)]));
  };

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading calibration run…</div>;
  }

  if (failed) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-rose-600 font-semibold">校准记录写入失败</div>
        <div className="text-xs text-muted-foreground max-w-md text-center">{failed}</div>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回列表并导出
        </Button>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-8 space-y-3">
        <div className="text-sm">找不到该 calibration run。</div>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
      </div>
    );
  }

  if (!protocol || !card || !manifest) {
    return (
      <div className="p-8 space-y-3">
        <div className="text-sm">协议或卡片不可用：{run.protocolId}</div>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
      </div>
    );
  }

  if (run.status === 'completed' || run.index >= run.sequence.length) {
    return (
      <CalibrationSummary
        run={run}
        trials={trials}
        protocol={protocol}
        onBack={onBack}
        onExport={handleExport}
        onCopy={handleCopy}
      />
    );
  }

  const scheduledLevels = run.sequence.slice(startIndex);
  const remaining = run.sequence.length - startIndex;
  const initialLevel = scheduledLevels[0] ?? run.sequence[run.sequence.length - 1];
  const cardSettings = getCardSettings(settings, run.cardId);

  return (
    <GenericTrainingView
      key={run.id}
      card={card}
      manifest={manifest}
      sessionType="sandbox"
      initialLevel={initialLevel}
      scheduledLevels={scheduledLevels}
      targetLimitTrials={remaining}
      settings={{
        ...cardSettings,
        autoNext: true,
        autoNextDelay: 700,
      }}
      globalSettings={globalSettings}
      protocol={{
        label: protocol.label,
        current: Math.min(run.index + 1, run.sequence.length),
        total: run.sequence.length,
        locked: true,
      }}
      onTrialCompleted={handleTrialCompleted}
      onTargetLimitReached={handleComplete}
      showExitButton={true}
      showTimer={true}
      onExit={onBack}
    />
  );
}
