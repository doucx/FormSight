export interface PlanItem {
  id: string; // 阶段唯一 ID (用于渲染与排序 key)
  cardId: string; // 目标卡片 ID (如 'star_single', 'color_hue')
  targetTrials: number; // 本阶段目标题量
}

export interface TrainingPlan {
  id: string;
  name: string;
  items: PlanItem[];
  updatedAt: number;
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  badge?: string;
  items: Omit<PlanItem, 'id'>[];
}