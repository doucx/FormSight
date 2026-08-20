import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { TrainingDomain } from '../utils/db';

export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization';

export type CognitiveSkillTag =
  | 'spatial_orientation'
  | 'color_fidelity'
  | 'illusion_invariance'
  | 'proportion'
  | 'visual_memory'
  | 'abstraction'
  | 'gesture_flow'
  | 'notan_grouping';

export type InteractionTag = 'continuous_slider' | 'point_click' | 'choice_2afc' | 'choice_nafc';

export interface CardTags {
  target: SensoryTargetTag[];
  skill: CognitiveSkillTag[];
  interaction: InteractionTag[];
}

export interface CardDefinition {
  id: string;
  legacyDomain: TrainingDomain;
  legacyMode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  settingsKey?: string; // 兼容
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
}
