现在开始执行 **Phase 2: 7 大扩展包（Packs）逐个自治化改造 (Pack Autonomy)**。

我们将为 7 个知觉领域扩展包（`angle`, `star`, `color`, `relative_color`, `negative_space`, `perspective`, `abstraction`）分别建立私有 `locales/` 联邦双语词典，声明各自的默认配置 `defaultCardSettings`，并将外溢在宿主目录的专属 Canvas 绘图算子迁移内聚至 `abstraction` 包内部。

## [WIP] feat: 推进 7 大领域扩展包（Packs）自包含与联邦本地化改造

### 用户需求
执行 FormSight v0.5 架构重构实施路线图 Phase 2：
1. **7 大扩展包双语本地化**：为 `angle`, `star`, `color`, `relative_color`, `negative_space`, `perspective`, `abstraction` 逐一建立私有 `locales/zh-CN.json` 与 `locales/en-US.json` 词典文件。
2. **扩展包清单升级**：在各 Pack 的 `index.ts` 中挂载私有 `locales` 与声明式 `defaultCardSettings`。
3. **渲染算子内聚与消除外溢**：将流落在全局 `src/utils/canvas/` 目录下的 `drawParticles.ts`、`drawNotanField.ts`、`drawPaletteTiles.ts` 迁入 `src/packs/abstraction/canvas/`，并更新包内相关组件的引用路径。

### 评论
领域扩展包自治是 FormSight v0.5 微内核架构的核心原则。通过将词典、默认配置和私有知觉渲染函数内聚在扩展包物理目录内部，彻底消除了 Pack 对平台全局目录的反向侵蚀，确保未来新增或迁移扩展包时实现“零内核侵入”。

### 目标
1. 创建 7 个 Pack 的私有 `locales/zh-CN.json` 与 `locales/en-US.json`。
2. 创建 `src/packs/abstraction/canvas/` 目录并搬迁 3 个抽象渲染算子，更新包内组件引用。
3. 更新 7 个 Pack 的 `index.ts`，导出挂载了 `locales` 和 `defaultCardSettings` 的 `PackManifest`。

### 基本原理
当扩展包导出符合 `PackManifest` 的对象时，`SystemDomainRegistry` 会在模块发现阶段自动提取 `manifest.locales` 并通过 `i18n.registerPackLocales(packId, locales)` 挂载到 `packs.<packId>` 命名空间；同时通过 `manifest.defaultCardSettings` 向宿主声明每张卡片的初始偏好，使宿主无需包含任何特定 Pack 的硬编码分支。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/config #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/packs #task/object/autonomous-domain-packs #task/action/build #task/state/continue

---

### Script

#### Acts 1: 改造 `angle` 扩展包 (模范工程)

为 `angle` 扩展包建立私有联邦语言包，并更新 `index.ts`。

~~~~~act
write_file
src/packs/angle/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "角度感知",
    "subTitle": "Angle Perception",
    "desc": "以极简白底黑线剥离干扰，通过夹角大小估算、微小角度二分对比与平行线对偶辨识，构建坚实的正负形起形与角度感知直觉。"
  },
  "cards": {
    "angle_estimation": {
      "title": "夹角大小估算",
      "desc": "观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。",
      "instruction": "观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)",
      "badge": "夹角大小估算",
      "hint": "观察两射线夹角，调制滑块逼近精准度数 (0°~180°)",
      "label": "夹角估算值:"
    },
    "angle_comparison_2afc": {
      "title": "角度二分对比",
      "desc": "在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。",
      "instruction": "二选一快速判别哪一侧夹角更大 (键 1 / 2)",
      "badge": "角度二分对比",
      "hint": "二选一辨识哪一侧的两射线夹角更大 (键 1 / 2)"
    },
    "angle_parallel_2afc": {
      "title": "平行线基准辨识",
      "desc": "观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。",
      "instruction": "观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)",
      "badge": "平行线基准辨识",
      "hint": "观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)"
    }
  },
  "analytics": {
    "title": "角度偏差度分析",
    "subTitle": "洞察你在各个锐角、钝角区间的估算偏大或偏小倾向",
    "diagnosticsTitle": "角度偏置诊断"
  }
}
~~~~~

~~~~~act
write_file
src/packs/angle/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Angle Perception",
    "subTitle": "Angle Perception",
    "desc": "Eliminate distractions with minimalist line drawings. Develop sharp intuitions for angles and parallel lines via estimation, 2AFC comparison, and parallel detection."
  },
  "cards": {
    "angle_estimation": {
      "title": "Angle Estimation",
      "desc": "Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).",
      "instruction": "Observe the two rays and adjust the slider to match the true angle (0°~180°).",
      "badge": "Angle Estimation",
      "hint": "Observe the angle and modulate the slider to match (0°~180°)",
      "label": "Estimated Angle:"
    },
    "angle_comparison_2afc": {
      "title": "Angle 2AFC Comparison",
      "desc": "Quickly identify which side has a larger angle under non-orthogonal orientations (2AFC).",
      "instruction": "Identify which angle is larger (Keys 1 / 2).",
      "badge": "Angle Comparison",
      "hint": "Identify which side has a larger angle (Keys 1 / 2)"
    },
    "angle_parallel_2afc": {
      "title": "Parallel Alignment",
      "desc": "Observe the prompt orientation and identify the strictly parallel line below (2AFC).",
      "instruction": "Find the line that is strictly parallel to the prompt line (Keys 1 / 2).",
      "badge": "Parallel Alignment",
      "hint": "Observe the prompt line and select the parallel one below (Keys 1 / 2)"
    }
  },
  "analytics": {
    "title": "Angle Bias Analysis",
    "subTitle": "Discover your tendencies to overestimate or underestimate acute and obtuse angles",
    "diagnosticsTitle": "Angle Bias Diagnostics"
  }
}
~~~~~

