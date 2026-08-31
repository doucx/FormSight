import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { UnifiedTrialRecord } from '../storage/db/schema';
import type { BaseModuleSettings } from '../storage/settings';
import type { CardDefinition, CardTags, VisualDomainTag } from '../types/card';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

export interface CardTrainingContract<
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
  renderCanvas: (
    props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
}

export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[]) => void;
  renderDiagnostics: (records: TRecord[]) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}

export interface CardAnalyticsContract<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  views: CardAnalyticsView<TRecord>[];
  fetchRecords?: (cardId: string) => Promise<TRecord[]>;
}

/**
 * 卡片独立清单 (CardManifest) - 系统的真正一等公民
 */
export interface CardManifest<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  id: string;
  domain: VisualDomainTag;
  groupId?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;

  // 1. 设置项定义与默认值
  settingSchemas?: SettingFieldSchema[];
  defaultSettings?: Partial<TSettings>;

  // 2. 本地私有多语言
  locales?: {
    'zh-CN'?: Record<string, unknown>;
    'en-US'?: Record<string, unknown>;
  };

  // 3. 训练引擎核心行为
  training: CardTrainingContract<TQuestion, THitResult, TAnswerVal, TSettings>;

  // 4. 卡片专属统计分析扩展
  analytics?: CardAnalyticsContract;
}

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic card manifest registry
export type AnyCardManifest = CardManifest<any, any, any, any>;

/**
 * 遗留兼容契约（在全量迁移过渡期间保留）
 */
export interface TrainingPlugin<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  packId?: string;
  title: string;
  getModeBadge: (mode: string) => string;
  isTargeting?: (mode: string, settings: TSettings) => boolean;
  generateQuestion: (mode: string, level: number, settings: TSettings) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion, mode: string) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  extractRecordDetails: (
    question: TQuestion,
    hitResult: THitResult,
    userVal: TAnswerVal,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (
    props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
}

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic training plugin registry
export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  views: CardAnalyticsView<TRecord>[];
}

export interface PackManifest {
  packId: string;
  meta: {
    id: string;
    title?: string;
    subTitle?: string;
    desc?: string;
    themeColor?: 'indigo' | 'amber' | 'purple' | 'emerald';
    icon?: (props: { className?: string }) => ComponentChildren;
  };
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
  locales?: Record<string, Record<string, unknown>>;
}

export function calculateBasicOverallStats<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord>(
  records: TRecord[],
): { accuracy: number; total: number } {
  const total = records.length;
  const hits = records.filter((r) => r.isHit).length;
  const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
  return { accuracy, total };
}