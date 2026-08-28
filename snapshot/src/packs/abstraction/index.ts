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
import { abstractionPlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const abstractionCards: CardDefinition[] = [
  // === 自底向上：提炼概括 (Bottom-Up Extraction) ===
  {
    id: 'abs_gesture_axis',
    packId: 'abstraction',
    mode: 'GESTURE_AXIS',
    title: '动态势线提取',
    desc: '从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。',
    instruction: '旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)',
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
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。',
    instruction: '观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项',
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
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
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
    title: '主调色群提炼',
    desc: '穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。',
    instruction: '在下方 4 个候选项中，选出代表画面全局主调的加权主色',
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
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    instruction: '观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势',
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
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
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
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    instruction: '观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构',
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
    title: '调性基底归位',
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
    instruction: '观察上方基准主调色，选出以此为色彩基底的拼贴画面',
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
    title: '形式与抽象感知',
    subTitle: 'Visual Abstraction & Refinement',
    desc: '贯通「自底向上提炼」与「自顶向下寻源」双向视知觉闭环，训练对动态势线、极简低模、黑白Notan与色彩基调的穿透与具象推演能力。',
    themeColor: 'indigo',
    icon: Eye,
  },
  cards: abstractionCards,
  trainingPlugin: abstractionPlugin,
};

export default abstractionPack;