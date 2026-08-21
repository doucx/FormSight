import type { TrainingDomain } from '../../utils/db';
import type { AnyTrainingPlugin } from '../trainingPlugins';
import { abstractionPlugin } from './abstractionPlugin';
import { colorPlugin } from './colorPlugin';
import { negativeSpacePlugin } from './negativeSpacePlugin';
import { relativeColorPlugin } from './relativeColorPlugin';
import { starPlugin } from './starPlugin';

export { starPlugin } from './starPlugin';
export { colorPlugin } from './colorPlugin';
export { relativeColorPlugin } from './relativeColorPlugin';
export { negativeSpacePlugin } from './negativeSpacePlugin';
export { abstractionPlugin } from './abstractionPlugin';

export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  abstraction: abstractionPlugin,
  concretization: abstractionPlugin,
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};

export const CARD_PLUGINS: Record<string, AnyTrainingPlugin> = {
  star_single: starPlugin,
  star_double_h: starPlugin,
  star_double_r: starPlugin,
  color_hue: colorPlugin,
  color_val: colorPlugin,
  color_sat: colorPlugin,
  color_all: colorPlugin,
  rel_vector_shift: relativeColorPlugin,
  rel_lightness_induction: relativeColorPlugin,
  rel_hue_induction: relativeColorPlugin,
  rel_decontextual_2afc: relativeColorPlugin,
  neg_ratio_estimation: negativeSpacePlugin,
  neg_area_comparison_2afc: negativeSpacePlugin,
  neg_vertex_fitting: negativeSpacePlugin,
  neg_shape_match_2afc: negativeSpacePlugin,
  abs_gesture_axis: abstractionPlugin,
  abs_polygon_decimation: abstractionPlugin,
  abs_notan_threshold: abstractionPlugin,
  abs_palette_clustering: abstractionPlugin,
  abs_td_gesture_2afc: abstractionPlugin,
  abs_td_hull_2afc: abstractionPlugin,
  abs_td_notan_2afc: abstractionPlugin,
  abs_td_palette_2afc: abstractionPlugin,
};

export function getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
  return CARD_PLUGINS[cardId];
}
