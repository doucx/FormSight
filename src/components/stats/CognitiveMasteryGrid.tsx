import { Brain, Compass } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { MasteryItem } from '../../hooks/useGlobalStatsData';
import { MetricCard } from '../ui/metric-card';

interface CognitiveMasteryGridProps {
  pathMasteryList: MasteryItem[];
  challengeMasteryList: MasteryItem[];
}

export function CognitiveMasteryGrid({
  pathMasteryList,
  challengeMasteryList,
}: CognitiveMasteryGridProps) {
  const { t } = useTranslation();

  // 依据能力层阶深浅赋予视觉梯队色彩 (L1~10 浅水区, L11~20 进阶区, L21+ 专家区)
  const getLevelBadgeClass = (avgLevel: number) => {
    if (avgLevel === 0) return 'bg-muted text-muted-foreground';
    if (avgLevel >= 21)
      return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black';
    if (avgLevel >= 11)
      return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black';
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black';
  };

  return (
    <>
      {/* 认知路径推演能力矩阵 */}
      <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-600" />
            {t('stats.pathMasteryTitle')}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {t('stats.pathMasterySubtitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pathMasteryList.map((pm) => (
            <MetricCard key={pm.label} variant="subtle" padding="compact" className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="truncate">{pm.label}</span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-lg ${getLevelBadgeClass(pm.avgLevel)}`}
                >
                  {pm.avgLevel > 0 ? `Avg L${pm.avgLevel}` : '--'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {pm.peakLevel > 0
                    ? `Peak L${pm.peakLevel}`
                    : t('stats.practicedTrials', { count: pm.total })}
                </span>
                <span>{t('stats.modulesCount', { count: pm.cardCount })}</span>
              </div>
            </MetricCard>
          ))}
        </div>
      </div>

      {/* 核心心智抗性矩阵 */}
      <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4 text-rose-500" />
            {t('stats.challengeMasteryTitle')}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {t('stats.challengeMasterySubtitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {challengeMasteryList.map((cm) => (
            <MetricCard key={cm.label} variant="subtle" padding="compact" className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="truncate">{cm.label.split(' ')[0]}</span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-lg ${getLevelBadgeClass(cm.avgLevel)}`}
                >
                  {cm.avgLevel > 0 ? `Avg L${cm.avgLevel}` : '--'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {cm.peakLevel > 0
                    ? `Peak L${cm.peakLevel}`
                    : t('stats.practicedTrials', { count: cm.total })}
                </span>
                <span>{t('stats.modulesCount', { count: cm.cardCount })}</span>
              </div>
            </MetricCard>
          ))}
        </div>
      </div>
    </>
  );
}
