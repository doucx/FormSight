import { Crosshair } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { type CardAnalyticsPlugin, calculateBasicOverallStats } from '../../core/contracts';
import { i18n } from '../../core/i18n';
import { getTrialRecordsByCard } from '../../storage/index';
import { CANVAS_THEME, hexToRgba } from '../../utils/theme';

export const negRatioAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'neg_ratio_estimation',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  views: [
    {
      id: 'ratio_scatter',
      tabLabel: 'packs.negative_space.analytics.ratioScatter.tabLabel',
      title: 'packs.negative_space.analytics.ratioScatter.title',
      subTitle: 'packs.negative_space.analytics.ratioScatter.subTitle',
      icon: Crosshair,
      renderVisualizer: (canvas, records) => {
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
          const target = Number(r.targetNegativeRatio ?? 50);
          const user = Number(r.userRatio ?? 50);
          const px = 30 + (target / 100) * (w - 50);
          const py = h - 30 - (user / 100) * (h - 50);

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = r.isHit
            ? hexToRgba(CANVAS_THEME.status.hit, 0.7)
            : hexToRgba(CANVAS_THEME.status.miss, 0.7);
          ctx.fill();
        }
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const avgRatioErr =
          totalCount > 0
            ? Math.round(
                (records.reduce((acc, c) => acc + Number(c.errorValue || 0), 0) / totalCount) * 10,
              ) / 10
            : 0;

        return (
          <Callout
            variant="success"
            icon={Crosshair}
            title={i18n.t('packs.negative_space.analytics.ratioScatter.cardTitle')}
          >
            <div className="space-y-1.5 text-[11px] text-foreground pt-1">
              <div className="flex justify-between font-mono bg-card p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                <span className="text-muted-foreground">
                  {i18n.t('packs.negative_space.analytics.ratioScatter.avgError')}
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  ±{avgRatioErr}%
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {i18n.t('packs.negative_space.analytics.ratioScatter.desc')}
              </p>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ],
};
