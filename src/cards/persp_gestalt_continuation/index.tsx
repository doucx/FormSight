import { Eye } from 'lucide-preact';

import type { BaseModuleSettings, CardManifest } from '@formsight/card-sdk';
import { PerspGestaltContinuationView } from './PerspGestaltContinuationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspGestaltHitResult, PerspGestaltQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const perspGestaltContinuationCard: CardManifest<
  PerspGestaltQuestion,
  PerspGestaltHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'persp_gestalt_continuation',
  domain: 'spatial_structure',
  tags: {
    domain: ['spatial_structure'],
    path: ['relational_mapping'],
    challenge: ['illusion_piercing'],
    interaction: ['binary_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  engine: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userChoice: userVal,
      correctChoice: hitResult.correctChoice,
      parallelOffset: q.parallelOffset,
      tolerance: hitResult.tolerance,
    }),
  },
  ui: {
    icon: Eye,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspGestaltContinuationView
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

export default perspGestaltContinuationCard;
