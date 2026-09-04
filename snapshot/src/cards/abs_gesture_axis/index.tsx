import { RotateCw } from 'lucide-preact';

import {
  type BaseModuleSettings,
  type CardManifest,
  SettingToggleItem,
  useCardTranslation,
} from '@formsight/card-sdk';
import { AbsGestureAxisView } from './AbsGestureAxisView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absGestureAxisCard: CardManifest<QuestionData, HitResult, number, BaseModuleSettings> =
  {
    id: 'abs_gesture_axis',
    domain: 'rhythm_and_notan',
    tags: {
      domain: ['rhythm_and_notan'],
      path: ['extraction'],
      interaction: ['continuous_mod'],
      status: 'stable',
    },
    locales: {
      'zh-CN': zhCN,
      'en-US': enUS,
    },
    defaultSettings: {
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    engine: {
      generateQuestion: (level) => generateQuestion(level),
      evaluateAnswer: (userVal, question) => checkHit(userVal, question),
      isHit: (res) => res.isHit,
      getQuestionLevel: (q) => q.difficultyLevel,
      extractRecordDetails: (q, hitResult, userVal) => ({
        userAnswer: userVal,
        targetValue: q.targetAngleDeg,
        errorValue: hitResult.errorValue,
      }),
    },
    ui: {
      icon: RotateCw,
      renderSettings: ({ settings, updateSettings }) => {
        const { t } = useCardTranslation('abs_gesture_axis');
        return (
          <div className="space-y-4">
            <SettingToggleItem
              title={t('settings.showToleranceBandTitle')}
              description={t('settings.showToleranceBandDesc')}
              checked={(settings.showToleranceBand as boolean) ?? true}
              onChange={(val) => updateSettings({ showToleranceBand: val })}
            />
          </div>
        );
      },
      renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
        <AbsGestureAxisView
          key={question.id}
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={onAnswer}
          disabled={disabled}
          hitMargin={settings.sliderHitMargin as number}
          showToleranceBand={settings.showToleranceBand as boolean}
          showCanvasHints={settings.showCanvasHints as boolean}
        />
      ),
    },
  };

export default absGestureAxisCard;
