收到，我们将按照审核报告中的架构精简方案，全面消除项目中的重复镜像代码、无意义重定向桥接文件及未使用的死代码，统一以 `SystemDomainRegistry` 为唯一事实来源（Single Source of Truth）。

## [WIP] refactor(core): 清理冗余镜像文件、死代码与桥接层并收敛 Domain 架构

### 用户需求
清除 FormSight 项目中由历史迭代遗留下来的重复文件（如 `core/` 与 `utils/` 下的重复实现、`config/plugins/` 下的重复插件）、删除未使用的死代码组件与单行桥接文件，并使系统卡片元数据统一由 `registry` 进行管理。

### 评论
该重构将大幅降低项目的冗余代码量（约 1,200+ 行），彻底消除多处双重维护的隐患，理顺模块依赖拓扑，显著提高可维护性与扩展性。

### 目标
1. 删除无引用的死代码文件（`PlanStepTransitionOverlay.tsx`, `AnswerDiagnosticBar.tsx`）。
2. 删除 `src/config/plugins/` 目录下的所有重复插件文件，训练插件统一由各 `src/domains/*/plugin.tsx` 唯一维护。
3. 删除 `src/components/` 顶层的 6 个单行转发组件文件（`*Canvas.tsx`）。
4. 消除 `src/utils/` 与 `src/core/` 之间对于 Canvas 绘制、色彩工具的 100% 重复实现，统一复用 `src/core/` 核心算法。
5. 重构 `src/config/cards.ts` 与 `src/config/domains.ts`，消除与各个 domain `index.ts` 的静态元数据双重定义，统一委托给 `registry`。
6. 更新 `useTodayStats.ts` 与 `settings.ts` 中的卡片引用逻辑。

### 基本原理
通过将 `registry`（自发现系统领域注册表）作为领域卡片与插件的唯一事实来源，消除原先集中配置 (`config/cards.ts`) 与分布式配置 (`domains/*/index.ts`) 并存的双轨制。将底层算法库统一归整到 `src/core/`，避免因路径分歧而在多个目录下维护同一份数学与绘图代码。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #comp/build #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/dead-code-cleanup #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 删除死代码组件与无引用的桥接文件

删除全局无引用的组件以及 `src/components/` 顶层仅做转发的单行 bridge 文件。

~~~~~act
delete_file
src/components/plan/PlanStepTransitionOverlay.tsx
~~~~~

~~~~~act
delete_file
src/components/common/AnswerDiagnosticBar.tsx
~~~~~

~~~~~act
delete_file
src/components/AbstractionCanvas.tsx
~~~~~

~~~~~act
delete_file
src/components/AngleCanvas.tsx
~~~~~

~~~~~act
delete_file
src/components/ColorCanvas.tsx
~~~~~

~~~~~act
delete_file
src/components/NegativeSpaceCanvas.tsx
~~~~~

~~~~~act
delete_file
src/components/RelativeColorCanvas.tsx
~~~~~

~~~~~act
delete_file
src/components/StarCanvas.tsx
~~~~~

#### Acts 2: 删除 `src/config/plugins/` 下的重复插件定义

删除与 `src/domains/*/plugin.tsx` 完全重复的旧插件目录及文件，并更新 `src/config/trainingPlugins.tsx`。

~~~~~act
delete_file
src/config/plugins/abstractionPlugin.tsx
~~~~~

~~~~~act
delete_file
src/config/plugins/anglePlugin.tsx
~~~~~

~~~~~act
delete_file
src/config/plugins/colorPlugin.tsx
~~~~~

~~~~~act
delete_file
src/config/plugins/negativeSpacePlugin.tsx
~~~~~

~~~~~act
delete_file
src/config/plugins/relativeColorPlugin.tsx
~~~~~

~~~~~act
delete_file
src/config/plugins/starPlugin.tsx
~~~~~

~~~~~act
delete_file
src/config/plugins/index.ts
~~~~~

~~~~~act
write_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~tsx
import type { ComponentChildren } from 'preact';
import type { TrainingDomain } from '../utils/db';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

