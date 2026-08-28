import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { colorHueAnalyticsPlugin } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { colorPlugin } from './plugin';

export const COLOR_SECTOR_KEYS = [
  'packs.color.sectors.red',
  'packs.color.sectors.orange',
  'packs.color.sectors.yellow',
  'packs.color.sectors.yellowGreen',
  'packs.color.sectors.green',
  'packs.color.sectors.cyanGreen',
  'packs.color.sectors.cyan',
  'packs.color.sectors.blue',
  'packs.color.sectors.blueViolet',
  'packs.color.sectors.violet',
  'packs.color.sectors.magenta',
  'packs.color.sectors.rose',
];

export const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.color.settings.showToleranceBandTitle',
    description: 'packs.color.settings.showToleranceBandDesc',
  },
];

export const HUE_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: 'packs.color.settings.targetingTitle',
    subTitle: 'packs.color.settings.targetingSubTitle',
    sectors: COLOR_SECTOR_KEYS,
    gridCols: 'grid-cols-3',
  },
];

export const COLOR_ALL_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'toggle',
    key: 'enableHoverColorPreview',
    title: 'packs.color.settings.enableHoverColorPreviewTitle',
    description: 'packs.color.settings.enableHoverColorPreviewDesc',
  },
];

export const colorCards: CardDefinition[] = [
  {
    id: 'color_hue',
    packId: 'color',
    mode: 'H',
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
