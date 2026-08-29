我们将修复 TypeScript 静态类型检查中报告的 5 处未使用变量与类型不兼容错误：
1. 清理 `PlanEditorHeader.tsx` 与 `PlanEditorView.tsx` 中未使用的 `onExit` 属性与参数传递。
2. 移除 `AppRouter.tsx` 中多余的重复 `plan-editor` 条件分支（该分支在主壳层已处理，此处类型收窄后已不可达）。
3. 修正 `useHashRoute.ts` 中 `home` 路由对象的返回值，移除不在类型定义中的 `query` 属性。
4. 修复 `GlobalStatsView.tsx` 中未读取的 `onExit` 参数解构。
5. 移除 `Home.tsx` 中未使用的 `Play` 图标导入。

## [WIP] fix: 修复 TypeScript 编译错误与未使用的声明

### 错误分析
TypeScript `tsc --noEmit` 报告了 5 处编译阻断错误：
1. `PlanEditorHeader.tsx`: `onExit` 属性被声明在参数中但未被使用，触发 `TS6133`。
2. `AppRouter.tsx`: `route.type === 'plan-editor'` 处于类型已收窄至 `'train' | 'plan-train'` 的代码块之后，类型比较恒为假，触发 `TS2367`。
3. `useHashRoute.ts`: `parseHash` 返回 `{ type: 'home', query: homeQuery }`，但 `RouteLocation` 的 `home` 分支未定义 `query` 字段，触发 `TS2353`。
4. `GlobalStatsView.tsx`: `onExit` 从 props 解构但未在组件内部使用，触发 `TS6133`。
5. `Home.tsx`: 顶部导入了 `Play` 图标但未被引用，触发 `TS6133`。

### 用户需求
修复这 5 处 TypeScript 编译错误，使 `npm run checkf` 与 `tsc --noEmit` 完全通过。

### 评论
这些错误属于死代码残留和接口定义轻微不一致。清理无用导入与不可达分支能够保持类型系统干净清晰，提升整体可维护性。

### 目标
1. 在 `PlanEditorHeader.tsx` 及 `PlanEditorView.tsx` 中移除无用 `onExit`。
2. 删除 `AppRouter.tsx` 中多余的 `if (route.type === 'plan-editor')` 重复分支。
3. 将 `useHashRoute.ts` 默认 `home` 路由返回值规范为 `{ type: 'home' }`。
4. 调整 `GlobalStatsView.tsx` 的入参声明。
5. 移除 `Home.tsx` 中的 `Play` 导入。

### 基本原理
- 遵循 TypeScript 的 `noUnusedLocals` / `noUnusedParameters` 配置，及时移除死代码与未使用的参数。
- 确保联合类型的窄化推断与返回值声明完全吻合。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #comp/runtime #scope/dx #ai/instruct #task/domain/typescript #task/object/typecheck-fixes #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `PlanEditorHeader.tsx` 与 `PlanEditorView.tsx` 中的 `onExit`

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~typescript.old
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