export interface TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings> {
  domain: TrainingDomain;
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

export type AnyTrainingPlugin = TrainingPlugin<unknown, unknown, unknown, unknown>;
~~~~~

#### Acts 3: 消除 `src/utils/` 下的重复算法与 Canvas 工具实现

将 `src/utils/colorUtils.ts` 与 Canvas 基础绘图工具统一重定向到 `src/core/` 中的标准实现，消除两套重复代码。

~~~~~act
write_file
src/utils/colorUtils.ts
~~~~~
~~~~~ts
export * from '../core/color/colorUtils';
export * from '../core/color/oklchUtils';
~~~~~

~~~~~act
write_file
src/utils/canvas/drawPointGrid.ts
~~~~~
~~~~~ts
export * from '../../core/canvas/drawPointGrid';
~~~~~

~~~~~act
write_file
src/utils/canvas/drawPolygon.ts
~~~~~
~~~~~ts
export * from '../../core/canvas/drawPolygon';
~~~~~

~~~~~act
write_file
src/utils/canvas/hidpi.ts
~~~~~
~~~~~ts
export * from '../../core/canvas/hidpi';
~~~~~

#### Acts 4: 重构 `src/config/cards.ts` 和 `src/config/domains.ts` 消除双重元数据定义

使 `cards.ts` 和 `domains.ts` 仅保留通用的 Schema 配置，并将查询方法直接委托给 `registry`，彻底消除卡片列表的双重硬编码。

~~~~~act
write_file
src/config/cards.ts
~~~~~
~~~~~ts
import {
  COLOR_SECTORS,
  STAR_SECTORS,
  type SettingFieldSchema,
} from '../components/settings/DynamicDomainSettings';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: '干扰点网格大小',
    options: [
      { label: '2x2', value: 2 },
      { label: '3x3', value: 3 },
      { label: '4x4', value: 4 },
      { label: '5x5', value: 5 },
    ],
    gridCols: 'grid-cols-4',
  },
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: '弱点专项靶向强化',
    subTitle: '选择需要靶向强化的角度扇区：',
    sectors: STAR_SECTORS,
    gridCols: 'grid-cols-4',
  },
];

export const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const HUE_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: '色相弱点专项靶向强化',
    subTitle: '选择需要靶向强化的色相扇区：',
    sectors: COLOR_SECTORS,
    gridCols: 'grid-cols-3',
  },
];

export const COLOR_ALL_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'toggle',
    key: 'enableHoverColorPreview',
    title: '综合拾色悬停颜色实时联动',
    description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
  },
];

export function getCardById(id: string): CardDefinition | undefined {
  return registry.getCardById(id);
}

export function getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
  return registry.getCardsByDomain(domain);
}
~~~~~

~~~~~act
write_file
src/config/domains.ts
~~~~~
~~~~~ts
import type { ComponentChildren } from 'preact';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';

export interface DomainMeta {
  domain: TrainingDomain;
  appId:
    | 'star-hopping'
    | 'color-sense'
    | 'relative-color'
    | 'negative-space'
    | 'visual-abstraction'
    | 'visual-refinement'
    | 'angle-perception';
  title: string;
  subTitle: string;
  homeTitle: string;
  homeDesc: string;
  themeColor: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon: (props: { className?: string }) => ComponentChildren;
  hasWeaknessAnalytics?: boolean;
  get cards(): CardDefinition[];
}
~~~~~

#### Acts 5: 更新 `settings.ts` 与 `useTodayStats.ts`

将对已移除的 `ALL_CARDS` 常量的引用更新为使用 `registry.getAllCards()`。

~~~~~act
write_file
src/hooks/useTodayStats.ts
~~~~~
~~~~~ts
import { useEffect, useState } from 'preact/hooks';
import { registry } from '../core/registry';
import { type TrainingDomain, getTrialRecords } from '../utils/db';

