我已经定位了 TypeScript 编译阶段报告的 10 处错误，它们主要由以下两类原因导致：

1. `src/views/Dashboard.tsx` 中重复声明了 `interface DashboardProps`（其中第一次声明包含了无用的 `totalTimeMs: number` 字段，导致接口自动合并后在 `src/app.tsx` 实例化 `<Dashboard>` 时提示缺少必要属性）。
2. `src/views/Dashboard.tsx` 和 `src/views/ColorDashboard.tsx` 中存在多处导入但未使用的变量（在严格模式下被 `tsconfig.json` 的 `noUnusedLocals` 阻断）。

我将生成一个修复计划以清理重复的接口定义与未使用的变量导入。

## [WIP] fix: 修复 TypeScript 编译阶段的类型声明重复与未引用变量错误

### 错误分析

1. **类型不匹配与重复声明错误 (`TS2322`)**:
   在 `src/views/Dashboard.tsx` 中存在两个同名的 `interface DashboardProps`。TypeScript 会将其进行接口合并 (Interface Merging)。由于第一个声明中引入了 `totalTimeMs: number` 字段，合并后的类型要求 `app.tsx` 中必须传入 `totalTimeMs`，从而导致组件使用处抛出 `TS2322` 错误。实际上 `Dashboard` 组件并不直接接收或使用 `totalTimeMs` 属性。
2. **未使用变量警告/错误 (`TS6133`)**:
   项目开启了 TypeScript 的 `noUnusedLocals` linting 校验。`ColorDashboard.tsx` 和 `Dashboard.tsx` 中导入了 `Clock`, `Download`, `Upload`, `useRef`, `exportAllData`, `formatTotalTime`, `importAllData` 等未在渲染及逻辑中使用的符号，触发编译终止。

### 用户需求

修复 `npm run build` 执行过程中遇到的 TypeScript 类型错误和未使用变量提醒，确保构建顺利完成。

### 评论

消除无用代码与重复接口定义是维护强类型和 TypeScript 质量的基本要求。合并多余接口并清理未使用的引用能提升编译性能和代码严谨度。

### 目标

1. 移除 `src/views/Dashboard.tsx` 中重复且失效的第一个 `interface DashboardProps` 声明。
2. 清理 `src/views/Dashboard.tsx` 和 `src/views/ColorDashboard.tsx` 中多余的导入项。

### 基本原理

通过 `patch_file` 精确移除多余的接口与未使用模块的导入语句，不改变组件原有的功能逻辑与交互能力。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/executor #scope/dx #ai/instruct #task/domain/build #task/object/typescript-compiler-errors #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 `ColorDashboard.tsx` 未使用的符号导入

清理 `ColorDashboard.tsx` 中未使用的 `Clock` 和 `formatTotalTime`。

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript
import { Award, Clock, Play, RotateCw, Sliders, Target, TrendingUp } from 'lucide-preact';
import type { ColorMode } from '../utils/colorUtils';
import { type ColorProfileData, formatTotalTime } from '../utils/db';
~~~~~
~~~~~typescript
import { Award, Play, RotateCw, Sliders, Target, TrendingUp } from 'lucide-preact';
import type { ColorMode } from '../utils/colorUtils';
import type { ColorProfileData } from '../utils/db';
~~~~~

#### Acts 2: 修复 `Dashboard.tsx` 重复接口声明与未使用符号

删除 `Dashboard.tsx` 中第一次重复且多余的 `DashboardProps` 声明，并清理未使用的各种 icon 和工具函数导入。

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript
import {
  Award,
  BarChart2,
  Clock,
  type Compass,
  Crosshair,
  Download,
  Play,
  RotateCw,
  Sliders,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-preact';
import { useRef } from 'preact/hooks';
import type { TrainingMode } from '../types';
import { type UserProfileData, exportAllData, formatTotalTime, importAllData } from '../utils/db';

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  totalTimeMs: number;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
}

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  desc: string;
  icon: typeof Compass;
}> = [
  {
    id: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    icon: Target,
  },
  {
    id: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    icon: Crosshair,
  },
  {
    id: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    icon: RotateCw,
  },
];

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
  onBackToHome?: () => void;
}
~~~~~
~~~~~typescript
import {
  Award,
  BarChart2,
  type Compass,
  Crosshair,
  Play,
  RotateCw,
  Sliders,
  Target,
  TrendingUp,
} from 'lucide-preact';
import type { TrainingMode } from '../types';
import type { UserProfileData } from '../utils/db';

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  desc: string;
  icon: typeof Compass;
}> = [
  {
    id: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    icon: Target,
  },
  {
    id: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    icon: Crosshair,
  },
  {
    id: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    icon: RotateCw,
  },
];

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
  onBackToHome?: () => void;
}
~~~~~

### 下一步建议

重新运行 `npm run build` 或 `npm run check` 验证代码类型检查与打包构建过程是否能顺利通过。
