import { ChevronRight, Clock, Copy } from 'lucide-preact';
import type { OfficialPlanPreset } from '../../../config/plans';
import { getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface OfficialPlanCardProps {
  preset: OfficialPlanPreset;
  onAdoptToLibrary: (preset: OfficialPlanPreset) => void;
}

export function OfficialPlanCard({
  preset,
  onAdoptToLibrary,
}: OfficialPlanCardProps) {
  const { t, locale } = useTranslation();

  const dict =
    preset.locales[locale as 'zh-CN' | 'en-US'] ||
    preset.locales['zh-CN'] ||
    preset.locales['en-US'];

  const name = dict?.name || preset.id;
  const description = dict?.description || '';

  const validItems = (preset.items || []).filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  return (
    <div className="group bg-card border border-border hover:border-primary/60 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between gap-5 relative select-none">
      <div className="space-y-4">
        {/* 顶栏：纯粹标题与详细阐述 */}
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {description}
          </p>
        </div>

        {/* 阶段管线可视化预览 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>{t('plan.stageCount', { count: validItems.length })}</span>
            <div className="flex items-center gap-2">
              <span>{t('plan.totalTrialsSummary', { trials: totalTrials })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {t('plan.estimatedTime', { min: estimatedMin })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {validItems.map((item, idx) => {
              const card = registry.getCardById(item.cardId);
              if (!card) return null;
              const Icon = card.icon;
              const cardTitle = getCardTitle(card, t);

              return (
                <div key={`${preset.id}_${item.cardId}_${idx}`} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-2xl shadow-inner">
                    <div className="w-4 h-4 rounded-md bg-accent text-primary flex items-center justify-center font-mono text-[10px] font-black">
                      {idx + 1}
                    </div>
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">{cardTitle}</span>
                    <Badge variant="secondary" size="sm" className="font-mono font-bold text-[10px]">
                      {item.targetTrials}
                      {t('common.trialsUnit')}
                    </Badge>
                  </div>
                  {idx < validItems.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部单一明确的 CTA 操作区 */}
      <div className="flex items-center justify-end pt-4 border-t border-border/60">
        <Button
          variant="default"
          size="sm"
          onClick={() => onAdoptToLibrary(preset)}
          className="gap-1.5"
          title={t('officialPlans.adoptToLibrary')}
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{t('officialPlans.adoptToLibrary')}</span>
        </Button>
      </div>
    </div>
  );
}