export function PlanEditorHeader({
  currentPlan,
  isNewPlan,
  isEditingName,
  planNameInput,
  showPlanManager,
  plansCount,
  fileInputRef,
  onExit,
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
~~~~~
~~~~~typescript.new
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
~~~~~

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~typescript.old
      {/* 顶部单行主操作栏 */}
      <PlanEditorHeader
        currentPlan={currentPlan}
        isNewPlan={isNewPlan}
        isEditingName={isEditingName}
        planNameInput={planNameInput}
        showPlanManager={showPlanManager}
        plansCount={storageState.plans.length}
        fileInputRef={fileInputRef}
        onExit={onExit}
        onStartEditingName={() => setIsEditingName(true)}
        onCancelEditingName={() => {
          setPlanNameInput(currentPlan.name);
          setIsEditingName(false);
        }}
        onPlanNameChange={setPlanNameInput}
        onNameSave={handleNameSave}
        onTogglePlanManager={() => setShowPlanManager(!showPlanManager)}
        onClonePlan={handleCloneCurrent}
        onExportPlan={handleExportPlan}
        onImportPlan={handleImportPlan}
        onSaveOnly={handleSaveOnly}
        onSaveAndStart={handleSaveAndStart}
      />
~~~~~
~~~~~typescript.new
      {/* 顶部单行主操作栏 */}
      <PlanEditorHeader
        currentPlan={currentPlan}
        isNewPlan={isNewPlan}
        isEditingName={isEditingName}
        planNameInput={planNameInput}
        showPlanManager={showPlanManager}
        plansCount={storageState.plans.length}
        fileInputRef={fileInputRef}
        onStartEditingName={() => setIsEditingName(true)}
        onCancelEditingName={() => {
          setPlanNameInput(currentPlan.name);
          setIsEditingName(false);
        }}
        onPlanNameChange={setPlanNameInput}
        onNameSave={handleNameSave}
        onTogglePlanManager={() => setShowPlanManager(!showPlanManager)}
        onClonePlan={handleCloneCurrent}
        onExportPlan={handleExportPlan}
        onImportPlan={handleImportPlan}
        onSaveOnly={handleSaveOnly}
        onSaveAndStart={handleSaveAndStart}
      />
~~~~~

#### Acts 2: 移除 `AppRouter.tsx` 中的重复不可达分支

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript.old
  if (route.type === 'analytics') {
    return (
      <CardAnalyticsView
        cardId={route.cardId}
        initialTab={route.tab}
        onExit={() => navigate(lastHomeRoute)}
        onStartTraining={(cId) => navigate({ type: 'train', cardId: cId, sessionType: 'training' })}
        onStartBenchmark={(cId) =>
          navigate({ type: 'train', cardId: cId, sessionType: 'benchmark' })
        }
        onOpenSettings={onOpenCardSettings}
      />
    );
  }

  if (route.type === 'plan-editor') {
    return (
      <PlanEditorView
        initialPlan={trainingPlan}
        onExit={() => navigate(lastHomeRoute)}
        onPlanListChanged={onRefreshProfiles}
        onSaveAndExit={(newPlan) => {
          saveTrainingPlan(newPlan);
          onSetTrainingPlan(newPlan);
          onRefreshProfiles();
          showToast(t('common.planUpdatedToast'), 'success');
          navigate(lastHomeRoute);
        }}
        onStartPlanDirectly={(newPlan) => {
          saveTrainingPlan(newPlan);
          onSetTrainingPlan(newPlan);
          onRefreshProfiles();
          navigate({ type: 'plan-train' });
        }}
      />
    );
  }

  if (route.type === 'plan-train') {
~~~~~
~~~~~typescript.new
  if (route.type === 'analytics') {
    return (
      <CardAnalyticsView
        cardId={route.cardId}
        initialTab={route.tab}
        onExit={() => navigate(lastHomeRoute)}
        onStartTraining={(cId) => navigate({ type: 'train', cardId: cId, sessionType: 'training' })}
        onStartBenchmark={(cId) =>
          navigate({ type: 'train', cardId: cId, sessionType: 'benchmark' })
        }
        onOpenSettings={onOpenCardSettings}
      />
    );
  }

  if (route.type === 'plan-train') {
~~~~~

#### Acts 3: 修正 `useHashRoute.ts` 中的 home 路由返回对象

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const sessionType = queryParams.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  const homeQuery = parseHomeQuery(queryParams);
  return { type: 'home', query: homeQuery };
}
~~~~~
~~~~~typescript.new
  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const sessionType = queryParams.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  return { type: 'home' };
}
~~~~~

#### Acts 4: 修复 `GlobalStatsView.tsx` 中未使用的 `onExit`

~~~~~act
patch_file
src/views/GlobalStatsView.tsx
~~~~~
~~~~~typescript.old
interface GlobalStatsViewProps {
  onExit?: () => void;
}

export function GlobalStatsView({ onExit }: GlobalStatsViewProps) {
  const { t } = useTranslation();
~~~~~
~~~~~typescript.new
interface GlobalStatsViewProps {
  onExit?: () => void;
}

export function GlobalStatsView(_props: GlobalStatsViewProps = {}) {
  const { t } = useTranslation();
~~~~~

#### Acts 5: 移除 `Home.tsx` 中未使用的 `Play` 导入

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
import { ArrowRight, Clock, Compass, Layers, Play, Target } from 'lucide-preact';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
~~~~~
~~~~~typescript.new
import { ArrowRight, Clock, Compass, Layers, Target } from 'lucide-preact';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
~~~~~

### 下一步建议
1. 运行 `npm run checkf` 校验 Biome 格式化和 TypeScript 类型检查是否已全部通过。
2. 运行 `npm test` 确认全套单元测试通过。