~~~~~act
write_file
src/packs/angle/index.ts
~~~~~
~~~~~typescript
import { Columns, Compass, Split } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { anglePlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const angleCards: CardDefinition[] = [
  {
    id: 'angle_estimation',
    packId: 'angle',
    mode: 'ANGLE_ESTIMATION',
    title: '夹角大小估算',
    desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。',
    instruction: '观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)',
    icon: Compass,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'angle_comparison_2afc',
    packId: 'angle',
    mode: 'ANGLE_COMPARISON_2AFC',
    title: '角度二分对比',
    desc: '在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。',
    instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'angle_parallel_2afc',
    packId: 'angle',
    mode: 'PARALLEL_ALIGNMENT_2AFC',
    title: '平行线基准辨识',
    desc: '观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。',
    instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
    icon: Split,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const anglePack: PackManifest = {
  packId: 'angle',
  meta: {
    id: 'angle',
    title: '角度感知',
    subTitle: 'Angle Perception',
    desc: '以极简白底黑线剥离干扰，通过夹角大小估算、微小角度二分对比与平行线对偶辨识，构建坚实的正负形起形与角度感知直觉。',
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: angleCards,
  trainingPlugin: anglePlugin,
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    angle_estimation: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
  },
};

export default anglePack;
~~~~~

#### Acts 2: 改造 `star` 扩展包

为 `star` 扩展包创建双语语言包并挂载至清单。

~~~~~act
write_file
src/packs/star/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "寻星练习",
    "subTitle": "Star-Hopping",
    "desc": "基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。"
  },
  "cards": {
    "star_single": {
      "title": "单锚点模式",
      "desc": "单一中心锚点，评估基本极坐标方位与距离感知力",
      "instruction": "观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位",
      "badge": "单锚点"
    },
    "star_double_h": {
      "title": "水平双锚点",
      "desc": "水平线段两端锚点，评估两点比例与正交投影判定力",
      "instruction": "观察左侧水平双锚点几何关系，在右侧点阵中盲打定位",
      "badge": "水平双锚点"
    },
    "star_double_r": {
      "title": "旋转双锚点",
      "desc": "带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力",
      "instruction": "观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位",
      "badge": "旋转双锚点"
    }
  },
  "analytics": {
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "空间偏置分析",
      "subTitle": "中心绿点为绝对真理点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为绝对真理点。散点越收敛代表空间直觉越敏锐。",
      "avgDx": "平均 X 轴偏移:",
      "avgDy": "平均 Y 轴偏移:",
      "avgDist": "平均像素误差:"
    },
    "directionalCompass": {
      "tabLabel": "八向方位罗盘",
      "title": "八向方位敏感度",
      "subTitle": "洞察你在 8 个极坐标视角扇区上的定位准确率分布",
      "cardTitle": "方位盲区诊断",
      "weakestHint": "你在 {{sector}} 方位上命中率最低：",
      "needMoreTrials": "各方位完成至少 3 题后可生成薄弱扇区诊断。"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/star/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Star-Hopping",
    "subTitle": "Star-Hopping",
    "desc": "Train visual spatial intuition for coordinates, distances, proportions, and rotations using polar and bipolar perspective grids."
  },
  "cards": {
    "star_single": {
      "title": "Single Anchor",
      "desc": "Single central anchor to evaluate polar angle and distance estimation.",
      "instruction": "Observe the target relative to the central anchor on the left, then locate it in the grid on the right.",
      "badge": "Single Anchor"
    },
    "star_double_h": {
      "title": "Horizontal Double Anchors",
      "desc": "Horizontal dual anchors to train proportion and orthogonal projection intuition.",
      "instruction": "Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.",
      "badge": "Horizontal Dual"
    },
    "star_double_r": {
      "title": "Rotated Double Anchors",
      "desc": "Tilted dual anchors to master complex rotated coordinate mapping.",
      "instruction": "Observe the rotated dual anchors on the left, then locate the target on the right.",
      "badge": "Rotated Dual"
    }
  },
  "analytics": {
    "spatialBias": {
      "tabLabel": "Spatial Bias",
      "title": "Spatial Bias Analysis",
      "subTitle": "Center point represents ground truth. Point spread reveals systematic hand-eye offset.",
      "cardTitle": "Systematic Bias",
      "desc": "Center is the ground truth. Tighter cluster indicates sharper spatial intuition.",
      "avgDx": "Avg X Offset:",
      "avgDy": "Avg Y Offset:",
      "avgDist": "Avg Pixel Error:"
    },
    "directionalCompass": {
      "tabLabel": "8-Way Compass",
      "title": "8-Directional Sensitivity",
      "subTitle": "Insights into your localization accuracy across 8 polar sectors",
      "cardTitle": "Directional Blindspot",
      "weakestHint": "Lowest accuracy found in sector {{sector}}:",
      "needMoreTrials": "Complete at least 3 trials in each sector to generate blindspot diagnostics."
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/star/index.ts
~~~~~
~~~~~typescript
import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { createStarAnalyticsPlugin } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { starPlugin } from './plugin';

export const STAR_SECTORS = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

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

export const starCards: CardDefinition[] = [
  {
    id: 'star_single',
    packId: 'star',
    mode: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
    icon: Target,
    tags: {
      domain: ['spatial_structure'],
      path: ['absolute_estimation'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_h',
    packId: 'star',
    mode: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    instruction: '观察左侧水平双锚点几何关系，在右侧点阵中盲打定位',
    icon: Crosshair,
    tags: {
      domain: ['spatial_structure', 'form_and_proportion'],
      path: ['absolute_estimation', 'relational_mapping'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_r',
    packId: 'star',
    mode: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    instruction: '观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位',
    icon: RotateCw,
    tags: {
      domain: ['spatial_structure', 'form_and_proportion'],
      path: ['absolute_estimation', 'relational_mapping'],
      challenge: ['dimensional_translation'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
];

export const starPack: PackManifest = {
  packId: 'star',
  meta: {
    id: 'star',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    desc: '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: starCards,
  trainingPlugin: starPlugin,
  analyticsPlugins: {
    star_single: createStarAnalyticsPlugin('star_single', '单锚点'),
    star_double_h: createStarAnalyticsPlugin('star_double_h', '水平双锚点'),
    star_double_r: createStarAnalyticsPlugin('star_double_r', '旋转双锚点'),
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    star_single: {
      gridSize: 3,
      targetingMode: 'off',
      manualTargetSectors: [],
    },
    star_double_h: {
      gridSize: 3,
      targetingMode: 'off',
      manualTargetSectors: [],
    },
    star_double_r: {
      gridSize: 3,
      targetingMode: 'off',
      manualTargetSectors: [],
    },
  },
};

export default starPack;
~~~~~

#### Acts 3: 改造 `color` 与 `relative_color` 扩展包

为绝对色感包与相对色感包添加本地化支持与默认配置。

~~~~~act
write_file
src/packs/color/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "绝对色感",
    "subTitle": "Color Recognition",
    "desc": "拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。"
  },
  "cards": {
    "color_hue": {
      "title": "色相 (Hue)",
      "desc": "识别颜色在色相环上的具体角度 (0°~360°)",
      "instruction": "定位上方色块在 360° 色相环上的精准角度",
      "badge": "色相"
    },
    "color_val": {
      "title": "明度 (Value)",
      "desc": "已知色相，评估颜色的素描明暗程度 (0%~100%)",
      "instruction": "评估上方色块的素描明度深浅比例 (0%~100%)",
      "badge": "明度"
    },
    "color_sat": {
      "title": "饱和度 (Sat)",
      "desc": "已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)",
      "instruction": "评估上方色块的鲜艳纯度比例 (0%~100%)",
      "badge": "饱和度"
    },
    "color_all": {
      "title": "综合拾色 (Match)",
      "desc": "同时调整色相、饱和度与明度，逼近真理色彩",
      "instruction": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
      "badge": "综合拾色"
    }
  },
  "analytics": {
    "hueBias": {
      "tabLabel": "色相偏差度",
      "title": "色相偏差度分析",
      "subTitle": "横轴色相与纵轴偏差分布，揭示系统性偏色倾向"
    },
    "hueRing": {
      "tabLabel": "12 色相敏感度",
      "title": "12 色相敏感度分析",
      "subTitle": "洞察你对 OKLab 色彩空间 12 色相扇区的敏感度与正确率分布"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/color/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Absolute Color Recognition",
    "subTitle": "Color Recognition",
    "desc": "Deconstruct the HSV/OKLab color space. Build perceptual acuity through progressive identification of Hue, Value, and Saturation."
  },
  "cards": {
    "color_hue": {
      "title": "Hue",
      "desc": "Identify the exact angle of a color on the 360° color wheel.",
      "instruction": "Locate the exact degree of the color on the 360° color wheel.",
      "badge": "Hue"
    },
    "color_val": {
      "title": "Value",
      "desc": "Given hue, estimate the lightness/darkness value (0%~100%).",
      "instruction": "Estimate the value/brightness percentage of the color (0%~100%).",
      "badge": "Value"
    },
    "color_sat": {
      "title": "Saturation",
      "desc": "Given hue and value, estimate the purity and saturation (0%~100%).",
      "instruction": "Estimate the saturation purity percentage of the color (0%~100%).",
      "badge": "Saturation"
    },
    "color_all": {
      "title": "Full Color Match",
      "desc": "Simultaneously adjust Hue, Saturation, and Value to match the target color.",
      "instruction": "Modulate H, S, and V tracks to match the target color on the left.",
      "badge": "Match"
    }
  },
  "analytics": {
    "hueBias": {
      "tabLabel": "Hue Bias",
      "title": "Hue Bias Analysis",
      "subTitle": "Distribution of signed hue offsets across the spectrum"
    },
    "hueRing": {
      "tabLabel": "12-Hue Sensitivity",
      "title": "12-Hue Sensitivity",
      "subTitle": "Perceptual accuracy across 12 OKLab hue sectors"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/color/index.ts
~~~~~
~~~~~typescript
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { colorHueAnalyticsPlugin } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { colorPlugin } from './plugin';

export const COLOR_SECTORS = [
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

export const colorCards: CardDefinition[] = [
  {
    id: 'color_hue',
    packId: 'color',
    mode: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    instruction: '定位上方色块在 360° 色相环上的精准角度',
    icon: RotateCw,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: HUE_SCHEMAS,
  },
  {
    id: 'color_val',
    packId: 'color',
    mode: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    instruction: '评估上方色块的素描明度深浅比例 (0%~100%)',
    icon: Sun,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_sat',
    packId: 'color',
    mode: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    instruction: '评估上方色块的鲜艳纯度比例 (0%~100%)',
    icon: Droplet,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_all',
    packId: 'color',
    mode: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    instruction: '同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['absolute_estimation'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: COLOR_ALL_SCHEMAS,
  },
];

export const colorPack: PackManifest = {
  packId: 'color',
  meta: {
    id: 'color',
    title: '绝对色感',
    subTitle: 'Color Recognition',
    desc: '拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。',
    themeColor: 'amber',
    icon: Palette,
  },
  cards: colorCards,
  trainingPlugin: colorPlugin,
  analyticsPlugins: {
    color_hue: colorHueAnalyticsPlugin,
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    color_hue: {
      sliderHitMargin: 12,
      showToleranceBand: true,
      targetingMode: 'off',
      manualTargetSectors: [],
    },
    color_val: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    color_sat: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    color_all: {
      sliderHitMargin: 12,
      showToleranceBand: true,
      enableHoverColorPreview: true,
    },
  },
};

export default colorPack;
~~~~~

~~~~~act
write_file
src/packs/relative_color/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "相对色感",
    "subTitle": "Relative Color Perception",
    "desc": "基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。"
  },
  "cards": {
    "rel_vector_shift": {
      "title": "色彩矢量迁移",
      "desc": "保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。",
      "instruction": "观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色",
      "badge": "矢量迁移"
    },
    "rel_lightness_induction": {
      "title": "明度反差补偿",
      "desc": "在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。",
      "instruction": "调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」",
      "badge": "明度反差补偿"
    },
    "rel_hue_induction": {
      "title": "补色残像调和",
      "desc": "在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力。",
      "instruction": "观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)",
      "badge": "补色残像调和"
    },
    "rel_decontextual_2afc": {
      "title": "环境穿透判别",
      "desc": "穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。",
      "instruction": "穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」",
      "badge": "环境穿透判别"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/relative_color/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Relative Color Perception",
    "subTitle": "Relative Color Perception",
    "desc": "Master color vector constancy and Albers simultaneous contrast in OKLab perceptual color space."
  },
  "cards": {
    "rel_vector_shift": {
      "title": "Color Vector Shift",
      "desc": "Observe color vector shift A->B and select matching parallel shift C->D.",
      "instruction": "Observe vector A->B and find matching vector C->D below.",
      "badge": "Vector Shift"
    },
    "rel_lightness_induction": {
      "title": "Lightness Induction",
      "desc": "Compensate for background illusion to achieve perceived lightness constancy.",
      "instruction": "Adjust right center value so both center squares appear perceptually identical.",
      "badge": "Lightness Induction"
    },
    "rel_hue_induction": {
      "title": "Hue Induction & Harmony",
      "desc": "Select the compensated target color to counteract chromatic induction (4AFC).",
      "instruction": "Select the hue that compensates for the colored background (Keys 1-4).",
      "badge": "Hue Induction"
    },
    "rel_decontextual_2afc": {
      "title": "Decontextualized 2AFC",
      "desc": "Pierce through simultaneous contrast illusions to identify the objectively brighter color.",
      "instruction": "Identify which center square is physically brighter (Keys 1 / 2).",
      "badge": "Decontextualized"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/relative_color/index.ts
~~~~~
~~~~~typescript
import { Columns, Palette, Shuffle, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { relativeColorPlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const relativeColorCards: CardDefinition[] = [
  {
    id: 'rel_vector_shift',
    packId: 'relative_color',
    mode: 'VECTOR_SHIFT',
    title: '色彩矢量迁移',
    desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
    instruction: '观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色',
    icon: Shuffle,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_lightness_induction',
    packId: 'relative_color',
    mode: 'LIGHTNESS_INDUCTION',
    title: '明度反差补偿',
    desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
    instruction: '调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」',
    icon: Sun,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_hue_induction',
    packId: 'relative_color',
    mode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力。',
    instruction: '观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'rel_decontextual_2afc',
    packId: 'relative_color',
    mode: 'DECONTEXTUAL_2AFC',
    title: '环境穿透判别',
    desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
    instruction: '穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」',
    icon: Columns,
    tags: {
      domain: ['color_and_value'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const relativeColorPack: PackManifest = {
  packId: 'relative_color',
  meta: {
    id: 'relative_color',
    title: '相对色感',
    subTitle: 'Relative Color Perception',
    desc: '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
  },
  cards: relativeColorCards,
  trainingPlugin: relativeColorPlugin,
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    rel_vector_shift: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    rel_lightness_induction: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    rel_hue_induction: {
      sliderHitMargin: 12,
    },
    rel_decontextual_2afc: {},
  },
};

export default relativeColorPack;
~~~~~

#### Acts 4: 改造 `negative_space` 与 `perspective` 扩展包

为正负形空间感知包与透视感知包创建私有语言包与清单声明。

~~~~~act
write_file
src/packs/negative_space/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "正负形空间感知",
    "subTitle": "Negative Space",
    "desc": "切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。"
  },
  "cards": {
    "neg_ratio_estimation": {
      "title": "负形占比滑块评估",
      "desc": "估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。",
      "instruction": "估计黑色主体周围的白色留白（负形）占画面总面积的百分比",
      "badge": "负形占比估算"
    },
    "neg_area_comparison_2afc": {
      "title": "负形面积二分判别",
      "desc": "快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。",
      "instruction": "二选一判别哪一侧画面的白色留白（负形）面积更大",
      "badge": "负形面积二分判别"
    },
    "neg_vertex_fitting": {
      "title": "负形边界反切定点",
      "desc": "观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。",
      "instruction": "观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点",
      "badge": "负形边界反切定点"
    },
    "neg_shape_match_2afc": {
      "title": "负形轮廓记忆匹配",
      "desc": "瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。",
      "instruction": "瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状",
      "badge": "负形轮廓记忆匹配"
    }
  },
  "analytics": {
    "ratioScatter": {
      "tabLabel": "留白占比评估",
      "title": "负形留白占比评估分析",
      "subTitle": "洞察你对留白空间面积占比估算的直觉灵敏度",
      "cardTitle": "空间留白敏感度诊断",
      "avgError": "负形占比平均绝对误差:"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/negative_space/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Negative Space Perception",
    "subTitle": "Negative Space",
    "desc": "Overcome object-recognition bias by estimating white space ratios and fitting obscured vertices."
  },
  "cards": {
    "neg_ratio_estimation": {
      "title": "Negative Space Ratio",
      "desc": "Estimate the area percentage of negative space outside the irregular polygon.",
      "instruction": "Estimate the percentage of white negative space relative to the whole canvas.",
      "badge": "Ratio Estimation"
    },
    "neg_area_comparison_2afc": {
      "title": "Negative Area 2AFC",
      "desc": "Compare two silhouettes and identify which one has greater negative space area.",
      "instruction": "Identify which side contains more negative white space (Keys 1 / 2).",
      "badge": "Area 2AFC"
    },
    "neg_vertex_fitting": {
      "title": "Negative Vertex Fitting",
      "desc": "Observe the negative space contours and locate the truncated vertex on the grid.",
      "instruction": "Click to locate the truncated vertex based on negative space contours.",
      "badge": "Vertex Fitting"
    },
    "neg_shape_match_2afc": {
      "title": "Negative Shape Match",
      "desc": "Memorize negative space contours and match the identical silhouette (2AFC).",
      "instruction": "Memorize the shape and select the identical one (Keys 1 / 2).",
      "badge": "Shape Match"
    }
  },
  "analytics": {
    "ratioScatter": {
      "tabLabel": "Ratio Estimation",
      "title": "Negative Space Ratio Analysis",
      "subTitle": "Insights into your perceptual sensitivity for negative space area",
      "cardTitle": "Space Sensitivity Diagnostics",
      "avgError": "Average Ratio Error:"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/negative_space/index.ts
~~~~~
~~~~~typescript
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { negRatioAnalyticsPlugin } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { negativeSpacePlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const negativeSpaceCards: CardDefinition[] = [
  {
    id: 'neg_ratio_estimation',
    packId: 'negative_space',
    mode: 'RATIO_ESTIMATION',
    title: '负形占比滑块评估',
    desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
    instruction: '估计黑色主体周围的白色留白（负形）占画面总面积的百分比',
    icon: Maximize2,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      challenge: ['figure_ground_reversal'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'neg_area_comparison_2afc',
    packId: 'negative_space',
    mode: 'AREA_COMPARISON_2AFC',
    title: '负形面积二分判别',
    desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
    instruction: '二选一判别哪一侧画面的白色留白（负形）面积更大',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      challenge: ['figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_vertex_fitting',
    packId: 'negative_space',
    mode: 'NEGATIVE_VERTEX_FITTING',
    title: '负形边界反切定点',
    desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
    instruction: '观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点',
    icon: Crosshair,
    tags: {
      domain: ['form_and_proportion', 'spatial_structure'],
      path: ['absolute_estimation'],
      challenge: ['figure_ground_reversal'],
      interaction: ['spatial_locate'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_shape_match_2afc',
    packId: 'negative_space',
    mode: 'SHAPE_MATCH_2AFC',
    title: '负形轮廓记忆匹配',
    desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
    instruction: '瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状',
    icon: Sparkles,
    tags: {
      domain: ['form_and_proportion'],
      path: ['relational_mapping'],
      challenge: ['working_memory', 'figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const negativeSpacePack: PackManifest = {
  packId: 'negative_space',
  meta: {
    id: 'negative_space',
    title: '正负形空间感知',
    subTitle: 'Negative Space',
    desc: '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
  },
  cards: negativeSpaceCards,
  trainingPlugin: negativeSpacePlugin,
  analyticsPlugins: {
    neg_ratio_estimation: negRatioAnalyticsPlugin,
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    neg_ratio_estimation: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    neg_area_comparison_2afc: {},
    neg_vertex_fitting: {},
    neg_shape_match_2afc: {},
  },
};

export default negativeSpacePack;
~~~~~

~~~~~act
write_file
src/packs/perspective/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "透视空间感知",
    "subTitle": "Perspective & Spatial Perception",
    "desc": "涵盖灭点统一感、比例黄金分割盲切、格式塔穿透遮挡完形延续与 3D 轴测结构空间翻转，全方位锤炼硬核空间素描起形直觉。"
  },
  "cards": {
    "perspective_vp_convergence": {
      "title": "透视灭点汇聚感",
      "desc": "观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。",
      "instruction": "观察已有透视线，调制滑块旋转第三条线使其交汇于同一灭点",
      "badge": "灭点汇聚"
    },
    "perspective_proportion_division": {
      "title": "平面比例与黄金分割盲切",
      "desc": "观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。",
      "instruction": "观察线段并在指定比例位置单次点击",
      "badge": "比例盲切"
    },
    "perspective_proportion_migration": {
      "title": "空间比例角度迁移",
      "desc": "观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。",
      "instruction": "观察上方基准线目标点，在下方倾斜线段上点选相同比例位置",
      "badge": "比例迁移"
    },
    "perspective_gestalt_continuation_2afc": {
      "title": "断线完形连续性辨识",
      "desc": "基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。",
      "instruction": "二选一选出保持绝对连续贯穿的延伸线 (键 1 / 2)",
      "badge": "完形断线"
    },
    "perspective_structure_3d": {
      "title": "3D 结构空间翻转",
      "desc": "观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。",
      "instruction": "结合三视图坐标，在 3D 立方体点阵中点选对应点",
      "badge": "3D 结构翻转"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/perspective/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Perspective & Spatial Perception",
    "subTitle": "Perspective & Spatial Perception",
    "desc": "Sharpen structural drawing intuition through Vanishing Point convergence, proportional division, Gestalt continuation, and 3D axonometric translation."
  },
  "cards": {
    "perspective_vp_convergence": {
      "title": "VP Convergence",
      "desc": "Modulate the ray angle to make it converge at the exact same vanishing point.",
      "instruction": "Adjust the ray angle using the slider so all lines meet at the vanishing point.",
      "badge": "VP Convergence"
    },
    "perspective_proportion_division": {
      "title": "Proportion Division",
      "desc": "Blindly cut lines at 1/2, 1/3, 1/4, or golden ratio (0.618).",
      "instruction": "Click at the designated target proportion along the tilted line.",
      "badge": "Proportion Division"
    },
    "perspective_proportion_migration": {
      "title": "Proportion Migration",
      "desc": "Migrate proportional divisions from horizontal references onto randomly tilted lines.",
      "instruction": "Observe the target point above and mark the identical proportion below.",
      "badge": "Proportion Migration"
    },
    "perspective_gestalt_continuation_2afc": {
      "title": "Gestalt Continuation 2AFC",
      "desc": "Identify the true collinear continuation penetrating an obstacle (2AFC).",
      "instruction": "Select the line that maintains true collinear continuation (Keys 1 / 2).",
      "badge": "Gestalt Continuation"
    },
    "perspective_structure_3d": {
      "title": "3D Structural Rotation",
      "desc": "Translate orthographic tri-views into 3D isometric cube grid coordinates.",
      "instruction": "Locate the 3D point in the axonometric cube grid based on the 3 views.",
      "badge": "3D Structural Rotation"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/perspective/index.ts
~~~~~
~~~~~typescript
import { ArrowRightLeft, Box, Eye, Layers, Sliders } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { perspectivePlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const perspectiveCards: CardDefinition[] = [
  {
    id: 'perspective_vp_convergence',
    packId: 'perspective',
    mode: 'VP_CONVERGENCE',
    title: '透视灭点汇聚感',
    desc: '观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。',
    instruction: '观察已有透视线，调制滑块旋转第三条线使其交汇于同一灭点',
    icon: Sliders,
    tags: {
      domain: ['spatial_structure'],
      path: ['relational_mapping'],
      interaction: ['continuous_mod'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'perspective_proportion_division',
    packId: 'perspective',
    mode: 'PROPORTION_DIVISION',
    title: '平面比例与黄金分割盲切',
    desc: '观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。',
    instruction: '观察线段并在指定比例位置单次点击',
    icon: Layers,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_proportion_migration',
    packId: 'perspective',
    mode: 'PROPORTION_MIGRATION',
    title: '空间比例角度迁移',
    desc: '观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。',
    instruction: '观察上方基准线目标点，在下方倾斜线段上点选相同比例位置',
    icon: ArrowRightLeft,
    tags: {
      domain: ['form_and_proportion', 'spatial_structure'],
      path: ['relational_mapping'],
      challenge: ['working_memory', 'dimensional_translation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_gestalt_continuation_2afc',
    packId: 'perspective',
    mode: 'GESTALT_CONTINUATION_2AFC',
    title: '断线完形连续性辨识',
    desc: '基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。',
    instruction: '二选一选出保持绝对连续贯穿的延伸线 (键 1 / 2)',
    icon: Eye,
    tags: {
      domain: ['spatial_structure'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['binary_choice'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_structure_3d',
    packId: 'perspective',
    mode: 'STRUCTURE_PROJECTION_3D',
    title: '3D 结构空间翻转',
    desc: '观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。',
    instruction: '结合三视图坐标，在 3D 立方体点阵中点选对应点',
    icon: Box,
    tags: {
      domain: ['spatial_structure'],
      path: ['absolute_estimation'],
      challenge: ['dimensional_translation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
];

export const perspectivePack: PackManifest = {
  packId: 'perspective',
  meta: {
    id: 'perspective',
    title: '透视空间感知',
    subTitle: 'Perspective & Spatial Perception',
    desc: '涵盖灭点统一感、比例黄金分割盲切、格式塔穿透遮挡完形延续与 3D 轴测结构空间翻转，全方位锤炼硬核空间素描起形直觉。',
    themeColor: 'purple',
    icon: Box,
  },
  cards: perspectiveCards,
  trainingPlugin: perspectivePlugin,
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    perspective_vp_convergence: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    perspective_proportion_division: {},
    perspective_proportion_migration: {},
    perspective_gestalt_continuation_2afc: {},
    perspective_structure_3d: {},
  },
};

export default perspectivePack;
~~~~~

#### Acts 5: 改造 `abstraction` 扩展包 (消除 Canvas 外溢并自治化)

搬迁专属绘图函数至 `src/packs/abstraction/canvas/`，更新组件引用，并创建私有词典。

~~~~~act
write_file
src/packs/abstraction/canvas/drawParticles.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';

export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = 400,
  axisAngle?: number,
  axisColor = '#22C55E',
  userAxisAngle?: number,
  isHit?: boolean,
) {
  if (!canvas || !particles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 绘制散点
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
  }

  // 若存在用户作答角度且已揭晓，先绘制用户选择的势线（命中绿，未命中红）
  if (userAxisAngle !== undefined && userAxisAngle !== axisAngle) {
    const radU = (userAxisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = isHit ? '#22C55E' : '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(radU), cy - L * Math.sin(radU));
    ctx.lineTo(cx + L * Math.cos(radU), cy + L * Math.sin(radU));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 绘制指示势线 (标准真理线)
  if (axisAngle !== undefined) {
    const rad = (axisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(rad), cy - L * Math.sin(rad));
    ctx.lineTo(cx + L * Math.cos(rad), cy + L * Math.sin(rad));
    ctx.stroke();
  }
}

export function drawSpinePromptCanvas(
  canvas: HTMLCanvasElement | null,
  spine?: Point[],
  size = 160,
) {
  if (!canvas || !spine || spine.length < 2) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const [p1, p2] = spine;
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();
}
~~~~~

~~~~~act
write_file
src/packs/abstraction/canvas/drawNotanField.ts
~~~~~
~~~~~typescript
export function drawRawGrayscaleNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  size = 260,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    const pIdx = i * 4;
    pixels[pIdx] = val;
    pixels[pIdx + 1] = val;
    pixels[pIdx + 2] = val;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}

export function drawNotanNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  thresholdPercent = 50,
  size = 400,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const thresholdByte = Math.round((thresholdPercent / 100) * 255);

  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const isDark = buffer[i] <= thresholdByte;
    const color = isDark ? 15 : 248;
    const pIdx = i * 4;
    pixels[pIdx] = color;
    pixels[pIdx + 1] = color === 15 ? 23 : 250;
    pixels[pIdx + 2] = color === 15 ? 42 : 252;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}
~~~~~

~~~~~act
write_file
src/packs/abstraction/canvas/drawPaletteTiles.ts
~~~~~
~~~~~typescript
import { hsvToHex } from '../../../core/color/colorUtils';

export interface PaletteTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hsv: [number, number, number];
  weight: number;
}

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = 400,
) {
  if (!canvas || !tiles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}
~~~~~

~~~~~act
patch_file
src/packs/abstraction/utils/types.ts
~~~~~
~~~~~old
import type { Point } from '../../../types';
import type { PaletteTile } from '../../../utils/canvas/drawPaletteTiles';

export type { PaletteTile };
~~~~~
~~~~~new
import type { Point } from '../../../types';
import type { PaletteTile } from '../canvas/drawPaletteTiles';

export type { PaletteTile };
~~~~~

~~~~~act
patch_file
src/packs/abstraction/components/GestureAxisView.tsx
~~~~~
~~~~~old
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { drawParticlesCanvas } from '../../../utils/canvas/drawParticles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~
~~~~~new
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { drawParticlesCanvas } from '../canvas/drawParticles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/abstraction/components/NotanThresholdView.tsx
~~~~~
~~~~~old
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import {
  drawNotanNoiseField,
  drawRawGrayscaleNoiseField,
} from '../../../utils/canvas/drawNotanField';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~
~~~~~new
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import {
  drawNotanNoiseField,
  drawRawGrayscaleNoiseField,
} from '../canvas/drawNotanField';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/abstraction/components/PaletteClusteringView.tsx
~~~~~
~~~~~old
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { drawPaletteTilesCanvas } from '../../../utils/canvas/drawPaletteTiles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~
~~~~~new
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { drawPaletteTilesCanvas } from '../canvas/drawPaletteTiles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/abstraction/components/TopDown2AfcView.tsx
~~~~~
~~~~~old
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { drawRawGrayscaleNoiseField } from '../../../utils/canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../../../utils/canvas/drawParticles';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~
~~~~~new
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { drawRawGrayscaleNoiseField } from '../canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../canvas/drawParticles';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/abstraction/components/TopDownPatternView.tsx
~~~~~
~~~~~old
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { drawPaletteTilesCanvas } from '../../../utils/canvas/drawPaletteTiles';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~
~~~~~new
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { drawPaletteTilesCanvas } from '../canvas/drawPaletteTiles';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
write_file
src/packs/abstraction/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "形式与抽象感知",
    "subTitle": "Visual Abstraction & Refinement",
    "desc": "贯通「自底向上提炼」与「自顶向下寻源」双向视知觉闭环，训练对动态势线、极简低模、黑白Notan与色彩基调的穿透与具象推演能力。"
  },
  "cards": {
    "abs_gesture_axis": {
      "title": "动态势线提取",
      "desc": "从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。",
      "instruction": "旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)",
      "badge": "动态势线提取"
    },
    "abs_polygon_decimation": {
      "title": "折线低模大形",
      "desc": "从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。",
      "instruction": "观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项",
      "badge": "折线低模大形"
    },
    "abs_notan_threshold": {
      "title": "黑白素描归组",
      "desc": "调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。",
      "instruction": "调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态",
      "badge": "黑白素描归组"
    },
    "abs_palette_clustering": {
      "title": "主调色群提炼",
      "desc": "穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。",
      "instruction": "在下方 4 个候选项中，选出代表画面全局主调的加权主色",
      "badge": "主调色群提炼"
    },
    "abs_td_gesture_2afc": {
      "title": "动态势线寻源",
      "desc": "给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。",
      "instruction": "观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势",
      "badge": "动态势线寻源"
    },
    "abs_td_hull_2afc": {
      "title": "几何大模寻形",
      "desc": "给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。",
      "instruction": "观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形",
      "badge": "几何大模寻形"
    },
    "abs_td_notan_2afc": {
      "title": "黑白素描骨架",
      "desc": "给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。",
      "instruction": "观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构",
      "badge": "黑白素描骨架"
    },
    "abs_td_palette_2afc": {
      "title": "调性基底归位",
      "desc": "给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。",
      "instruction": "观察上方基准主调色，选出以此为色彩基底的拼贴画面",
      "badge": "调性基底归位"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/abstraction/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Visual Abstraction & Refinement",
    "subTitle": "Visual Abstraction & Refinement",
    "desc": "Close the loop between Bottom-Up Extraction and Top-Down Concretization. Master gesture axes, convex hulls, Notan structures, and dominant color clustering."
  },
  "cards": {
    "abs_gesture_axis": {
      "title": "Gesture Axis Extraction",
      "desc": "Extract the primary PCA gesture axis angle from flowing particle fields.",
      "instruction": "Rotate the primary axis to align with the main particle flow (0°~180°).",
      "badge": "Gesture Axis"
    },
    "abs_polygon_decimation": {
      "title": "Polygon Hull Decimation",
      "desc": "Filter high-frequency noise from intricate silhouettes to identify the optimal low-poly hull.",
      "instruction": "Select the simplified polygon that best preserves key structural vertices.",
      "badge": "Polygon Hull"
    },
    "abs_notan_threshold": {
      "title": "Notan Value Thresholding",
      "desc": "Modulate the binarization cutoff threshold to extract solid Notan value groupings.",
      "instruction": "Adjust the threshold slider to find the most balanced Notan state.",
      "badge": "Notan Threshold"
    },
    "abs_palette_clustering": {
      "title": "Dominant Color Clustering",
      "desc": "Pierce mosaic noise to identify the area-weighted dominant centroid color (4AFC).",
      "instruction": "Select the dominant color that represents the overall scene palette.",
      "badge": "Color Clustering"
    },
    "abs_td_gesture_2afc": {
      "title": "Top-Down Gesture Match",
      "desc": "Given an abstract spine, identify which complex particle field follows that dynamic.",
      "instruction": "Identify which particle field conforms to the prompt spine (Keys 1 / 2).",
      "badge": "Top-Down Gesture"
    },
    "abs_td_hull_2afc": {
      "title": "Top-Down Hull Match",
      "desc": "Given a minimalist convex hull, match its detailed organic silhouette.",
      "instruction": "Identify which detailed silhouette conforms to the prompt hull (Keys 1 / 2).",
      "badge": "Top-Down Hull"
    },
    "abs_td_notan_2afc": {
      "title": "Top-Down Notan Match",
      "desc": "Given a binary Notan silhouette, match the grayscale scene with that value foundation.",
      "instruction": "Identify which grayscale scene shares this Notan foundation (Keys 1 / 2).",
      "badge": "Top-Down Notan"
    },
    "abs_td_palette_2afc": {
      "title": "Top-Down Palette Match",
      "desc": "Given a prompt dominant color, match the mosaic pattern sharing that tonality.",
      "instruction": "Select the mosaic pattern with the matching dominant color base (Keys 1-4).",
      "badge": "Top-Down Palette"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/abstraction/index.ts
~~~~~
~~~~~typescript
import {
  Columns,
  Droplet,
  Eye,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sparkles,
  Sun,
} from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { abstractionPlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const abstractionCards: CardDefinition[] = [
  // === 自底向上：提炼概括 (Bottom-Up Extraction) ===
  {
    id: 'abs_gesture_axis',
    packId: 'abstraction',
    mode: 'GESTURE_AXIS',
    title: '动态势线提取',
    desc: '从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。',
    instruction: '旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)',
    icon: RotateCw,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_polygon_decimation',
    packId: 'abstraction',
    mode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。',
    instruction: '观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项',
    icon: Maximize2,
    tags: {
      domain: ['form_and_proportion'],
      path: ['extraction'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_notan_threshold',
    packId: 'abstraction',
    mode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      challenge: ['figure_ground_reversal'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_palette_clustering',
    packId: 'abstraction',
    mode: 'PALETTE_CLUSTERING',
    title: '主调色群提炼',
    desc: '穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。',
    instruction: '在下方 4 个候选项中，选出代表画面全局主调的加权主色',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['extraction'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },

  // === 自顶向下：具象寻源 (Top-Down Concretization) ===
  {
    id: 'abs_td_gesture_2afc',
    packId: 'abstraction',
    mode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    instruction: '观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势',
    icon: Shuffle,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['concretization'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    packId: 'abstraction',
    mode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['concretization'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    packId: 'abstraction',
    mode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    instruction: '观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构',
    icon: Droplet,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['concretization'],
      challenge: ['figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    packId: 'abstraction',
    mode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
    instruction: '观察上方基准主调色，选出以此为色彩基底的拼贴画面',
    icon: Sparkles,
    tags: {
      domain: ['color_and_value'],
      path: ['concretization'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const abstractionPack: PackManifest = {
  packId: 'abstraction',
  meta: {
    id: 'abstraction',
    title: '形式与抽象感知',
    subTitle: 'Visual Abstraction & Refinement',
    desc: '贯通「自底向上提炼」与「自顶向下寻源」双向视知觉闭环，训练对动态势线、极简低模、黑白Notan与色彩基调的穿透与具象推演能力。',
    themeColor: 'indigo',
    icon: Eye,
  },
  cards: abstractionCards,
  trainingPlugin: abstractionPlugin,
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    abs_gesture_axis: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    abs_polygon_decimation: {},
    abs_notan_threshold: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    abs_palette_clustering: {},
    abs_td_gesture_2afc: {},
    abs_td_hull_2afc: {},
    abs_td_notan_2afc: {},
    abs_td_palette_2afc: {},
  },
};

export default abstractionPack;
~~~~~

### 下一步建议
Phase 2 已将 7 大扩展包全面完成了物理自治化改造、双语词典配置与专属渲染算子收敛。下一步建议推进 **Phase 3: 宿主层解耦与类型系统净化 (Host Decoupling & Types)**：
1. 清理 `src/types/index.ts`，彻底移除 `TrainingMode`、`QuestionData`、`HitResult` 等特定 Pack 类型。
2. 改造 `src/utils/settings.ts`，移除所有 `if (card.packId === ...)` 分支，改为纯粹从 `registry` 声明式聚合合并默认设置。
3. 删除全局 `src/utils/canvas/` 中已搬迁至 `abstraction` 的残留文件（`drawParticles.ts`, `drawNotanField.ts`, `drawPaletteTiles.ts`）。
