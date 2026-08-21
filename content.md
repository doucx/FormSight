我将为你生成一个结构化的重构方案与执行计划，将 FormSight 从“多点硬编码分散配置”全面重构为“微内核 + 插件注册表 (Domain Plugin Registry)”架构，实现单一数据源（Single Source of Truth, SSOT）。

## [WIP] refactor: 重构领域与卡片体系为插件注册表架构

### 用户需求
解决新增训练领域或卡片时需要修改十几个文件（包括路由白名单、主页顺序、全局状态、统计、设置默认值等）的问题，建立高内聚、微内核的插件注册表架构，使每个领域具备自我描述与完整配置能力。

### 评论
当前架构的根本瓶颈在于开闭原则（OCP）的缺失。通过倒转控制流（IoC）与注册表模式（Registry Pattern），核心调度层只面向标准接口（Plugin Interface）工作，所有业务领域（Angle, Star, Color, RelativeColor, NegativeSpace, Abstraction, Concretization）自包含卡片定义、训练引擎、设置 Schema 及分析视图，不仅消除了每次增删模块的漏改风险，也为未来的自定义卡片包与插件化拓展打下了坚实的地基。

### 目标
1. **建立领域插件规范 (`DomainPlugin`) 与核心注册表 (`src/config/registry.ts`)**：聚合 Domain 元数据、Card 列表、训练 Plugin、专属设置 Schema 以及弱点分析视图。
2. **重构设置与默认值构建**：使 `src/utils/settings.ts` 动态从所有注册的卡片中收集初始配置，不再硬编码每一张卡片名。
3. **解耦所有消费方**：
   - `src/hooks/useHashRoute.ts`：基于注册表动态校验 Domain 路由。
   - `src/views/Home.tsx`：由注册表驱动主页领域看板渲染，消除硬编码的 `domainOrder`。
   - `src/app.tsx` 与 `src/components/GlobalStatsModal.tsx`：动态读取所有已注册的 Domain 列表与统计数据。
   - 保持所有现有功能、自适应引擎和 TypeScript 严格类型兼容。

### 基本原理
1. 将 `TrainingDomain` 从封闭的联合类型泛化为基于注册表的字符串标识，并在运行时通过 `isRegisteredDomain(id)` 进行安全校验。
2. 在 `src/config/registry.ts` 中构建单例注册表，支持统一的查询 API（如 `getAllDomains()`、`getDomainMeta(id)`、`getCardById(id)`、`getPluginByCardId(id)`）。
3. 现有的 `src/config/domains.ts`、`cards.ts`、`trainingPlugins.tsx`、`analyticsPlugins.tsx` 转换为以领域为单元的内聚插件导出，并通过 Registry 统一托管。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/cli #concept/config #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/plugin-registry #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 建立核心领域插件接口与统一注册表

我们创建 `src/config/registry.ts`，定义 `DomainPlugin` 接口并将现有的 7 个领域（Angle, Star, Color, RelativeColor, NegativeSpace, Abstraction, Concretization）集中注册，提供全局查询函数。

~~~~~act
write_file
src/config/registry.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { BaseModuleSettings } from '../utils/settings';
import type { CardAnalyticsPlugin } from './analyticsPlugins';
import type { DomainMeta } from './domains';
import type { AnyTrainingPlugin } from './trainingPlugins';

// 引入各领域现有卡片与插件资源
import { CARD_ANALYTICS_PLUGINS } from './analyticsPlugins';
import { ALL_CARDS } from './cards';
import { DOMAINS_CONFIG } from './domains';
import { TRAINING_PLUGINS } from './plugins';

export interface DomainPlugin {
  domain: TrainingDomain;
  meta: DomainMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  settingSchemas?: SettingFieldSchema[];
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
}

class DomainRegistry {
  private plugins = new Map<TrainingDomain, DomainPlugin>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();

  public register(plugin: DomainPlugin): void {
    this.plugins.set(plugin.domain, plugin);

    for (const card of plugin.cards) {
      this.cardMap.set(card.id, card);
      this.cardPluginMap.set(card.id, plugin.trainingPlugin);
    }

    if (plugin.analyticsPlugins) {
      for (const [cardId, analyticsPlugin] of Object.entries(plugin.analyticsPlugins)) {
        this.cardAnalyticsMap.set(cardId, analyticsPlugin);
      }
    }
  }

