import type { ComponentChildren } from 'preact';
import type { TrainingDomain } from '../utils/db';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

export interface TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings> {
  domain: TrainingDomain;
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

export type AnyTrainingPlugin = TrainingPlugin<unknown, unknown, unknown, unknown>;
