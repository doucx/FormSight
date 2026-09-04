import { Layers } from 'lucide-preact';

import type { BaseModuleSettings, CardManifest, Point } from '@formsight/card-sdk';
import { PerspPropDivisionView } from './PerspPropDivisionView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspPropDivisionHitResult, PerspPropDivisionQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const perspPropDivisionCard: CardManifest<
  PerspPropDivisionQuestion,
  PerspPropDivisionHitResult,
  Point,
  BaseModuleSettings
> = {
  id: 'persp_prop_division',
  domain: 'form_and_proportion',
  tags: {
    domain: ['form_and_proportion'],
    path: ['absolute_estimation'],
    interaction: ['spatial_locate'],
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
      userAnswer: [userVal.x, userVal.y],
      targetValue: [q.targetDivisionPoint.x, q.targetDivisionPoint.y],
      targetRatio: q.targetRatio,
      ratioProgress: hitResult.ratioProgress,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
  },
  ui: {
    icon: Layers,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspPropDivisionView
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

export default perspPropDivisionCard;
