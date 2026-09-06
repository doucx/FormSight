## [WIP] refactor(plan): 从计划库抽屉中移除官方计划库快捷按钮

### 用户需求
去掉计划库抽屉 (`PlanLibraryDrawer`) 中“新建空白计划”旁边的“官方计划库”按钮。

### 评论
计划编排页面的顶部主操作栏已经提供了足够醒目的官方计划库入口，抽屉内部则专注于计划列表切换、新建空白计划与折叠管理，精简抽屉按钮能让布局更加清爽。

### 目标
1. 修改 `PlanLibraryDrawer.tsx`：移除 `onNavigateToOfficialPlans` 属性及对应的渲染按钮。
2. 修改 `PlanEditorView.tsx`：移除向 `PlanLibraryDrawer` 传递的 `onNavigateToOfficialPlans` 回调。

### 基本原理
通过精确的 `patch_file` 操作裁剪掉抽屉顶栏中多余的渲染 JSX 与类型定义。

### 标签
#intent/refine #flow/ready #priority/low
#comp/cli #concept/ui #scope/ux
#ai/refine
#task/domain/plans
#task/object/plan-library-drawer
#task/action/refactor
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 修改 `PlanLibraryDrawer.tsx` 移除该按钮

从 `PlanLibraryDrawerProps` 和抽屉头部工具条中删除官方计划库按钮。

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~old
import { BookOpen, Check, Plus, Star, Trash2 } from 'lucide-preact';
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
  onNavigateToOfficialPlans?: () => void;
  onClose: () => void;
  onToggleFavorite: (planId: string, e: MouseEvent) => void;
  onDeletePlan: (planId: string, e: MouseEvent) => void;
}

export function PlanLibraryDrawer({
  storageState,
  currentPlan,
  onSelectPlan,
  onCreateNewBlankPlan,
  onNavigateToOfficialPlans,
  onClose,
  onToggleFavorite,
  onDeletePlan,
}: PlanLibraryDrawerProps) {
~~~~~
~~~~~new
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
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~old
        <div className="flex items-center gap-2">
          {onNavigateToOfficialPlans && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToOfficialPlans}
              className="text-primary hover:text-primary gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('officialPlans.browseBtn')}</span>
            </Button>
          )}
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
~~~~~
~~~~~new
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
~~~~~

#### Acts 2: 修改 `PlanEditorView.tsx` 移除冗余属性传递

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~old
      {/* 展开的计划库总览抽屉 */}
      {showPlanManager && (
        <div className="flex-shrink-0">
          <PlanLibraryDrawer
            storageState={storageState}
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlanFromList}
            onCreateNewBlankPlan={() => {
              handleCreateNewBlankPlan();
              setMobileTab('picker');
            }}
            onNavigateToOfficialPlans={onNavigateToOfficialPlans}
            onClose={() => setShowPlanManager(false)}
            onToggleFavorite={handleToggleFavoriteItem}
            onDeletePlan={handleDeletePlanItem}
          />
        </div>
      )}
~~~~~
~~~~~new
      {/* 展开的计划库总览抽屉 */}
      {showPlanManager && (
        <div className="flex-shrink-0">
          <PlanLibraryDrawer
            storageState={storageState}
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlanFromList}
            onCreateNewBlankPlan={() => {
              handleCreateNewBlankPlan();
              setMobileTab('picker');
            }}
            onClose={() => setShowPlanManager(false)}
            onToggleFavorite={handleToggleFavoriteItem}
            onDeletePlan={handleDeletePlanItem}
          />
        </div>
      )}
~~~~~

### 下一步建议
1. 打开 `http://localhost:5173/#/plan-editor` 并点击“计划库”抽屉展开，确认“新建空白计划”旁边已不再显示官方计划库按钮，而顶部主操作栏仍保留该入口。
