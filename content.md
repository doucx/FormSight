好的，我们将正式启动 FormSight 架构由“水平技术分层”向“垂直切片 + 算法 Core + 零中心注册（Modular Monolith）”的系统性重构。

本阶段我们将完成：
1. 建立 `src/core/contracts.ts` 核心契约与标准协议。
2. 建立 `src/core/registry.ts` 基于 Vite `import.meta.glob` 的自动化零中心化扫描装配注册器。
3. 重构并迁移第一批核心垂直切片领域（`angle`、`star` 等），将其所有 UI、算法、分析图表与配置收敛至 `src/domains/<domain>/` 下，实现独立包级内聚与即插即用。

## [WIP] refactor: 重构核心架构为垂直切片模块化单体 (Modular Monolith)

### 用户需求
将 FormSight 的水平技术分层重构为“垂直切片 + 纯算法 Core + 零中心注册”的模块化架构，使每个领域（Domain）完全自治内聚，降低代码耦合度与 AI 维护的上下文负担。

### 评论
当前架构导致添加新卡片时需跨越 7+ 个不同目录进行中心化配置修改，不仅容易产生耦合与回归漏洞，也极大地加重了 LLM 维护时的上下文 Token 负担。通过引入模块契约（Manifest Contract）和自动化扫描装配，系统将获得极高的扩展性与可插拔能力。

### 目标
1. 创建 `src/core/contracts.ts`，定义 `DomainManifest` 与统一插件接口。
2. 创建 `src/core/registry.ts`，利用 Vite `import.meta.glob` 实现领域的自发现与自动化加载。
3. 创建各垂直领域包：`src/domains/angle/`、`src/domains/star/`、`src/domains/color/` 等，将 UI 视图、算法生成、判定与分析插件完全收敛入各自目录。
4. 保证现有全局计划编排、设置与数据流平滑迁移。

### 基本原理
1. **契约先行 (Contract-First)**：定义标准的 `DomainManifest` 数据结构，作为业务切片向主框架（Shell）注册的唯一入口。
2. **零中心注册 (Zero-Central Registration)**：利用 Vite 编译期静态分析 `import.meta.glob('../domains/*/index.ts', { eager: true })`，无需手动在中心配置文件中添加 `import` 即可自发现新模块。
3. **垂直内聚 (Vertical Slicing)**：每个 domain 内部完全自包含，外部消费方只与标准接口交互。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #concept/executor #concept/parser #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/modular-monolith #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 建立核心协议契约 `src/core/contracts.ts`

定义领域模块必须遵守的标准 Manifest 契约。

~~~~~act
write_file
src/core/contracts.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { CardAnalyticsPlugin } from '../config/analyticsPlugins';
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { BaseModuleSettings } from '../utils/settings';

/**
 * 领域包清单 (Domain Manifest)
 * 每一个垂直领域模块 (如 angle, star, color) 必须在 index.ts 中默认导出此对象
 */
export interface DomainManifest {
  domain: TrainingDomain;
  meta: DomainMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}
~~~~~

#### Acts 2: 建立自动化零中心注册器 `src/core/registry.ts`

利用 Vite `import.meta.glob` 实现领域插件的自动发现与动态注入。

~~~~~act
write_file
src/core/registry.ts
~~~~~
~~~~~typescript
import type { CardAnalyticsPlugin } from '../config/analyticsPlugins';
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { DomainManifest } from './contracts';

class SystemDomainRegistry {
  private domains = new Map<TrainingDomain, DomainManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();

  constructor() {
    this.autoDiscoverDomains();
  }

  /**
   * 自动扫描 src/domains/*\/index.ts 零中心注册所有领域模块
   */
  private autoDiscoverDomains(): void {
    const modules = import.meta.glob<{ default: DomainManifest }>(
      '../domains/*/index.ts',
      { eager: true }
    );

    for (const path in modules) {
      const manifest = modules[path]?.default;
      if (manifest && manifest.domain) {
        this.register(manifest);
      }
    }
  }

  public register(manifest: DomainManifest): void {
    this.domains.set(manifest.domain, manifest);

    for (const card of manifest.cards) {
      this.cardMap.set(card.id, card);
      this.cardPluginMap.set(card.id, manifest.trainingPlugin);
    }

    if (manifest.analyticsPlugins) {
      for (const [cardId, plugin] of Object.entries(manifest.analyticsPlugins)) {
        this.cardAnalyticsMap.set(cardId, plugin);
      }
    }
  }

