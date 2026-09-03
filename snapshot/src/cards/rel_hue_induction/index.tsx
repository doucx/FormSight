import { Palette } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelHueInductionView } from './RelHueInductionView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const relHueInductionCard: CardManifest<
  QuestionData,
  HitResult,
  [number, number, number],
  RelativeColorSettings
> = {
  id: 'rel_hue_induction',
  domain: 'color_and_value',
  icon: Palette,
  tags: {
    domain: ['color_and_value'],
    path: ['relational_mapping'],
    challenge: ['illusion_piercing'],
    interaction: ['multi_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, q) => checkHit(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      bgLeft: q.bgLeft,
      bgRight: q.bgRight,
      targetLeftCenter: q.targetLeftCenter,
      idealRightCenter: q.idealRightCenter,
      userRightColor: userVal,
      options: q.options,
      correctIndex: q.correctIndex,
      deltaEError: hitResult.deltaEError,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelHueInductionView
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

export default relHueInductionCard;