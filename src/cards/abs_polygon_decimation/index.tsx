import { Maximize2 } from 'lucide-preact';

import type { BaseModuleSettings, CardManifest } from '@formsight/card-sdk';
import { AbsPolygonDecimationView } from './AbsPolygonDecimationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absPolygonDecimationCard: CardManifest<
  QuestionData,
  HitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'abs_polygon_decimation',
  domain: 'form_and_proportion',
  tags: {
    domain: ['form_and_proportion'],
    path: ['extraction'],
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
      userAnswer: userVal,
      correctChoice: q.correctPolyChoice,
      errorValue: hitResult.errorValue,
    }),
  },
  ui: {
    icon: Maximize2,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsPolygonDecimationView
        key={question.id}
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

export default absPolygonDecimationCard;
