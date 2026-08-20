import type { PlanTemplate } from '../types/plan';

export const DEFAULT_PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'all_round_warmup',
    name: '晨间感知全能热身 (50题)',
    description: '快速激活空间几何、绝对色相与正负形快判直觉，适合每日开工前热身。',
    badge: '推荐',
    items: [
      { cardId: 'star_single', targetTrials: 15 },
      { cardId: 'color_hue', targetTrials: 15 },
      { cardId: 'neg_area_comparison_2afc', targetTrials: 20 },
    ],
  },
  {
    id: 'geometry_sculpting',
    name: '造型起形与比例强化 (60题)',
    description: '深入训练双锚点透视构图、负形反切定点与折线低模概括能力。',
    badge: '造型专项',
    items: [
      { cardId: 'star_double_h', targetTrials: 20 },
      { cardId: 'neg_vertex_fitting', targetTrials: 20 },
      { cardId: 'abs_polygon_decimation', targetTrials: 20 },
    ],
  },
  {
    id: 'color_light_mastery',
    name: '色彩光影与环境穿透 (65题)',
    description: '从绝对色相识别进阶到阿尔伯斯环境色对抗、色彩矢量迁移与综合拾色。',
    badge: '色彩进阶',
    items: [
      { cardId: 'color_hue', targetTrials: 20 },
      { cardId: 'rel_decontextual_2afc', targetTrials: 15 },
      { cardId: 'rel_vector_shift', targetTrials: 15 },
      { cardId: 'color_all', targetTrials: 15 },
    ],
  },
  {
    id: 'abstraction_essence',
    name: '视知觉概括提炼 (60题)',
    description: '自底向上训练动态势线提取、黑白素描归组与主调色群提炼本质。',
    badge: '概括专项',
    items: [
      { cardId: 'abs_gesture_axis', targetTrials: 20 },
      { cardId: 'abs_notan_threshold', targetTrials: 20 },
      { cardId: 'abs_palette_clustering', targetTrials: 20 },
    ],
  },
];