我已为你制定了重构实施计划，将现有架构从树状硬编码层级升级为**扁平卡片注册表 + 多维正交标签系统**，同时确保对现有用户数据与组件交互的完全向后兼容。

## [WIP] refactor: 重构训练层级架构为扁平卡片注册表与多维标签系统

### 用户需求
将 FormSight 的 14 种训练模式从树状层级解耦为扁平卡片注册中心（Card Registry），并引入感官对象、认知技能、交互范式三维正交标签体系，使执行流与视图层解耦，同时保证对现有 IndexedDB 数据与历史设置的 100% 兼容。

### 评论
当前系统随着模式从 3 个扩展到 14 个，传统的 `Domain -> Mode` 树状层级在状态管理、数据分发和跨领域能力评估上带来了冗余的中转逻辑。通过引入单一事实源的扁平卡片注册表，结合多维正交标签与虚拟集合（Virtual Collections），能够大幅提升系统的扩展性与代码可维护性。

### 目标
1. 新建 `src/types/card.ts`，定义正交三维标签类型与 `CardDefinition` 规范接口。
2. 新建 `src/config/cards.ts`，注册全量 14 张训练卡片并提供高效索引与 Legacy 映射辅助函数。
3. 重构 `src/config/trainingPlugins.tsx`，建立基于卡片 ID 的执行插件映射 `CARD_PLUGINS`。
4. 升级 `src/config/domains.ts` 与 `GenericDashboard.tsx`，将大类转为基于注册表派生的虚拟集合。
5. 升级 `src/utils/db/schema.ts` 与 `src/utils/db/queries.ts`，支持 `cardId` 双向兼容读写。
6. 改造 `src/views/GenericTrainingView.tsx` 与 `src/app.tsx`，收敛顶层调度状态为卡片直驱。

### 基本原理
- **单一事实源 (SSOT)**：所有 14 个训练卡片的标题、描述、图标、标签、遗留映射关系在 `cards.ts` 中统一定义。
- **正交三维标签**：按 `SensoryTargetTag`（感官对象）、`CognitiveSkillTag`（认知技能）、`InteractionTag`（交互范式）划分，支持未来任意维度的筛选与跨域能力画像。
- **平滑双向映射**：通过 `resolveLegacyCardId(domain, mode)` 与 `card.legacyDomain`，使存储层历史记录无需破坏性迁移即可直接运行。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #comp/interfaces #concept/state #concept/executor #scope/core #scope/api #ai/instruct #task/domain/architecture #task/object/flat-card-registry #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建卡片与标签类型定义 `src/types/card.ts`

新建卡片契约接口与三维正交标签定义。

~~~~~act
write_file
src/types/card.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { TrainingDomain } from '../utils/db';

/**
 * 维度 1：感官目标 / 训练对象 (Sensory Target)
 */
export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space';

/**
 * 维度 2：认知技能 / 核心心理学机制 (Cognitive Skill)
 */
export type CognitiveSkillTag =
  | 'spatial_orientation'
  | 'color_fidelity'
  | 'illusion_invariance'
  | 'proportion'
  | 'visual_memory';

/**
 * 维度 3：交互范式 / 做答动作 (Interaction Paradigm)
 */
export type InteractionTag =
  | 'continuous_slider'
  | 'point_click'
  | 'choice_2afc'
  | 'choice_nafc';

export interface CardTags {
  target: SensoryTargetTag[];
  skill: CognitiveSkillTag[];
  interaction: InteractionTag[];
}

/**
 * 扁平卡片定义实体 (Single Source of Truth)
 */
export interface CardDefinition {
  id: string; // 全局唯一 cardId，例如 'star_single', 'color_hue', 'neg_vertex_fitting'
  legacyDomain: TrainingDomain;
  legacyMode: string;
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  settingsKey: TrainingDomain;
}
~~~~~

#### Acts 2: 创建扁平卡片注册表 `src/config/cards.ts`

收敛全量 14 个模式定义，并导出高效索引及 Legacy 映射函数。

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
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';

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
    settingsKey: 'star',
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
    settingsKey: 'star',
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
    settingsKey: 'star',
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
    settingsKey: 'color',
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
    settingsKey: 'color',
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
    settingsKey: 'color',
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
    settingsKey: 'color',
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
    settingsKey: 'relative_color',
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
    settingsKey: 'relative_color',
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
    settingsKey: 'relative_color',
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
    settingsKey: 'relative_color',
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
    settingsKey: 'negative_space',
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
    settingsKey: 'negative_space',
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
    settingsKey: 'negative_space',
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
    settingsKey: 'negative_space',
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

