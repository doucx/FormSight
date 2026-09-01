import { Columns } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type RelativeColorHitResult,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateDecontextual2AfcQuestion,
} from '../../core/color/relativeColor';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelDecontextual2AfcView } from './RelDecontextual2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const relDecontextual2AfcCard: CardManifest<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  'A' | 'B',
  RelativeColorSettings
> = {
  id: 'rel_decontextual_2afc',
  domain: 'color_and_value',
  icon: Columns,
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
  training: {
    generateQuestion: (level) => generateDecontextual2AfcQuestion(level),
    evaluateAnswer: (userVal, q) => checkRelativeColorHit('DECONTEXTUAL_2AFC', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, _hitResult, userVal) => ({
      userChoice: userVal,
      correctChoice: q.largerPhysicalSide,
      physicalValueDiff: q.physicalValueDiff,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelDecontextual2AfcView
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
