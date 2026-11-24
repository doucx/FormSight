import type { OfficialPlanPreset } from '../types';

export const newbieTour: OfficialPlanPreset = {
  id: 'newbie_tour',
  category: 'general',
  locales: {
    'zh-CN': {
      name: '新手引航 · 体验 FormSight',
      description: '从空间、色彩到负形，用一条短流程体验 FormSight 的核心能力，并学会自己找卡片。',
    },
    'en-US': {
      name: 'Newcomer Tour · Experience FormSight',
      description:
        'A short guided routine across space, color, and negative space that also teaches you to find cards.',
    },
  },
  items: [
    {
      type: 'message',
      titleKey: 'plan.newbie.welcomeTitle',
      contentKey: 'plan.newbie.welcomeContent',
      actionLabelKey: 'plan.newbie.startAction',
    },
    { type: 'card', cardId: 'star_single', targetTrials: 10 },
    {
      type: 'message',
      titleKey: 'plan.newbie.colorTitle',
      contentKey: 'plan.newbie.colorContent',
    },
    { type: 'card', cardId: 'color_hue', targetTrials: 10 },
    {
      type: 'rest',
      durationSeconds: 60,
      allowSkip: true,
      tipsKey: 'plan.newbie.restTips',
    },
    {
      type: 'message',
      titleKey: 'plan.newbie.searchTitle',
      contentKey: 'plan.newbie.searchContent',
    },
    { type: 'card', cardId: 'neg_area_comparison_2afc', targetTrials: 10 },
    {
      type: 'message',
      titleKey: 'plan.newbie.finishTitle',
      contentKey: 'plan.newbie.finishContent',
      actionLabelKey: 'plan.newbie.finishAction',
    },
  ],
};

export default newbieTour;
