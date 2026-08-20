我将为你制定并执行这个核心架构重构计划。我们将把“偏好设置”和“弱点分析”的控制权与上下文从 Domain 层下沉并高内聚到各个独立的 Card（感知训练算子）上，实现卡片级细粒度配置与专属分析。

## [WIP] refactor: 重构训练算子架构以实现卡片级偏好设置与弱点分析

### 用户需求
1. 将偏好设置（Settings）从目前粗粒度的领域级（Domain）下沉至卡片级（Card），支持每张卡片独立配置自动切题、延迟、自适应步长以及卡片专属的靶向扇区等参数。
2. 将弱点分析（Weakness Analytics）直接挂载至卡片级别，消除原本跨模式过滤的冗余状态与语义模糊。
3. 调整 Dashboard 与 ModeCard 的交互界面，在卡片上直接暴露偏好设置与弱点分析的入口。

### 评论
这是一次非常关键的架构解耦与内聚优化。将训练的执行实体（Card）与配置、分析的控制实体统一，不仅使业务模型更加符合认知心理学上感知训练算子的定义，还极大地精简了状态流转与 Modal 内部的条件分支代码，大幅提升交互体验。

### 目标
1. **重构配置体系 (`settings.ts`)**：支持 `cards: Record<string, CardSettings>` 的卡片级独立存储与 Global 默认值回退机制，并平滑迁移旧配置。
2. **强化卡片定义 (`card.ts` & `cards.ts`)**：在卡片元数据中直接声明对应的专属配置项 Schema 和分析插件支持。
3. **改造卡片卡片 UI (`ModeCard.tsx` & `DashboardShell.tsx`)**：在 `ModeCard` 右上角提供专属的设置与弱点分析触发按钮，移除 Domain 顶层的冗余按钮。
4. **重构模态框 (`SettingsModal.tsx` & `WeaknessAnalyticsModal.tsx`)**：使其直接接受 `card` 对象，并精准加载对应卡片的配置项与历史练习数据。
5. **更新主应用状态调度 (`app.tsx`)**：将 Domain 级 Modal 打开状态切换为基于 `cardId` 的细粒度调度。

### 基本原理
1. **统一算子概念**：卡片是 FormSight 的最小训练单元。卡片内聚自己的交互方式、算法生成、Schema 规约与专属可视化分析。
2. **多层回退配置模型**：卡片配置优先读取 `settings.cards[cardId]`，未自定义项自动回退至全局全局默认 `DEFAULT_BASE_SETTINGS`，既保持了各卡片的独立性，又免去了重复配置基础项的负担。
3. **精准分析聚合**：由于 IndexedDB 记录已有 `cardId` 索引，点击卡片分析时可直接拉取该卡片对应的试炼记录，不再需要通过 `mode` 字段在分析组件内进行繁琐的二次筛选。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/cli #concept/ui #concept/state #scope/core #scope/ux #ai/instruct #task/domain/architecture #task/object/card-operators #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构配置管理模块 (`src/utils/settings.ts`)

我们将设置结构改造为卡片级字典存储，并提供向下兼容的迁移逻辑与基于卡片 ID 的读写辅助函数。

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~typescript
import { migrateLegacySettings } from './db/migration';

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

export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
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

export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
  },
  cards: {
    star_single: { ...DEFAULT_BASE_SETTINGS, gridSize: 3, targetingMode: 'off', manualTargetSectors: [] },
    star_double_h: { ...DEFAULT_BASE_SETTINGS, gridSize: 3, targetingMode: 'off', manualTargetSectors: [] },
    star_double_r: { ...DEFAULT_BASE_SETTINGS, gridSize: 3, targetingMode: 'off', manualTargetSectors: [] },
    color_hue: {
      ...DEFAULT_BASE_SETTINGS,
      sliderHitMargin: 12,
      showToleranceBand: true,
      enableHoverColorPreview: true,
      targetingMode: 'off',
      manualTargetSectors: [],
    },
    color_val: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    color_sat: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    color_all: {
      ...DEFAULT_BASE_SETTINGS,
      sliderHitMargin: 12,
      showToleranceBand: true,
      enableHoverColorPreview: true,
    },
    rel_vector_shift: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    rel_lightness_induction: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    rel_hue_induction: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    rel_decontextual_2afc: { ...DEFAULT_BASE_SETTINGS },
    neg_ratio_estimation: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    neg_area_comparison_2afc: { ...DEFAULT_BASE_SETTINGS },
    neg_vertex_fitting: { ...DEFAULT_BASE_SETTINGS },
    neg_shape_match_2afc: { ...DEFAULT_BASE_SETTINGS },
  },
};

