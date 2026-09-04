import { Eye } from 'lucide-preact';

import { PerspGestaltContinuationView } from './PerspGestaltContinuationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspGestaltHitResult, PerspGestaltQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';
import { BaseModuleSettings, CardManifest } from '@formsight/card-sdk';

export const perspGestaltContinuationCard: CardManifest<
  PerspGestaltQuestion,
  PerspGestaltHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'persp_gestalt_continuation',
  domain: 'spatial_structure',
  icon: Eye,
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
  training: {
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
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspGestaltContinuationView
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
