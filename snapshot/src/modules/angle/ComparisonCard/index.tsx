import { Columns } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { ComparisonView } from './ComparisonView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const angleComparisonCard: CardManifest<
  AngleQuestionData,
  AngleHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_comparison_2afc',
  groupId: 'angle',
  mode: 'ANGLE_COMPARISON_2AFC',
  icon: Columns,
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
  },
  hasWeaknessAnalytics: false,
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateAngleQuestion('ANGLE_COMPARISON_2AFC', level),
    evaluateAnswer: (userVal, q) => checkAngleHit(userVal, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal) => ({
      userAnswer: userVal,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ComparisonView
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

export default angleComparisonCard;
