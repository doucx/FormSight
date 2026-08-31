现在我们将推进阶段四：开始将业务层主干视图（`PlanEditorHeader.tsx`、`PlanHeroCard.tsx` 等）中的手写原生 `<button>` 与徽章容器替换为 `src/components/ui/` 导出的 `<Button>` 与 `<Badge>` 基础原语。

## [WIP] refactor(ui): 在计划编辑器头部与计划 Hero 卡片中接入 Button 和 Badge UI 原语

### 用户需求
推进设计系统阶段四，在 `PlanEditorHeader` 和 `PlanHeroCard` 中采用统一的 `<Button>`（支持 `default`、`secondary`、`ghost`、`icon`、`iconSm` 变体）和 `<Badge>`（支持 `success`、`accent`、`secondary` 变体）原语，淘汰冗长散乱的内联按钮与标签类名。

### 评论
将主干业务界面的按钮和徽章统一收敛至 `<Button>` 与 `<Badge>` 原语，能让代码语义更清晰、键盘聚焦（`focus-visible:ring`）和点击形变（`active:scale-95`）等交互动效更加一致，并大幅减少手写冗余样式的代码量。

### 目标
1. 在 `PlanEditorHeader.tsx` 中引入 `<Button>` 和 `<Badge>`，替换重命名确认、操作栏按钮组、下拉菜单触发器与主开始训练 CTA。
2. 在 `PlanHeroCard.tsx` 中引入 `<Button>` 和 `<Badge>`，替换空计划状态 CTA、阶段徽章、编排按钮与主开始训练 CTA。

### 基本原理
利用 `cva` 驱动的 `<Button variant="..." size="...">` 与 `<Badge variant="..." size="...">` 原语，集中管理所有按钮的外观变体、状态尺寸以及深浅色暗态适配，使业务组件只关注行为逻辑与排版结构。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/ui-primitives-adoption #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 在 `PlanEditorHeader.tsx` 中接入 `Button` 与 `Badge`

我们将重构计划编辑器头部组件，用 UI 原语替换原生按钮与徽章。

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
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

