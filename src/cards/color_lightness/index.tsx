import { Eye } from 'lucide-preact';

import {
  type CardManifest,
  SettingToggleItem,
  expDecayInterpolate,
  hsvToOkLab,
  useCardTranslation,
} from '@formsight/card-sdk';
import { ColorLightnessView } from './ColorLightnessView';
import { createColorLightnessAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type {
  ColorLightnessHitResult,
  ColorLightnessQuestionData,
  ColorLightnessSettings,
} from './types';

/**
 * 将 OKLab Lightness 转换为对应的物理真实中性灰 sRGB Hex
 */
function okLabLightnessToNeutralHex(l: number): string {
  // L -> linear RGB: 在 a=0, b=0 下，lCone = mCone = sCone = L^3
  const linear = Math.max(0, Math.min(1, l ** 3));
  // linear RGB -> sRGB (gamma 变换)
  const srgb = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  const byte = Math.round(Math.max(0, Math.min(1, srgb)) * 255);
  const hex = byte.toString(16).padStart(2, '0').toUpperCase();
  return `#${hex}${hex}${hex}`;
}

export function generateLightnessQuestion(level: number): ColorLightnessQuestionData {
  const id = `cl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  // 1. 随机生成具备充分视觉表现力的 HSV 目标色
  const targetH = Math.floor(Math.random() * 360);
  const targetS = Math.floor(Math.random() * 81) + 20; // 20%~100% 覆盖不同纯度
  const targetV = Math.floor(Math.random() * 81) + 20; // 20%~100%

  // 2. 提取 OKLab L 轴感知明度
  const lab = hsvToOkLab(targetH, targetS, targetV);
  const targetL = lab[0];
  const truthPercentage = Math.round(targetL * 100);
  const neutralGrayHex = okLabLightnessToNeutralHex(targetL);

  // 3. 难度容错指数衰减：Level 1 为 12%，Level 35 为 2%
  const tolerance = Math.round(expDecayInterpolate(12, 2, clampedLevel, 35) * 10) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    targetH,
    targetS,
    targetV,
    targetL,
    truthPercentage,
    neutralGrayHex,
    tolerance,
  };
}

export function evaluateLightnessAnswer(
  userVal: number,
  question: ColorLightnessQuestionData,
): ColorLightnessHitResult {
  const errorValue = Math.round(Math.abs(userVal - question.truthPercentage) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userValue: userVal,
    targetValue: question.truthPercentage,
    errorValue,
    tolerance: question.tolerance,
  };
}

export const colorLightnessCard: CardManifest<
  ColorLightnessQuestionData,
  ColorLightnessHitResult,
  number,
  ColorLightnessSettings
> = {
  id: 'color_lightness',
  domain: 'color_and_value',
  tags: {
    domain: ['color_and_value'],
    path: ['absolute_estimation'],
    challenge: ['illusion_piercing'],
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
    generateQuestion: (level) => generateLightnessQuestion(level),
    evaluateAnswer: (userVal, q) => evaluateLightnessAnswer(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      targetL: q.targetL,
      truthPercentage: q.truthPercentage,
      userValue: userVal,
      errorValue: hitResult.errorValue,
    }),
  },
  ui: {
    icon: Eye,
    renderSettings: ({ settings, updateSettings }) => {
      const { t } = useCardTranslation('color_lightness');
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
      <ColorLightnessView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        settings={settings}
      />
    ),
  },
  analytics: {
    views: createColorLightnessAnalytics(),
  },
};

export default colorLightnessCard;
