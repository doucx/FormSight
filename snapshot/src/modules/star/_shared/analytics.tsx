import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../../components/ui/callout';
import { type SectorStat, renderCompassCanvas } from '../../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../../core/canvas/charts/drawHeatmap';
import { type CardAnalyticsView, calculateBasicOverallStats } from '../../../core/contracts';
import { i18n } from '../../../core/i18n';
import { STAR_SECTORS } from './schemas';

export function createStarAnalyticsViews(cardId = 'star_single'): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: `cards.${cardId}.analytics.spatialBias.tabLabel`,
      title: `cards.${cardId}.analytics.spatialBias.title`,
      subTitle: `cards.${cardId}.analytics.spatialBias.subTitle`,
      icon: Target,
      renderVisualizer: (canvas, records) => {
        const totalCount = records.length;
        let sumDx = 0;
        let sumDy = 0;
        for (const r of records) {
          const uClick = (r.userClick as [number, number]) || [0, 0];
          const tB = (r.targetB as [number, number]) || [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
        }
        const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
        const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
        renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumDx = 0;
        let sumDy = 0;
        let sumDist = 0;
        for (const r of records) {
          const uClick = (r.userClick as [number, number]) || [0, 0];
          const tB = (r.targetB as [number, number]) || [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
          sumDist += (r.errorPixelDistance as number) || 0;
        }
        const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
        const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
        const avgDist = Math.round((sumDist / totalCount) * 10) / 10;

        const dxText =
          avgDx > 0
            ? i18n.t(`cards.${cardId}.analytics.spatialBias.right`, { val: avgDx })
            : avgDx < 0
              ? i18n.t(`cards.${cardId}.analytics.spatialBias.left`, { val: avgDx })
              : '0';

        const dyText =
          avgDy > 0
            ? i18n.t(`cards.${cardId}.analytics.spatialBias.down`, { val: avgDy })
            : avgDy < 0
              ? i18n.t(`cards.${cardId}.analytics.spatialBias.up`, { val: avgDy })
              : '0';

        return (
          <Callout
            variant="info"
            icon={Target}
            title={i18n.t(`cards.${cardId}.analytics.spatialBias.cardTitle`)}
          >
            <p className="text-muted-foreground leading-relaxed text-xs">
              {i18n.t(`cards.${cardId}.analytics.spatialBias.desc`)}
            </p>
            <div className="pt-1.5 space-y-1 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {i18n.t(`cards.${cardId}.analytics.spatialBias.avgDx`)}
                </span>
                <span className="font-bold">{dxText}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {i18n.t(`cards.${cardId}.analytics.spatialBias.avgDy`)}
                </span>
                <span className="font-bold">{dyText}</span>
              </div>
              <div className="flex justify-between text-primary font-bold border-t border-border/60 pt-1">
                <span>{i18n.t(`cards.${cardId}.analytics.spatialBias.avgDist`)}</span>
                <span>{avgDist}px</span>
              </div>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
    {
      id: 'directional_compass',
      tabLabel: `cards.${cardId}.analytics.directionalCompass.tabLabel`,
      title: `cards.${cardId}.analytics.directionalCompass.title`,
      subTitle: `cards.${cardId}.analytics.directionalCompass.subTitle`,
      icon: Compass,
      renderVisualizer: (canvas, records) => {
        const sectorBuckets = Array.from({ length: 8 }, () => ({
          total: 0,
          hits: 0,
          sumDist: 0,
        }));
        for (const r of records) {
          const angle = Number(r.angleDegree ?? 0);
          const normAngle = ((angle % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
          sectorBuckets[sectorIdx].total += 1;
          if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
          sectorBuckets[sectorIdx].sumDist += Number(r.errorPixelDistance || 0);
        }

        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: i18n.t(STAR_SECTORS[i]),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
        }));

        renderCompassCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
        for (const r of records) {
          const angle = Number(r.angleDegree ?? 0);
          const normAngle = ((angle % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
          sectorBuckets[sectorIdx].total += 1;
          if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
        }

        const validSectors = sectorBuckets
          .map((b, i) => ({
            label: i18n.t(STAR_SECTORS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          }))
          .filter((s) => s.total >= 3);

        const weakest =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout
            variant="info"
            icon={Compass}
            title={i18n.t(`cards.${cardId}.analytics.directionalCompass.cardTitle`)}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {i18n.t(`cards.${cardId}.analytics.directionalCompass.weakestHint`, {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {i18n.t(`cards.${cardId}.analytics.directionalCompass.accuracyRate`, {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {i18n.t(`cards.${cardId}.analytics.directionalCompass.needMoreTrials`)}
              </p>
            )}
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ];
}