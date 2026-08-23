import type { ComponentChildren } from 'preact';
import type { Point } from '../types';
import type {
  AbstractionSettings,
  BaseModuleSettings,
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../utils/settings';

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
