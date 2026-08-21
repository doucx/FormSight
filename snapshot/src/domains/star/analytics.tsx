import { Compass, Target } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { type SectorStat, renderCompassCanvas } from '../../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../../utils/canvas/drawHeatmap';
import { getTrialRecordsByCard } from '../../utils/db/index';

const STAR_SECTORS = [
  '正东 (0°)',
  '东北 (45°)',
  '正北 (90°)',
  '西北 (135°)',
  '正西 (180°)',
  '西南 (225°)',
  '正南 (270°)',
  '东南 (315°)',
];

export function createStarAnalyticsPlugin(cardId: string, title: string): CardAnalyticsPlugin {
  return {
    cardId,
    fetchRecords: async (id) => getTrialRecordsByCard(id),
    views: [
      {
        id: 'spatial_bias',
        tabLabel: '空间偏置散点',
        title: `${title} · 空间偏置分析`,
        subTitle: '中心绿点为绝对真理点，散点分布揭示手眼定位偏移',
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

          return (
            <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="font-bold text-indigo-900 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                系统空间偏置 (Systematic Bias)
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                中心为绝对真理点。散点越收敛代表空间直觉越敏锐。
              </p>
              <div className="pt-1 space-y-1 font-mono text-slate-700">
                <div className="flex justify-between">
                  <span>平均 X 轴偏移:</span>
                  <span className="font-bold">
                    {avgDx > 0 ? `右 +${avgDx}` : avgDx < 0 ? `左 ${avgDx}` : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>平均 Y 轴偏移:</span>
                  <span className="font-bold">
                    {avgDy > 0 ? `下 +${avgDy}` : avgDy < 0 ? `上 ${avgDy}` : '0'}
                  </span>
                </div>
                <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-200/60 pt-1">
                  <span>平均像素误差:</span>
                  <span>{avgDist}px</span>
                </div>
              </div>
            </div>
          );
        },
        getOverallStats: (records) => {
          const total = records.length;
          const hits = records.filter((r) => r.isHit).length;
          const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
          return { accuracy, total };
        },
      },
      {
        id: 'directional_compass',
        tabLabel: '八向方位罗盘',
        title: `${title} · 八向方位敏感度`,
        subTitle: '洞察你在 8 个极坐标视角扇区上的定位准确率分布',
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
            label: STAR_SECTORS[i],
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
              label: STAR_SECTORS[i],
              total: b.total,
              accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            }))
            .filter((s) => s.total >= 3);

          const weakest =
            validSectors.length > 0
              ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
              : null;

          return (
            <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="font-bold text-indigo-900 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                方位盲区诊断
              </div>
              {weakest ? (
                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <p>
                    你在 <span className="font-bold text-indigo-800">{weakest.label}</span>{' '}
                    方位上命中率最低：
                  </p>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-indigo-100 font-mono">
                    <span>{weakest.label}</span>
                    <span className="font-bold text-rose-600">{weakest.accuracy}% 准确率</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-[11px]">
                  各方位完成至少 3 题后可生成薄弱扇区诊断。
                </p>
              )}
            </div>
          );
        },
        getOverallStats: (records) => {
          const total = records.length;
          const hits = records.filter((r) => r.isHit).length;
          const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
          return { accuracy, total };
        },
      },
    ],
  };
}
