这是因为在 `useEffect` 回调中直接读取了 `currentPlan.id` 和 `currentPlan.items.length`，触发了 Biome 的 `useExhaustiveDependencies` 检查。

我们将使用已导入的 `sanitizePlan` 在 `useState` 初始化阶段就对 `initialPlan` 实施自愈清洗，同时在 `useEffect` 中改用函数式状态更新（Functional Updater），将 Hook 依赖精确收敛至 `[initialPlan.id]`。

## [WIP] fix: 修复 usePlanEditorState 依赖缺失与初始化即时自愈

### 错误分析

1. **Biome Linter 报错**：在 `usePlanEditorState.ts` 的 `useEffect` 中，直接闭包引用了组件内部的局部 state `currentPlan.id` 与 `currentPlan.items.length`，但依赖数组声明为 `[]`，违背了 React/Preact 的 Exhaustive Dependencies 静态检查规则。
2. **状态时序问题**：原有代码在 `useState({ ...initialPlan })` 时直接透传了可能包含失效卡片的 `initialPlan`，导致首次挂载那一帧仍然保持 31 项，直到后续异步 Promise 回调才更新。

### 用户需求

修复 `usePlanEditorState.ts` 中的 Biome linter 规则报错，并确保编辑器在挂载首帧即完成卡片有效性清洗。

### 评论

采用 `useState(() => sanitizePlan(initialPlan, initialPlan.name))` 配合 `setCurrentPlan(prev => ...)` 既能确保在首次渲染时即刻获得正确的 30 个训练阶段，避免异步更新导致的 UI 闪烁，又能彻底消除外部闭包依赖，符合 linter 的严格静态分析要求。

### 目标

1. 将 `currentPlan` 状态初始化改为惰性求值，直接调用 `sanitizePlan` 剔除已失效卡片。
2. 在 `useEffect` 的 Promise 回调中使用函数式更新器 `setCurrentPlan(prev => ...)`。
3. 将依赖数组精确对齐为 `[initialPlan.id]`，通过 Biome 校验。

### 基本原理

通过函数式更新器，Preact 会在应用状态更新时将最新的状态值作为入参传入，从而避免在 effect 依赖数组中引入正在被修改的 `currentPlan` 状态自身，彻底切断循环依赖与脏闭包风险。

### 标签

#intent/fix #flow/ready #priority/high #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/plan-storage #task/action/self-healing #task/state/continue

---

### Script

#### Acts 1: 修复 usePlanEditorState 中的依赖项与状态初始化

我们将更新 `src/components/plan/editor/usePlanEditorState.ts`，消除 Biome 校验错误并强化初始化自愈。

~~~~~act
patch_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript
  const [storageState, setStorageState] = useState<PlanStorageState>(getPlanStorageStateSnapshot);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  useEffect(() => {
    loadPlanStorageState().then((state) => {
      setStorageState(state);
      const synced = state.plans.find((p) => p.id === currentPlan.id);
      if (synced && synced.items.length !== currentPlan.items.length) {
        setCurrentPlan(synced);
      }
    });
  }, []);
~~~~~
~~~~~typescript
  const [storageState, setStorageState] = useState<PlanStorageState>(getPlanStorageStateSnapshot);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>(() =>
    sanitizePlan(initialPlan, initialPlan.name),
  );
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  useEffect(() => {
    loadPlanStorageState().then((state) => {
      setStorageState(state);
      const synced = state.plans.find((p) => p.id === initialPlan.id);
      if (synced) {
        setCurrentPlan((prev) =>
          prev.id === synced.id && prev.items.length !== synced.items.length ? synced : prev,
        );
      }
    });
  }, [initialPlan.id]);
~~~~~

### 下一步建议

1. **执行 Linter 校验**：运行 `npm run check` 或 Biome 检查，确认所有 Exhaustive Dependencies 错误已被彻底清除。
2. **体验验证**：验证进入计划编排界面时，阶段计数是否直接显示为 30，且无任何序号断层或渲染闪烁。
