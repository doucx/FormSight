import { h } from 'preact';
import { useRef } from 'preact/hooks';
import {
  Compass,
  Crosshair,
  RotateCw,
  Download,
  Upload,
  Play,
  Target,
  Sparkles,
  TrendingUp,
  Award,
} from 'lucide-preact';
import { TrainingMode } from '../types';
import { UserProfileData, exportAllData, importAllData } from '../utils/db';

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
}

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  subtitle: string;
  desc: string;
  icon: typeof Compass;
  badgeColor: string;
}> = [
  {
    id: 'single',
    title: '单锚点模式',
    subtitle: 'Single Anchor',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    icon: Target,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'double_h',
    title: '水平双锚点',
    subtitle: 'Double Horiz',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    icon: Crosshair,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'double_r',
    title: '旋转双锚点',
    subtitle: 'Double Rotated',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    icon: RotateCw,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

export function Dashboard({ profiles, onStart, onRefreshProfiles }: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `star_hopping_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        alert('✅ 数据导入成功！');
        onRefreshProfiles();
      } else {
        alert('❌ 导入失败，数据格式不匹配。');
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* 顶部 Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl shadow-xl border border-slate-800">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              自适应空间造型算法 v1.0
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              寻星练习 <span className="text-indigo-400 font-light">Star-Hopping</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              基于 3-Up/1-Down 阶梯梯度的空间眼力与几何推演训练系统，精确度量并提升观察定点能力。
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExport}
              className="px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-400" />
              导出数据
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              导入数据
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* 3 个训练卡片区 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MODES_CONFIG.map((config) => {
          const profile = profiles[config.id];
          const totalCards = profile?.totalTrainedCards || 0;
          const accuracy =
            totalCards > 0
              ? Math.round((profile!.totalHits / totalCards) * 100)
              : 0;
          const currentDegree = profile?.currentDegreeStep || 20;
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
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${config.badgeColor}`}
                  >
                    {config.subtitle}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {config.title}
                </h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">
                  {config.desc}
                </p>

                {/* 核心指标统计 */}
                <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                      <TrendingUp className="w-3 h-3 text-indigo-500" />
                      能力度数
                    </div>
                    <div className="text-xl font-black text-slate-800">
                      {currentDegree}{' '}
                      <span className="text-xs font-normal text-slate-500">px</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                      <Award className="w-3 h-3 text-emerald-500" />
                      正确率
                    </div>
                    <div className="text-xl font-black text-slate-800">
                      {accuracy}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 动作按钮区 */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => onStart(config.id, 'training')}
                  className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  开始自适应训练
                </button>
                <button
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