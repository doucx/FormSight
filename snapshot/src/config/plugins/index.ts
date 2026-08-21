import type { TrainingDomain } from '../../utils/db';
import type { AnyTrainingPlugin } from '../trainingPlugins';
import { abstractionPlugin } from './abstractionPlugin';
import { anglePlugin } from './anglePlugin';
import { colorPlugin } from './colorPlugin';
import { negativeSpacePlugin } from './negativeSpacePlugin';
import { relativeColorPlugin } from './relativeColorPlugin';
import { starPlugin } from './starPlugin';

export { starPlugin } from './starPlugin';
export { colorPlugin } from './colorPlugin';
export { relativeColorPlugin } from './relativeColorPlugin';
export { negativeSpacePlugin } from './negativeSpacePlugin';
export { abstractionPlugin } from './abstractionPlugin';
export { anglePlugin } from './anglePlugin';

export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  abstraction: abstractionPlugin as unknown as AnyTrainingPlugin,
  concretization: abstractionPlugin as unknown as AnyTrainingPlugin,
  star: starPlugin as unknown as AnyTrainingPlugin,
  color: colorPlugin as unknown as AnyTrainingPlugin,
  relative_color: relativeColorPlugin as unknown as AnyTrainingPlugin,
  negative_space: negativeSpacePlugin as unknown as AnyTrainingPlugin,
  angle: anglePlugin as unknown as AnyTrainingPlugin,
};

export const CARD_PLUGINS: Record<string, AnyTrainingPlugin> = {
  angle_estimation: anglePlugin as unknown as AnyTrainingPlugin,
  angle_comparison_2afc: anglePlugin as unknown as AnyTrainingPlugin,
  angle_parallel_2afc: anglePlugin as unknown as AnyTrainingPlugin,
  star_single: starPlugin as unknown as AnyTrainingPlugin,
  star_double_h: starPlugin as unknown as AnyTrainingPlugin,
  star_double_r: starPlugin as unknown as AnyTrainingPlugin,
  color_hue: colorPlugin as unknown as AnyTrainingPlugin,
  color_val: colorPlugin as unknown as AnyTrainingPlugin,
  color_sat: colorPlugin as unknown as AnyTrainingPlugin,
  color_all: colorPlugin as unknown as AnyTrainingPlugin,
  rel_vector_shift: relativeColorPlugin as unknown as AnyTrainingPlugin,
  rel_lightness_induction: relativeColorPlugin as unknown as AnyTrainingPlugin,
  rel_hue_induction: relativeColorPlugin as unknown as AnyTrainingPlugin,
  rel_decontextual_2afc: relativeColorPlugin as unknown as AnyTrainingPlugin,
  neg_ratio_estimation: negativeSpacePlugin as unknown as AnyTrainingPlugin,
  neg_area_comparison_2afc: negativeSpacePlugin as unknown as AnyTrainingPlugin,
  neg_vertex_fitting: negativeSpacePlugin as unknown as AnyTrainingPlugin,
  neg_shape_match_2afc: negativeSpacePlugin as unknown as AnyTrainingPlugin,
  abs_gesture_axis: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_polygon_decimation: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_notan_threshold: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_palette_clustering: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_td_gesture_2afc: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_td_hull_2afc: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_td_notan_2afc: abstractionPlugin as unknown as AnyTrainingPlugin,
  abs_td_palette_2afc: abstractionPlugin as unknown as AnyTrainingPlugin,
};

export function getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
  return CARD_PLUGINS[cardId];
}
