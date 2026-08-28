import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Clock,
  FlaskConical,
  Gauge,
  Info,
  LayoutDashboard,
  Play,
  Sliders,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView as CardAnalyticsViewContract } from '../core/contracts';
import { getCardDesc, getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedTrialRecord } from '../utils/db/index';

interface CardAnalyticsViewProps {
  cardId: string;
  initialTab?: string;
  onExit: () => void;
  onStartTraining: (cardId: string) => void;
  onStartBenchmark: (cardId: string) => void;
  onOpenSettings: (cardId: string) => void;
}

export function CardAnalyticsView({
  cardId,
  initialTab,
  onExit,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
}: CardAnalyticsViewProps) {
  const { t } = useTranslation();
  const card = registry.getCardById(cardId);
  const plugin = useMemo(
    () => (card ? registry.getAnalyticsPluginByCardId(card.id) : null),
    [card],
  );
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTabId, setActiveTabId] = useState<string>(initialTab || 'overview');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pack = card ? registry.getPack(card.packId) : null;
  const cardTitle = card ? getCardTitle(card, t) : cardId;
  const cardDesc = card ? getCardDesc(card, t) : '';
  const packTitle = pack ? getPackTitle(pack, t) : '';

  const views = plugin?.views ?? [];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin && card) {
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
  }, [plugin, card]);

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

  if (!card || !plugin) {
    return (
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center h-96 gap-4 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <Info className="w-10 h-10 text-slate-400" />
        <div className="text-sm font-bold text-slate-700">{t('home.noMatchTitle')}</div>
        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
        >
          {t('common.completeAndReturnHome')}
        </button>
      </div>
    );
  }

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
  };

  const CardIcon = card.icon;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 顶部主操作栏 */}
      <header className="w-full bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.exit')}
          </button>
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-xs flex-shrink-0">
              <CardIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate tracking-tight">
                  {cardTitle}
                </h1>
                {packTitle && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200/60">
                    {packTitle}
                  </span>
                )}
                {card.tags.status === 'experimental' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                    <FlaskConical className="w-3 h-3 text-amber-600" />
                    {t('card.experimentalBadge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                {cardDesc || t('analyticsModal.cardStatsTitle', { title: cardTitle })}
              </p>
            </div>
          </div>
        </div>

        {/* 右侧操作按钮组 */}
        <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenSettings(card.id)}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-xs"
            title={t('card.settingsTooltip', { title: cardTitle })}
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStartBenchmark(card.id)}
            className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
            title={t('card.startBenchmark')}
          >
            <Target className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('card.startBenchmark')}</span>
          </button>

          <button
            type="button"
            onClick={() => onStartTraining(card.id)}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('card.startAdaptive')}</span>
          </button>
        </div>
      </header>

      {/* 多页 Tab 切换栏 */}
      <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTabId('overview')}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTabId === 'overview'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          {t('analyticsModal.overviewTabLabel')}
        </button>

        {views.map((v: CardAnalyticsViewContract) => {
          const Icon = v.icon;
          const isActive = v.id === activeTabId;
          return (
            <button
              type="button"
              key={v.id}
              onClick={() => setActiveTabId(v.id)}
              className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {resolveText(v.tabLabel)}
            </button>
          );
        })}
      </div>

      {/* 主体展示区 */}
      {loading ? (
        <div className="h-96 bg-white rounded-3xl border border-slate-200/80 p-6 flex items-center justify-center text-slate-400 text-xs shadow-sm">
          {t('analyticsModal.analyzing')}
        </div>
      ) : records.length === 0 ? (
        <div className="h-96 bg-white rounded-3xl border border-slate-200/80 p-8 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl">
            <Info className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-slate-800">
            {t('analyticsModal.noRecords', { title: cardTitle })}
          </div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            {t('analyticsModal.needMoreSamples')}
          </p>
          <button
            type="button"
            onClick={() => onStartTraining(card.id)}
            className="mt-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {t('card.startAdaptive')}
          </button>
        </div>
      ) : activeTabId === 'overview' ? (
        /* 数据总览专属视图 */
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* 4 维核心大指标卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <Target className="w-4 h-4 text-indigo-500" />
                {t('common.accuracy')}
              </div>
              <div className="text-3xl font-black text-slate-800">{summaryStats.accuracy}%</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {t('common.totalHits')}
              </div>
              <div className="text-3xl font-black text-slate-800">
                {summaryStats.hits}{' '}
                <span className="text-xs font-normal text-slate-400">/ {summaryStats.total}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <Clock className="w-4 h-4 text-indigo-500" />
                {t('summary.duration')}
              </div>
              <div className="text-3xl font-black text-slate-800 font-mono">
                {summaryStats.avgResponseTimeSec}
                <span className="text-xs font-normal text-slate-400"> s</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                {t('stats.dailyMaxLevel')}
              </div>
              <div className="text-3xl font-black text-slate-800 font-mono">
                Lvl {summaryStats.maxLevel}
              </div>
            </div>
          </div>

          {/* 总体评价与认知建议 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                {t('analyticsModal.overallEvaluation')}
              </div>
              <span className="text-xs font-mono text-slate-400">
                {t('analyticsModal.sampleSize', { count: summaryStats.total })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                  <div className="font-bold text-slate-900">
                    {t('analyticsModal.sweetSpotTitle')}
                  </div>
                  <p className="text-slate-600">
                    {summaryStats.accuracy >= 80
                      ? t('analyticsModal.comfortZoneDesc', { maxLevel: summaryStats.maxLevel })
                      : t('analyticsModal.needMoreSamples')}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl flex-shrink-0">
                  <Gauge className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                  <div className="font-bold text-slate-900">
                    {t('analyticsModal.growthZoneTitle')}
                  </div>
                  <p className="text-slate-600">
                    Lvl {Math.max(1, summaryStats.maxLevel - 2)} ~ Lvl {summaryStats.maxLevel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : currentView ? (
        /* 专项分析视图 */
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-150">
          {/* 左侧 Canvas 可视化区 */}
          <div className="lg:col-span-7 flex justify-center bg-slate-50 p-6 rounded-3xl border border-slate-200/80 shadow-inner relative">
            <canvas
              key={`${card.id}-${currentView.id}`}
              ref={canvasRef}
              width={320}
              height={320}
              className="w-full max-w-[340px] aspect-square rounded-2xl border border-slate-100 shadow-xs"
            />
          </div>

          {/* 右侧数据统计与认知诊断面板 */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {resolveText(currentView.title)}
              </div>
              <div className="text-sm font-black text-slate-800">
                {resolveText(currentView.subTitle)}
              </div>
            </div>

            {/* 插件个性化诊断 */}
            <div className="space-y-3">{currentView.renderDiagnostics(records)}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
