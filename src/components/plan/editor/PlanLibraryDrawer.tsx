import { Check, Plus, Star, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { PlanStorageState, TrainingPlan } from '../../../types/plan';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface PlanLibraryDrawerProps {
  storageState: PlanStorageState;
  currentPlan: TrainingPlan;
  onSelectPlan: (p: TrainingPlan) => void;
  onCreateNewBlankPlan: () => void;
  onClose: () => void;
  onToggleFavorite: (planId: string, e: MouseEvent) => void;
  onDeletePlan: (planId: string, e: MouseEvent) => void;
}

export function PlanLibraryDrawer({
  storageState,
  currentPlan,
  onSelectPlan,
  onCreateNewBlankPlan,
  onClose,
  onToggleFavorite,
  onDeletePlan,
}: PlanLibraryDrawerProps) {
  const { t } = useTranslation();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === planId) {
      setConfirmDeleteId(null);
      onDeletePlan(planId, e);
    } else {
      setConfirmDeleteId(planId);
      setTimeout(() => setConfirmDeleteId((prev) => (prev === planId ? null : prev)), 3000);
    }
  };

  return (
    <div className="p-4 bg-muted/60 border border-border rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-foreground tracking-tight">
          {t('plan.switchEditingPlan')}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateNewBlankPlan}
            className="text-primary hover:text-primary gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('plan.createNewBlankPlan')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            {t('plan.collapse')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
        {storageState.plans.map((p) => {
          const isActive = currentPlan.id === p.id;
          const isFav = p.isFavorite ?? true;
          const stageCount = (p.items || []).length;
          const totalTrials = (p.items || []).reduce((acc, c) => acc + c.targetTrials, 0);
          const isPendingDelete = confirmDeleteId === p.id;

          return (
            <div
              key={p.id}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-card border-primary shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-card/80 border-border hover:bg-card hover:border-primary/60 shadow-xs'
              }`}
            >
              <Button
                variant="ghost"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left justify-start flex-col items-start p-0 h-auto"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-foreground truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <Badge variant="accent" size="sm">
                      {t('plan.officialTag')}
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 font-normal">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </Button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={(e) => onToggleFavorite(p.id, e as unknown as MouseEvent)}
                  className={`rounded-xl ${
                    isFav ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={isFav ? t('common.favoritedTooltip') : t('common.unfavoritedTooltip')}
                >
                  <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                </Button>

                <Button
                  variant={isPendingDelete ? 'danger' : 'ghost'}
                  size="iconSm"
                  onClick={(e) => handleDeleteClick(p.id, e as unknown as MouseEvent)}
                  className={`rounded-xl ${
                    isPendingDelete
                      ? 'animate-pulse'
                      : 'text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                  }`}
                  title={isPendingDelete ? t('common.confirm') : t('common.deletePlan')}
                >
                  {isPendingDelete ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
