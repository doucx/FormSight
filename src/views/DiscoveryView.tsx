import { Compass, Inbox, Layers, RotateCcw, Sparkles, Target } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { ModeCard } from '../components/common/ModeCard';
import { FilterEngine } from '../components/discovery/FilterEngine';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { DOMAIN_TAGS } from '../config/tags';
import { getCardDesc, getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedProfileData } from '../storage/index';
import type { CardQueryOptions, VisualDomainTag } from '../types/card';

interface DiscoveryViewProps {
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  query?: CardQueryOptions;
  onQueryChange?: (query: CardQueryOptions) => void;
  onStartCard: (cardId: string, type: 'training' | 'benchmark') => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
}

/** 1. 固定的四大基础视觉域标准顺序 */
const DOMAIN_ORDER: VisualDomainTag[] = [
  'form_and_proportion',
  'spatial_structure',
  'color_and_value',
  'rhythm_and_notan',
];

/** 2. 视觉域专属代表图标映射 */
const DOMAIN_ICON_MAP: Record<VisualDomainTag, typeof Target> = {
  form_and_proportion: Target,
  spatial_structure: Compass,
  color_and_value: Sparkles,
  rhythm_and_notan: Layers,
};

export function DiscoveryView({
  todayStats,
  profiles,
  query: externalQuery,
  onQueryChange,
  onStartCard,
  onOpenCardSettings,
  onOpenCardAnalytics,
}: DiscoveryViewProps) {
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState<CardQueryOptions>(externalQuery || {});

  const activeQuery = externalQuery !== undefined ? externalQuery : localQuery;

  const handleQueryChange = (newQuery: CardQueryOptions) => {
    setLocalQuery(newQuery);
    onQueryChange?.(newQuery);
  };

  const filteredCards = useMemo(() => {
    return registry.queryCards(activeQuery);
  }, [activeQuery]);

  /** 3. 依据标准顺序将卡片派生归组，并自动隐藏无匹配题目的空域 */
  const groupedDomains = useMemo(() => {
    return DOMAIN_ORDER.map((domain) => {
      const cards = filteredCards.filter((card) => card.domain === domain);
      const meta = DOMAIN_TAGS[domain];
      const Icon = DOMAIN_ICON_MAP[domain];
      return {
        domain,
        meta,
        Icon,
        cards,
      };
    }).filter((group) => group.cards.length > 0);
  }, [filteredCards]);

  const handleScrollToDomain = (domain: VisualDomainTag) => {
    const el = document.getElementById(`domain-section-${domain}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 顶部标题与说明栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {t('nav.discovery')}
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            {t('home.matchedModules', { count: filteredCards.length })}
          </p>
        </div>
      </div>

      {/* 五维标签与搜索筛选引擎 */}
      <FilterEngine
        query={activeQuery}
        totalMatches={filteredCards.length}
        onChange={handleQueryChange}
      />

      {/* 快捷跳转锚点条 (Quick Jump Bar)：当存在 2 个以上活跃视觉域时呈现 */}
      {groupedDomains.length > 1 && (
        <nav
          aria-label="Visual domain quick jump"
          className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none animate-in fade-in duration-150"
        >
          {groupedDomains.map(({ domain, meta, Icon, cards }) => (
            <button
              key={domain}
              type="button"
              onClick={() => handleScrollToDomain(domain)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-card hover:bg-accent border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all shadow-2xs whitespace-nowrap active:scale-95"
            >
              <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>{t(meta.i18nKey)}</span>
              <span className="font-mono text-[11px] text-muted-foreground ml-0.5">
                {cards.length}
              </span>
            </button>
          ))}
        </nav>
      )}

      {/* 模块大盘分区卡片列表 */}
      {filteredCards.length === 0 ? (
        <div className="w-full bg-card border border-border rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-muted text-muted-foreground rounded-3xl">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-foreground">{t('home.noMatchTitle')}</div>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
            {t('home.noMatchDesc')}
          </p>
          <Button variant="accent" onClick={() => handleQueryChange({})} className="mt-2 gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            {t('home.resetFilter')}
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedDomains.map(({ domain, meta, Icon, cards }) => (
            <section key={domain} id={`domain-section-${domain}`} className="space-y-4 scroll-mt-6">
              {/* 分区头部 Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-accent text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-foreground tracking-tight">
                      {t(meta.i18nKey)}
                    </h2>
                    <Badge variant="secondary" size="sm" className="font-mono">
                      {cards.length}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 分区卡片网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => {
                  const profile = profiles[card.id];
                  const totalTrials = profile?.totalTrials || 0;
                  const accuracy =
                    totalTrials > 0 && profile
                      ? Math.round((profile.totalHits / totalTrials) * 100)
                      : 0;
                  const currentLevel = profile?.currentLevel || 5;
                  const stat = todayStats[card.id] || { count: 0, timeMs: 0 };
                  const cardTitle = getCardTitle(card, t);
                  const cardDesc = getCardDesc(card, t);

                  return (
                    <ModeCard
                      key={card.id}
                      title={cardTitle}
                      desc={cardDesc}
                      icon={card.icon}
                      todayCount={stat.count}
                      todayTimeMs={stat.timeMs}
                      currentLevel={currentLevel}
                      accuracy={accuracy}
                      totalTrials={totalTrials}
                      hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                      isExperimental={card.tags.status === 'experimental'}
                      onStartTraining={() => onStartCard(card.id, 'training')}
                      onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                      onOpenSettings={() => onOpenCardSettings(card.id)}
                      onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
