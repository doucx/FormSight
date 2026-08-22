import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';

export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization'
  | 'angle';

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
  packId: string;
  mode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  isExperimental?: boolean;
}

export interface PackMeta {
  id: string;
  title: string;
  subTitle?: string;
  desc: string;
  version?: string;
  author?: string;
  themeColor?: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon?: (props: { className?: string }) => ComponentChildren;
}

export interface CardQueryOptions {
  packId?: string;
  targets?: SensoryTargetTag[];
  skills?: CognitiveSkillTag[];
  interactions?: InteractionTag[];
  includeExperimental?: boolean;
  searchKeyword?: string;
}