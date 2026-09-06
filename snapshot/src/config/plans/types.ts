export type OfficialPlanCategory = 'warmup' | 'form' | 'color' | 'abstraction' | 'general';

export interface OfficialPlanPreset {
  id: string;
  category: OfficialPlanCategory;
  badgeI18nKey?: string;
  locales: {
    'zh-CN': {
      name: string;
      description: string;
      badge?: string;
    };
    'en-US': {
      name: string;
      description: string;
      badge?: string;
    };
  };
  items: Array<{
    cardId: string;
    targetTrials: number;
  }>;
}