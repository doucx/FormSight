import type { OfficialPlanPreset } from '../types';

export const allRoundWarmup: OfficialPlanPreset = {
  id: 'all_round_warmup',
  category: 'warmup',
  locales: {
    'zh-CN': {
      name: '晨间感知全能热身 (50题)',
      description: '快速激活空间几何、绝对色相与正负形快判直觉，适合每日开工前热身。',
    },
    'en-US': {
      name: 'Morning All-Round Warmup (50 trials)',
      description: 'Quickly activate spatial geometry, absolute hue, and negative space intuition.',
    },
  },
  items: [
    { cardId: 'star_single', targetTrials: 15 },
    { cardId: 'color_hue', targetTrials: 15 },
    { cardId: 'neg_area_comparison_2afc', targetTrials: 20 },
  ],
};

export default allRoundWarmup;
