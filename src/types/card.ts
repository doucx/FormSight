import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';

/**
 * 维度 1: 视觉域 (Visual Domain) - 观察的基础视觉原材料
 */
export type VisualDomainTag =
  | 'form_and_proportion' // 形体与比例
  | 'spatial_structure' // 空间与结构
  | 'color_and_value' // 色彩与明度
  | 'rhythm_and_notan'; // 动态与图底

/**
 * 维度 2: 认知路径 (Cognitive Path) - 大脑信息处理与推演方向
 */
export type CognitivePathTag =
  | 'extraction' // 自底向上：提炼概括
  | 'concretization' // 自顶向下：具象寻源
  | 'absolute_estimation' // 绝对估测度量
  | 'relational_mapping'; // 相对推移映射

/**
 * 维度 3: 心智抗性 (Mental Challenge) - 刻意克服的人类生理/感知本能短板
 */
export type MentalChallengeTag =
  | 'illusion_piercing' // 错觉剥离 (抗环境色同化/抗连续错觉)
  | 'figure_ground_reversal' // 图底反转 (关注负空间留白)
  | 'working_memory' // 瞬时记忆 (抗视觉遗忘)
  | 'dimensional_translation'; // 维次转译 (3D/2D投影与视角旋转)

/**
 * 维度 4: 交互形态 (Interaction Mode)
 */
export type InteractionTag =
  | 'continuous_mod' // 连续调制 (滑块)
  | 'spatial_locate' // 空间定位 (点阵点击/盲打)
  | 'binary_choice' // 二分对抗 (2AFC)
  | 'multi_choice'; // 多维检索 (N-AFC)

export type CardStatusTag = 'stable' | 'experimental' | 'deprecated';

export interface CardTags {
  domain: VisualDomainTag[];
  path: CognitivePathTag[];
  challenge?: MentalChallengeTag[];
  interaction: InteractionTag[];
  status?: CardStatusTag;
}

export interface CardDefinition {
  id: string;
  domain: VisualDomainTag;
  title?: string;
  desc?: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  defaultSettings?: Record<string, unknown>;
}

export interface CardQueryOptions {
  domains?: VisualDomainTag[];
  paths?: CognitivePathTag[];
  challenges?: MentalChallengeTag[];
  interactions?: InteractionTag[];
  statuses?: CardStatusTag[];
  searchKeyword?: string;
  showAdvanced?: boolean;
}
