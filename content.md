好的，Biome 报告了 `noExplicitAny` 规则告警。这是因为使用泛型 `any` 违反了 linter 规则。我们可以将 `icon` 的类型定义为纯函数调用签名 `(props: { className?: string }) => ComponentChildren`，这不仅完全避免了 `any`，还优雅地规避了 Preact `ComponentType` 在 `defaultProps` 上的协变类型冲突。

## [WIP] fix(types): 使用强类型函数签名替换 icon 的 explicit any

### 错误分析

1. **`lint/suspicious/noExplicitAny` 触发**:
   - Biome 默认开启了禁止显式使用 `any` 的规则，`ComponentType<any>` 触发了该 linter 错误。
2. **根因回顾**:
   - 此前出现 TS2322 错误的本质是 Preact `ComponentType`/`FunctionComponent` 包含可选的 `defaultProps?: Partial<P>`。`lucide-preact` 组件的 `defaultProps.className` 是 `Signalish` 类型，在协变比较时与普通 `string` 不匹配。
   - 解决方案是将类型定义为函数调用签名 `(props: { className?: string }) => ComponentChildren`，既保证了函数参数在逆变校验下的严格类型安全，又没有 `defaultProps` 干扰，同时符合 Biome 无 `any` 的规范。

### 用户需求

消除 `ModeCard.tsx`、`Dashboard.tsx` 和 `ColorDashboard.tsx` 中的 `any` 类型使用，通过 Biome 的代码风格检查与 TypeScript 类型检查。

### 评论
使用 `(props: { className?: string }) => ComponentChildren` 是 Preact / React 中传递纯 UI 图标渲染组件的标准最佳实践，兼具类型安全与灵活性。

### 目标
1. 在 `ModeCard.tsx` 中使用 `(props: { className?: string }) => ComponentChildren`。
2. 在 `Dashboard.tsx` 与 `ColorDashboard.tsx` 中同步更新配置数组类型声明。

### 基本原理
- 导入 Preact 原生 `ComponentChildren` 类型。
- 采用函数签名 `(props: { className?: string }) => ComponentChildren` 明确约束图标组件接收 `className` 并返回渲染子项，彻底移除 `any`。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #concept/executor #scope/dx #ai/instruct #task/domain/build #task/object/typescript-types #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 替换 `ModeCard.tsx`、`Dashboard.tsx`、`ColorDashboard.tsx` 中的类型定义

~~~~~act
patch_file
src/components/dashboard/ModeCard.tsx
~~~~~
~~~~~typescript
import { Award, Play, Target, TrendingUp } from 'lucide-preact';
import type { ComponentType } from 'preact';

export function formatTodayTime(ms: number): string {
  if (ms <= 0) return '0秒';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}秒`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`;
}

interface ModeCardProps {
  title: string;
  desc: string;
  icon: ComponentType<any>;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  accuracy: number;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
}
~~~~~
~~~~~typescript
import { Award, Play, Target, TrendingUp } from 'lucide-preact';
import type { ComponentChildren } from 'preact';

export function formatTodayTime(ms: number): string {
  if (ms <= 0) return '0秒';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}秒`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`;
}

interface ModeCardProps {
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  accuracy: number;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript
import { Crosshair, RotateCw, Target } from 'lucide-preact';
import type { ComponentType } from 'preact';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import type { TrainingMode } from '../types';
import type { UserProfileData } from '../utils/db';

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  desc: string;
  icon: ComponentType<any>;
}> = [
~~~~~
~~~~~typescript
import { Crosshair, RotateCw, Target } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import type { TrainingMode } from '../types';
import type { UserProfileData } from '../utils/db';

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
}> = [
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import type { ComponentType } from 'preact';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import type { ColorMode } from '../utils/colorUtils';
import type { ColorProfileData } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}

const COLOR_MODES_CONFIG: Array<{
  id: ColorMode;
  title: string;
  desc: string;
  icon: ComponentType<any>;
}> = [
~~~~~
~~~~~typescript
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import type { ColorMode } from '../utils/colorUtils';
import type { ColorProfileData } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}

const COLOR_MODES_CONFIG: Array<{
  id: ColorMode;
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
}> = [
~~~~~

### 下一步建议
1. 运行 `npm run checkf` 验证代码规范检查通过。
2. 运行 `npm run build` 验证 TypeScript 编译与构建流程完全通过。