export function loadSettings(): UserSettings {
  try {
    migrateLegacySettings();
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    // 自动兼容并迁移旧版 domain 挂载的配置
    const cards: Record<string, BaseModuleSettings> = { ...DEFAULT_SETTINGS.cards };

    if (parsed.cards && typeof parsed.cards === 'object') {
      for (const [cardId, val] of Object.entries(parsed.cards)) {
        cards[cardId] = { ...(cards[cardId] || DEFAULT_BASE_SETTINGS), ...(val as Record<string, unknown>) };
      }
    } else {
      // 从旧结构（star/color/relative_color/negative_space）迁移到卡片
      if (parsed.star) {
        cards.star_single = { ...cards.star_single, ...parsed.star };
        cards.star_double_h = { ...cards.star_double_h, ...parsed.star };
        cards.star_double_r = { ...cards.star_double_r, ...parsed.star };
      }
      if (parsed.color) {
        cards.color_hue = { ...cards.color_hue, ...parsed.color };
        cards.color_val = { ...cards.color_val, ...parsed.color };
        cards.color_sat = { ...cards.color_sat, ...parsed.color };
        cards.color_all = { ...cards.color_all, ...parsed.color };
      }
      if (parsed.relative_color) {
        cards.rel_vector_shift = { ...cards.rel_vector_shift, ...parsed.relative_color };
        cards.rel_lightness_induction = { ...cards.rel_lightness_induction, ...parsed.relative_color };
        cards.rel_hue_induction = { ...cards.rel_hue_induction, ...parsed.relative_color };
        cards.rel_decontextual_2afc = { ...cards.rel_decontextual_2afc, ...parsed.relative_color };
      }
      if (parsed.negative_space) {
        cards.neg_ratio_estimation = { ...cards.neg_ratio_estimation, ...parsed.negative_space };
        cards.neg_area_comparison_2afc = { ...cards.neg_area_comparison_2afc, ...parsed.negative_space };
        cards.neg_vertex_fitting = { ...cards.neg_vertex_fitting, ...parsed.negative_space };
        cards.neg_shape_match_2afc = { ...cards.neg_shape_match_2afc, ...parsed.negative_space };
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

#### Acts 2: 完善卡片定义与 Schema 配置 (`src/types/card.ts` & `src/config/cards.ts`)

在 `CardDefinition` 中加入特定卡片的 `settingSchemas` 与 `hasWeaknessAnalytics` 属性，实现卡片层级的独立声明。

~~~~~act
write_file
src/types/card.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { TrainingDomain } from '../utils/db';

export type SensoryTargetTag = 'geometry' | 'color' | 'relative_color' | 'negative_space';

export type CognitiveSkillTag =
  | 'spatial_orientation'
  | 'color_fidelity'
  | 'illusion_invariance'
  | 'proportion'
  | 'visual_memory';

export type InteractionTag = 'continuous_slider' | 'point_click' | 'choice_2afc' | 'choice_nafc';

export interface CardTags {
  target: SensoryTargetTag[];
  skill: CognitiveSkillTag[];
  interaction: InteractionTag[];
}

export interface CardDefinition {
  id: string;
  legacyDomain: TrainingDomain;
  legacyMode: string;
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  settingsKey?: string; // 兼容
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
}
~~~~~

~~~~~act
write_file
src/config/cards.ts
~~~~~
~~~~~typescript
import {
  Columns,
  Crosshair,
  Droplet,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sparkles,
  Sun,
  Target,
} from 'lucide-preact';
import {
  COLOR_SECTORS,
  STAR_SECTORS,
  type SettingFieldSchema,
} from '../components/settings/DynamicDomainSettings';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';

const STAR_SCHEMAS: SettingFieldSchema[] = [
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

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'sliderMargin',
    key: 'sliderHitMargin',
    title: '滑块极值吸附外延感应区',
  },
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

const HUE_SCHEMAS: SettingFieldSchema[] = [
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

const COLOR_ALL_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'toggle',
    key: 'enableHoverColorPreview',
    title: '综合拾色悬停颜色实时联动',
    description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
  },
];

export const ALL_CARDS: CardDefinition[] = [
  // ==========================================
  // 1. 寻星练习系列 (Star-Hopping)
  // ==========================================
  {
    id: 'star_single',
    legacyDomain: 'star',
    legacyMode: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    icon: Target,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_h',
    legacyDomain: 'star',
    legacyMode: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    icon: Crosshair,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_r',
    legacyDomain: 'star',
    legacyMode: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    icon: RotateCw,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },

  // ==========================================
  // 2. 绝对色感系列 (Color Recognition)
  // ==========================================
  {
    id: 'color_hue',
    legacyDomain: 'color',
    legacyMode: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    icon: RotateCw,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: HUE_SCHEMAS,
  },
  {
    id: 'color_val',
    legacyDomain: 'color',
    legacyMode: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    icon: Sun,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_sat',
    legacyDomain: 'color',
    legacyMode: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    icon: Droplet,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_all',
    legacyDomain: 'color',
    legacyMode: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    icon: Palette,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: COLOR_ALL_SCHEMAS,
  },

  // ==========================================
  // 3. 相对色感系列 (Relative Color)
  // ==========================================
  {
    id: 'rel_vector_shift',
    legacyDomain: 'relative_color',
    legacyMode: 'VECTOR_SHIFT',
    title: '色彩矢量迁移',
    desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
    icon: Shuffle,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_lightness_induction',
    legacyDomain: 'relative_color',
    legacyMode: 'LIGHTNESS_INDUCTION',
    title: '明度反差补偿',
    desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
    icon: Sun,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_hue_induction',
    legacyDomain: 'relative_color',
    legacyMode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，逆向补偿色彩推移，训练环境光色感知调和力。',
    icon: Palette,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_decontextual_2afc',
    legacyDomain: 'relative_color',
    legacyMode: 'DECONTEXTUAL_2AFC',
    title: '环境穿透判别',
    desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
    icon: Columns,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },

  // ==========================================
  // 4. 正负形空间系列 (Negative Space)
  // ==========================================
  {
    id: 'neg_ratio_estimation',
    legacyDomain: 'negative_space',
    legacyMode: 'RATIO_ESTIMATION',
    title: '负形占比滑块评估',
    desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
    icon: Maximize2,
    tags: {
      target: ['negative_space'],
      skill: ['proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'neg_area_comparison_2afc',
    legacyDomain: 'negative_space',
    legacyMode: 'AREA_COMPARISON_2AFC',
    title: '负形面积二分判别',
    desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
    icon: Columns,
    tags: {
      target: ['negative_space'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_vertex_fitting',
    legacyDomain: 'negative_space',
    legacyMode: 'NEGATIVE_VERTEX_FITTING',
    title: '负形边界反切定点',
    desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
    icon: Crosshair,
    tags: {
      target: ['negative_space'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_shape_match_2afc',
    legacyDomain: 'negative_space',
    legacyMode: 'SHAPE_MATCH_2AFC',
    title: '负形轮廓记忆匹配',
    desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
    icon: Sparkles,
    tags: {
      target: ['negative_space'],
      skill: ['visual_memory', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
];

const CARD_MAP = new Map<string, CardDefinition>(ALL_CARDS.map((c) => [c.id, c]));
const LEGACY_MAP = new Map<string, CardDefinition>(
  ALL_CARDS.map((c) => [`${c.legacyDomain}:${c.legacyMode}`, c]),
);

export function getCardById(id: string): CardDefinition | undefined {
  return CARD_MAP.get(id);
}

export function getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
  return ALL_CARDS.filter((c) => c.legacyDomain === domain);
}

export function resolveLegacyCardId(domain: string, mode: string): string {
  const card = LEGACY_MAP.get(`${domain}:${mode}`);
  return card ? card.id : `${domain}_${mode}`;
}

export function resolveCardByLegacy(domain: string, mode: string): CardDefinition | undefined {
  return LEGACY_MAP.get(`${domain}:${mode}`);
}
~~~~~

#### Acts 3: 改造 ModeCard 与 Dashboard 界面 (`ModeCard.tsx` & `DashboardShell.tsx`)

为 `ModeCard` 增加卡片级的分析和设置按钮，移除 Domain 顶层的全局冗余按钮。

~~~~~act
write_file
src/components/dashboard/ModeCard.tsx
~~~~~
~~~~~typescript
import { Award, BarChart2, Play, Sliders, Target, TrendingUp } from 'lucide-preact';
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
  hasAnalytics?: boolean;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  accuracy,
  hasAnalytics = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
  return (
    <div className="group bg-white border border-gray-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <Icon className="w-6 h-6" />
            </div>

            {/* 卡片级专属操作快捷入口 */}
            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
              {hasAnalytics && onOpenAnalytics && (
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title={`${title} 弱点分析`}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title={`${title} 偏好设置`}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-semibold text-slate-400">今日刷题</div>
            <div className="text-xs font-bold text-slate-500 font-mono">
              {todayCount} 题
              {todayCount > 0 && todayTimeMs > 0 && (
                <span className="text-[11px] text-slate-400 font-normal ml-1">
                  ({formatTodayTime(todayTimeMs)})
                </span>
              )}
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">{desc}</p>

        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
              <TrendingUp className="w-3 h-3 text-indigo-500" />
              能力层阶
            </div>
            <div className="text-xl font-black text-slate-800">Level {currentLevel}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
              <Award className="w-3 h-3 text-emerald-500" />
              正确率
            </div>
            <div className="text-xl font-black text-slate-800">{accuracy}%</div>
          </div>
        </div>
      </div>

      {/* 动作按钮区 */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onStartTraining}
          className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          开始自适应训练
        </button>
        <button
          type="button"
          onClick={onStartBenchmark}
          className="w-full py-2.5 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <Target className="w-3.5 h-3.5 text-gray-500" />
          20 题基准测试
        </button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/dashboard/DashboardShell.tsx
~~~~~
~~~~~typescript
import { ArrowLeft } from 'lucide-preact';
import type { ComponentChildren } from 'preact';

interface DashboardShellProps {
  title: string;
  subTitle: string;
  onBackToHome?: () => void;
  children: ComponentChildren;
}

export function DashboardShell({
  title,
  subTitle,
  onBackToHome,
  children,
}: DashboardShellProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              返回主页
            </button>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {title} <span className="text-indigo-600 font-light text-xl">{subTitle}</span>
            </h1>
          </div>
        </div>
      </div>

      {/* 模块卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/dashboard/GenericDashboard.tsx
~~~~~
~~~~~typescript
import { useEffect, useState } from 'preact/hooks';
import type { DomainMeta } from '../../config/domains';
import { useTodayStats } from '../../hooks/useTodayStats';
import { type UnifiedProfileData, getProfilesByDomain } from '../../utils/db';
import { DashboardShell } from './DashboardShell';
import { ModeCard } from './ModeCard';

interface GenericDashboardProps {
  meta: DomainMeta;
  onStart: (cardId: string, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
}

export function GenericDashboard({
  meta,
  onStart,
  onBackToHome,
  onOpenCardSettings,
  onOpenCardAnalytics,
}: GenericDashboardProps) {
  const todayStats = useTodayStats(meta.domain);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});

  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain(meta.domain).then((list) => {
      if (!isMounted) return;
      const map: Record<string, UnifiedProfileData> = {};
      for (const p of list) {
        map[p.cardId] = p;
      }
      setProfiles(map);
    });
    return () => {
      isMounted = false;
    };
  }, [meta.domain]);

  return (
    <DashboardShell
      title={meta.title}
      subTitle={meta.subTitle}
      onBackToHome={onBackToHome}
    >
      {meta.cards.map((card) => {
        const profile = profiles[card.id];
        const totalTrials = profile?.totalTrials || 0;
        const accuracy =
          totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[card.legacyMode] || todayStats[card.id] || { count: 0, timeMs: 0 };

        return (
          <ModeCard
            key={card.id}
            title={card.title}
            desc={card.desc}
            icon={card.icon}
            todayCount={stat.count}
            todayTimeMs={stat.timeMs}
            currentLevel={currentLevel}
            accuracy={accuracy}
            hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
            onStartTraining={() => onStart(card.id, 'training')}
            onStartBenchmark={() => onStart(card.id, 'benchmark')}
            onOpenSettings={() => onOpenCardSettings(card.id)}
            onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
          />
        );
      })}
    </DashboardShell>
  );
}
~~~~~

#### Acts 4: 重构偏好设置模态框 (`SettingsModal.tsx`)

重写 `SettingsModal`，使其直接绑定并编辑特定卡片的配置（包含通用参数与卡片专属 Schemas）。

~~~~~act
write_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
import { Flame, Sliders, Target, ToggleLeft, ToggleRight } from 'lucide-preact';
import { useState } from 'preact/hooks';
import type { CardDefinition } from '../types/card';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  saveSettings,
} from '../utils/settings';
import { ModalShell } from './common/ModalShell';
import { DynamicDomainSettings } from './settings/DynamicDomainSettings';

interface SettingsModalProps {
  card: CardDefinition;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ card, settings, onClose, onSave }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
  const cardConfig = getCardSettings(current, card.id);

  const updateCardConfig = (patch: Partial<BaseModuleSettings>) => {
    setCurrent((prev) => {
      const updatedCard = {
        ...getCardSettings(prev, card.id),
        ...patch,
      };
      const nextSettings: UserSettings = {
        ...prev,
        cards: {
          ...prev.cards,
          [card.id]: updatedCard,
        },
      };
      saveSettings(nextSettings);
      onSave(nextSettings);
      return nextSettings;
    });
  };

  return (
    <ModalShell title={`${card.title} 偏好设置`} icon={Sliders} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-5">
        {/* 通用配置：自动翻页开关 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">自动切换下一题</div>
            <div className="text-xs text-slate-400">点击答题后无需手动按空格切题</div>
          </div>
          <button
            type="button"
            onClick={() => updateCardConfig({ autoNext: !cardConfig.autoNext })}
            className="text-indigo-600 hover:opacity-80 transition-opacity"
          >
            {cardConfig.autoNext ? (
              <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
        </div>

        {/* 通用配置：自动翻页延迟 */}
        {cardConfig.autoNext && (
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
              <span>切换延迟时间</span>
              <span className="font-mono text-indigo-600 font-bold">
                {cardConfig.autoNextDelay} ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={cardConfig.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateCardConfig({ autoNextDelay: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        )}

        {/* 通用配置：自适应算子模式 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700">自适应算子模式</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateCardConfig({ adaptiveMode: 'block' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                cardConfig.adaptiveMode === 'block'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              轮次胜率评估 (推荐)
            </button>
            <button
              type="button"
              onClick={() => updateCardConfig({ adaptiveMode: 'staircase' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                cardConfig.adaptiveMode === 'staircase'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              经典 3U1D 阶梯
            </button>
          </div>
        </div>

        {/* 轮次评估配置 */}
        {cardConfig.adaptiveMode === 'block' && (
          <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>目标通关正确率</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {Math.round(cardConfig.targetAccuracy * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                  <button
                    type="button"
                    key={acc}
                    onClick={() => updateCardConfig({ targetAccuracy: acc })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      cardConfig.targetAccuracy === acc
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {Math.round(acc * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>每轮评估题量</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {cardConfig.blockSize} 题/轮
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[10, 15, 20].map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => updateCardConfig({ blockSize: size })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      cardConfig.blockSize === size
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {size} 题
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 难度阶梯精细度 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700">难度阶梯精细度</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'standard' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                cardConfig.stepGranularity === 'standard'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              标准阶梯 (大步幅)
            </button>
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'fine' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                cardConfig.stepGranularity === 'fine'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              精细阶梯 (小步幅)
            </button>
          </div>
        </div>

        {/* 渲染卡片专属设置 Schemas */}
        {card.settingSchemas && card.settingSchemas.length > 0 && (
          <DynamicDomainSettings
            schemas={card.settingSchemas}
            values={cardConfig}
            onChange={(patch) => updateCardConfig(patch)}
          />
        )}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
        >
          完成
        </button>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 5: 重构弱点分析插件与模态框 (`analyticsPlugins.tsx` & `WeaknessAnalyticsModal.tsx`)

按卡片注册与拉取历史记录，精简多余的下拉筛选状态。

~~~~~act
write_file
src/config/analyticsPlugins.tsx
~~~~~
~~~~~typescript
import { AlertCircle, Crosshair, Target } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { renderHueRingCanvas } from '../utils/canvas/drawColorRing';
import { type SectorStat, renderCompassCanvas } from '../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../utils/canvas/drawHeatmap';
import { hsvToHex } from '../utils/colorUtils';
import { type UnifiedTrialRecord, getTrialRecordsByCard } from '../utils/db';

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  title: string;
  subTitle: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[]) => void;
  renderDiagnostics: (records: TRecord[]) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}

const STAR_SECTORS = [
  '正东 (0°)',
  '东北 (45°)',
  '正北 (90°)',
  '西北 (135°)',
  '正西 (180°)',
  '西南 (225°)',
  '正南 (270°)',
  '东南 (315°)',
];

const COLOR_SECTORS = [
  '红 (0°-30°)',
  '橙 (30°-60°)',
  '黄 (60°-90°)',
  '黄绿 (90°-120°)',
  '绿 (120°-150°)',
  '青绿 (150°-180°)',
  '青 (180°-210°)',
  '蓝 (210°-240°)',
  '蓝紫 (240°-270°)',
  '紫 (270°-300°)',
  '品红 (300°-330°)',
  '紫红 (330°-360°)',
];

// 寻星通用分析插件工厂
function createStarAnalyticsPlugin(cardId: string, title: string): CardAnalyticsPlugin {
  return {
    cardId,
    title: `${title} · 视角空间偏置分析`,
    subTitle: '洞察你的视觉系统空间偏置与视角盲区',
    fetchRecords: async (id) => getTrialRecordsByCard(id),
    renderVisualizer: (canvas, records) => {
      const totalCount = records.length;
      let sumDx = 0;
      let sumDy = 0;
      for (const r of records) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        sumDx += uClick[0] - tB[0];
        sumDy += uClick[1] - tB[1];
      }
      const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
      const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
      renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
    },
    renderDiagnostics: (records) => {
      const totalCount = records.length;
      if (totalCount === 0) return null;

      let sumDx = 0;
      let sumDy = 0;
      let sumDist = 0;
      for (const r of records) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        sumDx += uClick[0] - tB[0];
        sumDy += uClick[1] - tB[1];
        sumDist += (r.errorPixelDistance as number) || 0;
      }
      const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
      const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
      const avgDist = Math.round((sumDist / totalCount) * 10) / 10;

      return (
        <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
          <div className="font-bold text-indigo-900 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            系统空间偏置 (Systematic Bias)
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            中心绿点为绝对真理点。散点越收敛代表空间直觉越敏锐。
          </p>
          <div className="pt-1 space-y-1 font-mono text-slate-700">
            <div className="flex justify-between">
              <span>平均 X 轴偏移:</span>
              <span className="font-bold">
                {avgDx > 0 ? `右 +${avgDx}` : avgDx < 0 ? `左 ${avgDx}` : '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>平均 Y 轴偏移:</span>
              <span className="font-bold">
                {avgDy > 0 ? `下 +${avgDy}` : avgDy < 0 ? `上 ${avgDy}` : '0'}
              </span>
            </div>
            <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-200/60 pt-1">
              <span>平均像素误差:</span>
              <span>{avgDist}px</span>
            </div>
          </div>
        </div>
      );
    },
    getOverallStats: (records) => {
      const total = records.length;
      const hits = records.filter((r) => r.isHit).length;
      const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
      return { accuracy, total };
    },
  };
}

// 色相分析插件
export const colorHueAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'color_hue',
  title: '色相感知弱点分析',
  subTitle: '洞察你对 OKLab 色彩空间 12 色相扇区的敏感度分布',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  renderVisualizer: (canvas, records) => {
    const sectorBuckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0, sumError: 0 }));
    for (const r of records) {
      const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
      const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
      sectorBuckets[idx].total += 1;
      if (r.isHit) sectorBuckets[idx].hits += 1;
      sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
    }
    const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
      sectorIdx: i,
      label: COLOR_SECTORS[i],
      total: b.total,
      accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
      avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
    }));
    renderHueRingCanvas(canvas, sectorStats);
  },
  renderDiagnostics: (records) => {
    const totalCount = records.length;
    if (totalCount === 0) return null;

    const sectorBuckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0, sumError: 0 }));
    for (const r of records) {
      const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
      const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
      sectorBuckets[idx].total += 1;
      if (r.isHit) sectorBuckets[idx].hits += 1;
      sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
    }
    const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
      sectorIdx: i,
      label: COLOR_SECTORS[i],
      total: b.total,
      accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
      avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
    }));
    const validSectors = sectorStats.filter((s) => s.total >= 3);
    const weakestSector =
      validSectors.length > 0
        ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
        : null;

    return (
      <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
        <div className="font-bold text-amber-900 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          色相盲区诊断
        </div>
        {weakestSector ? (
          <div className="space-y-2">
            <p className="text-slate-700 text-[11px]">
              你在 <span className="font-bold text-amber-700">{weakestSector.label}</span>{' '}
              色相上辨识度最低：
            </p>
            <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full border border-slate-200"
                  style={{
                    backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                  }}
                />
                <span className="font-bold text-slate-800">
                  {weakestSector.label.split(' ')[0]}
                </span>
              </div>
              <span className="font-black text-rose-600 text-sm">
                {weakestSector.accuracy}% 正确率
              </span>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 text-[11px]">
            需每个色相扇区完成至少 3 题才能生成弱点诊断。
          </p>
        )}
      </div>
    );
  },
  getOverallStats: (records) => {
    const total = records.length;
    const hits = records.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
    const avgError = total > 0 ? Math.round((sumError / total) * 10) / 10 : 0;

    return {
      accuracy,
      total,
      customSummary: (
        <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
          <span>平均绝对角度误差:</span>
          <span>{avgError}°</span>
        </div>
      ),
    };
  },
};

// 负形留白占比估算分析插件
export const negRatioAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'neg_ratio_estimation',
  title: '负形留白占比评估分析',
  subTitle: '洞察你对留白空间面积占比估算的直觉灵敏度',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  renderVisualizer: (canvas, records) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, w, h);

    // 绘制散点图 (真实负形比 vs 用户估计比)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, h - 30);
    ctx.lineTo(w - 20, 20);
    ctx.stroke();

    for (const r of records) {
      const target = Number(r.targetNegativeRatio ?? 50);
      const user = Number(r.userRatio ?? 50);
      const px = 30 + (target / 100) * (w - 50);
      const py = h - 30 - (user / 100) * (h - 50);

      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = r.isHit ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
      ctx.fill();
    }
  },
  renderDiagnostics: (records) => {
    const totalCount = records.length;
    if (totalCount === 0) return null;

    const avgRatioErr =
      totalCount > 0
        ? Math.round(
            (records.reduce((acc, c) => acc + Number(c.errorValue || 0), 0) / totalCount) *
              10,
          ) / 10
        : 0;

    return (
      <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-2 text-xs">
        <div className="font-bold text-emerald-900 flex items-center gap-1">
          <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
          空间留白敏感度诊断
        </div>
        <div className="space-y-1.5 text-[11px] text-slate-700">
          <div className="flex justify-between font-mono bg-white p-2 rounded-xl border border-emerald-100">
            <span className="text-slate-600">负形占比平均绝对误差:</span>
            <span className="font-bold text-emerald-700">±{avgRatioErr}%</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            散点越紧贴对角线，代表对负形几何空隙的面积直觉越敏锐精准。
          </p>
        </div>
      </div>
    );
  },
  getOverallStats: (records) => {
    const total = records.length;
    const hits = records.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { accuracy, total };
  },
};

export const CARD_ANALYTICS_PLUGINS: Record<string, CardAnalyticsPlugin> = {
  star_single: createStarAnalyticsPlugin('star_single', '单锚点'),
  star_double_h: createStarAnalyticsPlugin('star_double_h', '水平双锚点'),
  star_double_r: createStarAnalyticsPlugin('star_double_r', '旋转双锚点'),
  color_hue: colorHueAnalyticsPlugin,
  neg_ratio_estimation: negRatioAnalyticsPlugin,
};
~~~~~

~~~~~act
write_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~typescript
import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CARD_ANALYTICS_PLUGINS } from '../config/analyticsPlugins';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db';

interface WeaknessAnalyticsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const plugin = CARD_ANALYTICS_PLUGINS[card.id];
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [plugin, card.id]);

  useEffect(() => {
    if (loading || !plugin) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    plugin.renderVisualizer(canvas, records);
  }, [plugin, loading, records]);

  if (!plugin) return null;

  const stats = plugin.getOverallStats
    ? plugin.getOverallStats(records)
    : {
        accuracy:
          records.length > 0
            ? Math.round((records.filter((r) => r.isHit).length / records.length) * 100)
            : 0,
        total: records.length,
      };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{plugin.title}</h2>
              <p className="text-xs text-slate-400">{plugin.subTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            正在分析历史答题数据...
          </div>
        ) : records.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            暂无【{card.title}】的练习记录，先去完成几轮练习吧！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl"
              />
            </div>

            {/* 右侧数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">总体评估</div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-800">{stats.accuracy}%</span>
                  <span className="text-xs font-semibold text-slate-400 mb-1">
                    样本量: {stats.total} 题
                  </span>
                </div>
                {stats.customSummary}
              </div>

              {/* 插件个性化诊断 */}
              {plugin.renderDiagnostics(records)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 6: 主入口状态与模态框调度适配 (`src/app.tsx`)

将原先以 `TrainingDomain` 为驱动的 Modal 状态改为以 `cardId` 为驱动。

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { getCardById } from './config/cards';
import { DOMAINS_CONFIG } from './config/domains';
import { CARD_PLUGINS } from './config/trainingPlugins';
import { useHashRoute } from './hooks/useHashRoute';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';

const ALL_DOMAINS: TrainingDomain[] = ['star', 'color', 'relative_color', 'negative_space'];

export function App() {
  const { route, navigate } = useHashRoute();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(ALL_DOMAINS.map((d) => getProfilesByDomain(d)));
    const pMap: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        pMap[p.cardId] = p;
      }
    }

    setDomainTimes(timesMap);
    setCurrentDomainProfiles(pMap);
    setSettings(loadSettings());
    setProfilesLoaded(true);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (route.type === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'dashboard') {
      const meta = DOMAINS_CONFIG[route.domain];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    } else if (route.type === 'train') {
      const card = getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route]);

  const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

  const activeSettingsCard = activeSettingsCardId ? getCardById(activeSettingsCardId) : null;
  const activeAnalyticsCard = activeAnalyticsCardId ? getCardById(activeAnalyticsCardId) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          domainTimes={domainTimes}
          onNavigateDomain={(domain) => navigate({ type: 'dashboard', domain })}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'dashboard' && (
        <GenericDashboard
          meta={DOMAINS_CONFIG[route.domain]}
          onStart={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
          onBackToHome={() => navigate({ type: 'home' })}
          onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
          onOpenCardAnalytics={(cardId) => setActiveAnalyticsCardId(cardId)}
        />
      )}

      {route.type === 'train' &&
        (() => {
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                正在同步能力层阶与训练数据...
              </div>
            );
          }
          const activeCard = getCardById(route.cardId);
          if (!activeCard) {
            navigate({ type: 'home' });
            return null;
          }
          const plugin = CARD_PLUGINS[activeCard.id];
          const activeLevel = currentDomainProfiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={getCardSettings(settings, activeCard.id)}
              onExit={() => navigate({ type: 'dashboard', domain: activeCard.legacyDomain })}
            />
          );
        })()}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={settings}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {activeAnalyticsCard && (
        <WeaknessAnalyticsModal
          card={activeAnalyticsCard}
          onClose={() => setActiveAnalyticsCardId(null)}
        />
      )}
    </div>
  );
}
~~~~~

---

### 下一步建议
1. **测试与类型检查**：在执行完本计划后，建议运行 `npm run check` (Biome) 与 `npm test` 确认类型安全与测试通过。
2. **提交代码**：确认所有卡片级设置和弱点分析表现正常后，即可发起 `[COMMIT]` 计划归档提交。
