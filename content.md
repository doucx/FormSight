分析结果显示，`useAppBootstrap.ts` 处的 `biome-ignore` 同样属于可以完全消除的不规范写法：开发者在 `useEffect` 依赖数组中直接传入了深入读取的 signal 属性 `$activePlan.value.name`，而函数体内部又用了一个局部变量 `currentPlanName` 进行二次赋值，导致依赖声明复杂化并触发 Biome 报警。

我们将 `activePlanName` 提升至 hook 顶层响应式提取，使 `useEffect` 仅依赖基础纯净变量 `[route, activePlanName, t]`，从而彻底移除该处的 `biome-ignore`。

## [WIP] refactor: 消除 useAppBootstrap 中的动态标题依赖 ignore

### 用户需求

重写 `src/hooks/useAppBootstrap.ts` 中的动态标题更新 effect，规范其响应式依赖声明，移除 `biome-ignore`。

### 评论

通过在组件/hook 作用域层规范响应式变量提炼，`useEffect` 的依赖项转为静态分析友好的扁平标识符 `[route, activePlanName, t]`，完全符合 hooks 依赖完整性规范。

### 目标

1. 在 `useAppBootstrap.ts` 中将 `$activePlan.value.name` 提前为顶层响应式常量 `activePlanName`。
2. 消除 `useAppBootstrap.ts` 中的 `// biome-ignore lint/correctness/useExhaustiveDependencies` 注释。

### 基本原理

通过解耦 signal 深度属性访问与 Effect 内部变量引用，使静态分析器能够精确追踪依赖映射关系。

### 标签

#intent/refine #flow/ready #priority/high #comp/build #concept/state #scope/core #ai/instruct #task/domain/quality #task/object/biome-ignore-cleanup #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 重写 `useAppBootstrap.ts` 动态标题监听

提炼 `activePlanName` 为顶层变量，使 `useEffect` 依赖清晰规范并消除 ignore 注释。

~~~~~act
patch_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript
  // 动态更新页面标题
  // biome-ignore lint/correctness/useExhaustiveDependencies: update document title when plan name or route changes
  useEffect(() => {
    const currentPlanName = $activePlan.value.name;
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.dashboard')} - ${t('common.appName')}`;
    } else if (route.type === 'discovery') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.discovery')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${currentPlanName || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'stats') {
      document.title = `${t('stats.title')} - ${t('common.appName')}`;
    } else if (route.type === 'analytics') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('common.stats');
      document.title = `${cardTitle} - ${t('common.stats')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
  }, [route, $activePlan.value.name, t]);
~~~~~
~~~~~typescript
  const activePlanName = $activePlan.value.name;

  // 动态更新页面标题
  useEffect(() => {
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.dashboard')} - ${t('common.appName')}`;
    } else if (route.type === 'discovery') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.discovery')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${activePlanName || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'stats') {
      document.title = `${t('stats.title')} - ${t('common.appName')}`;
    } else if (route.type === 'analytics') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('common.stats');
      document.title = `${cardTitle} - ${t('common.stats')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
  }, [route, activePlanName, t]);
~~~~~

### 下一步建议

1. **执行检索**: 运行 `rg biome-ignore`，验证此时全工程仅剩下 `src/components/common/CanvasView.tsx`（用于转发外部动态 `deps` 的底层元组件封装），其余业务卡片与 hook 中的 ignore 注释已全部清零。
2. **校验构建**: 执行 `pnpm check`（包含 `biome check` 与 `tsc`），确保整体代码库实现 0 错误、0 警告。
