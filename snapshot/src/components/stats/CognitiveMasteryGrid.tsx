import { Brain, Compass } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';

export interface MasteryItem {
  label: string;
  total: number;
  hits: number;
  accuracy: number;
  cardCount: number;
}

interface CognitiveMasteryGridProps {
  pathMasteryList: MasteryItem[];
  challengeMasteryList: MasteryItem[];
}

export function CognitiveMasteryGrid({
  pathMasteryList,
  challengeMasteryList,
}: CognitiveMasteryGridProps) {
  const { t } = useTranslation();

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
            <div
              key={pm.label}
              className="bg-muted/60 p-4 rounded-2xl border border-border space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="truncate">{pm.label}</span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-lg ${
                    pm.total === 0
                      ? 'bg-muted text-muted-foreground'
                      : pm.accuracy >= 80
                        ? 'bg-emerald-50 text-emerald-700 font-black'
                        : pm.accuracy >= 60
                          ? 'bg-amber-50 text-amber-700 font-black'
                          : 'bg-rose-50 text-rose-700 font-black'
                  }`}
                >
                  {pm.total > 0 ? `${pm.accuracy}%` : '--'}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{t('stats.practicedTrials', { count: pm.total })}</span>
                <span>{t('stats.modulesCount', { count: pm.cardCount })}</span>
              </div>
            </div>
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
            <div
              key={cm.label}
              className="bg-muted/60 p-4 rounded-2xl border border-border space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="truncate">{cm.label.split(' ')[0]}</span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-lg ${
                    cm.total === 0
                      ? 'bg-muted text-muted-foreground'
                      : cm.accuracy >= 80
                        ? 'bg-rose-50 text-rose-700 font-black'
                        : cm.accuracy >= 60
                          ? 'bg-amber-50 text-amber-700 font-black'
                          : 'bg-muted text-muted-foreground font-black'
                  }`}
                >
                  {cm.total > 0 ? `${cm.accuracy}%` : '--'}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{t('stats.practicedTrials', { count: cm.total })}</span>
                <span>{t('stats.modulesCount', { count: cm.cardCount })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
