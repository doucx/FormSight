import { AlertCircle, BarChart2, Compass, Info, Target, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TrainingMode, TrialRecord } from '../types';
import { renderHueRingCanvas } from '../utils/canvas/drawColorRing';
import { type SectorStat, renderCompassCanvas } from '../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../utils/canvas/drawHeatmap';
import { hsvToHex } from '../utils/colorUtils';
import { type ColorTrialRecord, getAllColorTrialRecords, getAllTrialRecords } from '../utils/db';

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

const COLOR_SECTORS = [
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

interface WeaknessAnalyticsModalProps {
  domain: 'star' | 'color';
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ domain, onClose }: WeaknessAnalyticsModalProps) {
  // 寻星模式专用子状态
  const [selectedStarMode, setSelectedStarMode] = useState<TrainingMode | 'all'>('all');
  const [starTab, setStarTab] = useState<'heatmap' | 'compass'>('heatmap');

  const [starRecords, setStarRecords] = useState<TrialRecord[]>([]);
  const [colorRecords, setColorRecords] = useState<ColorTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 数据加载
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      if (domain === 'star') {
        const data = await getAllTrialRecords(selectedStarMode === 'all' ? undefined : selectedStarMode);
        if (isMounted) {
          setStarRecords(data as unknown as TrialRecord[]);
          setLoading(false);
        }
      } else {
        const data = await getAllColorTrialRecords('H');
        if (isMounted) {
          setColorRecords(data);
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [domain, selectedStarMode]);

  // ==========================================
  // 指标统计与扇区分桶
  // ==========================================
  const totalCount = domain === 'star' ? starRecords.length : colorRecords.length;
  const hitCount =
    domain === 'star'
      ? starRecords.filter((r) => r.isHit).length
      : colorRecords.filter((r) => r.isHit).length;
  const overallAccuracy = totalCount > 0 ? Math.round((hitCount / totalCount) * 100) : 0;

  // 寻星专有偏置计算
  let avgDx = 0;
  let avgDy = 0;
  let avgErrorDist = 0;

  if (domain === 'star' && totalCount > 0) {
    let sumDx = 0;
    let sumDy = 0;
    let sumDist = 0;
    for (const r of starRecords) {
      sumDx += r.userClick[0] - r.targetB[0];
      sumDy += r.userClick[1] - r.targetB[1];
      sumDist += r.errorPixelDistance;
    }
    avgDx = Math.round((sumDx / totalCount) * 10) / 10;
    avgDy = Math.round((sumDy / totalCount) * 10) / 10;
    avgErrorDist = Math.round((sumDist / totalCount) * 10) / 10;
  } else if (domain === 'color' && totalCount > 0) {
    let sumDist = 0;
    for (const r of colorRecords) {
      sumDist += Number(r.errorValue ?? 0);
    }
    avgErrorDist = Math.round((sumDist / totalCount) * 10) / 10;
  }

  // 扇区分桶计算 (8 方向 或 12 色相)
  const sectorCount = domain === 'star' ? 8 : 12;
  const sectorLabels = domain === 'star' ? STAR_SECTORS : COLOR_SECTORS;
  const sectorBuckets = Array.from({ length: sectorCount }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  if (domain === 'star') {
    for (const r of starRecords) {
      const idx = Math.floor(((r.angleDegree + 22.5) % 360) / 45);
      sectorBuckets[idx].total += 1;
      if (r.isHit) sectorBuckets[idx].hits += 1;
      sectorBuckets[idx].sumError += r.errorPixelDistance;
    }
  } else {
    for (const r of colorRecords) {
      const errVal = Number(r.errorValue ?? 0);
      const tHsv = (r.targetHSV ?? [0, 0, 0]) as [number, number, number];
      const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
      sectorBuckets[idx].total += 1;
      if (r.isHit) sectorBuckets[idx].hits += 1;
      sectorBuckets[idx].sumError += errVal;
    }
  }

  const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
    sectorIdx: i,
    label: sectorLabels[i],
    total: b.total,
    accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
    avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
  }));

  const minSampleReq = domain === 'star' ? 2 : 3;
  const validSectors = sectorStats.filter((s) => s.total >= minSampleReq);
  const weakestSector =
    validSectors.length > 0
      ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
      : null;

  // ==========================================
  // Canvas 可视化渲染调度
  // ==========================================
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (domain === 'star') {
      if (starTab === 'heatmap') {
        renderHeatmapCanvas(canvas, starRecords, avgDx, avgDy, totalCount);
      } else {
        renderCompassCanvas(canvas, sectorStats);
      }
    } else {
      renderHueRingCanvas(canvas, sectorStats);
    }
  }, [domain, starTab, loading, starRecords, sectorStats, avgDx, avgDy, totalCount]);

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
              <h2 className="text-lg font-bold text-slate-800">
                {domain === 'star' ? '视角误差与弱点分析' : '色相感知弱点分析'}
              </h2>
              <p className="text-xs text-slate-400">
                {domain === 'star'
                  ? '洞察你的视觉系统空间偏置与盲区'
                  : '洞察你对色彩环上 12 扇区的敏感度分布'}
              </p>
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

        {/* 寻星专属：模式筛选 & Tab 切换栏 */}
        {domain === 'star' && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-1">
              {[
                { id: 'all', name: '全部模式' },
                { id: 'single', name: '单锚点' },
                { id: 'double_h', name: '水平双锚点' },
                { id: 'double_r', name: '旋转双锚点' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setSelectedStarMode(m.id as TrainingMode | 'all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    selectedStarMode === m.id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStarTab('heatmap')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  starTab === 'heatmap'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                中心相对偏差热力图
              </button>
              <button
                type="button"
                onClick={() => setStarTab('compass')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  starTab === 'compass'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                8方向弱点罗盘
              </button>
            </div>
          </div>
        )}

        {/* 主内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            正在分析历史答题数据...
          </div>
        ) : totalCount === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            {domain === 'star'
              ? '暂无当前模式下的练习日志，先去练习几道题吧！'
              : '暂无色相 (Hue) 模式的练习日志，先去练习几道题吧！'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl"
              />
            </div>

            {/* 右侧数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  总体评估 {domain === 'color' ? '(色相)' : ''}
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-800">{overallAccuracy}%</span>
                  <span className="text-xs font-semibold text-slate-400 mb-1">
                    样本量: {totalCount} 题
                  </span>
                </div>
                {domain === 'color' && (
                  <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
                    <span>平均绝对误差:</span>
                    <span>{avgErrorDist}°</span>
                  </div>
                )}
              </div>

              {domain === 'star' && starTab === 'heatmap' ? (
                <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
                  <div className="font-bold text-indigo-900 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    系统偏置诊断 (Systematic Bias)
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    中心绿色原点为真实目标。散点越集中代表手眼协调度越高。
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
                      <span>平均误差距离:</span>
                      <span>{avgErrorDist}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    {domain === 'star' ? '视角盲区与弱点扇区' : '色相盲区诊断'}
                  </div>
                  {weakestSector ? (
                    <div className="space-y-2">
                      <p className="text-slate-700 text-[11px]">
                        你在 <span className="font-bold text-amber-700">{weakestSector.label}</span>{' '}
                        方向上正确率最低：
                      </p>
                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          {domain === 'color' && (
                            <div
                              className="w-3 h-3 rounded-full border border-slate-200"
                              style={{
                                backgroundColor: hsvToHex(
                                  weakestSector.sectorIdx * 30 + 15,
                                  100,
                                  100,
                                ),
                              }}
                            />
                          )}
                          <span className="font-bold text-slate-800">
                            {domain === 'color'
                              ? weakestSector.label.split(' ')[0]
                              : weakestSector.label}
                          </span>
                        </div>
                        <span className="font-black text-rose-600 text-sm">
                          {weakestSector.accuracy}% 正确率
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-600 text-[11px]">
                      {domain === 'star'
                        ? '各方向表现均衡，继续保持！'
                        : '需每个色相扇区完成至少 3 题才能生成弱点诊断。'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}