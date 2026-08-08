import { ArrowRight, Clock, Compass, Palette, Sliders, Sparkles } from 'lucide-preact';
import { formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  starHoppingTimeMs: number;
  colorTimeMs: number;
  onNavigate: (app: 'star-hopping' | 'color-sense') => void;
  onOpenGlobalSettings: () => void;
}

export function Home({
  totalTimeMs,
  starHoppingTimeMs,
  colorTimeMs,
  onNavigate,
  onOpenGlobalSettings,
}: HomeProps) {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-10">
      {/* 品牌 Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-8 py-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              FormSight{' '}
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                v0.2.0
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">视觉造型构图与色彩感知强化训练系统</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
          <button
            type="button"
            onClick={onOpenGlobalSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5"
            title="全局设置"
          >
            <Sliders className="w-4 h-4" />
            全局设置
          </button>
        </div>
      </div>

      {/* 模块选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. 寻星练习 */}
        <button
          type="button"
          onClick={() => onNavigate('star-hopping')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                可练习
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">寻星练习 (Star-Hopping)</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                单锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                水平双锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                旋转双锚点
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>累计练习: {formatTotalTime(starHoppingTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入寻星练习看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* 2. 色感练习 */}
        <button
          type="button"
          onClick={() => onNavigate('color-sense')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                <Palette className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                色感核心 (HSV)
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                色感训练 (Color Recognition)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation)
                的分级递进识别，全面建立微小色彩差异感知力。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                1-色相 (Hue)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                2-明度 (Val)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                3-饱和度 (Sat)
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>累计练习: {formatTotalTime(colorTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入色感练习看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入色感练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
