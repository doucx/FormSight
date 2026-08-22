我已定位到导致 Biome 校验失败和 TypeScript 构建报错的具体原因：

1. **Biome Linter 报错** (`src/config/trainingPlugins.tsx`): `AnyTrainingPlugin` 类型别名中显式使用了 4 个 `any` 参数触发了 `noExplicitAny` 规则，需要添加 Biome 忽略注释进行类型擦除说明。
2. **TypeScript 编译报错** (`src/components/plan/PlanEditorModal.tsx`): `selectedDomainFilter` 与 `setSelectedDomainFilter` 状态声明后未被使用，触发了 `noUnusedLocals` (TS6133) 编译错误，直接清理未使用的状态变量即可。

## [WIP] fix: 修复 Biome linter 规则警告与 PlanEditorModal 未使用变量编译错误

### 错误分析

1. **`src/config/trainingPlugins.tsx` 中的 `noExplicitAny` 警告**:
   - `AnyTrainingPlugin` 是用于泛型多态插件注册与类型擦除的顶层别名，显式使用 `any` 触发了 Biome 的静态语法检查 `lint/suspicious/noExplicitAny`。通过添加局部 `// biome-ignore lint/suspicious/noExplicitAny` 注释明确类型擦除意图。
2. **`src/components/plan/PlanEditorModal.tsx` 中的 TS6133 编译错误**:
   - 在组件内部保留了旧版遗留的 `selectedDomainFilter` 状态，但子面板交互已解构重构成 `CardPickerPanel` 内部状态，导致声明的变量未被读取，直接删除未使用的 useState 声明。

### 用户需求

修复 `npm run checkf` 与 `npm run build` 出现的编译和校验报错，使项目构建和静态检查顺利通过。

### 评论

这两个问题属于重构过程中遗留的类型和废弃变量清理，修复后能恢复 CI/CD 流程与本地构建的严格类型校验。

### 目标

1. 在 `src/config/trainingPlugins.tsx` 中为泛型类型擦除添加 `biome-ignore`。
2. 在 `src/components/plan/PlanEditorModal.tsx` 中移除无用的 `selectedDomainFilter` 状态。

### 基本原理

通过最小化原子补丁分别修正类型定义文件与组件文件，保证不影响任何现有业务逻辑与运行时表现。

### 标签

#intent/fix #flow/ready #priority/high #comp/build #concept/config #scope/core #ai/instruct #task/domain/build #task/object/type-check-and-lint #task/action/fix-errors #task/state/begin

---

### Script

#### Acts 1: 修复 `PlanEditorModal.tsx` 未使用变量

移除 `selectedDomainFilter` 的未用状态声明。

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~tsx
  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);
~~~~~
~~~~~tsx
  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);
~~~~~

#### Acts 2: 修复 `trainingPlugins.tsx` 中的 Biome any 校验警告

为通配插件类型擦除添加 Biome ignore 注释。

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~tsx
export type AnyDomainPlugin =
  | StarPlugin
  | ColorPlugin
  | RelativeColorPlugin
  | NegativeSpacePlugin
  | AbstractionPlugin
  | AnglePlugin;

export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;
~~~~~
~~~~~tsx
export type AnyDomainPlugin =
  | StarPlugin
  | ColorPlugin
  | RelativeColorPlugin
  | NegativeSpacePlugin
  | AbstractionPlugin
  | AnglePlugin;

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic training plugin registry
export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;
~~~~~

### 下一步建议

- 补丁应用后，重新执行 `npm run checkf` 和 `npm run build` 验证构建与静态检查状态。
- 如果需要，可继续执行 `npm run test` 确保所有单元测试完全通过。
