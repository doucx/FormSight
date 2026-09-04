import { Columns } from 'lucide-preact';

import { AngleComparison2AfcView } from './AngleComparison2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { AngleComparisonHitResult, AngleComparisonQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';
import { BaseModuleSettings, CardManifest } from '@formsight/card-sdk';

export const angleComparison2AfcCard: CardManifest<
  AngleComparisonQuestion,
  AngleComparisonHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_comparison_2afc',
  domain: 'form_and_proportion',
  icon: Columns,
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userChoice: userVal,
      correctChoice: hitResult.correctChoice,
      angleA: q.angleA,
      angleB: q.angleB,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <AngleComparison2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default angleComparison2AfcCard;
