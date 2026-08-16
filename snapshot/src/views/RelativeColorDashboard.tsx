import { ArrowLeft, Award, Play, Shuffle, Sliders, Target, TrendingUp } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { type UnifiedProfileData, getProfilesByDomain, getTrialRecords } from '../utils/db';
import type { RelativeColorMode } from '../utils/relativeColorUtils';

interface RelativeColorDashboardProps {
  onStart: (mode: RelativeColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}

export function RelativeColorDashboard({
  onStart,
  onBackToHome,
  onOpenSettings,
}: RelativeColorDashboardProps) {
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData | null>>({});
  const [todayCount, setTodayCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const pList = await getProfilesByDomain('relative_color');
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.mode] = p;
      }

      const records = await getTrialRecords('relative_color');
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const count = records.filter((r) => r.timestamp >= startOfToday).length;

      if (isMounted) {
        setProfiles(pMap);
        setTodayCount(count);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const profile = profiles.VECTOR_SHIFT;
  const totalCards = profile?.totalTrainedCards || 0;
  const accuracy =
    totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
  const currentLevel = profile?.currentLevel || 5;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToHome}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            返回主页
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              相对色感 <span className="text-indigo-600 font-light text-xl">Relative Color</span>
            </h1>
          </div>
        </div>

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

      {/* 相对色感子模式卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group bg-white border border-gray-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Shuffle className="w-6 h-6" />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold text-slate-400">今日刷题</div>
                <div className="text-xs font-bold text-slate-500 font-mono">{todayCount} 题</div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">色彩矢量迁移</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">
              保持固有色推移矢量 $\vec{v}_{AB}$ 在全场施加统一推移，建立光影相对偏转直觉。
            </p>

            {/* 核心指标 */}
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
              onClick={() => onStart('VECTOR_SHIFT', 'training')}
              className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              开始自适应训练
            </button>
            <button
              type="button"
              onClick={() => onStart('VECTOR_SHIFT', 'benchmark')}
              className="w-full py-2.5 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5 text-gray-500" />
              20 题基准测试
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
