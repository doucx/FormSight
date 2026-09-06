import { Cuboid } from 'lucide-preact';
import { type CardManifest, type BaseModuleSettings } from '@formsight/card-sdk';
import { SpatialFractalView } from './SpatialFractalView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const spatialFractalCard: CardManifest<QuestionData, HitResult, number, BaseModuleSettings> = {
  id: 'spatial_fractal',
  domain: 'spatial_structure',
  tags: {
    domain: ['spatial_structure'],
    path: ['extraction'],
    interaction: ['multi_choice'],
    status: 'experimental',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultSettings: {
    showCanvasHints: true,
  },
  engine: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, q) => checkHit(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
  },
  ui: {
    icon: Cuboid,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <SpatialFractalView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default spatialFractalCard;