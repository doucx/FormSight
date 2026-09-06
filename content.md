我们将为路由层引入结构化的 `returnTo` 上下文追踪机制，并彻底解耦计划编辑器的「原地存盘」与「保存退出」行为。

## [WIP] feat: 引入结构化 returnTo 路由溯源机制并解耦计划存盘与退出行为

### 用户需求

1. 用户在计划编排界面（`#/plan-editor`）点击顶部工具栏的「保存」按钮时，仅在本地及数据库完成存盘并弹出成功提示，不再自动跳转回今日工作台（`#/`）。
2. 用户在计划编排界面点击「开始今日训练」进入训练流后，在训练结束或中途点击返回退出时，能够准确返回 `#/plan-editor` 编排现场，而不是被强制归拢到 `#/`。
3. 扩展路由状态系统，使 `RouteLocation` 具备结构化的来源上下文跟踪与 URL Query 参数双向序列化能力。

### 评论

这是一个十分标准的任务路由栈演进需求。此前的设计仅支持中心辐射型的硬编码退出模型，导致多级心流被强制打断。通过在 `RouteLocation` 中注入 `returnTo` 契约，并在序列化层与 URL 参数同步，能够以极低的代码成本赋予轻量 Hash 路由感知用户来路上下文的能力，同时使业务组件的持久化与导航动作彻底解耦。

### 目标

1. 在 `src/hooks/useHashRoute.ts` 中定义 `ReturnToLocation` 类型并扩展 `RouteLocation`，支持 `plan-train` 与 `train` 的 `returnTo` 字段；在 `parseHash` 与 `stringifyRoute` 中完成 `from` 参数的解析与拼接。
2. 在 `src/components/plan/editor/usePlanEditorState.ts` 与 `src/views/PlanEditorView.tsx` 中新增并优先调用 `onSave`（原地保存）回调，保留 `onSaveAndExit` 作为备用。
3. 在 `src/components/routing/AppRouter.tsx` 中，在 `plan-editor` 触发训练时传入 `returnTo: 'plan-editor'`，并为 `plan-train` 提供基于 `returnTo` 的智能回退路由解析。

### 基本原理

1. **路由栈溯源**：在哈希参数中通过 `#/plan-train?from=plan-editor` 显式记录前驱路径意图，即使用户直接复制链接或刷新页面，依然能无损重建回退目标。
2. **动作语义清晰化**：将 `PlanEditorHeader` 的「保存」按钮行为与路由跳转完全分离，实现“保存即存盘、完成退出即跳转”的单一职责规范。

### 标签

#intent/build #flow/ready #priority/high #comp/runtime #concept/navigation #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/navigation-stack #task/action/feature #task/state/begin

---

### Script

#### Acts 1: 在 useHashRoute 中扩展 returnTo 契约与序列化

在 `src/hooks/useHashRoute.ts` 中引入 `ReturnToLocation`，并在解析与生成 URL Hash 时处理 `from` 参数。

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
export type RouteLocation =
  | { type: 'home' }
  | { type: 'discovery'; query?: CardQueryOptions }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' }
  | { type: 'plan-editor' }
  | { type: 'official-plans' }
  | { type: 'stats' }
  | { type: 'analytics'; cardId: string; tab?: string };
~~~~~
~~~~~typescript
export type ReturnToLocation =
  | 'home'
  | 'discovery'
  | 'plan-editor'
  | 'official-plans'
  | 'stats';