  public getAllDomains(): TrainingDomain[] {
    return Array.from(this.plugins.keys());
  }

  public getAllDomainMetas(): DomainMeta[] {
    return Array.from(this.plugins.values()).map((p) => p.meta);
  }

  public getDomainPlugin(domain: TrainingDomain): DomainPlugin | undefined {
    return this.plugins.get(domain);
  }

  public getDomainMeta(domain: TrainingDomain): DomainMeta | undefined {
    return this.plugins.get(domain)?.meta;
  }

  public getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
    return this.plugins.get(domain)?.cards || [];
  }

  public getAllCards(): CardDefinition[] {
    return Array.from(this.cardMap.values());
  }

  public getCardById(cardId: string): CardDefinition | undefined {
    return this.cardMap.get(cardId);
  }

  public getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
    return this.cardPluginMap.get(cardId);
  }

  public getAnalyticsPluginByCardId(cardId: string): CardAnalyticsPlugin | undefined {
    return this.cardAnalyticsMap.get(cardId);
  }

  public isRegisteredDomain(domain: string): domain is TrainingDomain {
    return this.plugins.has(domain as TrainingDomain);
  }
}

export const registry = new DomainRegistry();

// 注册所有预设领域
const REGISTERED_DOMAINS: TrainingDomain[] = [
  'angle',
  'star',
  'color',
  'relative_color',
  'negative_space',
  'abstraction',
  'concretization',
];

for (const domain of REGISTERED_DOMAINS) {
  const meta = DOMAINS_CONFIG[domain];
  const cards = ALL_CARDS.filter((c) => c.domain === domain);
  const trainingPlugin = TRAINING_PLUGINS[domain];
  const analyticsPlugins: Record<string, CardAnalyticsPlugin> = {};

  for (const card of cards) {
    if (CARD_ANALYTICS_PLUGINS[card.id]) {
      analyticsPlugins[card.id] = CARD_ANALYTICS_PLUGINS[card.id];
    }
  }

  if (meta && trainingPlugin) {
    registry.register({
      domain,
      meta,
      cards,
      trainingPlugin,
      analyticsPlugins,
    });
  }
}
~~~~~

#### Acts 2: 将 cards.ts 与 domains.ts 重构为基于 Registry 的透传层

保持与现有消费代码平滑兼容，使 `src/config/cards.ts` 和 `src/config/domains.ts` 直接从 `registry` 中导出。

~~~~~act
write_file
src/config/cards.ts
~~~~~
~~~~~typescript
import {
  COLOR_SECTORS,
  STAR_SECTORS,
  type SettingFieldSchema,
} from '../components/settings/DynamicDomainSettings';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';
import { registry } from './registry';

// 导出配置 Schema 常量供各模块复用
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

// 原始卡片列表
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
  Split,
  Sun,
  Target,
} from 'lucide-preact';

