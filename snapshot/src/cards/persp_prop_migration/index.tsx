import { ArrowRightLeft } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { PerspPropMigrationView } from './PerspPropMigrationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspPropMigrationHitResult, PerspPropMigrationQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const perspPropMigrationCard: CardManifest<
  PerspPropMigrationQuestion,
  PerspPropMigrationHitResult,
  Point,
  BaseModuleSettings
> = {
  id: 'persp_prop_migration',
  domain: 'form_and_proportion',
  icon: ArrowRightLeft,
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['relational_mapping'],
    challenge: ['working_memory', 'dimensional_translation'],
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
      targetValue: [q.targetDivisionPoint.x, q.targetDivisionPoint.y],
      targetRatio: q.targetRatio,
      ratioProgress: hitResult.ratioProgress,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspPropMigrationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default perspPropMigrationCard;