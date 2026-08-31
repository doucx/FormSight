import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';
import type { UnifiedTrialRecord } from '../storage/db/schema';
import type {
  AbstractionSettings,
  BaseModuleSettings,
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../storage/settings';
import type { Point } from '../types';
import type { CardDefinition, CardTags, PackMeta } from '../types/card';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

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

export type StarPlugin = TrainingPlugin<
  unknown,
  unknown,
  { clickPoint: Point; hitResult: unknown },
  StarSettings
>;

export type ColorPlugin = TrainingPlugin<
  unknown,
  unknown,
  number | [number, number, number],
  ColorSenseSettings
>;

export type RelativeColorPlugin = TrainingPlugin<
  unknown,
  unknown,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
>;

export type NegativeSpacePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
>;

export type AbstractionPlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B',
  AbstractionSettings
>;

export type AnglePlugin = TrainingPlugin<unknown, unknown, number | 'A' | 'B', BaseModuleSettings>;

export type PerspectivePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B' | Point,
  BaseModuleSettings
>;

export type AnyDomainPlugin =
  | StarPlugin
  | ColorPlugin
  | RelativeColorPlugin
  | NegativeSpacePlugin
  | AbstractionPlugin
  | AnglePlugin
  | PerspectivePlugin;

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic training plugin registry
export type AnyTrainingPlugin = TrainingPlugin<any, any, any, any>;

export interface BaseInteractiveCardProps {
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function calculateBasicOverallStats<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord>(
  records: TRecord[],
): { accuracy: number; total: number } {
  const total = records.length;
  const hits = records.filter((r) => r.isHit).length;
  const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
  return { accuracy, total };
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

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  views: CardAnalyticsView<TRecord>[];
}

/**
 * 扩展包清单 (Pack Manifest)
 * v0.4.x 核心插件规范：任何独立内容扩展包（Pack）均遵循此清单
 */
export interface PackManifest {
  packId: string;
  meta: PackMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
  locales?: Record<string, Record<string, unknown>>;
}

export type AnyManifest = PackManifest;

/**
 * 训练卡片独立自包含清单 (Card Manifest)
 * 卡片作为系统一等公民的核心规范：涵盖元数据、设置、多语言、训练引擎逻辑与统计分析
 */
export interface CardManifest<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  /** 卡片全局唯一 ID (如 'star_single', 'color_hue') */
  id: string;
  /** 所属领域分类 / 文件夹分组 (如 'star', 'color', 'perspective')，用于 IDE 收纳与逻辑归类 */
  groupId?: string;
  /** 运行模式标识 (默认与 id 一致) */
  mode?: string;
  /** 卡片主矢量图标 */
  icon: (props: { className?: string }) => ComponentChildren;
  /** 五维本体语义标签 */
  tags: CardTags;

  /** 是否开启弱点专项分析功能 */
  hasWeaknessAnalytics?: boolean;
  /** 动态配置项描述列表 */
  settingSchemas?: SettingFieldSchema[];
  /** 卡片默认个性化设置项 */
  defaultSettings?: Partial<TSettings>;

  /** 卡片自包含的多语言词典 (可直接挂载 title, desc, instruction, hint 等) */
  locales?: {
    'zh-CN'?: Record<string, unknown>;
    'en-US'?: Record<string, unknown>;
    [lang: string]: Record<string, unknown> | undefined;
  };

  /** 卡片自闭环的训练引擎逻辑 */
  training: {
    /** 是否处于靶向弱点强化模式 */
    isTargeting?: (settings: TSettings) => boolean;
    /** 生成单道训练题目 */
    generateQuestion: (level: number, settings: TSettings) => TQuestion;
    /** 评估判定用户作答 */
    evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
    /** 判断该判定结果是否为命中 (Hit) */
    isHit: (hitResult: THitResult) => boolean;
    /** 获取题目的具体难度等级 (默认读取 question.difficultyLevel) */
    getQuestionLevel?: (question: TQuestion) => number;
    /** 提取入库持久化到 IndexedDB 的细节结构 */
    extractRecordDetails?: (
      question: TQuestion,
      hitResult: THitResult,
      userVal: TAnswerVal,
    ) => Record<string, unknown>;
    /** 渲染该卡片的 Canvas/交互视图 */
    renderCanvas: (
      props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
    ) => ComponentChildren;
  };

  /** 卡片专属认知数据分析扩展 (可选) */
  analytics?: {
    views: CardAnalyticsView[];
    fetchRecords?: (cardId: string) => Promise<UnifiedTrialRecord[]>;
  };
}

// biome-ignore lint/suspicious/noExplicitAny: type erasure for generic card manifest registry
export type AnyCardManifest = CardManifest<any, any, any, any>;
