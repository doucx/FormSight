import { Compass, Eye, Layers, Maximize2, Palette, Shuffle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';
import { getCardsByDomain } from './cards';

export interface DomainMeta {
  domain: TrainingDomain;
  appId:
    | 'star-hopping'
    | 'color-sense'
    | 'relative-color'
    | 'negative-space'
    | 'visual-abstraction'
    | 'visual-refinement';
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
  abstraction: {
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
      return getCardsByDomain('abstraction');
    },
  },
  concretization: {
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
      return getCardsByDomain('concretization');
    },
  },
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
    hasWeaknessAnalytics: true,
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
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('negative_space');
    },
  },
};
