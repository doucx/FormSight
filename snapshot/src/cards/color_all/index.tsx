import { Palette } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type ColorHitResult,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../../core/color/colorUtils';
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorAllView } from './ColorAllView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const colorAllCard: CardManifest<
  ColorQuestionData,
  ColorHitResult,
  [number, number, number],
  ColorSenseSettings
> = {
  id: 'color_all',
  domain: 'color_and_value',
  icon: Palette,
  tags: {
    domain: ['color_and_value'],
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
    {
      type: 'toggle',
      key: 'enableHoverColorPreview',
      title: 'settings.enableHoverColorPreviewTitle',
      description: 'settings.enableHoverColorPreviewDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
  training: {
    generateQuestion: (level) => generateColorQuestion('ALL', level),
    evaluateAnswer: (userVal, q) => checkColorHit('ALL', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: userVal,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ColorAllView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        settings={settings}
      />
    ),
  },
};

export default colorAllCard;