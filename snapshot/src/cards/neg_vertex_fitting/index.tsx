import { Crosshair } from 'lucide-preact';

import type { BaseModuleSettings, CardManifest, Point } from '@formsight/card-sdk';
import { NegVertexFittingView } from './NegVertexFittingView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const negVertexFittingCard: CardManifest<
  QuestionData,
  HitResult,
  Point,
  BaseModuleSettings
> = {
  id: 'neg_vertex_fitting',
  domain: 'form_and_proportion',
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['absolute_estimation'],
    challenge: ['figure_ground_reversal'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  engine: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userPoint, question) => evaluateAnswer(userPoint, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetVertexIndex: q.targetVertexIndex,
      targetPoint: [q.targetPoint.x, q.targetPoint.y],
      userClick: [userVal.x, userVal.y],
      errorPixelDistance: hitResult.errorDistance,
    }),
  },
  ui: {
    icon: Crosshair,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <NegVertexFittingView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default negVertexFittingCard;
