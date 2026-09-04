import { Box } from 'lucide-preact';

import { PerspStructure3DView } from './PerspStructure3DView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';
import { BaseModuleSettings, CardManifest, Point } from '@formsight/card-sdk';

export const perspStructure3DCard: CardManifest<
  PerspStructure3DQuestion,
  PerspStructure3DHitResult,
  Point,
  BaseModuleSettings
> = {
  id: 'persp_structure_3d',
  domain: 'spatial_structure',
  icon: Box,
  tags: {
    domain: ['spatial_structure'],
    path: ['absolute_estimation'],
    challenge: ['dimensional_translation'],
    interaction: ['spatial_locate'],
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
      userAnswer: [userVal.x, userVal.y],
      targetValue: [q.targetProjectedPoint.x, q.targetProjectedPoint.y],
      targetPoint3D: q.targetPoint3D,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspStructure3DView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default perspStructure3DCard;
