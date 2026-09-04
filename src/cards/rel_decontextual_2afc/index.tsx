import { Columns } from 'lucide-preact';

import type { CardManifest, RelativeColorSettings } from '@formsight/card-sdk';
import { RelDecontextual2AfcView } from './RelDecontextual2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const relDecontextual2AfcCard: CardManifest<
  QuestionData,
  HitResult,
  'A' | 'B',
  RelativeColorSettings
> = {
  id: 'rel_decontextual_2afc',
  domain: 'color_and_value',
  tags: {
    domain: ['color_and_value'],
    path: ['relational_mapping'],
    challenge: ['illusion_piercing'],
    interaction: ['binary_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  engine: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, q) => checkHit(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, _hitResult, userVal) => ({
      userChoice: userVal,
      correctChoice: q.largerPhysicalSide,
      physicalValueDiff: q.physicalValueDiff,
    }),
  },
  ui: {
    icon: Columns,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelDecontextual2AfcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
      />
    ),
  },
};

export default relDecontextual2AfcCard;