  public getAllDomains(): TrainingDomain[] {
    return Array.from(this.domains.keys());
  }

  public getAllDomainMetas(): DomainMeta[] {
    return Array.from(this.domains.values()).map((d) => d.meta);
  }

  public getDomainManifest(domain: TrainingDomain): DomainManifest | undefined {
    return this.domains.get(domain);
  }

  public getDomainMeta(domain: TrainingDomain): DomainMeta | undefined {
    return this.domains.get(domain)?.meta;
  }

  public getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
    return this.domains.get(domain)?.cards || [];
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
    return this.domains.has(domain as TrainingDomain);
  }
}

export const registry = new SystemDomainRegistry();
~~~~~

#### Acts 3: 创建 `src/domains/angle/index.ts` 垂直切片包

将 `angle` 角度感知领域的定义与插件收敛为自包含模块。

~~~~~act
write_file
src/domains/angle/index.ts
~~~~~
~~~~~typescript
import { Columns, Compass, Split } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import { anglePlugin } from '../../config/plugins/anglePlugin';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';

export const angleCards: CardDefinition[] = [
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
];

export const angleDomain: DomainManifest = {
  domain: 'angle',
  meta: {
    domain: 'angle',
    appId: 'angle-perception',
    title: '角度感知',
    subTitle: 'Angle Perception',
    homeTitle: '角度感知 (Angle Perception)',
    homeDesc:
      '以极简白底黑线剥离干扰，通过夹角大小估算、微小角度二分对比与平行线对偶辨识，构建坚实的正负形起形与角度感知直觉。',
    themeColor: 'indigo',
    icon: Compass,
    hasWeaknessAnalytics: true,
    get cards() {
      return angleCards;
    },
  },
  cards: angleCards,
  trainingPlugin: anglePlugin as unknown as DomainManifest['trainingPlugin'],
};

export default angleDomain;
~~~~~

#### Acts 4: 创建 `src/domains/star/index.ts` 垂直切片包

将 `star` 寻星领域的定义、专属弱点分析与卡片插件收敛为一个独立模块。

~~~~~act
write_file
src/domains/star/index.ts
~~~~~
~~~~~typescript
import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import { CARD_ANALYTICS_PLUGINS } from '../../config/analyticsPlugins';
import { STAR_SCHEMAS } from '../../config/cards';
import { starPlugin } from '../../config/plugins/starPlugin';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';

export const starCards: CardDefinition[] = [
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
];

export const starDomain: DomainManifest = {
  domain: 'star',
  meta: {
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
      return starCards;
    },
  },
  cards: starCards,
  trainingPlugin: starPlugin as unknown as DomainManifest['trainingPlugin'],
  analyticsPlugins: {
    star_single: CARD_ANALYTICS_PLUGINS.star_single,
    star_double_h: CARD_ANALYTICS_PLUGINS.star_double_h,
    star_double_r: CARD_ANALYTICS_PLUGINS.star_double_r,
  },
};

export default starDomain;
~~~~~

#### Acts 5: 创建 `src/domains/color/index.ts` 垂直切片包

将 `color` 绝对色感领域的定义、色相敏感度分析图表与配置收敛为一个独立模块。

~~~~~act
write_file
src/domains/color/index.ts
~~~~~
~~~~~typescript
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import { colorHueAnalyticsPlugin } from '../../config/analyticsPlugins';
import { COLOR_ALL_SCHEMAS, HUE_SCHEMAS, SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import { colorPlugin } from '../../config/plugins/colorPlugin';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';

export const colorCards: CardDefinition[] = [
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
];

export const colorDomain: DomainManifest = {
  domain: 'color',
  meta: {
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
      return colorCards;
    },
  },
  cards: colorCards,
  trainingPlugin: colorPlugin as unknown as DomainManifest['trainingPlugin'],
  analyticsPlugins: {
    color_hue: colorHueAnalyticsPlugin,
  },
};

export default colorDomain;
~~~~~

#### Acts 6: 创建其余垂直领域切片包

创建 `relative_color`、`negative_space`、`abstraction` 与 `concretization` 的独立包定义。

~~~~~act
write_file
src/domains/relative_color/index.ts
~~~~~
~~~~~typescript
import { Columns, Palette, Shuffle, Sun } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import { relativeColorPlugin } from '../../config/plugins/relativeColorPlugin';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';

export const relativeColorCards: CardDefinition[] = [
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
];

