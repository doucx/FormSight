import { CheckCircle2, ChevronLeft, Copy, Download } from 'lucide-preact';
import { Button } from '../components/ui/button';
import type { CalibrationRunData, CalibrationTrialData } from '../storage/db/schema';
import { summarizeTrials } from './export';
import type { CalibrationProtocol } from './types';

interface CalibrationSummaryProps {
  run: CalibrationRunData;
  trials: CalibrationTrialData[];
  protocol: CalibrationProtocol | null;
  onBack: () => void;
  onExport: () => void;
  onCopy: () => void;
}

export function CalibrationSummary({
  run,
  trials,
  protocol,
  onBack,
  onExport,
  onCopy,
}: CalibrationSummaryProps) {
  const summary = summarizeTrials(trials);
  const completed = run.status === 'completed';

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="iconSm" onClick={onBack}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-black flex items-center gap-2">
                {completed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : null}
                Calibration summary
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {protocol?.label ?? run.protocolId} · {summary.n}/{run.sequence.length}
                {completed ? ' · completed' : ' · in progress'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCopy}>
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy JSON
            </Button>
            <Button size="sm" onClick={onExport}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Export run
            </Button>
          </div>
        </header>

        {!completed && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
            该 run 尚未完成。导出的 JSON 会标为 in-progress，S03 可自行决定是否纳入。
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Trials</div>
            <div className="text-2xl font-black font-mono">{summary.n}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Hits</div>
            <div className="text-2xl font-black font-mono">{summary.hits}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Accuracy</div>
            <div className="text-2xl font-black font-mono">
              {(summary.accuracy * 100).toFixed(0)}%
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Median RT</div>
            <div className="text-2xl font-black font-mono">
              {summary.medianResponseTimeMs.toFixed(0)}ms
            </div>
          </div>
        </div>

        {summary.invalid && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-3 text-xs text-rose-800 dark:text-rose-200">
            中位 RT &lt; 300ms；按 D-026 该 run 判无效，S03 会丢弃。请重跑，并放慢到正常作答节奏。
          </div>
        )}

        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-bold">Level</th>
                <th className="text-right px-3 py-2 font-bold">n</th>
                <th className="text-right px-3 py-2 font-bold">hits</th>
                <th className="text-right px-3 py-2 font-bold">acc</th>
              </tr>
            </thead>
            <tbody>
              {summary.byLevel.map((row) => (
                <tr key={row.level} className="border-t border-border/60">
                  <td className="px-3 py-1.5 font-mono">{row.level}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{row.n}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{row.hits}</td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {(row.accuracy * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          导出文件包含完整 sequence 与逐题 details；不需要手填表格。把 JSON 交给 S03 即可。
        </p>
      </div>
    </div>
  );
}
