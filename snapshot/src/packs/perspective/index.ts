import { ArrowRightLeft, Box, Eye, Layers, Sliders } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { perspectivePlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.perspective.settings.showToleranceBandTitle',
    description: 'packs.perspective.settings.showToleranceBandDesc',
  },
];

export const perspectiveCards: CardDefinition[] = [
  {
    id: 'perspective_vp_convergence',
    packId: 'perspective',
    mode: 'VP_CONVERGENCE',
    icon: Sliders,
    tags: {
      domain: ['spatial_structure'],
      path: ['relational_mapping'],
      interaction: ['continuous_mod'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'perspective_proportion_division',
    packId: 'perspective',
    mode: 'PROPORTION_DIVISION',
    icon: Layers,
    tags: {
      domain: ['form_and_proportion'],
      path: ['absolute_estimation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_proportion_migration',
    packId: 'perspective',
    mode: 'PROPORTION_MIGRATION',
    icon: ArrowRightLeft,
    tags: {
      domain: ['form_and_proportion', 'spatial_structure'],
      path: ['relational_mapping'],
      challenge: ['working_memory', 'dimensional_translation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_gestalt_continuation_2afc',
    packId: 'perspective',
    mode: 'GESTALT_CONTINUATION_2AFC',
    icon: Eye,
    tags: {
      domain: ['spatial_structure'],
      path: ['relational_mapping'],
      challenge: ['illusion_piercing'],
      interaction: ['binary_choice'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_structure_3d',
    packId: 'perspective',
    mode: 'STRUCTURE_PROJECTION_3D',
    icon: Box,
    tags: {
      domain: ['spatial_structure'],
      path: ['absolute_estimation'],
      challenge: ['dimensional_translation'],
      interaction: ['spatial_locate'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
];

export const perspectivePack: PackManifest = {
  packId: 'perspective',
  meta: {
    id: 'perspective',
    themeColor: 'purple',
    icon: Box,
  },
  cards: perspectiveCards,
  trainingPlugin: perspectivePlugin,
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    perspective_vp_convergence: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    perspective_proportion_division: {},
    perspective_proportion_migration: {},
    perspective_gestalt_continuation_2afc: {},
    perspective_structure_3d: {},
  },
};

export default perspectivePack;
