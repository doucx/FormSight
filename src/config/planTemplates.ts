import type { PlanTemplate } from '../types/plan';

export const DEFAULT_PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'all_round_warmup',
    name: 'Morning All-Round Warmup (50 trials)',
    description: 'Quickly activate spatial geometry, absolute hue, and negative space intuition.',
    badge: 'Recommended',
    items: [
      { cardId: 'star_single', targetTrials: 15 },
      { cardId: 'color_hue', targetTrials: 15 },
      { cardId: 'neg_area_comparison_2afc', targetTrials: 20 },
    ],
  },
  {
    id: 'geometry_sculpting',
    name: 'Structure & Proportion Reinforcement (60 trials)',
    description:
      'Deeply train dual-anchor perspective, negative space vertex fitting, and low-poly decimation.',
    badge: 'Form Special',
    items: [
      { cardId: 'star_double_h', targetTrials: 20 },
      { cardId: 'neg_vertex_fitting', targetTrials: 20 },
      { cardId: 'abs_polygon_decimation', targetTrials: 20 },
    ],
  },
  {
    id: 'color_light_mastery',
    name: 'Color & Light Environment Penetration (65 trials)',
    description:
      'Advance from absolute hue to Albers simultaneous contrast, vector shifts, and full color matching.',
    badge: 'Color Mastery',
    items: [
      { cardId: 'color_hue', targetTrials: 20 },
      { cardId: 'rel_decontextual_2afc', targetTrials: 15 },
      { cardId: 'rel_vector_shift', targetTrials: 15 },
      { cardId: 'color_all', targetTrials: 15 },
    ],
  },
  {
    id: 'abstraction_essence',
    name: 'Perceptual Abstraction & Essence (60 trials)',
    description:
      'Bottom-up training for gesture axis extraction, Notan grouping, and dominant color clustering.',
    badge: 'Abstraction',
    items: [
      { cardId: 'abs_gesture_axis', targetTrials: 20 },
      { cardId: 'abs_notan_threshold', targetTrials: 20 },
      { cardId: 'abs_palette_clustering', targetTrials: 20 },
    ],
  },
];
