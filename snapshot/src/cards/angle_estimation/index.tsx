import { Compass } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { useCardTranslation } from '../../core/i18n';
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
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('angle_estimation');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={settings.showToleranceBand as boolean ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
      </div>
    );
  },
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
