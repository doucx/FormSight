import { Split } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { ParallelView } from './ParallelView';

export const angleParallelCard: CardManifest<
  AngleQuestionData,
  AngleHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_parallel_2afc',
  groupId: 'angle',
  mode: 'PARALLEL_ALIGNMENT_2AFC',
  icon: Split,
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
  },
  hasWeaknessAnalytics: false,
  locales: {
    'zh-CN': {
      title: '平行线基准辨识',
      desc: '观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。',
      instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
      badge: '平行线基准辨识',
    },
    'en-US': {
      title: 'Parallel Alignment',
      desc: 'Observe the prompt orientation and identify the strictly parallel line below (2AFC).',
      instruction: 'Find the line that is strictly parallel to the prompt line (Keys 1 / 2).',
      badge: 'Parallel Alignment',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleQuestion('PARALLEL_ALIGNMENT_2AFC', level),
    evaluateAnswer: (userVal, q) => checkAngleHit(userVal, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal, mode) => ({
      mode,
      userAnswer: userVal,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ParallelView
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

export default angleParallelCard;