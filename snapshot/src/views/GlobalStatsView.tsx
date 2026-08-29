import { Activity, BarChart2, ChevronDown, Filter } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { ActivityHeatmapCard } from '../components/stats/ActivityHeatmapCard';
import { CognitiveMasteryGrid } from '../components/stats/CognitiveMasteryGrid';
import { StatsMetricCards } from '../components/stats/StatsMetricCards';
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { useGlobalStatsData } from '../hooks/useGlobalStatsData';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';

interface GlobalStatsViewProps {
  onExit?: () => void;
}

export function GlobalStatsView({ onExit }: GlobalStatsViewProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    loading,
    selectedFilter,
    setSelectedFilter,
    getCurrentFilterLabel,
    stats,
    dailyData,
    heatmapData,
    pathMasteryList,
    challengeMasteryList,
  } = useGlobalStatsData();

  const packs = registry.getAllPacks();
  const allCards = registry.getAllCards();

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 顶部主操作栏 */}
      <header className="w-full bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-xs">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{t('stats.title')}</h1>
            <p className="text-xs text-slate-400 font-medium">{t('stats.subTitle')}</p>
          </div>
        </div>

        {/* 筛选选择器 */}
        <div className="relative flex items-center self-end sm:self-center w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
            className="w-full sm:w-auto pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all shadow-sm max-w-xs truncate"
          >
            <option value="all">{t('stats.allModules')}</option>

            <optgroup label={t('stats.optgroupPacks')}>
              {packs.map((p) => (
                <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                  {getPackTitle(p, t)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupDomains')}>
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
                <option key={`domain:${domain}`} value={`domain:${domain}`}>
                  {t(DOMAIN_TAGS[domain].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupPaths')}>
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((path) => (
                <option key={`path:${path}`} value={`path:${path}`}>
                  {t(PATH_TAGS[path].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupChallenges')}>
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((ch) => (
                <option key={`challenge:${ch}`} value={`challenge:${ch}`}>
                  {t(CHALLENGE_TAGS[ch].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupCards')}>
              {allCards.map((card) => (
                <option key={`card:${card.id}`} value={`card:${card.id}`}>
                  {getCardTitle(card, t)}
                </option>
              ))}
            </optgroup>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
        </div>
      </header>

      {/* 主体展示区 */}
      {loading ? (
        <div className="h-96 bg-white rounded-3xl border border-slate-200/80 p-6 flex items-center justify-center text-slate-400 text-sm shadow-sm">
          {t('stats.loading')}
        </div>
      ) : stats.allTime.total === 0 ? (
        <div className="h-96 bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 shadow-sm">
          <Activity className="w-10 h-10 text-slate-300" />
          {t('stats.noRecords', { filter: getCurrentFilterLabel() })}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <StatsMetricCards stats={stats} streakDays={Object.keys(dailyData).length} />

          <CognitiveMasteryGrid
            pathMasteryList={pathMasteryList}
            challengeMasteryList={challengeMasteryList}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityHeatmapCard heatmapData={heatmapData} />

            <div className="bg-white border border-slate-200/80 shadow-sm p-6 rounded-3xl flex flex-col gap-2">
              <div className="text-sm font-bold text-slate-800 flex items-center justify-between">
                <span>{t('stats.trendTitle')}</span>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                  {t('stats.dailyMaxLevel')}
                </span>
              </div>
              <canvas ref={canvasRef} width={480} height={160} className="w-full mt-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