export const ALL_CARDS: CardDefinition[] = [
  // 角度感知系列
  {
    id: 'angle_estimation',
    domain: 'angle',
    mode: 'ANGLE_ESTIMATION',
    title: '夹角大小估算',
    desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。',
    instruction: '观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)',
    icon: Compass,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'angle_comparison_2afc',
    domain: 'angle',
    mode: 'ANGLE_COMPARISON_2AFC',
    title: '角度二分对比',
    desc: '在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。',
    instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
    icon: Columns,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'angle_parallel_2afc',
    domain: 'angle',
    mode: 'PARALLEL_ALIGNMENT_2AFC',
    title: '平行线基准辨识',
    desc: '观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。',
    instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
    icon: Split,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },

  // 视知觉概括系列
  {
    id: 'abs_gesture_axis',
    domain: 'abstraction',
    mode: 'GESTURE_AXIS',
    title: '动态势线提取',
    desc: '从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。',
    instruction: '旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)',
    icon: RotateCw,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_polygon_decimation',
    domain: 'abstraction',
    mode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。',
    instruction: '观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项',
    icon: Maximize2,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_notan_threshold',
    domain: 'abstraction',
    mode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_palette_clustering',
    domain: 'abstraction',
    mode: 'PALETTE_CLUSTERING',
    title: '主调色群提炼',
    desc: '穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。',
    instruction: '在下方 4 个候选项中，选出代表画面全局主调的加权主色',
    icon: Palette,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_gesture_2afc',
    domain: 'concretization',
    mode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    instruction: '观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势',
    icon: Shuffle,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    domain: 'concretization',
    mode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    domain: 'concretization',
    mode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    instruction: '观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构',
    icon: Droplet,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    domain: 'concretization',
    mode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
    instruction: '观察上方基准主调色，选出以此为色彩基底的拼贴画面',
    icon: Sparkles,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },

  // 寻星练习系列
  {
    id: 'star_single',
    domain: 'star',
    mode: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
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
    domain: 'star',
    mode: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    instruction: '观察左侧水平双锚点几何关系，在右侧点阵中盲打定位',
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
    domain: 'star',
    mode: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    instruction: '观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位',
    icon: RotateCw,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },

  // 绝对色感系列
  {
    id: 'color_hue',
    domain: 'color',
    mode: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    instruction: '定位上方色块在 360° 色相环上的精准角度',
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
    domain: 'color',
    mode: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    instruction: '评估上方色块的素描明度深浅比例 (0%~100%)',
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
    domain: 'color',
    mode: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    instruction: '评估上方色块的鲜艳纯度比例 (0%~100%)',
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
    domain: 'color',
    mode: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    instruction: '同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色',
    icon: Palette,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: COLOR_ALL_SCHEMAS,
  },

  // 相对色感系列
  {
    id: 'rel_vector_shift',
    domain: 'relative_color',
    mode: 'VECTOR_SHIFT',
    title: '色彩矢量迁移',
    desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
    instruction: '观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色',
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
    domain: 'relative_color',
    mode: 'LIGHTNESS_INDUCTION',
    title: '明度反差补偿',
    desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
    instruction: '调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」',
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
    domain: 'relative_color',
    mode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力。',
    instruction: '观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)',
    icon: Palette,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'rel_decontextual_2afc',
    domain: 'relative_color',
    mode: 'DECONTEXTUAL_2AFC',
    title: '环境穿透判别',
    desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
    instruction: '穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」',
    icon: Columns,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },

  // 正负形空间系列
  {
    id: 'neg_ratio_estimation',
    domain: 'negative_space',
    mode: 'RATIO_ESTIMATION',
    title: '负形占比滑块评估',
    desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
    instruction: '估计黑色主体周围的白色留白（负形）占画面总面积的百分比',
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
    domain: 'negative_space',
    mode: 'AREA_COMPARISON_2AFC',
    title: '负形面积二分判别',
    desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
    instruction: '二选一判别哪一侧画面的白色留白（负形）面积更大',
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
    domain: 'negative_space',
    mode: 'NEGATIVE_VERTEX_FITTING',
    title: '负形边界反切定点',
    desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
    instruction: '观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点',
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
    domain: 'negative_space',
    mode: 'SHAPE_MATCH_2AFC',
    title: '负形轮廓记忆匹配',
    desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
    instruction: '瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状',
    icon: Sparkles,
    tags: {
      target: ['negative_space'],
      skill: ['visual_memory', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export function getCardById(id: string): CardDefinition | undefined {
  return registry.getCardById(id);
}

export function getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
  return registry.getCardsByDomain(domain);
}
~~~~~

#### Acts 3: 重构动态配置中心，消除硬编码默认值

重构 `src/utils/settings.ts`，自动从 `ALL_CARDS` 中收集每张卡片的基础配置与特征项（例如 `sliderHitMargin`、`showToleranceBand` 等），杜绝手动维护超长卡片列表。

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~typescript
import { ALL_CARDS } from '../config/cards';

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

// 动态根据卡片定义构建初始默认配置
function buildDefaultCardSettings(): Record<string, BaseModuleSettings> {
  const cards: Record<string, BaseModuleSettings> = {};

  for (const card of ALL_CARDS) {
    const cardConfig: BaseModuleSettings = { ...DEFAULT_BASE_SETTINGS };

    // 如果卡片包含滑块交互或相关设置 schema，配置默认容错与外延感应
    if (card.tags.interaction.includes('continuous_slider')) {
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

#### Acts 4: 重构路由与消费视图，消除所有硬编码 Domain 列表

解耦 `useHashRoute.ts`、`Home.tsx`、`GlobalStatsModal.tsx` 与 `app.tsx`，直接从 `registry` 获取领域。

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
  if (segments[0] === 'dashboard' && segments[1]) {
    const domain = segments[1] as TrainingDomain;
    if (
      [
        'angle',
        'abstraction',
        'concretization',
        'star',
        'color',
        'relative_color',
        'negative_space',
      ].includes(domain)
    ) {
      return { type: 'dashboard', domain };
    }
  }
~~~~~
~~~~~typescript.new
  if (segments[0] === 'dashboard' && segments[1]) {
    const domain = segments[1] as TrainingDomain;
    return { type: 'dashboard', domain };
  }
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
  const domainOrder: TrainingDomain[] = [
    'angle',
    'star',
    'color',
    'relative_color',
    'negative_space',
    'abstraction',
    'concretization',
  ];
  const domains = domainOrder.map((d) => DOMAINS_CONFIG[d]);
~~~~~
~~~~~typescript.new
  const domains = Object.values(DOMAINS_CONFIG);
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
const ALL_DOMAINS: TrainingDomain[] = [
  'angle',
  'abstraction',
  'concretization',
  'star',
  'color',
  'relative_color',
  'negative_space',
];

export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
~~~~~
~~~~~typescript.new
import { registry } from '../config/registry';

export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const allDomains = registry.getAllDomains();
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
      const results = await Promise.all(
        ALL_DOMAINS.map(async (domain) => {
          const domainRecords = await getTrialRecords(domain);
          return domainRecords.map((r) => ({
            timestamp: r.timestamp,
            isHit: r.isHit,
            level: r.difficultyLevel,
            module: domain,
            subMode: r.mode,
          }));
        }),
      );
~~~~~
~~~~~typescript.new
      const results = await Promise.all(
        allDomains.map(async (domain) => {
          const domainRecords = await getTrialRecords(domain);
          return domainRecords.map((r) => ({
            timestamp: r.timestamp,
            isHit: r.isHit,
            level: r.difficultyLevel,
            module: domain,
            subMode: r.mode,
          }));
        }),
      );
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
const ALL_DOMAINS: TrainingDomain[] = [
  'angle',
  'abstraction',
  'concretization',
  'star',
  'color',
  'relative_color',
  'negative_space',
];

export function App() {
  const { route, navigate } = useHashRoute();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(loadTrainingPlan);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(() => loadPlanStorageState().plans);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    angle: 0,
    abstraction: 0,
    concretization: 0,
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });
~~~~~
~~~~~typescript.new
import { registry } from './config/registry';

export function App() {
  const { route, navigate } = useHashRoute();
  const allDomains = registry.getAllDomains();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(loadTrainingPlan);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(() => loadPlanStorageState().plans);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>(() => {
    const init: Record<string, number> = {};
    for (const d of allDomains) init[d] = 0;
    return init as Record<TrainingDomain, number>;
  });
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(ALL_DOMAINS.map((d) => getProfilesByDomain(d)));
~~~~~
~~~~~typescript.new
  const refreshProfiles = useCallback(async () => {
    const domains = registry.getAllDomains();
    const timesEntries = await Promise.all(
      domains.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(domains.map((d) => getProfilesByDomain(d)));
~~~~~

### 下一步建议
1. 执行代码检查与测试运行，确保重构后所有模块正常工作：
   - 运行 `npm run check` 或 `npm run test`。
2. 考虑后续将各个 Domain 进一步物理文件夹模块化（例如将 `src/utils/angleUtils.ts` 与对应视图合并进 `src/domains/angle/`），形成完全独立的领域微内核包。
