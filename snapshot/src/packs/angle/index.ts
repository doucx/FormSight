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
    title: 'packs.angle.settings.showToleranceBandTitle',
    description: 'packs.angle.settings.showToleranceBandDesc',
  },
];

export const angleCards: CardDefinition[] = [
  {
    id: 'angle_estimation',
    packId: 'angle',
    mode: 'ANGLE_ESTIMATION',
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
