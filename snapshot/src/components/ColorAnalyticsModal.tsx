import { AlertCircle, BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { renderHueRingCanvas } from '../utils/canvas/drawColorRing';
import { hsvToHex } from '../utils/colorUtils';
import { type ColorTrialRecord, getAllColorTrialRecords } from '../utils/db';

interface ColorAnalyticsModalProps {
  onClose: () => void;
}

const SECTOR_LABELS = [
  '红 (0°-30°)',
  '橙 (30°-60°)',
  '黄 (60°-90°)',
  '黄绿 (90°-120°)',
  '绿 (120°-150°)',
  '青绿 (150°-180°)',
  '青 (180°-210°)',
  '蓝 (210°-240°)',
  '蓝紫 (240°-270°)',
  '紫 (270°-300°)',
  '品红 (300°-330°)',
  '紫红 (330°-360°)',
];

export function ColorAnalyticsModal({ onClose }: ColorAnalyticsModalProps) {
  const [records, setRecords] = useState<ColorTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const ringCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 加载数据 (只看 Hue 模式)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchRecords = async () => {
      const data = await getAllColorTrialRecords('H');
      if (isMounted) {
        setRecords(data);
        setLoading(false);
      }
    };
    fetchRecords();
    return () => {
      isMounted = false;
    };
  }, []);

  // === 统计指标算子 ===
  const totalCount = records.length;
  const hitCount = records.filter((r) => r.isHit).length;
  const overallAccuracy = totalCount > 0 ? Math.round((hitCount / totalCount) * 100) : 0;

  // 12 色相方向数据桶计算
  const sectorBuckets = Array.from({ length: 12 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  let avgErrorDist = 0;
  if (totalCount > 0) {
    let sumDist = 0;
    for (const r of records) {
      const errVal = Number(r.errorValue ?? 0);
      const tHsv = (r.targetHSV ?? [0, 0, 0]) as [number, number, number];
      sumDist += errVal;
      const targetH = tHsv[0];
      const idx = Math.floor(targetH / 30);
      const safeIdx = Math.max(0, Math.min(11, idx));
      sectorBuckets[safeIdx].total += 1;
      if (r.isHit) sectorBuckets[safeIdx].hits += 1;
      sectorBuckets[safeIdx].sumError += errVal;
    }
    avgErrorDist = Math.round((sumDist / totalCount) * 10) / 10;
  }

  const sectorStats = sectorBuckets.map((b, i) => {
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0;
    return {
      sectorIdx: i,
      label: SECTOR_LABELS[i],
      total: b.total,
      accuracy: acc,
      avgError: avgErr,
    };
  });

  // 找最弱方向（做答数 >= 3 中正确率最低的方向）
  const validSectors = sectorStats.filter((s) => s.total >= 3);
  const weakestSector =
    validSectors.length > 0
      ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
      : null;

  // === 渲染 12 色相正确率环状图 ===
  useEffect(() => {
    if (loading) return;
    const canvas = ringCanvasRef.current;
    if (canvas) {
      renderHueRingCanvas(canvas, sectorStats);
    }
  }, [loading, sectorStats]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">色相感知弱点分析</h2>
              <p className="text-xs text-slate-400">洞察你对色彩环上 12 扇区的敏感度分布</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 主内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            正在分析历史答题数据...
          </div>
        ) : totalCount === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            暂无色相 (Hue) 模式的练习日志，先去练习几道题吧！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
              <canvas
                ref={ringCanvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl"
              />
            </div>

            {/* 右侧数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">总体评估 (色相)</div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-800">{overallAccuracy}%</span>
                  <span className="text-xs font-semibold text-slate-400 mb-1">
                    样本量: {totalCount} 题
                  </span>
                </div>
                <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
                  <span>平均绝对误差:</span>
                  <span>{avgErrorDist}°</span>
                </div>
              </div>

              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
                <div className="font-bold text-amber-900 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  色相盲区诊断
                </div>
                {weakestSector ? (
                  <div className="space-y-2">
                    <p className="text-slate-700 text-[11px]">
                      你在 <span className="font-bold text-amber-700">{weakestSector.label}</span>{' '}
                      方向上辨识正确率最低：
                    </p>
                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full border border-slate-200"
                          style={{
                            backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                          }}
                        />
                        <span className="font-bold text-slate-800">
                          {weakestSector.label.split(' ')[0]}
                        </span>
                      </div>
                      <span className="font-black text-rose-600 text-sm">
                        {weakestSector.accuracy}% 正确率
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-600 text-[11px]">
                    需每个色相扇区完成至少 3 题才能生成弱点诊断。
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
