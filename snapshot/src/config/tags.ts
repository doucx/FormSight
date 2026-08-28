import type {
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';

export interface TagMeta<T extends string> {
  id: T;
  i18nKey: string;
  themeColor?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'purple';
}

export const DOMAIN_TAGS: Record<VisualDomainTag, TagMeta<VisualDomainTag>> = {
  form_and_proportion: {
    id: 'form_and_proportion',
    i18nKey: 'tags.domains.form_and_proportion',
    themeColor: 'indigo',
  },
  spatial_structure: {
    id: 'spatial_structure',
    i18nKey: 'tags.domains.spatial_structure',
    themeColor: 'indigo',
  },
  color_and_value: {
    id: 'color_and_value',
    i18nKey: 'tags.domains.color_and_value',
    themeColor: 'amber',
  },
  rhythm_and_notan: {
    id: 'rhythm_and_notan',
    i18nKey: 'tags.domains.rhythm_and_notan',
    themeColor: 'emerald',
  },
};

export const PATH_TAGS: Record<CognitivePathTag, TagMeta<CognitivePathTag>> = {
  extraction: {
    id: 'extraction',
    i18nKey: 'tags.paths.extraction',
    themeColor: 'emerald',
  },
  concretization: {
    id: 'concretization',
    i18nKey: 'tags.paths.concretization',
    themeColor: 'emerald',
  },
  absolute_estimation: {
    id: 'absolute_estimation',
    i18nKey: 'tags.paths.absolute_estimation',
    themeColor: 'indigo',
  },
  relational_mapping: {
    id: 'relational_mapping',
    i18nKey: 'tags.paths.relational_mapping',
    themeColor: 'indigo',
  },
};

export const CHALLENGE_TAGS: Record<MentalChallengeTag, TagMeta<MentalChallengeTag>> = {
  illusion_piercing: {
    id: 'illusion_piercing',
    i18nKey: 'tags.challenges.illusion_piercing',
    themeColor: 'rose',
  },
  figure_ground_reversal: {
    id: 'figure_ground_reversal',
    i18nKey: 'tags.challenges.figure_ground_reversal',
    themeColor: 'rose',
  },
  working_memory: {
    id: 'working_memory',
    i18nKey: 'tags.challenges.working_memory',
    themeColor: 'rose',
  },
  dimensional_translation: {
    id: 'dimensional_translation',
    i18nKey: 'tags.challenges.dimensional_translation',
    themeColor: 'purple',
  },
};

export const INTERACTION_TAGS: Record<InteractionTag, TagMeta<InteractionTag>> = {
  continuous_mod: {
    id: 'continuous_mod',
    i18nKey: 'tags.interactions.continuous_mod',
    themeColor: 'amber',
  },
  spatial_locate: {
    id: 'spatial_locate',
    i18nKey: 'tags.interactions.spatial_locate',
    themeColor: 'indigo',
  },
  binary_choice: {
    id: 'binary_choice',
    i18nKey: 'tags.interactions.binary_choice',
    themeColor: 'emerald',
  },
  multi_choice: {
    id: 'multi_choice',
    i18nKey: 'tags.interactions.multi_choice',
    themeColor: 'amber',
  },
};

export const STATUS_TAGS: Record<CardStatusTag, TagMeta<CardStatusTag>> = {
  stable: {
    id: 'stable',
    i18nKey: 'tags.statuses.stable',
    themeColor: 'indigo',
  },
  experimental: {
    id: 'experimental',
    i18nKey: 'tags.statuses.experimental',
    themeColor: 'purple',
  },
  deprecated: {
    id: 'deprecated',
    i18nKey: 'tags.statuses.deprecated',
    themeColor: 'rose',
  },
};