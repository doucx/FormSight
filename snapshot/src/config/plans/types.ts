export type OfficialPlanCategory = 'warmup' | 'form' | 'color' | 'abstraction' | 'general';

export interface OfficialPlanPreset {
  id: string;
  category: OfficialPlanCategory;
  locales: {
    'zh-CN': {
      name: string;
      description: string;
    };
    'en-US': {
      name: string;
      description: string;
    };
  };
  items: Array<{
    cardId: string;
    targetTrials: number;
  }>;
}
