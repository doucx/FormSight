import type { OfficialPlanPreset } from '../types';

export const colorLightMastery: OfficialPlanPreset = {
  id: 'color_light_mastery',
  category: 'color',
  locales: {
    'zh-CN': {
      name: '色彩光影与环境穿透 (65题)',
      description: '从绝对色相识别进阶到阿尔伯斯环境色对抗、色彩矢量迁移与综合拾色。',
    },
    'en-US': {
      name: 'Color & Light Environment Penetration (65 trials)',
      description:
        'Advance from absolute hue to Albers simultaneous contrast, vector shifts, and full color matching.',
    },
  },
  items: [
    { cardId: 'color_hue', targetTrials: 20 },
    { cardId: 'rel_decontextual_2afc', targetTrials: 15 },
    { cardId: 'rel_vector_shift', targetTrials: 15 },
    { cardId: 'color_all', targetTrials: 15 },
  ],
};

export default colorLightMastery;
