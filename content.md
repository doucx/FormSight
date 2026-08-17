好的，我已经分析了构建失败的原因并整理了修复方案。我们将针对 TypeScript 类型兼容、未使用变量以及冗余导入进行精准修复。

## [WIP] fix(build): 修复 TypeScript 编译类型错误及未使用的变量导入

### 错误分析

1. **图标类型不兼容及导出缺失**:
   - `lucide-preact` 未直接暴露 `LucideIcon` 命名类型，且组件 props 类型定义与 Preact 的 `Signalish` 特性在严格模式下存在微小差异，导致 `ComponentType<{ className?: string }>` 校验失败。将其放宽兼容为 `ComponentType<any>` 即可完全兼容。
2. **未使用变量警告 (`TS6133`)**:
   - `TrainingShell.tsx`: 传入了 `title` 和 `onExit` 但在渲染时未消费 `title`，且 `onExit` 未被函数体直接引用（退出的实际触发由 session 内的 `handleRequestFinish` 和 `handleFinishSession` 接管）。
3. **测试文件冗余导入**:
   - `sound.test.ts` 中无用且未被使用的 `vi` 导入触发了 TS 编译警告。

### 用户需求

1. 将 `ModeCard.tsx`、`Dashboard.tsx`、`ColorDashboard.tsx` 中的图标类型统一调整为泛型组件类型 `ComponentType<any>`。
2. 在 `TrainingShell.tsx` 中将 `title` 整合至 Header 标识栏中展示，并从函数签名中移除未直接消费的 `onExit` 参数解构。
3. 移除 `src/utils/__tests__/sound.test.ts` 中未使用的 `vi` 导入。

### 评论
这些改动消除了编译时的严格类型报错和未使用符号告警，使代码库可以顺利通过 `tsc && vite build`，同时保证了组件库的兼容性与整洁度。

### 目标
1. 精确修改 `ModeCard.tsx`、`ColorDashboard.tsx`、`Dashboard.tsx` 中的图标类型。
2. 调整 `TrainingShell.tsx`，将 `title` 融入界面徽标提示，并清理未使用的参数。
3. 清理 `sound.test.ts` 导入。

### 基本原理
- 使用 Preact 的 `ComponentType<any>` 作为通用组件类型，适配 Preact 10 与 Lucide 组件的 Props 签名。
- 在 `TrainingShell` 顶部将 `title` 与 `badge` 共同展示，不仅解决了未使用变量报错，还增强了训练界面所属训练类型的直观度。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #concept/executor #scope/dx #ai/instruct #task/domain/build #task/object/typescript-types #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复图标类型与 Dashboard 组件定义

~~~~~act
patch_file
src/components/dashboard/ModeCard.tsx
~~~~~
~~~~~typescript
interface ModeCardProps {
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  accuracy: number;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
}
~~~~~
~~~~~typescript
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

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
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
  icon: typeof RotateCw;
}> = [
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

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript
import { Crosshair, RotateCw, Target } from 'lucide-preact';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { ModeCard } from '../components/dashboard/ModeCard';
import { useTodayStats } from '../hooks/useTodayStats';
import type { TrainingMode } from '../types';
import type { UserProfileData } from '../utils/db';

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  desc: string;
  icon: typeof Target;
}> = [
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

#### Acts 2: 修复 `TrainingShell.tsx` 中的未使用变量

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
export function TrainingShell({
  title,
  badge,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  onExit,
  children,
}: TrainingShellProps) {
  const {
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    showAnswer,
    showSummaryModal,
    sessionHistory,
    resumeFromIdle,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 统一 Header 状态栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {badge} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
~~~~~
~~~~~typescript
export function TrainingShell({
  title,
  badge,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  children,
}: TrainingShellProps) {
  const {
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    showAnswer,
    showSummaryModal,
    sessionHistory,
    resumeFromIdle,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 统一 Header 状态栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {title} · {badge} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
~~~~~

#### Acts 3: 移除 `sound.test.ts` 中未使用的 `vi` 导入

~~~~~act
patch_file
src/utils/__tests__/sound.test.ts
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSettings, saveSettings } from '../settings';
import { playHitSound, playMissSound } from '../sound';
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from '../settings';
import { playHitSound, playMissSound } from '../sound';
~~~~~

### 下一步建议
1. 执行 `npm run build` 和 `npm test` 验证类型检查与单元测试全部通过。
2. 验证完成后可进行代码提交流程。
