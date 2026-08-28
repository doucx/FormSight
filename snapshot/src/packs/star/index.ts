import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { createStarAnalyticsPlugin } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { starPlugin } from './plugin';

export const STAR_SECTORS = [
  'packs.star.sectors.e',
  'packs.star.sectors.ne',
  'packs.star.sectors.n',
  'packs.star.sectors.nw',
  'packs.star.sectors.w',
  'packs.star.sectors.sw',
  'packs.star.sectors.s',
  'packs.star.sectors.se',
];

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: 'packs.star.settings.gridSizeTitle',
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
    title: 'packs.star.settings.targetingTitle',
    subTitle: 'packs.star.settings.targetingSubTitle',
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
