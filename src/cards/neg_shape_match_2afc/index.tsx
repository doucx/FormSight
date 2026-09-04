import { Sparkles } from 'lucide-preact';

import type { BaseModuleSettings, CardManifest } from '@formsight/card-sdk';
import { NegShapeMatch2AfcView } from './NegShapeMatch2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const negShapeMatch2AfcCard: CardManifest<
  QuestionData,
  HitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'neg_shape_match_2afc',
  domain: 'form_and_proportion',
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    challenge: ['working_memory', 'figure_ground_reversal'],
    interaction: ['binary_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  engine: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => evaluateAnswer(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userChoice: userVal,
      correctChoice: q.correctChoice,
      displayTimeMs: q.displayTimeMs,
      errorValue: hitResult.errorValue,
    }),
  },
  ui: {
    icon: Sparkles,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegShapeMatch2AfcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default negShapeMatch2AfcCard;
