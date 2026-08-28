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
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: starCards,
  trainingPlugin: starPlugin,
  analyticsPlugins: {
    star_single: createStarAnalyticsPlugin('star_single'),
    star_double_h: createStarAnalyticsPlugin('star_double_h'),
    star_double_r: createStarAnalyticsPlugin('star_double_r'),
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
