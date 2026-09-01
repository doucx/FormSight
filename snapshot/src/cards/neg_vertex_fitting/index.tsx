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
  { clickPoint: Point; hitResult: HitResult },
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
    evaluateAnswer: (userVal) => userVal.hitResult,
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      targetVertexIndex: q.targetVertexIndex,
      targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
      userClick: hitResult.nearestGridPoint
        ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
        : undefined,
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