#### Acts 3: 改造训练插件注册与调度层 `src/config/trainingPlugins.tsx`

导出卡片级执行器映射 `CARD_PLUGINS` 与 `getPluginByCardId`。

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript
// biome-ignore lint/suspicious/noExplicitAny: Plugin map holds heterogeneous plugin instances
export const TRAINING_PLUGINS: Record<TrainingDomain, TrainingPlugin<any, any, any, any>> = {
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};
~~~~~
~~~~~typescript
// biome-ignore lint/suspicious/noExplicitAny: Plugin map holds heterogeneous plugin instances
export const TRAINING_PLUGINS: Record<TrainingDomain, TrainingPlugin<any, any, any, any>> = {
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};

// 卡片粒度的插件调度表 (直接以 cardId 进行 O(1) 派发)
// biome-ignore lint/suspicious/noExplicitAny: Plugin map holds heterogeneous plugin instances
export const CARD_PLUGINS: Record<string, TrainingPlugin<any, any, any, any>> = {
  star_single: starPlugin,
  star_double_h: starPlugin,
  star_double_r: starPlugin,
  color_hue: colorPlugin,
  color_val: colorPlugin,
  color_sat: colorPlugin,
  color_all: colorPlugin,
  rel_vector_shift: relativeColorPlugin,
  rel_lightness_induction: relativeColorPlugin,
  rel_hue_induction: relativeColorPlugin,
  rel_decontextual_2afc: relativeColorPlugin,
  neg_ratio_estimation: negativeSpacePlugin,
  neg_area_comparison_2afc: negativeSpacePlugin,
  neg_vertex_fitting: negativeSpacePlugin,
  neg_shape_match_2afc: negativeSpacePlugin,
};

export function getPluginByCardId(cardId: string): TrainingPlugin<any, any, any, any> | undefined {
  return CARD_PLUGINS[cardId];
}
~~~~~

#### Acts 4: 虚拟化大类集合与数据看板 `src/config/domains.ts` & `src/components/dashboard/GenericDashboard.tsx`

