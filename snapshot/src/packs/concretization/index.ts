import { Columns, Droplet, Layers, Shuffle, Sparkles } from 'lucide-preact';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { abstractionPlugin } from '../abstraction/plugin';

export const concretizationCards: CardDefinition[] = [
  {
    id: 'abs_td_gesture_2afc',
    packId: 'concretization',
    mode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    instruction: '观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势',
    icon: Shuffle,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    packId: 'concretization',
    mode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    packId: 'concretization',
    mode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    instruction: '观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构',
    icon: Droplet,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    packId: 'concretization',
    mode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
    instruction: '观察上方基准主调色，选出以此为色彩基底的拼贴画面',
    icon: Sparkles,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const concretizationPack: PackManifest = {
  packId: 'concretization',
  meta: {
    id: 'concretization',
    title: '细化感知',
    subTitle: 'Visual Refinement',
    desc: '自顶向下透视具象细节，训练基于势线骨架、几何大形、Notan 构图与调性基底在丰富画面中寻源辨识的能力。',
    themeColor: 'purple',
    icon: Layers,
  },
  cards: concretizationCards,
  trainingPlugin: abstractionPlugin,
};

export default concretizationPack;
