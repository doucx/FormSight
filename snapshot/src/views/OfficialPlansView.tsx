import { ArrowLeft, BookOpen, Layers, Sparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { OfficialPlanCard } from '../components/plan/official/OfficialPlanCard';
import { Button } from '../components/ui/button';
import { type OfficialPlanCategory, officialPlanRegistry } from '../config/plans';
import { useTranslation } from '../core/i18n';
import type { TrainingPlan } from '../types/plan';

interface OfficialPlansViewProps {
  userPlans: TrainingPlan[];
  onExit: () => void;
  onNavigateToMyPlans: () => void;
  onAdoptPlan: (preset: import('../config/plans').OfficialPlanPreset, startImmediately?: boolean) => Promise<void>;
}

export function OfficialPlansView({
  userPlans,
  onExit,
  onNavigateToMyPlans,
  onAdoptPlan,
}: OfficialPlansViewProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<OfficialPlanCategory | 'all'>('all');

  const allPresets = useMemo(() => officialPlanRegistry.getAllPresets(), []);

  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'all') return allPresets;
    return allPresets.filter((p) => p.category === selectedCategory);
  }, [allPresets, selectedCategory]);

  const adoptedMap = useMemo(() => {
    const map = new Set<string>();
    for (const plan of userPlans) {
      for (const preset of allPresets) {
        if (plan.id.includes(preset.id)) {
          map.add(preset.id);
        }
      }
    }
    return map;
  }, [userPlans, allPresets]);

  const categories: Array<{ id: OfficialPlanCategory | 'all'; labelKey: string }> = [
    { id: 'all', labelKey: 'common.all' },
    { id: 'warmup', labelKey: 'officialPlans.categoryWarmup' },
    { id: 'form', labelKey: 'officialPlans.categoryForm' },
    { id: 'color', labelKey: 'officialPlans.categoryColor' },
    { id: 'abstraction', labelKey: 'officialPlans.categoryAbstraction' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 顶部标题与导航栏 */}
      <header className="w-full bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onExit} className="gap-1.5 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common.exit')}</span>
          </Button>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-accent text-primary rounded-2xl shadow-xs flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  {t('officialPlans.title')}
                </h1>
                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                  {filteredPresets.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {t('officialPlans.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onNavigateToMyPlans}
          className="gap-1.5 border border-border self-end sm:self-auto"
        >
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>{t('officialPlans.myPlansBtn')}</span>
        </Button>
      </header>

      {/* 分类切换滤镜 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className="rounded-xl h-auto py-2 px-3.5 text-xs font-bold whitespace-nowrap"
          >
            {t(cat.labelKey)}
          </Button>
        ))}
      </div>

      {/* 官方计划卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPresets.map((preset) => (
          <OfficialPlanCard
            key={preset.id}
            preset={preset}
            isAlreadyAdopted={adoptedMap.has(preset.id)}
            onAdoptToLibrary={(p) => onAdoptPlan(p, false)}
            onAdoptAndStart={(p) => onAdoptPlan(p, true)}
          />
        ))}
      </div>
    </div>
  );
}