export interface PlanEditorHeaderProps {
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~typescript.old
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
              <h1 className="text-sm sm:text-lg font-black text-foreground truncate tracking-tight">
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
                <span className="hidden sm:inline-flex text-[10px] font-bold px-1.5 py-0.5 bg-accent text-primary rounded-md border border-indigo-100 dark:border-indigo-900 flex-shrink-0">
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
                : 'bg-muted text-foreground border-border hover:bg-accent'
            }`}
            title={t('plan.switchAndManageTitle')}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('plan.planLibraryTitle', { count: plansCount })}</span>
          </button>

          <button
            type="button"
            onClick={onClonePlan}
            className="p-2 text-muted-foreground hover:text-primary bg-muted hover:bg-accent border border-border rounded-xl transition-all cursor-pointer"
            title={t('plan.cloneCopyTitle')}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExportPlan}
            className="p-2 text-muted-foreground hover:text-primary bg-muted hover:bg-accent border border-border rounded-xl transition-all cursor-pointer"
            title={t('plan.exportJsonTitle')}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-muted-foreground hover:text-primary bg-muted hover:bg-accent border border-border rounded-xl transition-all cursor-pointer"
            title={t('plan.importJsonTitle')}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <div className="h-5 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={onSaveOnly}
            disabled={currentPlan.items.length === 0}
            className="px-3.5 py-2 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
            className="p-2 text-muted-foreground bg-muted border border-border rounded-xl transition-all active:scale-95"
            title={t('common.settings')}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMobileMoreMenu && (
            <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-card rounded-2xl shadow-xl border border-border p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onTogglePlanManager();
                }}
                className="w-full px-3 py-2 text-xs font-bold text-foreground hover:bg-accent rounded-xl flex items-center gap-2 text-left"
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
                className="w-full px-3 py-2 text-xs font-bold text-foreground hover:bg-accent rounded-xl flex items-center gap-2 text-left"
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
                className="w-full px-3 py-2 text-xs font-bold text-foreground hover:bg-accent rounded-xl flex items-center gap-2 text-left"
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
                className="w-full px-3 py-2 text-xs font-bold text-foreground hover:bg-accent rounded-xl flex items-center gap-2 text-left"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('plan.importBtn')}</span>
              </button>
              <div className="my-1 border-t border-border/60" />
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
~~~~~
~~~~~typescript.new
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
            className={`gap-1.5 border ${showPlanManager ? 'border-indigo-600' : 'border-border'}`}
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
              <button
                type="button"
                onClick={() => {
                  setShowMobileMoreMenu(false);
                  onTogglePlanManager();
                }}
                className="w-full px-3 py-2 text-xs font-bold text-foreground hover:bg-accent rounded-xl flex items-center gap-2 text-left"
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
                className="w-full px-3 py-2 text-xs font-bold text-foreground hover:bg-accent rounded-xl flex items-center gap-2 text-left"
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
                className="w-full px-3 py-2 text-xs font-bold text-foreground hover:bg-accent rounded-xl flex items-center gap-2 text-left"
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
                className="w-full px-3 py-2 text-xs font-bold text-foreground hover:bg-accent rounded-xl flex items-center gap-2 text-left"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('plan.importBtn')}</span>
              </button>
              <div className="my-1 border-t border-border/60" />
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
~~~~~

#### Acts 2: 在 `PlanHeroCard.tsx` 中接入 `Button` 与 `Badge`

我们将重构首页今日训练流 Hero 卡片，使用 UI 原语替换按钮与徽章。

~~~~~act
patch_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~typescript.old
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

interface PlanHeroCardProps {
~~~~~
~~~~~typescript.new
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
~~~~~

~~~~~act
patch_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~typescript.old
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{t('plan.todayPlan')}</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                {t('common.empty')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{t('plan.emptyHeroDesc')}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('plan.customizeBtn')}
        </button>
      </div>
    );
  }
~~~~~
~~~~~typescript.new
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
          {t('plan.customizeBtn')}
        </Button>
      </div>
    );
  }
~~~~~

~~~~~act
patch_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~typescript.old
              ) : (
                <h2 className="text-lg font-black text-foreground tracking-tight">{plan.name}</h2>
              )}

              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-accent text-primary border border-indigo-100 dark:border-indigo-900 rounded-full">
                {t('plan.stageCount', { count: plan.items.length })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-0.5">
              <span>{t('plan.totalTrialsSummary', { trials: totalTrials })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {t('plan.estimatedTime', { min: estimatedMin })}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="px-3 py-1.5 text-xs font-bold bg-muted hover:bg-accent border border-border text-muted-foreground rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          title={t('plan.editPlan')}
        >
          <Sliders className="w-3.5 h-3.5" />
          {t('plan.editPlan')}
        </button>
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
                <div className="w-5 h-5 rounded-lg bg-accent text-primary flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">{cardTitle}</span>
                <span className="text-[11px] font-mono font-bold text-primary bg-card px-1.5 py-0.5 rounded-lg border border-border/60 shadow-sm">
                  {item.targetTrials}
                  {t('common.trialsUnit')}
                </span>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <div className="text-xs text-slate-400 font-medium">{t('plan.syncNotice')}</div>

        <button
          type="button"
          onClick={onStartPlan}
          className="py-3 px-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2 ml-auto"
        >
          <Play className="w-4 h-4 fill-current" />
          {t('plan.startPlan')}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript.new
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
          className="gap-1.5 shadow-sm border border-border"
          title={t('plan.editPlan')}
        >
          <Sliders className="w-3.5 h-3.5" />
          {t('plan.editPlan')}
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
                <div className="w-5 h-5 rounded-lg bg-accent text-primary flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">{cardTitle}</span>
                <span className="text-[11px] font-mono font-bold text-primary bg-card px-1.5 py-0.5 rounded-lg border border-border/60 shadow-sm">
                  {item.targetTrials}
                  {t('common.trialsUnit')}
                </span>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
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
          {t('plan.startPlan')}
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
1. **测试与交互验证**：在浏览器中打开工作台首页和计划编辑器，检查按钮点击涟漪、状态切换和键盘焦点表现。
2. **继续推广 UI 原语至设置面板**：在 `GeneralPreferencesSection` 和 `DataGovernanceSection` 中，将备份、清理与重置操作按钮全面收敛至 `<Button>`。
3. **提交已完成的重构**：确认变更无误后，生成包含 `git add` 和 `git commit` 的 `[COMMIT]` 计划以锁定进展。
