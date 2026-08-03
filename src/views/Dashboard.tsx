import { h } from 'preact';
import { useRef } from 'preact/hooks';
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
}> = [
  {
    id: 'single',
    title: '01_单锚点',
    subtitle: 'Single Anchor',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
  },
  {
    id: 'double_h',
    title: '02_水平双锚点',
    subtitle: 'Double Horiz',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
  },
  {
    id: 'double_r',
    title: '03_旋转双锚点',
    subtitle: 'Double Rotated',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
  },
];

export function Dashboard({ profiles, onStart, onRefreshProfiles }: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 导出 JSON 数据
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

  // 导入 JSON 数据
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
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      {/* 顶部标题与操作栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            📐 寻星练习 (Star-Hopping)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            基于自适应梯度的空间造型眼力与几何推演训练系统
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            📤 导出数据
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            📥 导入数据
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

          return (
            <div
              key={config.id}
              className="bg-white border border-gray-200 hover:border-indigo-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {config.title}
                  </h3>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {config.subtitle}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  {config.desc}
                </p>

                {/* 核心指标统计 */}
                <div className="grid grid-cols-2 gap-3 mb-6 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      能力度数 (80%临界)
                    </span>
                    <span className="text-lg font-extrabold text-gray-800">
                      {currentDegree} <span className="text-xs font-normal text-gray-500">px</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      历史正确率
                    </span>
                    <span className="text-lg font-extrabold text-gray-800">
                      {accuracy}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 动作按钮区 */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onStart(config.id, 'training')}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
                >
                  🚀 开始自适应训练
                </button>
                <button
                  onClick={() => onStart(config.id, 'benchmark')}
                  className="w-full py-2 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  🎯 20 题基准测试
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}