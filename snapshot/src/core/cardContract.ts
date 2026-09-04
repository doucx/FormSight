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

/**
 * 纯领域计算与规则契约 (0 UI 依赖理念，仅负责出题、判分与数据提取)
 */
export interface CardEngineContract<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
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
}

/**
 * 表现层绑定契约 (声明 Web 视图渲染、图标与设置弹窗组件注入)
 */
export interface CardUIContract<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  icon: (props: { className?: string }) => ComponentChildren;
  renderCanvas: (
    props: CardCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
  renderSettings?: (props: {
    settings: TSettings;
    updateSettings: (patch: Partial<TSettings>) => void;
  }) => ComponentChildren;
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
  defaultSettings?: Partial<TSettings>;

  /** 2. 自包含多语言词典 */
  locales?: {
    'zh-CN': Record<string, unknown>;
    'en-US': Record<string, unknown>;
  };

  /** 3. 核心领域逻辑 */
  engine: CardEngineContract<TQuestion, THitResult, TAnswerVal, TSettings>;

  /** 4. 表现层绑定 */
  ui: CardUIContract<TQuestion, THitResult, TAnswerVal, TSettings>;

  /** 5. 专属能力分析视图 (可选) */
  analytics?: {
    views: CardAnalyticsView[];
    fetchRecords?: (cardId: string) => Promise<UnifiedTrialRecord[]>;
  };
}
