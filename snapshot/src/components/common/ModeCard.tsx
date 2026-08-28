import { Award, BarChart2, FlaskConical, Play, Sliders, Target, TrendingUp } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useTranslation } from '../../core/i18n';

export function formatTodayTimeWithT(ms: number, t: (key: string) => string): string {
  if (ms <= 0) return `0${t('common.sec')}`;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}${t('common.sec')}`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0
    ? `${min}${t('common.min')}${sec}${t('common.sec')}`
    : `${min}${t('common.minFull')}`;
}

interface ModeCardProps {
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  accuracy: number;
  hasAnalytics?: boolean;
  isExperimental?: boolean;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  accuracy,
  hasAnalytics = false,
  isExperimental = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
  const { t } = useTranslation();

  return (
    <div className="group bg-white border border-gray-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <Icon className="w-6 h-6" />
            </div>

            {/* 卡片级专属操作快捷入口 */}
            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
              {hasAnalytics && onOpenAnalytics && (
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                  title={t('card.analyticsTooltip', { title })}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                title={t('card.settingsTooltip', { title })}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-semibold text-slate-400">{t('card.todayTrials')}</div>
            <div className="text-xs font-bold text-slate-500 font-mono">
              {todayCount} {t('common.trialsUnit')}
              {todayCount > 0 && todayTimeMs > 0 && (
                <span className="text-[11px] text-slate-400 font-normal ml-1">
                  ({formatTodayTimeWithT(todayTimeMs, t)})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          {isExperimental && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
              <FlaskConical className="w-3 h-3 text-amber-600" />
              {t('card.experimentalBadge')}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">{desc}</p>

        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
              <TrendingUp className="w-3 h-3 text-indigo-500" />
              {t('card.skillLevel')}
            </div>
            <div className="text-xl font-black text-slate-800">
              {t('card.levelBadge', { level: currentLevel })}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
              <Award className="w-3 h-3 text-emerald-500" />
              {t('card.accuracy')}
            </div>
            <div className="text-xl font-black text-slate-800">{accuracy}%</div>
          </div>
        </div>
      </div>

      {/* 动作按钮区 */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onStartTraining}
          className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {t('card.startAdaptive')}
        </button>
        <button
          type="button"
          onClick={onStartBenchmark}
          className="w-full py-2.5 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Target className="w-3.5 h-3.5 text-gray-500" />
          {t('card.startBenchmark')}
        </button>
      </div>
    </div>
  );
}