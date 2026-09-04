import { Palette } from 'lucide-preact';

import type { BaseModuleSettings, CardManifest } from '@formsight/card-sdk';
import { AbsPaletteClusteringView } from './AbsPaletteClusteringView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absPaletteClusteringCard: CardManifest<
  QuestionData,
  HitResult,
  number,
  BaseModuleSettings
> = {
  id: 'abs_palette_clustering',
  domain: 'color_and_value',
  tags: {
    domain: ['color_and_value'],
    path: ['extraction'],
    interaction: ['multi_choice'],
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
      correctIndex: q.correctPaletteIndex,
      errorValue: hitResult.errorValue,
    }),
  },
  ui: {
    icon: Palette,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsPaletteClusteringView
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

export default absPaletteClusteringCard;
