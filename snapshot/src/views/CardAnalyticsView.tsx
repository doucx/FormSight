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
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Callout } from '../components/ui/callout';
import { MetricCard } from '../components/ui/metric-card';
import { DOMAIN_TAGS } from '../config/tags';
import { getCognitiveOverviewInsights } from '../core/analytics/universalViews';
import type { CardAnalyticsView as CardAnalyticsViewContract } from '../core/contracts';
import { getCardDesc, getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedTrialRecord } from '../storage/index';

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

  const cardTitle = card ? getCardTitle(card, t) : cardId;
  const cardDesc = card ? getCardDesc(card, t) : '';
  const domainTitle =
    card?.domain && DOMAIN_TAGS[card.domain] ? t(DOMAIN_TAGS[card.domain].i18nKey) : '';

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
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center h-96 gap-4 bg-card rounded-3xl border border-border p-8 shadow-sm">
        <Info className="w-10 h-10 text-muted-foreground" />
        <div className="text-sm font-bold text-foreground">{t('home.noMatchTitle')}</div>
        <Button variant="secondary" onClick={onExit}>
          {t('common.completeAndReturnHome')}
        </Button>
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
      <header className="w-full bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Button variant="secondary" size="sm" onClick={onExit} className="gap-1.5 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
            {t('common.exit')}
          </Button>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-accent text-primary rounded-2xl shadow-xs flex-shrink-0">
              <CardIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-foreground truncate tracking-tight">
                  {cardTitle}
                </h1>
                {domainTitle && (
                  <Badge variant="secondary" size="sm">
                    {domainTitle}
                  </Badge>
                )}
                {card.tags.status === 'experimental' && (
                  <Badge variant="warning" size="sm">
                    <FlaskConical className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {t('card.experimentalBadge')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                {cardDesc || t('analyticsModal.cardStatsTitle', { title: cardTitle })}
              </p>
            </div>
          </div>
        </div>

        {/* 右侧操作按钮组 */}
        <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onOpenSettings(card.id)}
            className="border border-border"
            title={t('card.settingsTooltip', { title: cardTitle })}
          >
            <Sliders className="w-4 h-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onStartBenchmark(card.id)}
            className="gap-1.5"
            title={t('card.startBenchmark')}
          >
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{t('card.startBenchmark')}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onStartTraining(card.id)}
            className="gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('card.startAdaptive')}</span>
          </Button>
        </div>
      </header>

      {/* 多页 Tab 切换栏 */}
      <div className="w-full bg-card border border-border rounded-2xl p-1.5 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <Button
          variant={activeTabId === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTabId('overview')}
          className="gap-1.5 whitespace-nowrap"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          {t('analyticsModal.overviewTabLabel')}
        </Button>

        {views.map((v: CardAnalyticsViewContract) => {
          const Icon = v.icon;
          const isActive = v.id === activeTabId;
          return (
            <Button
              key={v.id}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTabId(v.id)}
              className="gap-1.5 whitespace-nowrap"
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {resolveText(v.tabLabel)}
            </Button>
          );
        })}
      </div>

      {/* 主体展示区 */}
      {loading ? (
        <div className="h-96 bg-card rounded-3xl border border-border p-6 flex items-center justify-center text-muted-foreground text-xs shadow-sm">
          {t('analyticsModal.analyzing')}
        </div>
      ) : records.length === 0 ? (
        <div className="h-96 bg-card rounded-3xl border border-border p-8 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-muted text-muted-foreground rounded-3xl">
            <Info className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-foreground">
            {t('analyticsModal.noRecords', { title: cardTitle })}
          </div>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
            {t('analyticsModal.needMoreSamples')}
          </p>
          <Button
            variant="default"
            onClick={() => onStartTraining(card.id)}
            className="mt-2 gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {t('card.startAdaptive')}
          </Button>
        </div>
      ) : activeTabId === 'overview' ? (
        /* 数据总览专属视图 */
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* 4 维核心大指标卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <Target className="w-4 h-4 text-primary" />
                {t('common.accuracy')}
              </div>
              <div className="text-3xl font-black text-foreground">{summaryStats.accuracy}%</div>
            </MetricCard>

            <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {t('common.totalHits')}
              </div>
              <div className="text-3xl font-black text-foreground">
                {summaryStats.hits}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  / {summaryStats.total}
                </span>
              </div>
            </MetricCard>

            <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <Clock className="w-4 h-4 text-primary" />
                {t('summary.duration')}
              </div>
              <div className="text-3xl font-black text-foreground font-mono">
                {summaryStats.avgResponseTimeSec}
                <span className="text-xs font-normal text-muted-foreground"> s</span>
              </div>
            </MetricCard>

            <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                {t('stats.dailyMaxLevel')}
              </div>
              <div className="text-3xl font-black text-foreground font-mono">
                Lvl {summaryStats.maxLevel}
              </div>
            </MetricCard>
          </div>

          {/* 总体评价与认知建议 */}
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                {t('analyticsModal.overallEvaluation')}
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {t('analyticsModal.sampleSize', { count: summaryStats.total })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {(() => {
                const insights = getCognitiveOverviewInsights(records);
                return (
                  <>
                    <Callout
                      variant="warning"
                      icon={Zap}
                      title={t('analyticsModal.paceSummaryTitle')}
                    >
                      <p className="text-muted-foreground text-xs">{insights.paceSummaryText}</p>
                    </Callout>

                    <Callout
                      variant="accent"
                      icon={Gauge}
                      title={t('analyticsModal.levelFocusSummaryTitle')}
                    >
                      <p className="text-muted-foreground text-xs">{insights.growthZoneText}</p>
                    </Callout>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      ) : currentView ? (
        /* 专项分析视图 */
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-150">
          {/* 左侧 Canvas 可视化区 */}
          <div className="lg:col-span-7 flex items-center justify-center bg-muted/40 p-4 sm:p-6 rounded-3xl border border-border shadow-inner relative min-h-[320px] overflow-hidden">
            <canvas
              key={`${card.id}-${currentView.id}`}
              ref={canvasRef}
              className="max-w-full rounded-2xl border border-border/60 shadow-xs block"
            />
          </div>

          {/* 右侧数据统计与认知诊断面板 */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-muted/60 p-4 rounded-2xl border border-border/60 space-y-1">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {resolveText(currentView.title)}
              </div>
              <div className="text-sm font-black text-foreground">
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