export function useTodayStats(domain?: TrainingDomain) {
  const [todayStats, setTodayStats] = useState<Record<string, { count: number; timeMs: number }>>(
    {},
  );

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const records = await getTrialRecords(domain);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const allCards = registry.getAllCards();

      const stats: Record<string, { count: number; timeMs: number }> = {};

      for (const r of records) {
        if (r.timestamp >= startOfToday) {
          const matchedCard = allCards.find(
            (c) => c.id === r.cardId || (c.domain === r.domain && c.mode === r.mode),
          );
          const key = matchedCard ? matchedCard.id : r.cardId || r.mode;
          if (!stats[key]) {
            stats[key] = { count: 0, timeMs: 0 };
          }
          stats[key].count += 1;
          stats[key].timeMs += (r.responseTimeMs as number) || 0;
        }
      }

      if (isMounted) {
        setTodayStats(stats);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [domain]);

  return todayStats;
}
~~~~~

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~ts
import { registry } from '../core/registry';

export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';

export interface BaseModuleSettings {
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity: StepGranularity;
  adaptiveMode: AdaptiveMode;
  targetAccuracy: number;
  blockSize: number;
  [key: string]: unknown;
}

export interface StarSettings extends BaseModuleSettings {
  gridSize?: number;
  targetingMode?: TargetingMode;
  manualTargetSectors?: number[];
}

export interface ColorSenseSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
  targetingMode?: TargetingMode;
  manualTargetSectors?: number[];
}

export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface AbstractionSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
  showExperimentalCards?: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  cards: Record<string, BaseModuleSettings>;
}

const SETTINGS_KEY = 'formsight_user_settings';

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};

// 动态根据注册表中的卡片定义构建初始默认配置
function buildDefaultCardSettings(): Record<string, BaseModuleSettings> {
  const cards: Record<string, BaseModuleSettings> = {};
  const allCards = registry.getAllCards();

  for (const card of allCards) {
    const cardConfig: BaseModuleSettings = { ...DEFAULT_BASE_SETTINGS };

    // 如果卡片包含滑块交互，配置默认容错与外延感应
    if (card.tags?.interaction?.includes('continuous_slider')) {
      cardConfig.sliderHitMargin = 12;
      cardConfig.showToleranceBand = true;
    }

    if (card.domain === 'star') {
      cardConfig.gridSize = 3;
      cardConfig.targetingMode = 'off';
      cardConfig.manualTargetSectors = [];
    } else if (card.id === 'color_hue') {
      cardConfig.enableHoverColorPreview = true;
      cardConfig.targetingMode = 'off';
      cardConfig.manualTargetSectors = [];
    } else if (card.id === 'color_all') {
      cardConfig.enableHoverColorPreview = true;
    }

    cards[card.id] = cardConfig;
  }

  return cards;
}

export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
    showExperimentalCards: false,
  },
  cards: buildDefaultCardSettings(),
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    const defaultCards = buildDefaultCardSettings();
    const cards: Record<string, BaseModuleSettings> = { ...defaultCards };

    if (parsed.cards && typeof parsed.cards === 'object') {
      for (const [cardId, val] of Object.entries(parsed.cards)) {
        cards[cardId] = {
          ...(cards[cardId] || DEFAULT_BASE_SETTINGS),
          ...(val as Record<string, unknown>),
        };
      }
    }

    return {
      global: { ...DEFAULT_SETTINGS.global, ...(parsed.global || {}) },
      cards,
    };
  } catch (e) {
    console.error('Failed to load user settings, fallback to default:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}

export function getCardSettings(settings: UserSettings, cardId: string): BaseModuleSettings {
  return settings.cards[cardId] || DEFAULT_SETTINGS.cards[cardId] || DEFAULT_BASE_SETTINGS;
}
~~~~~

---

### 下一步建议
1. 运行测试验证是否全部通过。
2. 将 `src/components/<domain>/` 下的具体子视图进一步物理移动到对应 `src/domains/<domain>/components/` 目录下，彻底实现完全自治的 Domain 目录内聚（Colocation）。
3. 验证无误后可生成针对本轮重构的 Git Commit 计划。