export type RouteLocation =
  | { type: 'home' }
  | { type: 'discovery'; query?: CardQueryOptions }
  | {
      type: 'train';
      cardId: string;
      sessionType: 'training' | 'benchmark';
      returnTo?: ReturnToLocation;
    }
  | { type: 'plan-train'; returnTo?: ReturnToLocation }
  | { type: 'plan-editor' }
  | { type: 'official-plans' }
  | { type: 'stats' }
  | { type: 'analytics'; cardId: string; tab?: string };
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'official-plans' || (segments[0] === 'plans' && segments[1] === 'official')) {
    return { type: 'official-plans' };
  }

  if (segments[0] === 'plan-editor' || segments[0] === 'plans') {
    return { type: 'plan-editor' };
  }

  if (segments[0] === 'stats') {
    return { type: 'stats' };
  }

  if (segments[0] === 'discovery') {
    const discoveryQuery = parseHomeQuery(queryParams);
    return { type: 'discovery', query: discoveryQuery };
  }

  if (segments[0] === 'analytics' && segments[1]) {
    const cardId = segments[1];
    const tab = queryParams.get('tab') || undefined;
    return { type: 'analytics', cardId, tab };
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const sessionType = queryParams.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }
~~~~~
~~~~~typescript
  if (segments[0] === 'plan-train') {
    const fromParam = queryParams.get('from') || queryParams.get('returnTo');
    const returnTo = fromParam as ReturnToLocation | undefined;
    return { type: 'plan-train', returnTo };
  }

  if (segments[0] === 'official-plans' || (segments[0] === 'plans' && segments[1] === 'official')) {
    return { type: 'official-plans' };
  }

  if (segments[0] === 'plan-editor' || segments[0] === 'plans') {
    return { type: 'plan-editor' };
  }

  if (segments[0] === 'stats') {
    return { type: 'stats' };
  }

  if (segments[0] === 'discovery') {
    const discoveryQuery = parseHomeQuery(queryParams);
    return { type: 'discovery', query: discoveryQuery };
  }

  if (segments[0] === 'analytics' && segments[1]) {
    const cardId = segments[1];
    const tab = queryParams.get('tab') || undefined;
    return { type: 'analytics', cardId, tab };
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const sessionType = queryParams.get('type') === 'benchmark' ? 'benchmark' : 'training';
    const fromParam = queryParams.get('from') || queryParams.get('returnTo');
    const returnTo = fromParam as ReturnToLocation | undefined;
    return { type: 'train', cardId, sessionType, returnTo };
  }
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'plan-editor') return '#/plan-editor';
  if (route.type === 'official-plans') return '#/official-plans';
  if (route.type === 'stats') return '#/stats';
  if (route.type === 'analytics') {
    const qs = route.tab ? `?tab=${encodeURIComponent(route.tab)}` : '';
    return `#/analytics/${route.cardId}${qs}`;
  }
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
~~~~~
~~~~~typescript
  if (route.type === 'plan-train') {
    return route.returnTo ? `#/plan-train?from=${encodeURIComponent(route.returnTo)}` : '#/plan-train';
  }
  if (route.type === 'plan-editor') return '#/plan-editor';
  if (route.type === 'official-plans') return '#/official-plans';
  if (route.type === 'stats') return '#/stats';
  if (route.type === 'analytics') {
    const qs = route.tab ? `?tab=${encodeURIComponent(route.tab)}` : '';
    return `#/analytics/${route.cardId}${qs}`;
  }
  if (route.type === 'train') {
    const params = new URLSearchParams();
    params.set('type', route.sessionType);
    if (route.returnTo) {
      params.set('from', route.returnTo);
    }
    return `#/train/${route.cardId}?${params.toString()}`;
  }
~~~~~

#### Acts 2: 在计划编辑器状态机中解耦 onSave 与 onSaveAndExit