export const relativeColorDomain: DomainManifest = {
  domain: 'relative_color',
  meta: {
    domain: 'relative_color',
    appId: 'relative-color',
    title: '相对色感',
    subTitle: 'Relative Color',
    homeTitle: '相对色感 (Relative Color Perception)',
    homeDesc:
      '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
    hasWeaknessAnalytics: true,
    get cards() {
      return relativeColorCards;
    },
  },
  cards: relativeColorCards,
  trainingPlugin: relativeColorPlugin as unknown as DomainManifest['trainingPlugin'],
};

export default relativeColorDomain;
~~~~~

~~~~~act
write_file
src/domains/negative_space/index.ts
~~~~~
~~~~~typescript
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import { negRatioAnalyticsPlugin } from '../../config/analyticsPlugins';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import { negativeSpacePlugin } from '../../config/plugins/negativeSpacePlugin';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';

export const negativeSpaceCards: CardDefinition[] = [
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

export const negativeSpaceDomain: DomainManifest = {
  domain: 'negative_space',
  meta: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: true,
    get cards() {
      return negativeSpaceCards;
    },
  },
  cards: negativeSpaceCards,
  trainingPlugin: negativeSpacePlugin as unknown as DomainManifest['trainingPlugin'],
  analyticsPlugins: {
    neg_ratio_estimation: negRatioAnalyticsPlugin,
  },
};

export default negativeSpaceDomain;
~~~~~

~~~~~act
write_file
src/domains/abstraction/index.ts
~~~~~
~~~~~typescript
import { Eye, Maximize2, Palette, RotateCw, Sun } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import { abstractionPlugin } from '../../config/plugins/abstractionPlugin';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';

export const abstractionCards: CardDefinition[] = [
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
];

export const abstractionDomain: DomainManifest = {
  domain: 'abstraction',
  meta: {
    domain: 'abstraction',
    appId: 'visual-abstraction',
    title: '概括感知',
    subTitle: 'Visual Abstraction',
    homeTitle: '概括感知 (Visual Abstraction)',
    homeDesc:
      '自底向上过滤繁琐细节，训练对动态势线、极简低模折线、素描黑白块面与加权主调的本质提炼能力。',
    themeColor: 'indigo',
    icon: Eye,
    hasWeaknessAnalytics: false,
    get cards() {
      return abstractionCards;
    },
  },
  cards: abstractionCards,
  trainingPlugin: abstractionPlugin as unknown as DomainManifest['trainingPlugin'],
};

export default abstractionDomain;
~~~~~

~~~~~act
write_file
src/domains/concretization/index.ts
~~~~~
~~~~~typescript
import { Columns, Droplet, Layers, Shuffle, Sparkles } from 'lucide-preact';
import { abstractionPlugin } from '../../config/plugins/abstractionPlugin';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';

export const concretizationCards: CardDefinition[] = [
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
];

export const concretizationDomain: DomainManifest = {
  domain: 'concretization',
  appId: 'visual-refinement',
  title: '细化感知',
  subTitle: 'Visual Refinement',
  homeTitle: '细化感知 (Visual Refinement)',
  homeDesc:
    '自顶向下透视具象细节，训练基于势线骨架、几何大形、Notan 构图与调性基底在丰富画面中寻源辨识的能力。',
  themeColor: 'purple',
  icon: Layers,
  hasWeaknessAnalytics: false,
  get cards() {
    return concretizationCards;
  },
  cards: concretizationCards,
  trainingPlugin: abstractionPlugin as unknown as DomainManifest['trainingPlugin'],
};

export default concretizationDomain;
~~~~~

#### Acts 7: 调整 `src/config/registry.ts` 代理至 `src/core/registry.ts`

平滑保持现有引用兼容，统一使用全新的自发现注册器。

~~~~~act
write_file
src/config/registry.ts
~~~~~
~~~~~typescript
export { registry } from '../core/registry';
export type { DomainPlugin } from '../core/contracts';
~~~~~

### 下一步建议
1. **统一公共工具库**：将 `src/utils/` 下的算法及通用 UI 逐步整理收拢至 `src/core/`（例如 `src/core/math/`、`src/core/color/` 等）。
2. **迁移领域专属 UI**：将各个具体 View（如 `AngleEstimationView.tsx` 等）从全局 `components/` 移动至对应 `domains/<domain>/` 文件夹中。
3. **验证构建与测试**：执行类型检查与单元测试，确认各模块自发现与即插即用工作正常。
