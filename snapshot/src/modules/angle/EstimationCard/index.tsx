import { Compass } from 'lucide-preact';
import type { SettingFieldSchema } from '../../../components/settings/DynamicDomainSettings';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { EstimationView } from './EstimationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'cards.angle_estimation.settings.showToleranceBandTitle',
    description: 'cards.angle_estimation.settings.showToleranceBandDesc',
  },
];

export const angleEstimationCard: CardManifest<
  AngleQuestionData,
  AngleHitResult,
  number,
  BaseModuleSettings
> = {
  id: 'angle_estimation',
  groupId: 'angle',
  mode: 'ANGLE_ESTIMATION',
  icon: Compass,
  tags: {
    domain: ['form_and_proportion'],
    path: ['absolute_estimation'],
    interaction: ['continuous_mod'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: SLIDER_COMMON_SCHEMAS,
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateAngleQuestion('ANGLE_ESTIMATION', level),
    evaluateAnswer: (userVal, q) => checkAngleHit(userVal, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal) => ({
      userAnswer: userVal,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <EstimationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={(settings.sliderHitMargin as number) ?? 12}
        showToleranceBand={(settings.showToleranceBand as boolean) ?? true}
        showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
      />
    ),
  },
};

export default angleEstimationCard;
