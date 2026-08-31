import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Play,
  Plus,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface PlanHeroCardProps {
  plan: TrainingPlan;
  allPlans?: TrainingPlan[];
  onStartPlan: () => void;
  onOpenEditor: () => void;
  onSelectPlan?: (planId: string) => void;
}

export function PlanHeroCard({
  plan,
  allPlans = [],
  onStartPlan,
  onOpenEditor,
  onSelectPlan,
}: PlanHeroCardProps) {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const hasItems = plan.items && plan.items.length > 0;
  const totalTrials = (plan.items || []).reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  const favoritePlans = allPlans.filter((p) => p.isFavorite ?? true);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  if (!hasItems) {
    return (
      <div className="w-full bg-accent/40 border-2 border-dashed border-border rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-accent text-primary rounded-2xl">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{t('plan.todayPlan')}</h2>
              <Badge variant="secondary" size="sm">
                {t('common.empty')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('plan.emptyHeroDesc')}</p>
          </div>
        </div>

        <Button
          variant="default"
          onClick={onOpenEditor}
          className="w-full sm:w-auto gap-2 flex-shrink-0 rounded-2xl"
        >
          <Plus className="w-4 h-4" />
          <span>{t('plan.customizeBtn')}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="group w-full bg-card border border-border hover:border-primary/60 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 relative z-10">
      <div className="flex items-center justify-between border-b border-border/60 pb-3.5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-primary-foreground rounded-2xl shadow-xs">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {favoritePlans.length > 1 && onSelectPlan ? (
                <div ref={dropdownRef} className="relative inline-block text-left">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="h-auto p-0 hover:bg-transparent text-lg font-black text-foreground tracking-tight hover:text-primary gap-1.5"
                  >
                    <span>{plan.name}</span>
                    <div
                      className={`p-1 rounded-lg bg-muted text-muted-foreground group-hover:text-primary transition-all duration-200 ${
                        isDropdownOpen ? 'rotate-180 bg-accent text-primary' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </Button>

                  {isDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 flex items-center justify-between">
                        <span>{t('plan.switchPlan')}</span>
                        <span className="font-mono">
                          {t('plan.availableCount', { count: favoritePlans.length })}
                        </span>
                      </div>

                      <div className="max-h-60 overflow-y-auto py-1 space-y-1 pr-1">
                        {favoritePlans.map((p) => {
                          const isSelected = p.id === plan.id;
                          const stageCount = (p.items || []).length;
                          const pTrials = (p.items || []).reduce(
                            (acc, c) => acc + c.targetTrials,
                            0,
                          );

                          return (
                            <Button
                              key={p.id}
                              variant={isSelected ? 'accent' : 'ghost'}
                              size="sm"
                              onClick={() => {
                                onSelectPlan(p.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full h-auto p-2.5 rounded-xl text-left justify-between items-center gap-2.5 ${
                                isSelected
                                  ? 'shadow-xs border border-indigo-200 dark:border-indigo-900'
                                  : 'text-foreground'
                              }`}
                            >
                              <div className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate text-foreground">
                                    {p.name}
                                  </span>
                                  {p.isBuiltin && (
                                    <Badge variant="secondary" size="sm">
                                      {t('common.official')}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {t('plan.stageCount', { count: stageCount })} •{' '}
                                  {t('plan.totalTrialsSummary', { trials: pTrials })}
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <h2 className="text-lg font-black text-foreground tracking-tight">{plan.name}</h2>
              )}

              <Badge variant="accent" size="sm" className="rounded-full">
                {t('plan.stageCount', { count: plan.items.length })}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium mt-0.5">
              <span>{t('plan.totalTrialsSummary', { trials: totalTrials })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {t('plan.estimatedTime', { min: estimatedMin })}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenEditor}
          className="gap-1.5 shadow-xs border border-border"
          title={t('plan.editPlan')}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{t('plan.editPlan')}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {plan.items.map((item, idx) => {
          const card = registry.getCardById(item.cardId);
          if (!card) return null;
          const Icon = card.icon;
          const cardTitle = getCardTitle(card, t);

          return (
            <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-2 rounded-2xl shadow-inner">
                <div className="w-5 h-5 rounded-lg bg-accent text-primary flex items-center justify-center font-mono text-xs font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">{cardTitle}</span>
                <Badge variant="accent" size="sm" className="font-mono font-bold">
                  {item.targetTrials}
                  {t('common.trialsUnit')}
                </Badge>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <div className="text-xs text-muted-foreground font-medium">{t('plan.syncNotice')}</div>

        <Button
          variant="default"
          onClick={onStartPlan}
          className="py-3 px-6 gap-2 ml-auto rounded-2xl"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{t('plan.startPlan')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