让大类配置动态关联卡片注册表，并升级看板渲染。

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript
import {
  Columns,
  Compass,
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
import type { ComponentChildren } from 'preact';
import type { TrainingDomain } from '../utils/db';

export interface ModeConfig {
  id: string;
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
}

export interface DomainMeta {
  domain: TrainingDomain;
  appId: 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space';
  title: string;
  subTitle: string;
  homeTitle: string;
  homeDesc: string;
  themeColor: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon: (props: { className?: string }) => ComponentChildren;
  hasWeaknessAnalytics?: boolean;
  modes: ModeConfig[];
}

export const DOMAINS_CONFIG: Record<TrainingDomain, DomainMeta> = {
  star: {
    domain: 'star',
    appId: 'star-hopping',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    homeTitle: '寻星练习 (Star-Hopping)',
    homeDesc:
      '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
    hasWeaknessAnalytics: true,
    modes: [
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
    ],
  },
  color: {
    domain: 'color',
    appId: 'color-sense',
    title: '色感训练',
    subTitle: 'Color Recognition',
    homeTitle: '绝对色感 (Color Recognition)',
    homeDesc:
      '拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。',
    themeColor: 'amber',
    icon: Palette,
    hasWeaknessAnalytics: true,
    modes: [
      {
        id: 'H',
        title: '色相 (Hue)',
        desc: '识别颜色在色相环上的具体角度 (0°~360°)',
        icon: RotateCw,
      },
      {
        id: 'V',
        title: '明度 (Value)',
        desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
        icon: Sun,
      },
      {
        id: 'S',
        title: '饱和度 (Sat)',
        desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
        icon: Droplet,
      },
      {
        id: 'ALL',
        title: '综合拾色 (Match)',
        desc: '同时调整色相、饱和度与明度，逼近真理色彩',
        icon: Palette,
      },
    ],
  },
  relative_color: {
    domain: 'relative_color',
    appId: 'relative-color',
    title: '相对色感',
    subTitle: 'Relative Color',
    homeTitle: '相对色感 (Relative Color Perception)',
    homeDesc:
      '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
    hasWeaknessAnalytics: false,
    modes: [
      {
        id: 'VECTOR_SHIFT',
        title: '色彩矢量迁移',
        desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
        icon: Shuffle,
      },
      {
        id: 'LIGHTNESS_INDUCTION',
        title: '明度反差补偿',
        desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
        icon: Sun,
      },
      {
        id: 'HUE_INDUCTION',
        title: '补色残像调和',
        desc: '在强色相与饱和度背景下，逆向补偿色彩推移，训练环境光色感知调和力。',
        icon: Palette,
      },
      {
        id: 'DECONTEXTUAL_2AFC',
        title: '环境穿透判别',
        desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
        icon: Columns,
      },
    ],
  },
  negative_space: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: false,
    modes: [
      {
        id: 'RATIO_ESTIMATION',
        title: '负形占比滑块评估',
        desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
        icon: Maximize2,
      },
      {
        id: 'AREA_COMPARISON_2AFC',
        title: '负形面积二分判别',
        desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
        icon: Columns,
      },
      {
        id: 'NEGATIVE_VERTEX_FITTING',
        title: '负形边界反切定点',
        desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
        icon: Crosshair,
      },
      {
        id: 'SHAPE_MATCH_2AFC',
        title: '负形轮廓记忆匹配',
        desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
        icon: Sparkles,
      },
    ],
  },
};
~~~~~
~~~~~typescript
import { Compass, Maximize2, Palette, Shuffle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { CardDefinition } from '../types/card';
import { getCardsByDomain } from './cards';
import type { TrainingDomain } from '../utils/db';

export interface DomainMeta {
  domain: TrainingDomain;
  appId: 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space';
  title: string;
  subTitle: string;
  homeTitle: string;
  homeDesc: string;
  themeColor: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon: (props: { className?: string }) => ComponentChildren;
  hasWeaknessAnalytics?: boolean;
  get cards(): CardDefinition[];
}

export const DOMAINS_CONFIG: Record<TrainingDomain, DomainMeta> = {
  star: {
    domain: 'star',
    appId: 'star-hopping',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    homeTitle: '寻星练习 (Star-Hopping)',
    homeDesc:
      '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('star');
    },
  },
  color: {
    domain: 'color',
    appId: 'color-sense',
    title: '色感训练',
    subTitle: 'Color Recognition',
    homeTitle: '绝对色感 (Color Recognition)',
    homeDesc:
      '拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。',
    themeColor: 'amber',
    icon: Palette,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('color');
    },
  },
  relative_color: {
    domain: 'relative_color',
    appId: 'relative-color',
    title: '相对色感',
    subTitle: 'Relative Color',
    homeTitle: '相对色感 (Relative Color Perception)',
    homeDesc:
      '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
    hasWeaknessAnalytics: false,
    get cards() {
      return getCardsByDomain('relative_color');
    },
  },
  negative_space: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: false,
    get cards() {
      return getCardsByDomain('negative_space');
    },
  },
};
~~~~~