修改 `src/components/plan/editor/usePlanEditorState.ts`，为配置项增加可选的 `onSave` 钩子，并在点击「保存」时优先执行原地保存。

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript
export interface UsePlanEditorStateOptions {
  initialPlan: TrainingPlan;
  onSaveAndExit: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

export function usePlanEditorState({
  initialPlan,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: UsePlanEditorStateOptions) {
~~~~~
~~~~~typescript
export interface UsePlanEditorStateOptions {
  initialPlan: TrainingPlan;
  onSave?: (plan: TrainingPlan) => void;
  onSaveAndExit?: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

export function usePlanEditorState({
  initialPlan,
  onSave,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: UsePlanEditorStateOptions) {
~~~~~

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript
    handleExportPlan: () => {
      const jsonStr = exportPlanToJson(currentPlan);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('plan.exportedJsonToast'), 'success');
    },
    handleImportPlan,
    handleSaveOnly: async () => onSaveAndExit(await persist()),
    handleSaveAndStart: async () => onStartPlanDirectly(await persist()),
  };
}
~~~~~
~~~~~typescript
    handleExportPlan: () => {
      const jsonStr = exportPlanToJson(currentPlan);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('plan.exportedJsonToast'), 'success');
    },
    handleImportPlan,
    handleSaveOnly: async () => {
      const saved = await persist();
      if (onSave) {
        onSave(saved);
      } else if (onSaveAndExit) {
        onSaveAndExit(saved);
      }
    },
    handleSaveAndStart: async () => onStartPlanDirectly(await persist()),
  };
}
~~~~~

#### Acts 3: 在 PlanEditorView 暴露 onSave 接口

修改 `src/views/PlanEditorView.tsx`，接收并向下传递 `onSave` 属性。

~~~~~act
patch_file
src/views/PlanEditorView.tsx
~~~~~
~~~~~typescript
interface PlanEditorViewProps {
  initialPlan: TrainingPlan;
  onExit: () => void;
  onNavigateToOfficialPlans?: () => void;
  onSaveAndExit: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

const TRIAL_PRESETS = [10, 15, 20, 30, 50];

export function PlanEditorView({
  initialPlan,
  onExit: _onExit,
  onNavigateToOfficialPlans,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: PlanEditorViewProps) {
  const { t } = useTranslation();
  const [mobileTab, setMobileTab] = useState<'stages' | 'picker'>(
    initialPlan.items.length === 0 ? 'picker' : 'stages',
  );

  const {
    storageState,
    currentPlan,
    isEditingName,
    setIsEditingName,
    planNameInput,
    setPlanNameInput,
    showPlanManager,
    setShowPlanManager,
    isNewPlan,
    totalTrials,
    estimatedMin,
    fileInputRef,
    handleSelectPlanFromList,
    handleNameSave,
    handleBatchUpdateTrials,
    handleAddItem,
    handleRemoveItem,
    handleMoveItem,
    handleUpdateTrials,
    handleClearAll,
    handleCreateNewBlankPlan,
    handleCloneCurrent,
    handleToggleFavoriteItem,
    handleDeletePlanItem,
    handleExportPlan,
    handleImportPlan,
    handleSaveOnly,
    handleSaveAndStart,
  } = usePlanEditorState({
    initialPlan,
    onSaveAndExit,
    onStartPlanDirectly,
    onPlanListChanged,
  });
~~~~~
~~~~~typescript
interface PlanEditorViewProps {
  initialPlan: TrainingPlan;
  onExit: () => void;
  onNavigateToOfficialPlans?: () => void;
  onSave?: (plan: TrainingPlan) => void;
  onSaveAndExit?: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

const TRIAL_PRESETS = [10, 15, 20, 30, 50];

export function PlanEditorView({
  initialPlan,
  onExit: _onExit,
  onNavigateToOfficialPlans,
  onSave,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: PlanEditorViewProps) {
  const { t } = useTranslation();
  const [mobileTab, setMobileTab] = useState<'stages' | 'picker'>(
    initialPlan.items.length === 0 ? 'picker' : 'stages',
  );

  const {
    storageState,
    currentPlan,
    isEditingName,
    setIsEditingName,
    planNameInput,
    setPlanNameInput,
    showPlanManager,
    setShowPlanManager,
    isNewPlan,
    totalTrials,
    estimatedMin,
    fileInputRef,
    handleSelectPlanFromList,
    handleNameSave,
    handleBatchUpdateTrials,
    handleAddItem,
    handleRemoveItem,
    handleMoveItem,
    handleUpdateTrials,
    handleClearAll,
    handleCreateNewBlankPlan,
    handleCloneCurrent,
    handleToggleFavoriteItem,
    handleDeletePlanItem,
    handleExportPlan,
    handleImportPlan,
    handleSaveOnly,
    handleSaveAndStart,
  } = usePlanEditorState({
    initialPlan,
    onSave,
    onSaveAndExit,
    onStartPlanDirectly,
    onPlanListChanged,
  });
~~~~~

#### Acts 4: 在 AppRouter 中配置原地存盘与上下文精准回跳

修改 `src/components/routing/AppRouter.tsx`：
1. `PlanEditorView` 接入 `onSave`：持久化并弹出 Toast，留在当前页面。
2. `onStartPlanDirectly` 跳转时携带 `returnTo: 'plan-editor'`。
3. `PlanTrainingView` 退出时，依据 `route.returnTo` 解析精准目标，支持平滑返回 `#/plan-editor`。

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { RouteLocation } from '../../hooks/useHashRoute';
~~~~~
~~~~~typescript
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { ReturnToLocation, RouteLocation } from '../../hooks/useHashRoute';
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
    if (route.type === 'plan-editor') {
      return (
        <PlanEditorView
          initialPlan={currentPlan}
          onExit={() => navigate(lastHomeRoute)}
          onNavigateToOfficialPlans={() => navigate({ type: 'official-plans' })}
          onPlanListChanged={async () => {
            await Promise.all([initPlanStore(), refreshAppData()]);
          }}
          onSaveAndExit={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRoute);
          }}
          onStartPlanDirectly={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            navigate({ type: 'plan-train' });
          }}
        />
      );
    }
~~~~~
~~~~~typescript
    if (route.type === 'plan-editor') {
      return (
        <PlanEditorView
          initialPlan={currentPlan}
          onExit={() => navigate(lastHomeRoute)}
          onNavigateToOfficialPlans={() => navigate({ type: 'official-plans' })}
          onPlanListChanged={async () => {
            await Promise.all([initPlanStore(), refreshAppData()]);
          }}
          onSave={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            showToast(t('common.planUpdatedToast'), 'success');
          }}
          onSaveAndExit={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRoute);
          }}
          onStartPlanDirectly={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            navigate({ type: 'plan-train', returnTo: 'plan-editor' });
          }}
        />
      );
    }
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
  if (route.type === 'plan-train') {
    return (
      <PlanTrainingView
        key={`plan-train-${currentPlan.id}`}
        plan={currentPlan}
        settings={currentSettings}
        onExit={async () => {
          await refreshAppData();
          navigate(lastHomeRoute);
        }}
      />
    );
  }
