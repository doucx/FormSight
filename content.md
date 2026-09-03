我已经分析了 `AppRouter.tsx` 中的接口与实现，将移除 `AppRouterProps` 中声明但从未被实际消费的 11 个僵尸属性，并清理相关的未引用类型导入。

## [WIP] refactor(router): 清理 AppRouterProps 遗留的僵尸 Props

### 用户需求
按照系统架构审查报告中梯队 3 的要求，彻底移除 `src/components/routing/AppRouter.tsx` 中 `AppRouterProps` 声明的 11 个未消费的遗留参数（包括 `totalTimeMs`、`todayStats`、`profiles`、`trainingPlan`、`allPlans`、`settings`、`profilesLoaded`、`onRefreshProfiles`、`onSetTrainingPlan`、`onSelectPlanOnHome`、`showToast`），使组件接口对齐纯粹基于 Signals 单一真实源（SSOT）的实际消费形态。

### 评论
该项重构耗时短且收益显著。早前应用状态管理由基于 React/Preact 的 Props Drilling 逐步重构至 `@preact/signals` 响应式单例 Store，但 `AppRouterProps` 接口声明未及时精简，形成了“接口声明了十余个属性，组件内部却全部丢弃、直接读取 Signals”的欺骗性接口。清理这些遗留参数能够消除状态源二义性，大幅提高代码可维护性。

### 目标
1. 精简 `src/components/routing/AppRouter.tsx` 中的 `AppRouterProps` 接口，仅保留实际消费的 `route`、`navigate`、`lastHomeRoute`、`onOpenCardSettings`、`onOpenGlobalSettings` 5 个属性。
2. 同步清理因移除这些属性而闲置的类型导入（`UnifiedProfileData`、`UserSettings`、`TrainingPlan`、`ToastType`）。

### 基本原理
`AppRouter` 内部的所有数据与操作分发（如 `$activePlan`、`$settings`、`$profiles`、`refreshAppData`、`savePlanAction` 等）已经全面直接接入 Signal Store，调用方 `app.tsx` 实际也从未传递过这些冗余属性。删除无用属性定义与无用 import 不会对现有运行时行为产生任何负面影响，同时能使 TypeScript 编译期接口与运行时保持 100% 一致。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/app-router #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 清理 AppRouter.tsx 的类型导入与 AppRouterProps 接口

我们将修改 `src/components/routing/AppRouter.tsx`，移除因废弃僵尸 Props 而不再需要的类型导入，并将 `AppRouterProps` 缩减为其实际需要的核心参数。

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript.old
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { RouteLocation } from '../../hooks/useHashRoute';
import type { UnifiedProfileData } from '../../storage/db/schema';
import { type UserSettings, getCardSettings } from '../../storage/settings';
import {
  $activePlan,
  $allPlans,
  savePlanAction,
  setActivePlanAction,
} from '../../stores/planStore';
import {
  $isProfilesLoaded,
  $profiles,
  $todayStatsMap,
  $totalTimeMs,
  refreshAppData,
} from '../../stores/profileStore';
import { $settings } from '../../stores/settingsStore';
import { showToast } from '../../stores/toastStore';
import type { TrainingPlan } from '../../types/plan';
import { CardAnalyticsView } from '../../views/CardAnalyticsView';
import { DiscoveryView } from '../../views/DiscoveryView';
import { GenericTrainingView } from '../../views/GenericTrainingView';
import { GlobalStatsView } from '../../views/GlobalStatsView';
import { HomeView } from '../../views/HomeView';
import { PlanEditorView } from '../../views/PlanEditorView';
import { PlanTrainingView } from '../../views/PlanTrainingView';
import type { ToastType } from '../common/Toast';
import { AppNavigation } from '../navigation/AppNavigation';

interface AppRouterProps {
  route: RouteLocation;
  navigate: (target: RouteLocation, options?: { replace?: boolean }) => void;
  lastHomeRoute: RouteLocation;
  totalTimeMs?: number;
  todayStats?: Record<string, { count: number; timeMs: number }>;
  profiles?: Record<string, UnifiedProfileData>;
  trainingPlan?: TrainingPlan;
  allPlans?: TrainingPlan[];
  settings?: UserSettings;
  profilesLoaded?: boolean;
  onRefreshProfiles?: () => Promise<void>;
  onSetTrainingPlan?: (plan: TrainingPlan) => void;
  onSelectPlanOnHome?: (planId: string) => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenGlobalSettings: () => void;
  showToast?: (message: string, type?: ToastType) => void;
}
~~~~~
~~~~~typescript.new
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { RouteLocation } from '../../hooks/useHashRoute';
import { getCardSettings } from '../../storage/settings';
import {
  $activePlan,
  $allPlans,
  savePlanAction,
  setActivePlanAction,
} from '../../stores/planStore';
import {
  $isProfilesLoaded,
  $profiles,
  $todayStatsMap,
  $totalTimeMs,
  refreshAppData,
} from '../../stores/profileStore';
import { $settings } from '../../stores/settingsStore';
import { showToast } from '../../stores/toastStore';
import { CardAnalyticsView } from '../../views/CardAnalyticsView';
import { DiscoveryView } from '../../views/DiscoveryView';
import { GenericTrainingView } from '../../views/GenericTrainingView';
import { GlobalStatsView } from '../../views/GlobalStatsView';
import { HomeView } from '../../views/HomeView';
import { PlanEditorView } from '../../views/PlanEditorView';
import { PlanTrainingView } from '../../views/PlanTrainingView';
import { AppNavigation } from '../navigation/AppNavigation';

interface AppRouterProps {
  route: RouteLocation;
  navigate: (target: RouteLocation, options?: { replace?: boolean }) => void;
  lastHomeRoute: RouteLocation;
  onOpenCardSettings: (cardId: string) => void;
  onOpenGlobalSettings: () => void;
}
~~~~~

### 下一步建议
1. **构建与类型验证**：执行 `npm run build` 或 `tsc --noEmit` 确认无遗留编译错误。
2. **继续处理梯队 2 治理**：推进国际化子系统的规范化，包括：
   - 全面在卡片视图中推行 `useCardTranslation` 相对键；
   - 彻底删除 `DynamicDomainSettings` 中的 `split('.').slice(2)` 截取补丁；
   - 为 Canvas 绘图函数注入动态国际化文本参数。
