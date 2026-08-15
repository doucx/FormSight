import {
  Activity,
  BarChart2,
  Calendar,
  ChevronDown,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { getAllColorTrialRecords, getAllTrialRecords } from '../utils/db';

interface GlobalStatsModalProps {
  onClose: () => void;
}

interface UnifiedRecord {
  timestamp: number;
  isHit: boolean;
  level: number;
  module: 'star' | 'color';
  subMode: string;
}

type FilterOption =
  | 'all'
  | 'star_all'
  | 'star_single'
  | 'star_double_h'
  | 'star_double_r'
  | 'color_all'
  | 'color_H'
  | 'color_V'
  | 'color_S'
  | 'color_ALL';

const FILTER_LABELS: Record<FilterOption, string> = {
  all: '全部练习项目',
  star_all: '寻星练习 (全部模式)',
  star_single: '寻星 • 单锚点',
  star_double_h: '寻星 • 水平双锚点',
  star_double_r: '寻星 • 旋转双锚点',
  color_all: '色感训练 (全部模式)',
  color_H: '色感 • 色相 (Hue)',
  color_V: '色感 • 明度 (Value)',
  color_S: '色感 • 饱和度 (Sat)',
  color_ALL: '色感 • 综合拾色 (Match)',
};

export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<UnifiedRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // === 1. 数据加载与聚合 ===
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const starData = await getAllTrialRecords();
      const colorData = await getAllColorTrialRecords();

      const combined: UnifiedRecord[] = [
        ...starData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'star' as const,
          subMode: r.mode,
        })),
        ...colorData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'color' as const,
          subMode: r.mode,
        })),
      ];
      combined.sort((a, b) => a.timestamp - b.timestamp);

      if (isMounted) {
        setRecords(combined);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // === 2. 筛选过滤处理 ===
  const filteredRecords = records.filter((r) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'star_all') return r.module === 'star';
    if (selectedFilter === 'color_all') return r.module === 'color';
    if (selectedFilter.startsWith('star_')) {
      return r.module === 'star' && r.subMode === selectedFilter.replace('star_', '');
    }
    if (selectedFilter.startsWith('color_')) {
      return r.module === 'color' && r.subMode === selectedFilter.replace('color_', '');
    }
    return true;
  });

  // === 3. 基于筛选结果计算统计指标 ===
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  const stats = {
    today: { total: 0, hits: 0 },
    week: { total: 0, hits: 0 },
    year: { total: 0, hits: 0 },
    allTime: { total: filteredRecords.length, hits: filteredRecords.filter((r) => r.isHit).length },
  };

  const dailyData: Record<string, { total: number; maxLevel: number }> = {};

  for (const r of filteredRecords) {
    if (r.timestamp >= startOfToday) {
      stats.today.total++;
      if (r.isHit) stats.today.hits++;
    }
    if (r.timestamp >= startOfWeek) {
      stats.week.total++;
      if (r.isHit) stats.week.hits++;
    }
    if (r.timestamp >= startOfYear) {
      stats.year.total++;
      if (r.isHit) stats.year.hits++;
    }

    const dateStr = new Date(r.timestamp).toISOString().slice(0, 10);
    if (!dailyData[dateStr]) {
      dailyData[dateStr] = { total: 0, maxLevel: r.level };
    }
    dailyData[dateStr].total++;
    dailyData[dateStr].maxLevel = Math.max(dailyData[dateStr].maxLevel, r.level);
  }

  const calcAcc = (hits: number, total: number) =>
    total === 0 ? 0 : Math.round((hits / total) * 100);

  // === 4. 热力图数据 (近 84 天) ===
  const heatmapDays = 84;
  const heatmapData = Array.from({ length: heatmapDays }).map((_, i) => {
    const d = new Date(startOfToday - (heatmapDays - 1 - i) * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    return {
      date: dateStr,
      count: dailyData[dateStr]?.total || 0,
    };
  });

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count < 10) return 'bg-indigo-200';
    if (count < 25) return 'bg-indigo-400';
    if (count < 50) return 'bg-indigo-600';
    return 'bg-indigo-800';
  };

  // === 5. 折线图渲染 ===
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 20, bottom: 25, left: 30 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const activeDates = Object.keys(dailyData).sort();
    const recentDates = activeDates.slice(-30);

    if (recentDates.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('当前筛选条件下暂无做答轨迹', width / 2, height / 2);
      return;
    }

    const levels = recentDates.map((d) => dailyData[d].maxLevel);
    const maxLevel = Math.max(...levels, 35);
    const minLevel = 1;

    const getY = (val: number) =>
      padding.top + (1 - (val - minLevel) / (maxLevel - minLevel || 1)) * chartH;
    const getX = (idx: number) =>
      padding.left + (idx / Math.max(1, recentDates.length - 1)) * chartW;

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const l of [minLevel, Math.round(maxLevel / 2), maxLevel]) {
      const y = getY(l);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.moveTo(getX(0), getY(levels[0]));
    for (let i = 1; i < levels.length; i++) {
      ctx.lineTo(getX(i), getY(levels[i]));
    }
    ctx.stroke();

    for (let i = 0; i < levels.length; i++) {
      ctx.beginPath();
      ctx.arc(getX(i), getY(levels[i]), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const l of [minLevel, maxLevel]) {
      ctx.fillText(`L${l}`, padding.left - 5, getY(l));
    }
    ctx.textAlign = 'center';
    ctx.fillText('最近活跃日演进趋势 ➔', width / 2, height - 5);
  }, [loading]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">全局数据统计</h2>
              <p className="text-xs text-slate-400">洞察你的训练足迹与能力成长</p>
            </div>
          </div>

          {/* 右侧下拉筛选与关闭 */}
          <div className="flex items-center gap-3">
            {/* 维度 Select 下拉菜单 */}
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedFilter}
                onChange={(e) =>
                  setSelectedFilter((e.target as HTMLSelectElement).value as FilterOption)
                }
                className="pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all shadow-sm"
              >
                <option value="all">全部练习项目</option>
                <optgroup label="寻星练习">
                  <option value="star_all">寻星练习 (全部)</option>
                  <option value="star_single">单锚点模式</option>
                  <option value="star_double_h">水平双锚点</option>
                  <option value="star_double_r">旋转双锚点</option>
                </optgroup>
                <optgroup label="色感训练">
                  <option value="color_all">色感训练 (全部)</option>
                  <option value="color_H">色相 (Hue)</option>
                  <option value="color_V">明度 (Value)</option>
                  <option value="color_S">饱和度 (Saturation)</option>
                  <option value="color_ALL">综合拾色 (Match)</option>
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            正在统计海量数据...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Activity className="w-10 h-10 text-slate-300" />【{FILTER_LABELS[selectedFilter]}
            】下暂无训练数据，先去练习几道题吧！
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 1. 核心指标卡片群 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  今日刷题
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.today.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.today.hits, stats.today.total)}%
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  最近 7 天
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.week.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.week.hits, stats.week.total)}%
                </div>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  本年累计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.year.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-amber-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.year.hits, stats.year.total)}%
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  生涯总计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.allTime.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  打卡 {Object.keys(dailyData).length} 天
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 2. 热力图 */}
              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-4">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>近 12 周训练热力图</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                    少 <div className="w-2.5 h-2.5 rounded-sm bg-slate-100" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-800" /> 多
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1.5 self-center">
                  {heatmapData.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date} : 训练了 ${day.count} 题`}
                      className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
                        day.count,
                      )}`}
                    />
                  ))}
                </div>
              </div>

              {/* 3. 折线图 */}
              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-2">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>能力峰值演进轨迹</span>
                  <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                    每日最高 Level
                  </span>
                </div>
                <canvas ref={canvasRef} width={340} height={150} className="w-full mt-2" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
