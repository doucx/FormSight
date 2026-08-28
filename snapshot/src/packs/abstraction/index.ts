import {
  Columns,
  Droplet,
  Eye,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sparkles,
  Sun,
} from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { abstractionPlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.abstraction.settings.showToleranceBandTitle',
    description: 'packs.abstraction.settings.showToleranceBandDesc',
  },
];

export const abstractionCards: CardDefinition[] = [
  // === 自底向上：提炼概括 (Bottom-Up Extraction) ===
  {
    id: 'abs_gesture_axis',
    packId: 'abstraction',
    mode: 'GESTURE_AXIS',
    icon: RotateCw,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_polygon_decimation',
    packId: 'abstraction',
    mode: 'POLYGON_DECIMATION',
    icon: Maximize2,
    tags: {
      domain: ['form_and_proportion'],
      path: ['extraction'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_notan_threshold',
    packId: 'abstraction',
    mode: 'NOTAN_THRESHOLD',
    icon: Sun,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      challenge: ['figure_ground_reversal'],
      interaction: ['continuous_mod'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_palette_clustering',
    packId: 'abstraction',
    mode: 'PALETTE_CLUSTERING',
    icon: Palette,
    tags: {
      domain: ['color_and_value'],
      path: ['extraction'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },

  // === 自顶向下：具象寻源 (Top-Down Concretization) ===
  {
    id: 'abs_td_gesture_2afc',
    packId: 'abstraction',
    mode: 'TD_GESTURE_2AFC',
    icon: Shuffle,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['concretization'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    packId: 'abstraction',
    mode: 'TD_HULL_2AFC',
    icon: Columns,
    tags: {
      domain: ['form_and_proportion'],
      path: ['concretization'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    packId: 'abstraction',
    mode: 'TD_NOTAN_2AFC',
    icon: Droplet,
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['concretization'],
      challenge: ['figure_ground_reversal'],
      interaction: ['binary_choice'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    packId: 'abstraction',
    mode: 'TD_PALETTE_2AFC',
    icon: Sparkles,
    tags: {
      domain: ['color_and_value'],
      path: ['concretization'],
      interaction: ['multi_choice'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const abstractionPack: PackManifest = {
  packId: 'abstraction',
  meta: {
    id: 'abstraction',
    themeColor: 'indigo',
    icon: Eye,
  },
  cards: abstractionCards,
  trainingPlugin: abstractionPlugin,
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultCardSettings: {
    abs_gesture_axis: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    abs_polygon_decimation: {},
    abs_notan_threshold: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    abs_palette_clustering: {},
    abs_td_gesture_2afc: {},
    abs_td_hull_2afc: {},
    abs_td_notan_2afc: {},
    abs_td_palette_2afc: {},
  },
};

export default abstractionPack;
