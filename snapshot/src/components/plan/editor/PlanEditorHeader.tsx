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
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

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
    <header className="w-full bg-card border border-border rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 flex-shrink-0">
      {/* 左侧：计划名与重命名 */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-1 w-full max-w-xs">
              <Input
                inputSize="sm"
                value={planNameInput}
                onInput={(e) => onPlanNameChange((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onNameSave();
                  if (e.key === 'Escape') onCancelEditingName();
                }}
                maxLength={32}
                placeholder={t('plan.nameInputPlaceholder')}
              />
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onNameSave}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex-shrink-0"
                title={t('common.confirm')}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-sm sm:text-lg font-black text-foreground truncate tracking-tight">
                {currentPlan.name}
              </h1>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onStartEditingName}
                className="flex-shrink-0 text-muted-foreground hover:text-primary"
                title={t('plan.renameTitle')}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>

              {isNewPlan ? (
                <Badge variant="success" size="sm" className="hidden sm:inline-flex flex-shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('common.newPlanBadge')}
                </Badge>
              ) : currentPlan.isBuiltin ? (
                <Badge variant="accent" size="sm" className="hidden sm:inline-flex flex-shrink-0">
                  {t('common.officialBadge')}
                </Badge>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：桌面端平铺操作 & 移动端收纳操作 */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* 桌面端平铺操作区 */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant={showPlanManager ? 'default' : 'secondary'}
            size="sm"
            onClick={onTogglePlanManager}
            className={`gap-1.5 border ${showPlanManager ? 'border-primary' : 'border-border'}`}
            title={t('plan.switchAndManageTitle')}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('plan.planLibraryTitle', { count: plansCount })}</span>
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={onClonePlan}
            className="border border-border"
            title={t('plan.cloneCopyTitle')}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={onExportPlan}
            className="border border-border"
            title={t('plan.exportJsonTitle')}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="border border-border"
            title={t('plan.importJsonTitle')}
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>

          <div className="h-5 w-px bg-border mx-1" />

          <Button
            variant="secondary"
            size="sm"
            onClick={onSaveOnly}
            disabled={currentPlan.items.length === 0}
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('common.save')}</span>
          </Button>
        </div>

        {/* 移动端更多操作弹层菜单 */}
        <div ref={moreMenuRef} className="relative sm:hidden">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
            className="border border-border"
            title={t('common.settings')}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>

          {showMobileMoreMenu && (
            <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-card rounded-2xl shadow-xl border border-border p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onTogglePlanManager();
                }}
                className="w-full justify-start gap-2 h-auto py-2"
              >
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>{t('plan.libraryBtn')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onClonePlan();
                }}
                className="w-full justify-start gap-2 h-auto py-2"
              >
                <Copy className="w-3.5 h-3.5 text-primary" />
                <span>{t('plan.cloneBtn')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onExportPlan();
                }}
                className="w-full justify-start gap-2 h-auto py-2"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>{t('plan.exportBtn')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  fileInputRef.current?.click();
                }}
                className="w-full justify-start gap-2 h-auto py-2"
              >
                <Upload className="w-3.5 h-3.5 text-primary" />
                <span>{t('plan.importBtn')}</span>
              </Button>
              <div className="my-1 border-t border-border/60" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onSaveOnly();
                }}
                disabled={currentPlan.items.length === 0}
                className="w-full justify-start gap-2 h-auto py-2 text-primary hover:text-primary disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('common.save')}</span>
              </Button>
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
        <Button
          variant="default"
          size="sm"
          onClick={onSaveAndStart}
          disabled={currentPlan.items.length === 0}
          className="gap-1.5 px-3.5 sm:px-4"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t('plan.startPlan')}</span>
        </Button>
      </div>
    </header>
  );
}