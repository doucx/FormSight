import type { OfficialPlanPreset } from '../types';

export const geometrySculpting: OfficialPlanPreset = {
  id: 'geometry_sculpting',
  category: 'form',
  locales: {
    'zh-CN': {
      name: '造型起形与比例强化 (60题)',
      description: '深入训练双锚点透视构图、负形反切定点与折线低模概括能力。',
    },
    'en-US': {
      name: 'Structure & Proportion Reinforcement (60 trials)',
      description:
        'Deeply train dual-anchor perspective, negative space vertex fitting, and low-poly decimation.',
    },
  },
  items: [
    { cardId: 'star_double_h', targetTrials: 20 },
    { cardId: 'neg_vertex_fitting', targetTrials: 20 },
    { cardId: 'abs_polygon_decimation', targetTrials: 20 },
  ],
};

export default geometrySculpting;