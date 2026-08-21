import { Plus, Star, Trash2 } from 'lucide-preact';
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
  return (
    <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">切换正在编辑的训练计划：</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCreateNewBlankPlan}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            新建空白计划
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            收起
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {storageState.plans.map((p) => {
          const isActive = currentPlan.id === p.id;
          const isFav = p.isFavorite ?? true;
          const stageCount = (p.items || []).length;

          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                  : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">
                      官方
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {stageCount} 个阶段 •{' '}
                  {(p.items || []).reduce((acc, c) => acc + c.targetTrials, 0)} 题
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(p.id, e)}
                  className={`p-1 rounded-lg transition-colors ${
                    isFav
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-slate-300 hover:text-slate-500'
                  }`}
                  title={isFav ? '已收藏 (显示在主页快速切换)' : '未收藏'}
                >
                  <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={(e) => onDeletePlan(p.id, e)}
                  className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="删除计划"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
