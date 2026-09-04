import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../storage/db/schema';
import type { BaseModuleSettings } from '../storage/settings';
import type { CardTags, VisualDomainTag } from '../types/card';

export interface CardCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

import type { ScopedTranslator } from './i18n';

export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[], t: ScopedTranslator) => void;
  renderDiagnostics: (records: TRecord[], t: ScopedTranslator) => ComponentChildren;
  getOverallStats?: (
    records: TRecord[],
    t: ScopedTranslator,
  ) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}

export interface CardManifest<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  /** 1. 全局唯一标识与分类标签 */
  id: string;
  domain: VisualDomainTag;
  tags: CardTags;
  icon: (props: { className?: string }) => ComponentChildren;

  /** 2. 个性化设置项定义与默认值 */
  renderSettings?: (props: {
    settings: TSettings;
    updateSettings: (patch: Partial<TSettings>) => void;
  }) => ComponentChildren;
  defaultSettings?: Partial<TSettings>;

  /** 3. 自包含多语言词典 */
  locales?: {
    'zh-CN': Record<string, unknown>;
    'en-US': Record<string, unknown>;
  };

  /** 4. 训练引擎核心逻辑闭环 */
  training: {
    isTargeting?: (settings: TSettings) => boolean;
    generateQuestion: (level: number, settings: TSettings) => TQuestion;
    evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
    isHit: (hitResult: THitResult) => boolean;
    getQuestionLevel?: (question: TQuestion) => number;
    extractRecordDetails?: (
      question: TQuestion,
      hitResult: THitResult,
      userVal: TAnswerVal,
    ) => Record<string, unknown>;
    renderCanvas: (
      props: CardCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
    ) => ComponentChildren;
  };

  /** 5. 专属能力分析视图 (可选) */
  analytics?: {
    views: CardAnalyticsView[];
    fetchRecords?: (cardId: string) => Promise<UnifiedTrialRecord[]>;
  };
}
