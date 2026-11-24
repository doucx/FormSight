export interface CardStageItem {
  id: string; // 阶段唯一 ID (用于渲染与排序 key)
  type?: 'card'; // 旧数据缺省时视为 card，保持向下兼容
  cardId: string; // 目标卡片 ID (如 'star_single', 'color_hue')
  targetTrials: number; // 本阶段目标题量
}

export interface MessageStageItem {
  id: string;
  type: 'message';
  title: string;
  content: string; // 轻量 Markdown 子集
  actionLabel?: string; // 按钮文案，如“继续”“开始实战”
}

export interface RestStageItem {
  id: string;
  type: 'rest';
  durationSeconds: number;
  allowSkip?: boolean;
  tips?: string;
}

/**
 * 训练流阶段：卡片训练 / 文字提示 / 休息段。
 * 判别字段为 `type`；缺省 `type` 的历史数据一律视为卡片阶段。
 */
export type PlanItem = CardStageItem | MessageStageItem | RestStageItem;

export type PlanItemDraft =
  | Omit<CardStageItem, 'id'>
  | Omit<MessageStageItem, 'id'>
  | Omit<RestStageItem, 'id'>;

export interface TrainingPlan {
  id: string;
  name: string;
  description?: string;
  items: PlanItem[];
  isFavorite?: boolean;
  isBuiltin?: boolean;
  updatedAt: number;
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  badge?: string;
  items: PlanItemDraft[];
}

export interface PlanStorageState {
  activePlanId: string;
  plans: TrainingPlan[];
}
