import { Crosshair } from 'lucide-preact';
import {
  CANVAS_THEME,
  Callout,
  calculateBasicOverallStats,
  hexToRgba,
} from '@formsight/card-sdk';
import type { CardAnalyticsView, UnifiedTrialRecord } from '@formsight/card-sdk';

interface NegRatioTrialRecord extends UnifiedTrialRecord {
  targetNegativeRatio: number;
  userRatio: number;
  errorValue: number;
  positiveArea: number;
  negativeArea: number;
}

export function createNegRatioAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'ratio_scatter',
      tabLabel: 'analytics.ratioScatter.tabLabel',
      title: 'analytics.ratioScatter.title',
      subTitle: 'analytics.ratioScatter.subTitle',
      icon: Crosshair,
      renderVisualizer: (canvas, rawRecords) => {
        const records = rawRecords as NegRatioTrialRecord[];
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = CANVAS_THEME.shape.stroke;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = CANVAS_THEME.text.secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, h - 30);
        ctx.lineTo(w - 20, 20);
        ctx.stroke();

        for (const r of records) {
          const px = 30 + (r.targetNegativeRatio / 100) * (w - 50);
          const py = h - 30 - (r.userRatio / 100) * (h - 50);

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = r.isHit
            ? hexToRgba(CANVAS_THEME.status.hit, 0.7)
            : hexToRgba(CANVAS_THEME.status.miss, 0.7);
          ctx.fill();
        }
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as NegRatioTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const avgRatioErr =
          totalCount > 0
            ? Math.round((records.reduce((acc, c) => acc + c.errorValue, 0) / totalCount) * 10) / 10
            : 0;

        return (
          <Callout variant="success" icon={Crosshair} title={t('analytics.ratioScatter.cardTitle')}>
            <div className="space-y-1.5 text-xs text-foreground pt-1">
              <div className="flex justify-between font-mono bg-card p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                <span className="text-muted-foreground">
                  {t('analytics.ratioScatter.avgError')}
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  ±{avgRatioErr}%
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {t('analytics.ratioScatter.desc')}
              </p>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ];
}
