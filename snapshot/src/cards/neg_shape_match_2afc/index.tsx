import { Sparkles } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { NegShapeMatch2AfcView } from './NegShapeMatch2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const negShapeMatch2AfcCard: CardManifest<
  QuestionData,
  HitResult,
  0 | 1,
  BaseModuleSettings
> = {
  id: 'neg_shape_match_2afc',
  domain: 'form_and_proportion',
  icon: Sparkles,
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
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => evaluateAnswer(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userChoice: userVal === 0 ? 'A' : 'B',
      correctChoice: q.correctChoice,
      displayTimeMs: q.displayTimeMs,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegShapeMatch2AfcView
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
