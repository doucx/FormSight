import { Sparkles } from 'lucide-preact';

import type { BaseModuleSettings, CardManifest } from '@formsight/card-sdk';
import { FractalEdgeRoughnessView } from './FractalEdgeRoughnessView';
import { createFractalEdgeRoughnessAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const fractalEdgeRoughnessCard: CardManifest<
  QuestionData,
  HitResult,
  number,
  BaseModuleSettings
> = {
  id: 'fractal_edge_roughness',
  domain: 'rhythm_and_notan',
  icon: Sparkles,
  tags: {
    domain: ['rhythm_and_notan'],
    path: ['extraction', 'absolute_estimation'],
    challenge: ['illusion_piercing'],
    interaction: ['continuous_mod'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => evaluateAnswer(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetH: q.targetH,
      userH: userVal,
      errorValue: hitResult.errorValue,
      signedBias: hitResult.signedBias,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <FractalEdgeRoughnessView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createFractalEdgeRoughnessAnalytics(),
  },
};

export default fractalEdgeRoughnessCard;
