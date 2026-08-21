import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import { STAR_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { createStarAnalyticsPlugin } from './analytics';
import { starPlugin } from './plugin';

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
    star_single: createStarAnalyticsPlugin('star_single', '单锚点'),
    star_double_h: createStarAnalyticsPlugin('star_double_h', '水平双锚点'),
    star_double_r: createStarAnalyticsPlugin('star_double_r', '旋转双锚点'),
  },
};

export default starDomain;
