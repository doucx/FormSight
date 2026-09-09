import { Sparkles } from 'lucide-preact';

import type { BaseModuleSettings, CardManifest } from '@formsight/card-sdk';
import { AbsTdPalette4afcView } from './AbsTdPalette4afcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absTdPalette4afcCard: CardManifest<
  QuestionData,
  HitResult,
  number,
  BaseModuleSettings
> = {
  id: 'abs_td_palette_4afc',
  domain: 'color_and_value',
  tags: {
    domain: ['color_and_value'],
    path: ['concretization'],
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
      correctIndex: q.correctPatternIndex,
      errorValue: hitResult.errorValue,
    }),
  },
  ui: {
    icon: Sparkles,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdPalette4afcView
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

export default absTdPalette4afcCard;
