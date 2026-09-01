import { Compass } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AngleEstimationView } from './AngleEstimationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { AngleEstimationHitResult, AngleEstimationQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export interface AngleEstimationSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export const angleEstimationCard: CardManifest<
  AngleEstimationQuestion,
  AngleEstimationHitResult,
  number,
  AngleEstimationSettings
> = {
  id: 'angle_estimation',
  domain: 'form_and_proportion',
  icon: Compass,
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['absolute_estimation'],
    interaction: ['continuous_mod'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userAnswer: userVal,
      targetValue: q.targetAngleDeg,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AngleEstimationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings?.sliderHitMargin ?? 12}
        showToleranceBand={settings?.showToleranceBand ?? true}
      />
    ),
  },
};

export default angleEstimationCard;