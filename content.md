我们将从“计划中心”与“认知档案”视图头部移除左上角多余的“退出”按钮及垂直分隔线，使其与一级的侧边栏页面规范保持一致。

## [WIP] refactor(ui): 移除计划中心与认知档案左上角多余的退出按钮

### 用户需求
由于“计划中心”与“认知档案”已经通过侧边栏成为系统的一级导航页面，无需再在页面左上角放置返回/退出按钮。需要移除对应的退出按钮及分隔线。

### 评论
在引入常驻全局导航后，一级视图之间的流转统一由侧边栏（或移动端底部栏）接管。移除视图内部局部的返回按钮符合现代单页应用（SPA）的导航一致性规范，避免了界面层级冗余。

### 目标
1. 在 `src/components/plan/editor/PlanEditorHeader.tsx` 中移除左上角的退出按钮与分隔线，清理无用的 `ArrowLeft` 图标导入。
2. 在 `src/views/GlobalStatsView.tsx` 中移除左上角的退出按钮与分隔线，清理无用的 `ArrowLeft` 图标导入。

### 基本原理
直接剔除两处组件头部渲染中的退出 `button` 节点及 `h-5 w-px bg-slate-200` 分隔条，并将对应 Props 中的 `onExit` 调整为可选属性。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/remove-redundant-exit-buttons #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 修改 `PlanEditorHeader.tsx` 移除退出按钮

从计划编辑器头部组件中移除返回按钮及分隔线。

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~typescript
import {
  ArrowLeft,
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
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~typescript
export interface PlanEditorHeaderProps {
  currentPlan: TrainingPlan;
  isNewPlan: boolean;
  isEditingName: boolean;
  planNameInput: string;
  showPlanManager: boolean;
  plansCount: number;
  fileInputRef: RefObject<HTMLInputElement>;
  onExit: () => void;
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
~~~~~
~~~~~typescript
export interface PlanEditorHeaderProps {
  currentPlan: TrainingPlan;
  isNewPlan: boolean;
  isEditingName: boolean;
  planNameInput: string;
  showPlanManager: boolean;
  plansCount: number;
  fileInputRef: RefObject<HTMLInputElement>;
  onExit?: () => void;
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
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~typescript
  return (
    <header className="w-full bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 flex-shrink-0">
      {/* 左侧：返回与计划名 */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onExit}
          className="p-2 sm:px-3 sm:py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
          title={t('common.exit')}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('common.exit')}</span>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block flex-shrink-0" />

        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isEditingName ? (
~~~~~
~~~~~typescript
  return (
    <header className="w-full bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 flex-shrink-0">
      {/* 左侧：计划名与重命名 */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isEditingName ? (
~~~~~

#### Acts 2: 修改 `GlobalStatsView.tsx` 移除退出按钮

从认知档案视图头部移除退出按钮及分隔线。

~~~~~act
patch_file
src/views/GlobalStatsView.tsx
~~~~~
~~~~~typescript
import { Activity, ArrowLeft, BarChart2, ChevronDown, Filter } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Activity, BarChart2, ChevronDown, Filter } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/views/GlobalStatsView.tsx
~~~~~
~~~~~typescript
interface GlobalStatsViewProps {
  onExit: () => void;
}
~~~~~
~~~~~typescript
interface GlobalStatsViewProps {
  onExit?: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/GlobalStatsView.tsx
~~~~~
~~~~~typescript
      {/* 顶部主操作栏 */}
      <header className="w-full bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.exit')}
          </button>
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-xs">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                {t('stats.title')}
              </h1>
              <p className="text-xs text-slate-400 font-medium">{t('stats.subTitle')}</p>
            </div>
          </div>
        </div>
~~~~~
~~~~~typescript
      {/* 顶部主操作栏 */}
      <header className="w-full bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-xs">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              {t('stats.title')}
            </h1>
            <p className="text-xs text-slate-400 font-medium">{t('stats.subTitle')}</p>
          </div>
        </div>
~~~~~

### 下一步建议
1. **代码与类型验证**：运行 `npm run check` 确保 Biome 格式与 TypeScript 编译通过。
2. **视觉审查**：在浏览器中查看“计划中心”与“认知档案”页面头部，确认界面排版更加简洁通透且无多余按钮残留。
