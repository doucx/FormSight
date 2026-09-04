import { Sparkles } from 'lucide-preact';

import { AbsTdPalette2afcView } from './AbsTdPalette2afcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';
import { BaseModuleSettings, CardManifest } from '@formsight/card-sdk';

export const absTdPalette2afcCard: CardManifest<
  QuestionData,
  HitResult,
  number,
  BaseModuleSettings
> = {
  id: 'abs_td_palette_2afc',
  domain: 'color_and_value',
  icon: Sparkles,
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
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userAnswer: userVal,
      correctIndex: q.correctPatternIndex,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdPalette2afcView
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

export default absTdPalette2afcCard;