~~~~~act
patch_file
src/components/dashboard/GenericDashboard.tsx
~~~~~
~~~~~typescript
interface GenericDashboardProps {
  meta: DomainMeta;
  onStart: (mode: string, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function GenericDashboard({
  meta,
  onStart,
  onBackToHome,
  onOpenSettings,
  onOpenAnalytics,
}: GenericDashboardProps) {
  const todayStats = useTodayStats(meta.domain);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});

  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain(meta.domain).then((list) => {
      if (!isMounted) return;
      const map: Record<string, UnifiedProfileData> = {};
      for (const p of list) {
        map[p.mode] = p;
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
      onOpenSettings={onOpenSettings}
      onOpenAnalytics={meta.hasWeaknessAnalytics ? onOpenAnalytics : undefined}
    >
      {meta.modes.map((config) => {
        const profile = profiles[config.id];
        const totalCards = profile?.totalTrainedCards || 0;
        const accuracy =
          totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[config.id] || { count: 0, timeMs: 0 };

        return (
          <ModeCard
            key={config.id}
            title={config.title}
            desc={config.desc}
            icon={config.icon}
            todayCount={stat.count}
            todayTimeMs={stat.timeMs}
            currentLevel={currentLevel}
            accuracy={accuracy}
            onStartTraining={() => onStart(config.id, 'training')}
            onStartBenchmark={() => onStart(config.id, 'benchmark')}
          />
        );
      })}
    </DashboardShell>
  );
}
~~~~~
~~~~~typescript
interface GenericDashboardProps {
  meta: DomainMeta;
  onStart: (cardId: string, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function GenericDashboard({
  meta,
  onStart,
  onBackToHome,
  onOpenSettings,
  onOpenAnalytics,
}: GenericDashboardProps) {
  const todayStats = useTodayStats(meta.domain);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});

  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain(meta.domain).then((list) => {
      if (!isMounted) return;
      const map: Record<string, UnifiedProfileData> = {};
      for (const p of list) {
        map[p.mode] = p;
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
      onOpenSettings={onOpenSettings}
      onOpenAnalytics={meta.hasWeaknessAnalytics ? onOpenAnalytics : undefined}
    >
      {meta.cards.map((card) => {
        const profile = profiles[card.legacyMode];
        const totalCards = profile?.totalTrainedCards || 0;
        const accuracy =
          totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[card.legacyMode] || { count: 0, timeMs: 0 };

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
            onStartTraining={() => onStart(card.id, 'training')}
            onStartBenchmark={() => onStart(card.id, 'benchmark')}
          />
        );
      })}
    </DashboardShell>
  );
}
~~~~~

#### Acts 5: 数据库层适配与双向兼容 `src/utils/db/schema.ts` & `src/utils/db/queries.ts`

在存储模型中加入可选 `cardId` 字段，并在查询与保存时自动补齐卡片标识。

~~~~~act
patch_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
export interface UnifiedSessionData {
  id: string;
  domain?: TrainingDomain;
  mode: string;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface UnifiedTrialRecord {
  id: string;
  sessionId: string;
  domain?: TrainingDomain;
  mode: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}
~~~~~
~~~~~typescript
export interface UnifiedSessionData {
  id: string;
  cardId?: string;
  domain?: TrainingDomain;
  mode: string;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface UnifiedTrialRecord {
  id: string;
  sessionId: string;
  cardId?: string;
  domain?: TrainingDomain;
  mode: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}
~~~~~

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';

export async function saveTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const normalizedRecord: UnifiedTrialRecord = { ...record, domain };
  await db.put('records', normalizedRecord);
  await updateProfile(domain, record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  await db.put('sessions', { ...session, domain });
}
~~~~~
~~~~~typescript
import { resolveLegacyCardId } from '../../config/cards';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';

export async function saveTrialRecord(record: UnifiedTrialRecord): Promise<void> {
  const db = await getDB();
  const domain = record.domain || 'star';
  const cardId = record.cardId || resolveLegacyCardId(domain, record.mode);
  const normalizedRecord: UnifiedTrialRecord = { ...record, domain, cardId };
  await db.put('records', normalizedRecord);
  await updateProfile(domain, record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const domain = session.domain || 'star';
  const cardId = session.cardId || resolveLegacyCardId(domain, session.mode);
  await db.put('sessions', { ...session, domain, cardId });
}
~~~~~

#### Acts 6: 重构通用训练视图 `src/views/GenericTrainingView.tsx`

支持以 `card` 实体与直接派发的插件直接驱动训练会话。

~~~~~act
write_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
import { TrainingShell } from '../components/training/TrainingShell';
import type { TrainingPlugin } from '../config/trainingPlugins';
import { useTrainingSession } from '../hooks/useTrainingSession';
import type { CardDefinition } from '../types/card';
import { saveSession, saveTrialRecord } from '../utils/db';
import type { BaseModuleSettings } from '../utils/settings';

interface GenericTrainingViewProps<
  TQuestion,
  THitResult,
  TAnswerVal,
  TSettings extends BaseModuleSettings,
> {
  card: CardDefinition;
  plugin: TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  onExit: () => void;
}

export function GenericTrainingView<
  TQuestion,
  THitResult,
  TAnswerVal,
  TSettings extends BaseModuleSettings,
>({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
  const domain = card.legacyDomain;
  const mode = card.legacyMode;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain,
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => plugin.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => plugin.evaluateAnswer(userVal, q, mode),
    isHit: plugin.isHit,
    getQuestionLevel: plugin.getQuestionLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        cardId: card.id,
        domain,
        mode,
        timestamp: Date.now(),
        difficultyLevel: plugin.getQuestionLevel(q),
        isHit: plugin.isHit(hitResult),
        responseTimeMs,
        details: plugin.extractRecordDetails(q, hitResult, userVal, mode),
      });
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  const isTargeting = plugin.isTargeting ? plugin.isTargeting(mode, settings) : false;

  return (
    <TrainingShell
      title={card.title}
      badge={card.tags.target[0]}
      sessionType={sessionType}
      currentLevel={session.question ? plugin.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
        plugin.renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings,
        })
      }
    </TrainingShell>
  );
}
~~~~~

#### Acts 7: 根应用调度与组装 `src/app.tsx`

统一以 `activeCardId` 进行全局状态机驱动，消除双重状态。

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
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { getCardById } from './config/cards';
import { DOMAINS_CONFIG } from './config/domains';
import { CARD_PLUGINS } from './config/trainingPlugins';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space';

const APP_TO_DOMAIN: Record<Exclude<GlobalApp, 'home'>, TrainingDomain> = {
  'star-hopping': 'star',
  'color-sense': 'color',
  'relative-color': 'relative_color',
  'negative-space': 'negative_space',
};

const ALL_DOMAINS: TrainingDomain[] = ['star', 'color', 'relative_color', 'negative_space'];

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');

  const [activeCardId, setActiveCardId] = useState<string>('star_single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsDomain, setSettingsDomain] = useState<TrainingDomain>('star');

  const [activeAnalyticsDomain, setActiveAnalyticsDomain] = useState<'star' | 'color' | null>(null);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    setDomainTimes(timesMap);
    setSettings(loadSettings());

    if (currentApp !== 'home') {
      const d = APP_TO_DOMAIN[currentApp];
      const pList = await getProfilesByDomain(d);
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.mode] = p;
      }
      setCurrentDomainProfiles(pMap);
    }
  }, [currentApp]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else {
      const d = APP_TO_DOMAIN[currentApp];
      const meta = DOMAINS_CONFIG[d];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    }
  }, [currentApp]);

  const handleStartSession = (cardId: string, type: 'training' | 'benchmark') => {
    setActiveCardId(cardId);
    setSessionType(type);
    setCurrentView('training');
  };

  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);

  const activeCard = getCardById(activeCardId);
  const activeLevel = activeCard
    ? currentDomainProfiles[activeCard.legacyMode]?.currentLevel || 5
    : 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          domainTimes={domainTimes}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {currentApp !== 'home' &&
        (() => {
          const domain = APP_TO_DOMAIN[currentApp];
          const meta = DOMAINS_CONFIG[domain];

          if (currentView === 'dashboard') {
            return (
              <GenericDashboard
                meta={meta}
                onStart={handleStartSession}
                onBackToHome={() => setCurrentApp('home')}
                onOpenSettings={() => {
                  setSettingsDomain(domain);
                  setIsSettingsOpen(true);
                }}
                onOpenAnalytics={() => {
                  if (domain === 'star' || domain === 'color') {
                    setActiveAnalyticsDomain(domain);
                  }
                }}
              />
            );
          }

          if (!activeCard) return null;
          const plugin = CARD_PLUGINS[activeCard.id];

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={sessionType}
              initialLevel={activeLevel}
              settings={settings[activeCard.settingsKey]}
              onExit={handleExitTraining}
            />
          );
        })()}

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {isSettingsOpen && (
        <SettingsModal
          domain={settingsDomain}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {activeAnalyticsDomain && (
        <WeaknessAnalyticsModal
          domain={activeAnalyticsDomain}
          onClose={() => setActiveAnalyticsDomain(null)}
        />
      )}
    </div>
  );
}
~~~~~

---

### 下一步建议
1. **多维统计报表增强**：在 `GlobalStatsModal.tsx` 中增加基于 `CognitiveSkillTag`（如“空间定位力”、“视错觉穿透力”、“负形比例力”）的雷达图聚合视图。
2. **跨大类混刷练习**：基于 `ALL_CARDS` 实现“每日全能盲盒训练”或“弱点专项跨域串烧”，打破固定 4 大类的浏览限制。
