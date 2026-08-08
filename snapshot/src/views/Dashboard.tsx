import {
  Award,
  BarChart2,
  type Compass,
  Crosshair,
  Play,
  RotateCw,
  Sliders,
  Target,
  TrendingUp,
} from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import type { TrainingMode } from '../types';
import { type UserProfileData, getAllTrialRecords } from '../utils/db';

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  desc: string;
  icon: typeof Compass;
}> = [
  {
    id: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    icon: Target,
  },
  {
    id: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    icon: Crosshair,
  },
  {
    id: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    icon: RotateCw,
  },
];

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
  onBackToHome?: () => void;
}

function formatTodayTime(ms: number): string {
  if (ms <= 0) return '0秒';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}秒`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`;
}

export function Dashboard({
  profiles,
  onStart,
  onOpenSettings,
  onOpenAnalytics,
  onBackToHome,
}: DashboardProps) {
  const [todayStats, setTodayStats] = useState<Record<TrainingMode, { count: number; timeMs: number }>>({
    single: { count: 0, timeMs: 0 },
    double_h: { count: 0, timeMs: 0 },
    double_r: { count: 0, timeMs: 0 },
  });

  useEffect(() => {
    let isMounted = true;
    const fetchTodayStats = async () => {
      const records = await getAllTrialRecords();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const stats: Record<TrainingMode, { count: number; timeMs: number }> = {
        single: { count: 0, timeMs: 0 },
        double_h: { count: 0, timeMs: 0 },
        double_r: { count: 0, timeMs: 0 },
      };

      for (const r of records) {
        if (r.timestamp >= startOfToday && stats[r.mode]) {
          stats[r.mode].count += 1;
          stats[r.mode].timeMs += r.responseTimeMs || 0;
        }
      }

      if (isMounted) {
        setTodayStats(stats);
      }
    };
    fetchTodayStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              ← 返回主页
            </button>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              寻星练习 <span className="text-indigo-600 font-light text-xl">Star-Hopping</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAnalytics()}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="弱点分析"
          >
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            弱点分析
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="偏好设置"
          >
            <Sliders className="w-4 h-4" />
            偏好设置
          </button>
        </div>
      </div>

      {/* 3 个训练卡片区 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MODES_CONFIG.map((config) => {
          const profile = profiles[config.id];
          const totalCards = profile?.totalTrainedCards || 0;
          const accuracy =
            totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
          const currentLevel = profile?.currentLevel || 5;
          const IconComponent = config.icon;

          return (
            <div
              key={config.id}
              className="group bg-white border border-gray-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-slate-400">今日刷题</div>
                    <div className="text-xs font-bold text-slate-500 font-mono">
                      {todayStats[config.id].count} 题
                      {todayStats[config.id].count > 0 && (
                        <span className="text-[11px] text-slate-400 font-normal ml-1">
                          ({formatTodayTime(todayStats[config.id].timeMs)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">{config.desc}</p>

                {/* 核心指标统计 */}
                <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                      <TrendingUp className="w-3 h-3 text-indigo-500" />
                      能力层阶
                    </div>
                    <div className="text-xl font-black text-slate-800">Level {currentLevel}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                      <Award className="w-3 h-3 text-emerald-500" />
                      正确率
                    </div>
                    <div className="text-xl font-black text-slate-800">{accuracy}%</div>
                  </div>
                </div>
              </div>

              {/* 动作按钮区 */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => onStart(config.id, 'training')}
                  className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  开始自适应训练
                </button>
                <button
                  type="button"
                  onClick={() => onStart(config.id, 'benchmark')}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5 text-gray-500" />
                  20 题基准测试
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
