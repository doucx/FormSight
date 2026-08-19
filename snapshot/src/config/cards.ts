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