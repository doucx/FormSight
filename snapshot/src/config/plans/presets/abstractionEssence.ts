import type { OfficialPlanPreset } from '../types';

export const abstractionEssence: OfficialPlanPreset = {
  id: 'abstraction_essence',
  category: 'abstraction',
  locales: {
    'zh-CN': {
      name: '视知觉概括提炼 (60题)',
      description: '自底向上训练动态势线提取、黑白素描归组与主调色群提炼本质。',
      badge: '概括专项',
    },
    'en-US': {
      name: 'Perceptual Abstraction & Essence (60 trials)',
      description:
        'Bottom-up training for gesture axis extraction, Notan grouping, and dominant color clustering.',
      badge: 'Abstraction',
    },
  },
  items: [
    { cardId: 'abs_gesture_axis', targetTrials: 20 },
    { cardId: 'abs_notan_threshold', targetTrials: 20 },
    { cardId: 'abs_palette_clustering', targetTrials: 20 },
  ],
};

export default abstractionEssence;