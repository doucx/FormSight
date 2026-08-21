import { Crosshair } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { getTrialRecordsByCard } from '../../utils/db/index';

export const negRatioAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'neg_ratio_estimation',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  views: [
    {
      id: 'ratio_scatter',
      tabLabel: '留白占比评估',
      title: '负形留白占比评估分析',
      subTitle: '洞察你对留白空间面积占比估算的直觉灵敏度',
      icon: Crosshair,
      renderVisualizer: (canvas, records) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#475569';
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
          ctx.fillStyle = r.isHit ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
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
          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-2 text-xs">
            <div className="font-bold text-emerald-900 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
              空间留白敏感度诊断
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-700">
              <div className="flex justify-between font-mono bg-white p-2 rounded-xl border border-emerald-100">
                <span className="text-slate-600">负形占比平均绝对误差:</span>
                <span className="font-bold text-emerald-700">±{avgRatioErr}%</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                散点越紧贴对角线，代表对负形几何空隙的面积直觉越敏锐精准。
              </p>
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
  ],
};
