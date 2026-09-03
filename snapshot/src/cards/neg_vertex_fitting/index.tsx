import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import type { Point } from '../../types';
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
  icon: Crosshair,
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
  training: {
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
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegVertexFittingView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default negVertexFittingCard;
