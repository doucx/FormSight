import { Target } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { StarSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { createStarAnalyticsViews } from '../_shared/analytics';
import { STAR_SCHEMAS } from '../_shared/schemas';
import type { StarHitResult } from '../_shared/types';
import { SingleAnchorView } from './SingleAnchorView';
import { type SingleAnchorQuestion, generateSingleAnchorQuestion } from './generator';

export const starSingleCard: CardManifest<
  SingleAnchorQuestion,
  StarHitResult,
  { clickPoint: Point; hitResult: StarHitResult },
  StarSettings
> = {
  id: 'star_single',
  groupId: 'star',
  icon: Target,
  tags: {
    domain: ['spatial_structure'],
    path: ['absolute_estimation'],
    interaction: ['spatial_locate'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: STAR_SCHEMAS,
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  locales: {
    'zh-CN': {
      title: '单锚点模式',
      desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
      instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
      badge: '单锚点',
      settings: {
        gridSizeTitle: '干扰点网格大小',
        targetingTitle: '弱点专项靶向强化',
        targetingSubTitle: '选择需要靶向强化的角度扇区：',
      },
      sectors: {
        e: '正东 (0°)',
        ne: '东北 (45°)',
        n: '正北 (90°)',
        nw: '西北 (135°)',
        w: '正西 (180°)',
        sw: '西南 (225°)',
        s: '正南 (270°)',
        se: '东南 (315°)',
      },
      analytics: {
        spatialBias: {
          tabLabel: '空间偏置散点',
          title: '单锚点 · 空间偏置分析',
          subTitle: '中心绿点为绝对真理点，散点分布揭示手眼定位偏移',
          cardTitle: '系统空间偏置 (Systematic Bias)',
          desc: '中心为绝对真理点。散点越收敛代表空间直觉越敏锐。',
          avgDx: '平均 X 轴偏移:',
          avgDy: '平均 Y 轴偏移:',
          avgDist: '平均像素误差:',
          right: '右 +{{val}}',
          left: '左 {{val}}',
          down: '下 +{{val}}',
          up: '上 {{val}}',
        },
        directionalCompass: {
          tabLabel: '八向方位罗盘',
          title: '单锚点 · 八向方位敏感度',
          subTitle: '洞察你在 8 个极坐标视角扇区上的定位准确率分布',
          cardTitle: '方位盲区诊断',
          weakestHint: '你在 {{sector}} 方位上命中率最低：',
          accuracyRate: '{{accuracy}}% 准确率',
          needMoreTrials: '各方位完成至少 3 题后可生成薄弱扇区诊断。',
        },
      },
    },
    'en-US': {
      title: 'Single Anchor',
      desc: 'Single central anchor to evaluate polar angle and distance estimation.',
      instruction:
        'Observe the target relative to the central anchor on the left, then locate it in the grid on the right.',
      badge: 'Single Anchor',
      settings: {
        gridSizeTitle: 'Distractor Grid Dimensions',
        targetingTitle: 'Targeted Weakness Reinforcement',
        targetingSubTitle: 'Select angle sectors for targeted training:',
      },
      sectors: {
        e: 'East (0°)',
        ne: 'NE (45°)',
        n: 'North (90°)',
        nw: 'NW (135°)',
        w: 'West (180°)',
        sw: 'SW (225°)',
        s: 'South (270°)',
        se: 'SE (315°)',
      },
      analytics: {
        spatialBias: {
          tabLabel: 'Spatial Bias',
          title: 'Single Anchor · Spatial Bias Analysis',
          subTitle:
            'Center point represents ground truth. Point spread reveals systematic hand-eye offset.',
          cardTitle: 'Systematic Bias',
          desc: 'Center is the ground truth. Tighter cluster indicates sharper spatial intuition.',
          avgDx: 'Avg X Offset:',
          avgDy: 'Avg Y Offset:',
          avgDist: 'Avg Pixel Error:',
          right: 'Right +{{val}}',
          left: 'Left {{val}}',
          down: 'Down +{{val}}',
          up: 'Up {{val}}',
        },
        directionalCompass: {
          tabLabel: '8-Way Compass',
          title: 'Single Anchor · 8-Directional Sensitivity',
          subTitle: 'Insights into your localization accuracy across 8 polar sectors',
          cardTitle: 'Directional Blindspot',
          weakestHint: 'Lowest accuracy found in sector {{sector}}:',
          accuracyRate: '{{accuracy}}% accuracy',
          needMoreTrials:
            'Complete at least 3 trials in each sector to generate blindspot diagnostics.',
        },
      },
    },
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) => generateSingleAnchorQuestion(level, settings),
    evaluateAnswer: (userVal, q) =>
      evaluatePointGridHit(userVal.clickPoint, q.targetB, q.distractorPoints),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <SingleAnchorView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarAnalyticsViews(),
  },
};

export default starSingleCard;
