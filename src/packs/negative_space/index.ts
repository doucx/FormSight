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
    title: 'packs.negative_space.settings.showToleranceBandTitle',
    description: 'packs.negative_space.settings.showToleranceBandDesc',
  },
];

export const negativeSpaceCards: CardDefinition[] = [
  {
    id: 'neg_ratio_estimation',
    packId: 'negative_space',
    mode: 'RATIO_ESTIMATION',
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
