已定位到问题根源，主要包括：
1. `src/core/contracts.ts` 中存在重复的 `BaseModuleSettings` 导入。
2. `src/core/registry.ts` 导入了不存在的 `../storage/queries`（应为 `../storage`）。
3. `src/main.tsx` 与 `src/app.tsx` 中仍有旧路径未更新（如 `./utils/settings`、`./components/SettingsModal`）。
4. `src/components/modals/` 内部相对层级调整（需上溯两级 `../../`）。
5. `SessionSummaryModal` 与 `PlanSummaryModal` 中 `lucide-preact` 的 `Home` 图标被正则误伤为 `HomeView`。

我们立即生成计划进行精准修复并运行完整 TypeScript / Biome 检查。

## [WIP] fix: 修复重构后的导入路径与图标引用问题

### 错误分析
1. **类型重复声明**：在合并 `TrainingPlugin` 接口至 `src/core/contracts.ts` 时，在文件前后各导入了一次 `BaseModuleSettings`，触发 Biome `noRedeclare` 报错。
2. **仓储子路径失配**：`src/core/registry.ts` 尝试从 `../storage/queries` 导入，而实际文件已归整至 `../storage/db/queries`（且通过 `../storage` 统一导出）。
3. **入口文件遗留路径**：`src/main.tsx` 和 `src/app.tsx` 中部分组件与工具的相对路径未同步。
4. **图标名称误替**：正则批量替换 `Home` 为 `HomeView` 时误修改了来自 `lucide-preact` 的 `<Home />` 图标标签。

### 用户需求
修复构建报错，确保 Vite 开发服务器和 TypeScript/Biome 代码检查全部通过。

### 评论
结构调整后的路径规范化是模块解耦的最后一公里，全面修复后将使系统恢复 100% 的编译与类型安全。

### 目标
1. 修复 `src/core/contracts.ts` 重复导入。
2. 修复 `src/core/registry.ts`、`src/main.tsx`、`src/app.tsx` 中的引用路径。
3. 修正 `src/components/modals/` 中组件的相对导入路径和 `Home` 图标。
4. 运行 `npx tsc --noEmit` 和 `npm run check` 确保零错误。

### 基本原理
通过精确的 `patch_file` 还原 Lucide 图标引用并更新正确的模块绝对/相对导入路径，同时消除重复的 TypeScript 类型引入。

