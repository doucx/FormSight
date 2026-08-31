import {
  Check,
  Copy,
  Download,
  Edit3,
  Layers,
  MoreHorizontal,
  Play,
  Save,
  Sparkles,
  Upload,
} from 'lucide-preact';
import type { RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { TrainingPlan } from '../../../types/plan';

export interface PlanEditorHeaderProps {
  currentPlan: TrainingPlan;
  isNewPlan: boolean;
  isEditingName: boolean;
  planNameInput: string;
  showPlanManager: boolean;
  plansCount: number;
  fileInputRef: RefObject<HTMLInputElement>;
  onStartEditingName: () => void;
  onCancelEditingName: () => void;
  onPlanNameChange: (name: string) => void;
  onNameSave: () => void;
  onTogglePlanManager: () => void;
  onClonePlan: () => void;
  onExportPlan: () => void;
  onImportPlan: (e: Event) => void;
  onSaveOnly: () => void;
  onSaveAndStart: () => void;
}

export function PlanEditorHeader({
  currentPlan,
  isNewPlan,
  isEditingName,
  planNameInput,
  showPlanManager,
  plansCount,
  fileInputRef,
  onStartEditingName,
  onCancelEditingName,
  onPlanNameChange,
  onNameSave,
  onTogglePlanManager,
  onClonePlan,
  onExportPlan,
  onImportPlan,
  onSaveOnly,
  onSaveAndStart,
}: PlanEditorHeaderProps) {
  const { t } = useTranslation();
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState<boolean>(false);

  useEffect(() => {
    if (!showMobileMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMobileMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileMoreMenu]);

  return (
    <header className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 flex-shrink-0">
      {/* 左侧：计划名与重命名 */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-1 w-full max-w-xs">
              <input
                type="text"
                value={planNameInput}
                onInput={(e) => onPlanNameChange((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onNameSave();
                  if (e.key === 'Escape') onCancelEditingName();
                }}
                maxLength={32}
                className="w-full px-2.5 py-1 text-xs sm:text-sm font-black text-slate-800 bg-slate-50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder={t('plan.nameInputPlaceholder')}
              />
              <button
                type="button"
                onClick={onNameSave}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                title={t('common.confirm')}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate tracking-tight">
                {currentPlan.name}
              </h1>
              <button
                type="button"
                onClick={onStartEditingName}
                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                title={t('plan.renameTitle')}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              {isNewPlan ? (
                <span className="hidden sm:inline-flex text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800 flex-shrink-0 items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('common.newPlanBadge')}
                </span>
              ) : currentPlan.isBuiltin ? (
                <span className="hidden sm:inline-flex text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-900 flex-shrink-0">
                  {t('common.officialBadge')}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：桌面端平铺操作 & 移动端收纳操作 */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* 桌面端平铺操作区 */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlanManager}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showPlanManager
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={t('plan.switchAndManageTitle')}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('plan.planLibraryTitle', { count: plansCount })}</span>
          </button>

          <button
            type="button"
            onClick={onClonePlan}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
            title={t('plan.cloneCopyTitle')}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExportPlan}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
            title={t('plan.exportJsonTitle')}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
            title={t('plan.importJsonTitle')}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={onSaveOnly}
            disabled={currentPlan.items.length === 0}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('common.save')}</span>
          </button>
        </div>

        {/* 移动端更多操作弹层菜单 */}
        <div ref={moreMenuRef} className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
            className="p-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all active:scale-95"
            title={t('common.settings')}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMobileMoreMenu && (
            <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onTogglePlanManager();
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 text-left"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('plan.libraryBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onClonePlan();
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 text-left"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('plan.cloneBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onExportPlan();
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 text-left"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('plan.exportBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  fileInputRef.current?.click();
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 text-left"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('plan.importBtn')}</span>
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onSaveOnly();
                }}
                disabled={currentPlan.items.length === 0}
                className="w-full px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center gap-2 text-left disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('common.save')}</span>
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImportPlan}
          className="hidden"
        />

        {/* 统一开始训练主 CTA */}
        <button
          type="button"
          onClick={onSaveAndStart}
          disabled={currentPlan.items.length === 0}
          className="px-3.5 py-2 sm:px-4 sm:py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t('plan.startPlan')}</span>
        </button>
      </div>
    </header>
  );
}
