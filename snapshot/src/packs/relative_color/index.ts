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
    title: 'packs.relative_color.settings.showToleranceBandTitle',
    description: 'packs.relative_color.settings.showToleranceBandDesc',
  },
];

export const relativeColorCards: CardDefinition[] = [
  {
    id: 'rel_vector_shift',
    packId: 'relative_color',
    mode: 'VECTOR_SHIFT',
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