~~~~~
~~~~~typescript
  const resolveTargetRoute = (returnTo?: ReturnToLocation): RouteLocation => {
    if (returnTo === 'plan-editor') return { type: 'plan-editor' };
    if (returnTo === 'official-plans') return { type: 'official-plans' };
    if (returnTo === 'discovery') return { type: 'discovery' };
    if (returnTo === 'stats') return { type: 'stats' };
    return lastHomeRoute;
  };

  if (route.type === 'plan-train') {
    return (
      <PlanTrainingView
        key={`plan-train-${currentPlan.id}`}
        plan={currentPlan}
        settings={currentSettings}
        onExit={async () => {
          await refreshAppData();
          navigate(resolveTargetRoute(route.returnTo));
        }}
      />
    );
  }
~~~~~

### 下一步建议

1. **功能验证**：
   - 访问 `http://localhost:5173/#/plan-editor`，点击顶部「保存」按钮，验证是否仅弹出「训练计划已成功更新」Toast 且留在当前编辑界面。
   - 点击「开始今日计划」，观察 URL 变为 `#/plan-train?from=plan-editor`；在训练界面点击返回，验证是否能直接跳回 `#/plan-editor`。
   - 从今日工作台（`#/`）直接进入训练流，返回时验证是否正常归拢至 `#/`。
2. **代码提交**：确认体验符合预期后，可生成 `[COMMIT]` 计划将此次路由溯源机制提交至版本库。
