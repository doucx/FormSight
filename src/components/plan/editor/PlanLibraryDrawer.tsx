import { Check, Plus, Star, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { PlanStorageState, TrainingPlan } from '../../../types/plan';

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
    <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-slate-700 tracking-tight">
          {t('plan.switchEditingPlan')}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCreateNewBlankPlan}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('plan.createNewBlankPlan')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            {t('plan.collapse')}
          </button>
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
                  ? 'bg-white border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-800 truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                      {t('plan.officialTag')}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(p.id, e)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isFav
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-slate-300 hover:text-slate-500'
                  }`}
                  title={isFav ? t('common.favoritedTooltip') : t('common.unfavoritedTooltip')}
                >
                  <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(p.id, e)}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isPendingDelete
                      ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                      : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title={isPendingDelete ? t('common.confirm') : t('common.deletePlan')}
                >
                  {isPendingDelete ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
