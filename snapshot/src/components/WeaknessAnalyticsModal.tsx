import {
  Activity,
  BarChart2,
  CheckCircle,
  Clock,
  Gauge,
  Info,
  LayoutDashboard,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView } from '../core/contracts';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db/index';

interface WeaknessAnalyticsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const { t } = useTranslation();
  const plugin = useMemo(() => registry.getAnalyticsPluginByCardId(card.id), [card.id]);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTabId, setActiveTabId] = useState<string>('overview');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);

  const views = plugin?.views ?? [];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data: UnifiedTrialRecord[]) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [card.id]);

  const currentView = useMemo(() => {
    return views.find((v) => v.id === activeTabId);
  }, [views, activeTabId]);

  useEffect(() => {
    if (loading || !currentView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    currentView.renderVisualizer(canvas, records);
  }, [currentView, loading, records]);

  // 计算全局统计指标
  const summaryStats = useMemo(() => {
    const total = records.length;
    const hits = records.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    const avgResponseTimeSec =
      total > 0
        ? (
            records.reduce((acc, r) => acc + (Number(r.responseTimeMs) || 0), 0) /
            total /
            1000
          ).toFixed(1)
        : '0.0';
    const maxLevel =
      records.length > 0 ? Math.max(...records.map((r) => Number(r.difficultyLevel) || 1)) : 1;

    return { total, hits, accuracy, avgResponseTimeSec, maxLevel };
  }, [records]);

  if (!plugin) return null;

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
  };

  const headerSubtitle =
    activeTabId === 'overview'
      ? t('analyticsModal.overviewSubtitle')
      : resolveText(currentView?.subTitle);

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
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                {t('analyticsModal.cardStatsTitle', { title: cardTitle })}
              </h2>
              <p className="text-xs text-slate-400">{headerSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 多页 Tab 切换栏 */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTabId('overview')}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTabId === 'overview'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            {t('analyticsModal.overviewTabLabel')}
          </button>

          {views.map((v: CardAnalyticsView) => {
            const Icon = v.icon;
            const isActive = v.id === activeTabId;
            return (
              <button
                type="button"
                key={v.id}
                onClick={() => setActiveTabId(v.id)}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {resolveText(v.tabLabel)}
              </button>
            );
          })}
        </div>

        {/* 内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            {t('analyticsModal.analyzing')}
          </div>
        ) : records.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            {t('analyticsModal.noRecords', { title: cardTitle })}
          </div>
        ) : activeTabId === 'overview' ? (
          /* 数据总览专属 Tab */
          <div className="flex flex-col gap-4 animate-in fade-in duration-150">
            {/* 4 维核心大指标卡片 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-1">
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                  <Target className="w-3.5 h-3.5 text-indigo-500" />
                  {t('common.accuracy')}
                </div>
                <div className="text-2xl font-black text-slate-800">{summaryStats.accuracy}%</div>
              </div>

              <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  {t('common.totalHits')}
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {summaryStats.hits}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {summaryStats.total}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  {t('summary.duration')}
                </div>
                <div className="text-2xl font-black text-slate-800 font-mono">
                  {summaryStats.avgResponseTimeSec}
                  <span className="text-xs font-normal text-slate-400"> s</span>
                </div>
              </div>

              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-1">
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  {t('stats.dailyMaxLevel')}
                </div>
                <div className="text-2xl font-black text-slate-800 font-mono">
                  Lvl {summaryStats.maxLevel}
                </div>
              </div>
            </div>

            {/* 总体评价与认知建议 */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  {t('analyticsModal.overallEvaluation')}
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {t('analyticsModal.sampleSize', { count: summaryStats.total })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold">{t('analyticsModal.sweetSpotTitle')}: </span>
                    {summaryStats.accuracy >= 80
                      ? t('analyticsModal.comfortZoneDesc', { maxLevel: summaryStats.maxLevel })
                      : t('analyticsModal.needMoreSamples')}
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-start gap-2.5">
                  <Gauge className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold">{t('analyticsModal.growthZoneTitle')}: </span>
                    Lvl {Math.max(1, summaryStats.maxLevel - 2)} ~ Lvl {summaryStats.maxLevel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentView ? (
          /* 专项分析视图 */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center animate-in fade-in duration-150">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-inner relative">
              <canvas
                key={`${card.id}-${currentView.id}`}
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100"
              />
            </div>

            {/* 右侧数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  {t('analyticsModal.overallEvaluation')}
                </div>
                <div className="text-sm font-extrabold text-slate-800">
                  {resolveText(currentView.title)}
                </div>
              </div>

              {/* 插件个性化诊断 */}
              {currentView.renderDiagnostics(records)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
