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
        id: 'SHAPE_MATCH_4AFC',
        title: '负形轮廓记忆匹配',
        desc: '瞬时记忆负形空隙轮廓，在相似干扰项中快速识别出与之完全一致的形状。',
        icon: Sparkles,
      },
    ],
  },
};
