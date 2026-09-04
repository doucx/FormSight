import { Sliders } from 'lucide-preact';

import {
  type BaseModuleSettings,
  type CardManifest,
  SettingToggleItem,
  useCardTranslation,
} from '@formsight/card-sdk';
import { PerspVpConvergenceView } from './PerspVpConvergenceView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspVpHitResult, PerspVpQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export interface PerspVpSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export const perspVpConvergenceCard: CardManifest<
  PerspVpQuestion,
  PerspVpHitResult,
  number,
  PerspVpSettings
> = {
  id: 'persp_vp_convergence',
  domain: 'spatial_structure',
  tags: {
    domain: ['spatial_structure'],
    path: ['relational_mapping'],
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
      tolerance: hitResult.tolerance,
    }),
  },
  ui: {
    icon: Sliders,
    renderSettings: ({ settings, updateSettings }) => {
      const { t } = useCardTranslation('persp_vp_convergence');
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
      <PerspVpConvergenceView
        key={question.id}
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

export default perspVpConvergenceCard;
