import { BarChart2, FlaskConical, Play, Sliders, Target } from 'lucide-preact';
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
    <div
      role="presentation"
      onClick={onStartTraining}
      className="group bg-white border border-slate-200/90 hover:border-indigo-500 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative cursor-pointer select-none"
    >
      <div>
        {/* 顶部标题、图标与右上角状态徽章 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-105 transition-all shadow-xs flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                  {title}
                </h3>
                {isExperimental && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg flex-shrink-0">
                    <FlaskConical className="w-3 h-3 text-amber-600" />
                    {t('card.experimentalBadge')}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {todayCount > 0
                  ? `${t('card.todayTrials')}: ${todayCount} ${t('common.trialsUnit')}${
                      todayTimeMs > 0 ? ` (${formatTodayTimeWithT(todayTimeMs, t)})` : ''
                    }`
                  : t('common.empty')}
              </div>
            </div>
          </div>

          {/* 右上角：等级胶囊与快捷操作 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-mono font-black bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-700 border border-slate-200/80 group-hover:border-indigo-200 px-2.5 py-1 rounded-xl text-slate-700 transition-colors">
              Lvl {currentLevel}
            </span>

            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
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
        </div>

        {/* 卡片描述 */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[2.5rem] mb-5">
          {desc}
        </p>
      </div>

      {/* 底部指标栏与浮动操作按钮 */}
      <div
        className="flex items-end justify-between border-t border-slate-100 pt-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* 左侧：正确率综合指示 */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('card.accuracy')}
          </div>
          <div className="text-sm font-black text-slate-800 font-mono flex items-baseline gap-1.5">
            <span className={accuracy >= 80 ? 'text-emerald-600' : 'text-slate-800'}>
              {accuracy}%
            </span>
            {todayCount > 0 && (
              <span className="text-[11px] font-normal text-slate-400 font-sans">
                ({todayCount} {t('common.trialsUnit')})
              </span>
            )}
          </div>
        </div>

        {/* 右侧：紧凑动作按钮组 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStartBenchmark}
            className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all cursor-pointer"
            title={t('card.startBenchmark')}
          >
            <Target className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={onStartTraining}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 group-hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('card.startAdaptive')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}