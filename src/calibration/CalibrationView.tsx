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
import { buildCustomProtocol, resolveProtocol } from './protocols';
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

function parseLevels(raw: string): number[] {
  return [
    ...new Set(
      raw
        .split(/[^0-9]+/)
        .filter(Boolean)
        .map(Number),
    ),
  ].sort((a, b) => a - b);
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
  const [selectedCard, setSelectedCard] = useState('');
  const [levelsInput, setLevelsInput] = useState('1, 9, 17, 25, 35');
  const [trialsPerLevel, setTrialsPerLevel] = useState(6);
  const [formError, setFormError] = useState<string | null>(null);

  const cards = useMemo(
    () =>
      registry.getAllCards().sort((a, b) => getCardTitle(a, t).localeCompare(getCardTitle(b, t))),
    [t],
  );

  const refresh = useCallback(async () => {
    setRuns(await listCalibrationRuns());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedCard && cards.length > 0) setSelectedCard(cards[0].id);
  }, [cards, selectedCard]);

  const handleStart = async () => {
    const levels = parseLevels(levelsInput);
    if (!selectedCard) {
      setFormError('先选一张卡');
      return;
    }
    if (levels.length < 2 || levels.length > 8) {
      setFormError('levels 需要 2–8 个');
      return;
    }
    if (levels.some((level) => level < 1 || level > 35)) {
      setFormError('levels 必须在 1–35');
      return;
    }
    if (!Number.isFinite(trialsPerLevel) || trialsPerLevel < 1 || trialsPerLevel > 12) {
      setFormError('每级题数需要 1–12');
      return;
    }
    if (levels.length * trialsPerLevel > 48) {
      setFormError('总题数不要超过 48');
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      const protocol = buildCustomProtocol(selectedCard, levels, Math.round(trialsPerLevel));
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
    const protocol = resolveProtocol(run) ?? null;
    const trials = await getCalibrationTrials(run.id);
    const payload = buildExportBundle([buildRunExport(run, trials, protocol)]);
    downloadJson(calibrationExportFilename(`formsight_calibration_${run.cardId}`), payload);
  };

  const handleExportAll = async () => {
    if (runs.length === 0) return;
    const payload: CalibrationRunExport[] = [];
    for (const run of runs) {
      const protocol = resolveProtocol(run) ?? null;
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
        key={runId}
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
                Card QA · calibration
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                任意卡、固定 levels、自动记录。用于难度轴诊断，不是训练统计。
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

        <section className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
          <div className="text-sm font-black">New QA run</div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_110px_auto] gap-2 items-end">
            <label className="text-xs text-muted-foreground space-y-1">
              <span>Card</span>
              <select
                value={selectedCard}
                onChange={(event) => setSelectedCard((event.target as HTMLSelectElement).value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-2 text-xs"
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {getCardTitle(card, t)} ({card.id})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground space-y-1">
              <span>Levels（逗号分隔）</span>
              <input
                value={levelsInput}
                onInput={(event) => setLevelsInput((event.target as HTMLInputElement).value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-2 text-xs font-mono"
              />
            </label>
            <label className="text-xs text-muted-foreground space-y-1">
              <span>每级题数</span>
              <input
                type="number"
                min={1}
                max={12}
                value={trialsPerLevel}
                onInput={(event) =>
                  setTrialsPerLevel(Number((event.target as HTMLInputElement).value))
                }
                className="w-full h-9 rounded-xl border border-border bg-background px-2 text-xs font-mono"
              />
            </label>
            <Button size="sm" onClick={handleStart} disabled={busy}>
              <Play className="w-3.5 h-3.5 mr-1" />
              Start
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            没有先验时先用 <code>1, 9, 17, 25, 35</code> 各 2–3 题 bracket；再围绕穿越点做 4–5 级
            ×5–6 题。 总题数 ≤48。
          </div>
          {formError && <div className="text-xs text-rose-600">{formError}</div>}
        </section>

        <section className="space-y-2">
          <div className="text-sm font-black">Recent runs</div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : runs.length === 0 ? (
            <div className="text-sm text-muted-foreground">还没有 run。</div>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => {
                const protocol = resolveProtocol(run);
                const card = registry.getCardById(run.cardId);
                return (
                  <div
                    key={run.id}
                    className="rounded-xl border border-border bg-card/60 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        {card ? getCardTitle(card, t) : run.cardId}
                        <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                          {run.cardId}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {protocol ? `${protocol.levels.join(' / ')}` : run.sequence.join(' / ')} ·{' '}
                        {run.trialCount}/{run.sequence.length} · {run.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {run.status === 'in-progress' ? (
                        <Button size="sm" onClick={() => onNavigate(run.id)}>
                          <Play className="w-3.5 h-3.5 mr-1" />
                          Resume
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => onNavigate(run.id)}>
                          View
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleExport(run)}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      {run.status !== 'completed' && (
                        <span title="incomplete">
                          <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
