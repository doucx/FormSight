import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { X, Target, Compass, BarChart2, AlertCircle, Info } from 'lucide-preact';
import { TrialRecord, TrainingMode } from '../types';
import { getAllTrialRecords } from '../utils/db';

interface AnalyticsModalProps {
  initialMode?: TrainingMode | 'all';
  onClose: () => void;
}

const SECTOR_LABELS = [
  '正东 (0°)',
  '东北 (45°)',
  '正北 (90°)',
  '西北 (135°)',
  '正西 (180°)',
  '西南 (225°)',
  '正南 (270°)',
  '东南 (315°)',
];

export function AnalyticsModal({ initialMode = 'all', onClose }: AnalyticsModalProps) {
  const [selectedMode, setSelectedMode] = useState<TrainingMode | 'all'>(initialMode);
  const [activeTab, setActiveTab] = useState<'heatmap' | 'compass'>('heatmap');
  const [records, setRecords] = useState<TrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compassCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 加载数据
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchRecords = async () => {
      const data = await getAllTrialRecords(
        selectedMode === 'all' ? undefined : selectedMode
      );
      if (isMounted) {
        setRecords(data);
        setLoading(false);
      }
    };
    fetchRecords();
    return () => {
      isMounted = false;
    };
  }, [selectedMode]);

  // === 统计指标算子 ===
  const totalCount = records.length;
  const hitCount = records.filter((r) => r.isHit).length;
  const overallAccuracy = totalCount > 0 ? Math.round((hitCount / totalCount) * 100) : 0;

  // 平均 X / Y 偏移量 (像素)
  let avgDx = 0;
  let avgDy = 0;
  let avgErrorDist = 0;
  if (totalCount > 0) {
    let sumDx = 0;
    let sumDy = 0;
    let sumDist = 0;
    records.forEach((r) => {
      sumDx += r.userClick[0] - r.targetB[0];
      sumDy += r.userClick[1] - r.targetB[1];
      sumDist += r.errorPixelDistance;
    });
    avgDx = Math.round((sumDx / totalCount) * 10) / 10;
    avgDy = Math.round((sumDy / totalCount) * 10) / 10;
    avgErrorDist = Math.round((sumDist / totalCount) * 10) / 10;
  }

  // 8 方向数据桶计算
  const sectorBuckets = Array.from({ length: 8 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  records.forEach((r) => {
    // 将 0~360° 归类到 8 个 45° 扇区
    const idx = Math.floor(((r.angleDegree + 22.5) % 360) / 45);
    sectorBuckets[idx].total += 1;
    if (r.isHit) sectorBuckets[idx].hits += 1;
    sectorBuckets[idx].sumError += r.errorPixelDistance;
  });

  const sectorStats = sectorBuckets.map((b, i) => {
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0;
    return {
      label: SECTOR_LABELS[i],
      total: b.total,
      accuracy: acc,
      avgError: avgErr,
    };
  });

  // 找最弱方向（做答数 >= 3 中正确率最低或误差最大的方向）
  const validSectors = sectorStats.filter((s) => s.total >= 2);
  const weakestSector =
    validSectors.length > 0
      ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
      : null;

  // === 1. 渲染：方案一 中心相对偏差热力图 ===
  useEffect(() => {
    if (activeTab !== 'heatmap' || loading) return;
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const scale = 5; // 1px 屏幕误差放大 5 倍渲染便于可视化

    // 清屏
    ctx.fillStyle = '#1E293B'; // 科技深蓝背景
    ctx.fillRect(0, 0, width, height);

    // 绘制辅助同心圆 (5px, 10px, 20px, 30px)
    const rings = [5, 10, 20, 30];
    ctx.lineWidth = 1;
    rings.forEach((r) => {
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '10px monospace';
      ctx.fillText(`${r}px`, cx + r * scale + 2, cy - 4);
    });

    // 绘制十字坐标轴
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 绘制每个做答记录的相对偏移散点
    records.forEach((r) => {
      const dx = r.userClick[0] - r.targetB[0];
      const dy = r.userClick[1] - r.targetB[1];

      const px = cx + dx * scale;
      const py = cy + dy * scale;

      // 根据是否击中渲染绿色/红黄色散点光晕
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      if (r.isHit) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      }
      ctx.fill();
    });

    // 绘制中心目标点 B (真理原点)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制平均偏移向量线
    if (totalCount > 0) {
      const avgPx = cx + avgDx * scale;
      const avgPy = cy + avgDy * scale;

      ctx.strokeStyle = '#F59E0B'; // 橙色平均方向指示线
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(avgPx, avgPy);
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(avgPx, avgPy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [activeTab, loading, records, avgDx, avgDy, totalCount]);

  // === 2. 渲染：方案三 8 方向弱点罗盘扇形图 ===
  useEffect(() => {
    if (activeTab !== 'compass' || loading) return;
    const canvas = compassCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 30;

    // 清屏
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);

    // 绘制 8 个扇形
    const sectorAngle = (Math.PI * 2) / 8;
    // 起始偏移量 -22.5° 使正东 0° 位于正中央
    const startOffset = -Math.PI / 8;

    sectorStats.forEach((stat, i) => {
      const startA = startOffset + i * sectorAngle;
      const endA = startA + sectorAngle;

      // 根据正确率决定半径大小与填充颜色
      const radiusRatio = stat.total > 0 ? 0.35 + (stat.accuracy / 100) * 0.65 : 0.25;
      const r = outerRadius * radiusRatio;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startA, endA);
      ctx.closePath();

      if (stat.total === 0) {
        ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
      } else if (stat.accuracy >= 80) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.55)'; // 绿
      } else if (stat.accuracy >= 60) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.65)'; // 黄
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.75)'; // 红
      }
      ctx.fill();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 绘制方向文字标注
      const midA = startA + sectorAngle / 2;
      const labelR = outerRadius + 18;
      const lx = cx + Math.cos(midA) * labelR;
      const ly = cy + Math.sin(midA) * labelR;

      ctx.fillStyle = stat.accuracy < 60 && stat.total > 0 ? '#EF4444' : '#94A3B8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stat.label.split(' ')[0], lx, ly);
    });

    // 中心装饰基准圆
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.stroke();
  }, [activeTab, loading, records, sectorStats]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">视角误差与弱点分析</h2>
              <p className="text-xs text-slate-400">洞察你的视觉系统空间偏置与盲区</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 模式筛选 & Tab 切换栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          {/* 模式 Selector */}
          <div className="flex items-center gap-1">
            {[
              { id: 'all', name: '全部模式' },
              { id: 'single', name: '单锚点' },
              { id: 'double_h', name: '水平双锚点' },
              { id: 'double_r', name: '旋转双锚点' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  selectedMode === m.id
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          {/* Tab 选择器 */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'heatmap'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              中心相对偏差热力图
            </button>
            <button
              onClick={() => setActiveTab('compass')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'compass'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              8方向弱点罗盘
            </button>
          </div>
        </div>

        {/* 主内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            正在分析历史答题数据...
          </div>
        ) : totalCount === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            暂无当前模式下的练习日志，先去练习几道题吧！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧/上方 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
              {activeTab === 'heatmap' ? (
                <canvas
                  ref={heatmapCanvasRef}
                  width={320}
                  height={320}
                  className="w-full max-w-[300px] aspect-square rounded-xl"
                />
              ) : (
                <canvas
                  ref={compassCanvasRef}
                  width={320}
                  height={320}
                  className="w-full max-w-[300px] aspect-square rounded-xl"
                />
              )}
            </div>

            {/* 右侧/下方 数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">总体评估</div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-800">
                    {overallAccuracy}%
                  </span>
                  <span className="text-xs font-semibold text-slate-400 mb-1">
                    样本量: {totalCount} 题
                  </span>
                </div>
              </div>

              {activeTab === 'heatmap' ? (
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
                        {avgDx > 0 ? `右 +${avgDx}` : avgDx < 0 ? `左 ${avgDx}` : '0'}{' '}
                        px
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>平均 Y 轴偏移:</span>
                      <span className="font-bold">
                        {avgDy > 0 ? `下 +${avgDy}` : avgDy < 0 ? `上 ${avgDy}` : '0'}{' '}
                        px
                      </span>
                    </div>
                    <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-200/60 pt-1">
                      <span>平均像素误差:</span>
                      <span>{avgErrorDist} px</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    视角盲区与弱点扇区
                  </div>
                  {weakestSector ? (
                    <div className="space-y-1">
                      <p className="text-slate-700 text-[11px]">
                        你在 <span className="font-bold text-amber-700">{weakestSector.label}</span> 方向上正确率最低：
                      </p>
                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60">
                        <span className="font-bold text-slate-800">{weakestSector.label}</span>
                        <span className="font-black text-rose-600 text-sm">
                          {weakestSector.accuracy}% 正确率
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-600 text-[11px]">各方向表现均衡，继续保持！</p>
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