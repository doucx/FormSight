import type { ComponentChildren } from 'preact';
import type { TrainingDomain } from '../utils/db';

/**
 * 维度 1：感官目标 / 训练对象 (Sensory Target)
 */
export type SensoryTargetTag = 'geometry' | 'color' | 'relative_color' | 'negative_space';

/**
 * 维度 2：认知技能 / 核心心理学机制 (Cognitive Skill)
 */
export type CognitiveSkillTag =
  | 'spatial_orientation'
  | 'color_fidelity'
  | 'illusion_invariance'
  | 'proportion'
  | 'visual_memory';

/**
 * 维度 3：交互范式 / 做答动作 (Interaction Paradigm)
 */
export type InteractionTag = 'continuous_slider' | 'point_click' | 'choice_2afc' | 'choice_nafc';

export interface CardTags {
  target: SensoryTargetTag[];
  skill: CognitiveSkillTag[];
  interaction: InteractionTag[];
}

/**
 * 扁平卡片定义实体 (Single Source of Truth)
 */
export interface CardDefinition {
  id: string; // 全局唯一 cardId，例如 'star_single', 'color_hue', 'neg_vertex_fitting'
  legacyDomain: TrainingDomain;
  legacyMode: string;
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  settingsKey: TrainingDomain;
}