### 标签
#intent/fix #flow/ready #priority/critical #comp/core #concept/state #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/project-structure #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 修复 `src/core/contracts.ts` 和 `src/core/registry.ts`

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript.old
import type {
  AbstractionSettings,
  BaseModuleSettings,
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../storage/settings';
import type { Point } from '../types';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

export interface TrainingPlugin<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  packId?: string;
  title: string;
  getModeBadge: (mode: string) => string;
  isTargeting?: (mode: string, settings: TSettings) => boolean;
  generateQuestion: (mode: string, level: number, settings: TSettings) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion, mode: string) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  extractRecordDetails: (
    question: TQuestion,
    hitResult: THitResult,
    userVal: TAnswerVal,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (
    props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
}

export type StarPlugin = TrainingPlugin<
  unknown,
  unknown,
  { clickPoint: Point; hitResult: unknown },
  StarSettings
>;

export type ColorPlugin = TrainingPlugin<
  unknown,
  unknown,
  number | [number, number, number],
  ColorSenseSettings
>;

export type RelativeColorPlugin = TrainingPlugin<
  unknown,
  unknown,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
>;

export type NegativeSpacePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
>;

export type AbstractionPlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B',
  AbstractionSettings
>;

export type AnglePlugin = TrainingPlugin<unknown, unknown, number | 'A' | 'B', BaseModuleSettings>;

export type PerspectivePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B' | Point,
  BaseModuleSettings
>;

export type AnyDomainPlugin =
  | StarPlugin
  | ColorPlugin
  | RelativeColorPlugin
  | NegativeSpacePlugin
  | AbstractionPlugin
  | AnglePlugin
  | PerspectivePlugin;

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic training plugin registry
export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;

import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../storage/schema';
import type { BaseModuleSettings } from '../storage/settings';
import type { CardDefinition, PackMeta } from '../types/card';
~~~~~
~~~~~typescript.new
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../storage/db/schema';
import type {
  AbstractionSettings,
  BaseModuleSettings,
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../storage/settings';
import type { Point } from '../types';
import type { CardDefinition, PackMeta } from '../types/card';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

export interface TrainingPlugin<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  packId?: string;
  title: string;
  getModeBadge: (mode: string) => string;
  isTargeting?: (mode: string, settings: TSettings) => boolean;
  generateQuestion: (mode: string, level: number, settings: TSettings) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion, mode: string) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  extractRecordDetails: (
    question: TQuestion,
    hitResult: THitResult,
    userVal: TAnswerVal,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (
    props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
}

export type StarPlugin = TrainingPlugin<
  unknown,
  unknown,
  { clickPoint: Point; hitResult: unknown },
  StarSettings
>;

export type ColorPlugin = TrainingPlugin<
  unknown,
  unknown,
  number | [number, number, number],
  ColorSenseSettings
>;

export type RelativeColorPlugin = TrainingPlugin<
  unknown,
  unknown,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
>;

export type NegativeSpacePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
>;

export type AbstractionPlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B',
  AbstractionSettings
>;

export type AnglePlugin = TrainingPlugin<unknown, unknown, number | 'A' | 'B', BaseModuleSettings>;

export type PerspectivePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B' | Point,
  BaseModuleSettings
>;

export type AnyDomainPlugin =
  | StarPlugin
  | ColorPlugin
  | RelativeColorPlugin
  | NegativeSpacePlugin
  | AbstractionPlugin
  | AnglePlugin
  | PerspectivePlugin;

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic training plugin registry
export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
import type { AnyTrainingPlugin } from '../core/contracts';
import { getTrialRecordsByCard } from '../storage/queries';
import type {
~~~~~
~~~~~typescript.new
import type { AnyTrainingPlugin } from '../core/contracts';
import { getTrialRecordsByCard } from '../storage/index';
import type {
~~~~~

#### Acts 2: 修复 `src/main.tsx` 与 `src/app.tsx` 中的引用路径

~~~~~act
patch_file
src/main.tsx
~~~~~
~~~~~typescript.old
import { render } from 'preact';
import { App } from './app';
import { applyThemeToDocument } from './hooks/useTheme';
import { loadSettings } from './utils/settings';
import './index.css';
~~~~~
~~~~~typescript.new
import { render } from 'preact';
import { App } from './app';
import { applyThemeToDocument } from './hooks/useTheme';
import { loadSettings } from './storage/settings';
import './index.css';
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
import { useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/common/Toast';
~~~~~
~~~~~typescript.new
import { useState } from 'preact/hooks';
import { ToastContainer } from './components/common/Toast';
import { GlobalSettingsModal } from './components/modals/GlobalSettingsModal';
import { SettingsModal } from './components/modals/SettingsModal';
~~~~~

#### Acts 3: 修复弹窗组件的相对导入与 `Home` 图标

~~~~~act
patch_file
src/components/modals/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
import { ModalShell } from '../common/ModalShell';
import type { ToastType } from '../common/Toast';
import { useTranslation } from '../core/i18n';
import { DataGovernanceSection } from '../settings/sections/DataGovernanceSection';
import { GeneralPreferencesSection } from '../settings/sections/GeneralPreferencesSection';
import { Button } from '../ui/button';
~~~~~
~~~~~typescript.new
import { useTranslation } from '../../core/i18n';
import { ModalShell } from '../common/ModalShell';
import type { ToastType } from '../common/Toast';
import { DataGovernanceSection } from '../settings/sections/DataGovernanceSection';
import { GeneralPreferencesSection } from '../settings/sections/GeneralPreferencesSection';
import { Button } from '../ui/button';
~~~~~

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript.old
import { getCardTitle, useTranslation } from '../core/i18n';
import { DynamicDomainSettings } from '../settings/DynamicDomainSettings';
import type { CardDefinition } from '../types/card';
import { Button } from '../ui/button';
~~~~~
~~~~~typescript.new
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { ModalShell } from '../common/ModalShell';
import { DynamicDomainSettings } from '../settings/DynamicDomainSettings';
import { Button } from '../ui/button';
~~~~~

~~~~~act
patch_file
src/components/modals/SessionSummaryModal.tsx
~~~~~
~~~~~typescript.old
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { renderSessionTrendChartCanvas } from '../../core/canvas/charts/drawTrendChart';
import { ModalShell } from '../common/ModalShell';
import { getCardTitle, useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MetricCard } from '../ui/metric-card';
import { formatSecondsToTimer } from '../utils/time';
~~~~~
~~~~~typescript.new
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { renderSessionTrendChartCanvas } from '../../core/canvas/charts/drawTrendChart';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import { ModalShell } from '../common/ModalShell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MetricCard } from '../ui/metric-card';
~~~~~

~~~~~act
patch_file
src/components/modals/SessionSummaryModal.tsx
~~~~~
~~~~~typescript.old
        {/* 底部操作按钮 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="h-11 gap-1.5">
            <HomeView className="w-4 h-4" />
            <span>{t('summary.backHome')}</span>
          </Button>
          <Button variant="default" onClick={onRestart} className="h-11 gap-1.5">
            <RotateCcw className="w-4 h-4" />
            <span>{t('summary.trainAgain')}</span>
          </Button>
        </div>
~~~~~
~~~~~typescript.new
        {/* 底部操作按钮 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="h-11 gap-1.5">
            <Home className="w-4 h-4" />
            <span>{t('summary.backHome')}</span>
          </Button>
          <Button variant="default" onClick={onRestart} className="h-11 gap-1.5">
            <RotateCcw className="w-4 h-4" />
            <span>{t('summary.trainAgain')}</span>
          </Button>
        </div>
~~~~~

~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~typescript.old
        {/* 底部动作按钮 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="h-11 gap-1.5">
            <HomeView className="w-4 h-4" />
            <span>{t('common.completeAndReturnHome')}</span>
          </Button>
          <Button variant="default" onClick={onRestart} className="h-11 gap-1.5">
            <RotateCcw className="w-4 h-4" />
            <span>{t('common.restartPlan')}</span>
          </Button>
        </div>
~~~~~
~~~~~typescript.new
        {/* 底部动作按钮 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="h-11 gap-1.5">
            <Home className="w-4 h-4" />
            <span>{t('common.completeAndReturnHome')}</span>
          </Button>
          <Button variant="default" onClick={onRestart} className="h-11 gap-1.5">
            <RotateCcw className="w-4 h-4" />
            <span>{t('common.restartPlan')}</span>
          </Button>
        </div>
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';
~~~~~
~~~~~typescript.new
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';
import type { SessionHistoryItem } from '../modals/SessionSummaryModal';
import { SessionSummaryModal } from '../modals/SessionSummaryModal';
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/modals/SessionSummaryModal';
import { AdaptiveEngine } from '../core/engine/adaptiveEngine';
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/modals/SessionSummaryModal';
import { AdaptiveEngine } from '../core/engine/adaptiveEngine';
~~~~~

### 下一步建议
1. **测试验证**：运行 `npm run dev` 验证浏览器中主页、探索大盘、计划编排、训练流及各项分析看板均正常运行。
2. **清理临时脚本**：确认无误后可删除根目录下 `scripts/refactor_structure.py`。
3. **完成提交**：如需归档提交本次重构，可向我发送提交指令以创建 `[COMMIT]` 计划。
