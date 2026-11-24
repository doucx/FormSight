export type OfficialPlanCategory = 'warmup' | 'form' | 'color' | 'abstraction' | 'general';

/**
 * 官方预设阶段。文字提示的文案通过 i18n key 引用，
 * 避免在预设文件里重复维护两种语言的正文。
 */
export type OfficialPlanStage =
  | { type?: 'card'; cardId: string; targetTrials: number }
  | { type: 'message'; titleKey: string; contentKey: string; actionLabelKey?: string }
  | { type: 'rest'; durationSeconds: number; allowSkip?: boolean; tipsKey?: string };

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
  items: OfficialPlanStage[];
}
