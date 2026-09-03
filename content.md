我已经梳理出针对两个 **P0 级结构性坏味道** 的完整解耦与重构方案：

1. **彻底拆解 `relativeColor.ts` 集中式伪多态**：为 `rel_decontextual_2afc`、`rel_hue_induction`、`rel_lightness_induction`、`rel_vector_shift` 建立各自目录内高内聚、独立的 `types.ts` 与 `utils/generator.ts`，消除膨胀的 Optional 联合 DTO 与 View 层的死值兜底，完全删除 `src/core/color/relativeColor.ts`。
2. **纠正 `star_*` 与 `neg_vertex_fitting` 的 `evaluateAnswer` 契约逆转**：将业务判定逻辑从 View 层剥离并回归到卡片清单的 `evaluateAnswer` 纯函数中，`TAnswerVal` 统一回归为纯粹的 `Point`，彻底修复数据流职责倒置。

以下为执行此架构重构的完整实施计划。

## [WIP] refactor(cards): 彻底消除 relativeColor 伪多态与 star/vertex 评估契约逆转

### 用户需求
对代码库中被识别为 P0 优先级的“基于控制标记的伪多态与类型退化”进行彻底重构：
1. 拆解 `relativeColor.ts`，为 4 个相对色彩卡片赋予独立的强类型契约与生成/评估闭环。
2. 修复 `star_single`、`star_double_h`、`star_double_r` 以及 `neg_vertex_fitting` 的契约逆转（`evaluateAnswer: (val) => val.hitResult`）问题，将评估逻辑收敛至领域层。

### 评论
该重构是 FormSight 核心架构从“面向过程的集中式控制路由”走向“标准微内核卡片体系（Micro-Kernel Manifest Architecture）”的关键一步。彻底消除集中联合类型和契约逆转后，每个卡片不仅类型自包含且无冗余字段，还能够保证测试和静态推导的绝对确定性。

### 目标
1. 为 4 个相对色彩卡片创建自包含的 `types.ts` 与 `utils/generator.ts`，重构对应的 `index.tsx` 和 View 组件，删除 `src/core/color/relativeColor.ts`。
2. 改造 `star_single`、`star_double_h`、`star_double_r`、`neg_vertex_fitting`：
   - 提取 `checkHit(clickPoint, question)` 作为领域评估函数；
   - View 仅负责有效点击校验并提交原始 `Point`；
   - `CardManifest` 中的 `TAnswerVal` 修正为 `Point`，`evaluateAnswer` 恢复其计算判定的单一职责。

### 基本原理
- **消除控制耦合与膨胀接口**：通过将 4 个形态各异的相对色彩卡片下沉为卡片私有的领域模型，消除了拥有 15 个全可选字段的 `RelativeColorQuestionData`，代之以各个卡片语义明确且均为必需属性的强类型数据结构。
- **恢复单向数据流与架构分层**：UI View 只负责接收交互输入并向容器发出单纯的意图事件（`onAnswer(point)`），`TrainingSession` 容器驱动领域清单的 `evaluateAnswer(userVal, question)` 进行无副作用的命中判定，杜绝在 UI 渲染回调中提前偷跑业务逻辑。

### 标签
#intent/refine #flow/ready #priority/critical #comp/interfaces #concept/state #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/type-degradation-elimination #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 构建 `rel_decontextual_2afc` 专属强类型与生成器

为环境穿透判别卡片建立强类型的 `QuestionData` 与 `HitResult`，下沉其生成与评估逻辑。

~~~~~act
write_file
src/cards/rel_decontextual_2afc/types.ts
~~~~~
~~~~~typescript
export interface QuestionData {
  id: string;
  difficultyLevel: number;
  bgLeft: [number, number, number];
  bgRight: [number, number, number];
  centerColorA: [number, number, number];
  centerColorB: [number, number, number];
  largerPhysicalSide: 'A' | 'B';
  physicalValueDiff: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  physicalValueDiff: number;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/rel_decontextual_2afc/utils/generator.ts
~~~~~
~~~~~typescript
import type { HitResult, QuestionData } from '../types';

export function generateQuestion(level: number): QuestionData {
  const id = `adc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const t = (clampedLevel - 1) / 34;
  const diffPercent = Math.max(1.5, Math.round(18 * (1.5 / 18) ** t * 10) / 10);

  const largerPhysicalSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
  const isTrapTrial = Math.random() < 0.5;
  const sideForBrightBg: 'A' | 'B' = isTrapTrial
    ? largerPhysicalSide
    : largerPhysicalSide === 'A'
      ? 'B'
      : 'A';

  const brightBgVal = Math.floor(Math.random() * 15) + 80;
  const darkBgVal = Math.floor(Math.random() * 15) + 10;

  const bgLeftVal = sideForBrightBg === 'A' ? brightBgVal : darkBgVal;
  const bgRightVal = sideForBrightBg === 'B' ? brightBgVal : darkBgVal;

  const baseHue = Math.floor(Math.random() * 360);
  const baseSat = Math.floor(Math.random() * 20);

  const bgLeft: [number, number, number] = [baseHue, baseSat, bgLeftVal];
  const bgRight: [number, number, number] = [baseHue, baseSat, bgRightVal];

  const baseCenterVal = Math.floor(Math.random() * 20) + 40;
  const valA =
    largerPhysicalSide === 'A' ? baseCenterVal + diffPercent : baseCenterVal - diffPercent;
  const valB =
    largerPhysicalSide === 'B' ? baseCenterVal + diffPercent : baseCenterVal - diffPercent;

  const centerColorA: [number, number, number] = [baseHue, baseSat, Math.round(valA)];
  const centerColorB: [number, number, number] = [baseHue, baseSat, Math.round(valB)];

  return {
    id,
    difficultyLevel: clampedLevel,
    bgLeft,
    bgRight,
    centerColorA,
    centerColorB,
    largerPhysicalSide,
    physicalValueDiff: diffPercent,
    tolerance: diffPercent,
  };
}

export function checkHit(userChoice: 'A' | 'B', question: QuestionData): HitResult {
  const isHit = userChoice === question.largerPhysicalSide;
  return {
    isHit,
    userChoice,
    correctChoice: question.largerPhysicalSide,
    physicalValueDiff: question.physicalValueDiff,
    errorValue: isHit ? 0 : question.physicalValueDiff,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { hsvToHex } from '../../core/color/colorUtils';
import { useCardTranslation } from '../../core/i18n';
import { PALETTE } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';

export interface RelDecontextual2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function RelDecontextual2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: RelDecontextual2AfcViewProps) {
  const { t } = useCardTranslation('rel_decontextual_2afc');
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...question.bgLeft);
  const hexBgB = hsvToHex(...question.bgRight);
  const hexCenterA = hsvToHex(...question.centerColorA);
  const hexCenterB = hsvToHex(...question.centerColorB);

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('views.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('common.areaA'),
        isCorrect: isAHit,
        badge: isAHit
          ? t('views.physicallyBrighter', {
              v: question.centerColorA[2],
            })
          : t('views.physicallyDarker', {
              v: question.centerColorA[2],
            }),
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? PALETTE.slate[500] : hexBgA }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: isBHit
          ? t('views.physicallyBrighter', {
              v: question.centerColorB[2],
            })
          : t('views.physicallyDarker', {
              v: question.centerColorB[2],
            }),
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? PALETTE.slate[500] : hexBgB }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
write_file
src/cards/rel_decontextual_2afc/index.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelDecontextual2AfcView } from './RelDecontextual2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const relDecontextual2AfcCard: CardManifest<
  QuestionData,
  HitResult,
  'A' | 'B',
  RelativeColorSettings
> = {
  id: 'rel_decontextual_2afc',
  domain: 'color_and_value',
  icon: Columns,
  tags: {
    domain: ['color_and_value'],
    path: ['relational_mapping'],
    challenge: ['illusion_piercing'],
    interaction: ['binary_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, q) => checkHit(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, _hitResult, userVal) => ({
      userChoice: userVal,
      correctChoice: q.largerPhysicalSide,
      physicalValueDiff: q.physicalValueDiff,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelDecontextual2AfcView
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

export default relDecontextual2AfcCard;
~~~~~

#### Acts 2: 构建 `rel_hue_induction` 专属强类型与生成器

~~~~~act
write_file
src/cards/rel_hue_induction/types.ts
~~~~~
~~~~~typescript
export interface QuestionData {
  id: string;
  difficultyLevel: number;
  bgLeft: [number, number, number];
  bgRight: [number, number, number];
  targetLeftCenter: [number, number, number];
  idealRightCenter: [number, number, number];
  options: [number, number, number][];
  correctIndex: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userColor: [number, number, number];
  targetColor: [number, number, number];
  deltaEError: number;
  tolerance: number;
  selectedIndex?: number;
}
~~~~~

~~~~~act
write_file
src/cards/rel_hue_induction/utils/generator.ts
~~~~~
~~~~~typescript
import {
  calcDeltaEOk,
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  getTargetDeltaEForLevel,
  hsvToOkLab,
  okLabToHsv,
} from '../../../core/color/oklchUtils';
import { createShuffledChoices } from '../../../core/math/mathUtils';
import type { HitResult, QuestionData } from '../types';

export function calcInductionShift(
  bgLab: [number, number, number],
  centerLab: [number, number, number],
  intensity = 0.22,
): [number, number, number] {
  const dL = bgLab[0] - centerLab[0];
  const da = bgLab[1] - centerLab[1];
  const db = bgLab[2] - centerLab[2];
  return [-dL * intensity, -da * intensity, -db * intensity];
}

export function calcCompensatedRightColor(
  bgLeftLab: [number, number, number],
  centerLeftLab: [number, number, number],
  bgRightLab: [number, number, number],
  intensity = 0.22,
): [number, number, number] {
  const shiftL = calcInductionShift(bgLeftLab, centerLeftLab, intensity);
  const perceivedL: [number, number, number] = [
    centerLeftLab[0] + shiftL[0],
    centerLeftLab[1] + shiftL[1],
    centerLeftLab[2] + shiftL[2],
  ];

  const factor = 1 + intensity;
  return [
    (perceivedL[0] + intensity * bgRightLab[0]) / factor,
    (perceivedL[1] + intensity * bgRightLab[1]) / factor,
    (perceivedL[2] + intensity * bgRightLab[2]) / factor,
  ];
}

export function generateQuestion(level: number): QuestionData {
  const id = `ahi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);
  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);

  const bgLHue = Math.floor(Math.random() * 360);
  const bgLSat = Math.floor(Math.random() * 30) + 70;
  const bgLVal = Math.floor(Math.random() * 30) + 50;
  const bgLeft: [number, number, number] = [bgLHue, bgLSat, bgLVal];

  const bgRHue = (bgLHue + 180 + (Math.floor(Math.random() * 40) - 20)) % 360;
  const bgRSat = Math.floor(Math.random() * 25);
  const bgRVal = Math.floor(Math.random() * 30) + 50;
  const bgRight: [number, number, number] = [bgRHue, bgRSat, bgRVal];

  const centerHue = (bgLHue + 60 + Math.floor(Math.random() * 120)) % 360;
  const centerSat = Math.floor(Math.random() * 30) + 30;
  const centerVal = Math.floor(Math.random() * 30) + 45;
  const targetLeftCenter: [number, number, number] = [centerHue, centerSat, centerVal];

  const labBgL = hsvToOkLab(...bgLeft);
  const labCenterL = hsvToOkLab(...targetLeftCenter);
  const labBgR = hsvToOkLab(...bgRight);

  const idealLabR = calcCompensatedRightColor(labBgL, labCenterL, labBgR, 0.22);
  const idealRightCenter = okLabToHsv(idealLabR);

  const distractors = generateTetrahedralDistractors(idealLabR, distractorDeltaE);
  const { options, correctIndex } = createShuffledChoices(idealRightCenter, distractors);

  return {
    id,
    difficultyLevel: clampedLevel,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    options,
    correctIndex,
    tolerance,
  };
}

export function checkHit(userColor: [number, number, number], question: QuestionData): HitResult {
  const labTarget = hsvToOkLab(...question.idealRightCenter);
  const labUser = hsvToOkLab(...userColor);
  const deltaEError = calcDeltaEOk(labTarget, labUser);

  const selectedIndex = question.options.findIndex(
    (opt) => opt[0] === userColor[0] && opt[1] === userColor[1] && opt[2] === userColor[2],
  );

  const isHit =
    selectedIndex !== -1
      ? selectedIndex === question.correctIndex
      : deltaEError <= question.tolerance;

  return {
    isHit,
    userColor,
    targetColor: question.idealRightCenter,
    deltaEError: Math.round(deltaEError * 1000) / 1000,
    tolerance: question.tolerance,
    selectedIndex: selectedIndex !== -1 ? selectedIndex : undefined,
  };
}
~~~~~

~~~~~act
write_file
src/cards/rel_hue_induction/RelHueInductionView.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { DualViewportContainer } from '../../components/common/DualViewportContainer';
import { StandardNafcView } from '../../components/common/StandardNafcView';
import { hsvToHex } from '../../core/color/colorUtils';
import { useCardTranslation } from '../../core/i18n';
import type { HitResult, QuestionData } from './types';

export interface RelHueInductionViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (chosenColor: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function RelHueInductionView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: RelHueInductionViewProps) {
  const { t } = useCardTranslation('rel_hue_induction');
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const { bgLeft, bgRight, targetLeftCenter, idealRightCenter, options, correctIndex } = question;

  useEffect(() => {
    if (question.id) {
      setSelectedIdx(0);
    }
  }, [question.id]);

  const bgLeftHex = hsvToHex(...bgLeft);
  const bgRightHex = hsvToHex(...bgRight);
  const centerLeftHex = hsvToHex(...targetLeftCenter);
  const idealRightHex = hsvToHex(...idealRightCenter);

  const activeColor = options[selectedIdx] ?? idealRightCenter;
  const activeRightHex = hsvToHex(...activeColor);

  const nafcOptions = options.map((opt, idx) => {
    const isTarget = idx === correctIndex;
    const hexVal = hsvToHex(...opt);
    return {
      key: `hue-opt-${idx}-${hexVal}`,
      title: t('common.candidateN', { num: idx + 1 }),
      value: opt,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-border/60 p-1 flex items-center justify-center bg-card">
          <div
            className="w-full h-full rounded-lg shadow-sm border border-border/50"
            style={{ backgroundColor: hexVal }}
          />
        </div>
      ),
    };
  });

  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText={t('views.hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIdx}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText={t('common.confirmSpace')}
      onSelectIndex={(idx) => setSelectedIdx(idx)}
      onAnswer={(_idx, option) => {
        const chosen = option.value ?? activeColor;
        onAnswer(chosen);
      }}
      preview={
        <DualViewportContainer
          leftTitle={t('views.leftBase')}
          rightTitle={t('views.rightPreview')}
          leftContent={
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
              style={{ backgroundColor: bgLeftHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all"
                style={{ backgroundColor: centerLeftHex }}
              />
            </div>
          }
          rightContent={
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
              style={{ backgroundColor: bgRightHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
                style={{ backgroundColor: activeRightHex }}
              >
                {showAnswer && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1/2"
                    style={{ backgroundColor: idealRightHex }}
                    title={t('views.splitComparisonTooltip')}
                  />
                )}
              </div>
            </div>
          }
        />
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/cards/rel_hue_induction/index.tsx
~~~~~
~~~~~typescript
import { Palette } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelHueInductionView } from './RelHueInductionView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const relHueInductionCard: CardManifest<
  QuestionData,
  HitResult,
  [number, number, number],
  RelativeColorSettings
> = {
  id: 'rel_hue_induction',
  domain: 'color_and_value',
  icon: Palette,
  tags: {
    domain: ['color_and_value'],
    path: ['relational_mapping'],
    challenge: ['illusion_piercing'],
    interaction: ['multi_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, q) => checkHit(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      bgLeft: q.bgLeft,
      bgRight: q.bgRight,
      targetLeftCenter: q.targetLeftCenter,
      idealRightCenter: q.idealRightCenter,
      userRightColor: userVal,
      options: q.options,
      correctIndex: q.correctIndex,
      deltaEError: hitResult.deltaEError,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelHueInductionView
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

export default relHueInductionCard;
~~~~~

#### Acts 3: 构建 `rel_lightness_induction` 专属强类型与生成器

~~~~~act
write_file
src/cards/rel_lightness_induction/types.ts
~~~~~
~~~~~typescript
export interface QuestionData {
  id: string;
  difficultyLevel: number;
  bgLeft: [number, number, number];
  bgRight: [number, number, number];
  targetLeftCenter: [number, number, number];
  idealRightCenter: [number, number, number];
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userColor: [number, number, number];
  targetColor: [number, number, number];
  deltaEError: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/rel_lightness_induction/utils/generator.ts
~~~~~
~~~~~typescript
import {
  calcDeltaEOk,
  getTargetDeltaEForLevel,
  hsvToOkLab,
  okLabToHsv,
} from '../../../core/color/oklchUtils';
import type { HitResult, QuestionData } from '../types';

export function calcInductionShift(
  bgLab: [number, number, number],
  centerLab: [number, number, number],
  intensity = 0.25,
): [number, number, number] {
  const dL = bgLab[0] - centerLab[0];
  const da = bgLab[1] - centerLab[1];
  const db = bgLab[2] - centerLab[2];
  return [-dL * intensity, -da * intensity, -db * intensity];
}

export function calcCompensatedRightColor(
  bgLeftLab: [number, number, number],
  centerLeftLab: [number, number, number],
  bgRightLab: [number, number, number],
  intensity = 0.25,
): [number, number, number] {
  const shiftL = calcInductionShift(bgLeftLab, centerLeftLab, intensity);
  const perceivedL: [number, number, number] = [
    centerLeftLab[0] + shiftL[0],
    centerLeftLab[1] + shiftL[1],
    centerLeftLab[2] + shiftL[2],
  ];

  const factor = 1 + intensity;
  return [
    (perceivedL[0] + intensity * bgRightLab[0]) / factor,
    (perceivedL[1] + intensity * bgRightLab[1]) / factor,
    (perceivedL[2] + intensity * bgRightLab[2]) / factor,
  ];
}

export function generateQuestion(level: number): QuestionData {
  const id = `ali_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);

  const isLeftBright = Math.random() < 0.5;
  const bgLVal = isLeftBright
    ? Math.floor(Math.random() * 20) + 75
    : Math.floor(Math.random() * 20) + 10;
  const bgRVal = isLeftBright
    ? Math.floor(Math.random() * 20) + 10
    : Math.floor(Math.random() * 20) + 75;

  const baseHue = Math.floor(Math.random() * 360);
  const baseSat = Math.floor(Math.random() * 15);

  const bgLeft: [number, number, number] = [baseHue, baseSat, bgLVal];
  const bgRight: [number, number, number] = [baseHue, baseSat, bgRVal];

  const centerLVal = Math.floor(Math.random() * 20) + 40;
  const targetLeftCenter: [number, number, number] = [baseHue, baseSat, centerLVal];

  const labBgL = hsvToOkLab(...bgLeft);
  const labCenterL = hsvToOkLab(...targetLeftCenter);
  const labBgR = hsvToOkLab(...bgRight);

  const idealLabR = calcCompensatedRightColor(labBgL, labCenterL, labBgR, 0.25);
  const idealRightCenter = okLabToHsv(idealLabR);

  return {
    id,
    difficultyLevel: clampedLevel,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    tolerance,
  };
}

export function checkHit(userColor: [number, number, number], question: QuestionData): HitResult {
  const labTarget = hsvToOkLab(...question.idealRightCenter);
  const labUser = hsvToOkLab(...userColor);
  const deltaEError = calcDeltaEOk(labTarget, labUser);
  const isHit = deltaEError <= question.tolerance;

  return {
    isHit,
    userColor,
    targetColor: question.idealRightCenter,
    deltaEError: Math.round(deltaEError * 1000) / 1000,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/rel_lightness_induction/RelLightnessInductionView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { DualViewportContainer } from '../../components/common/DualViewportContainer';
import { HsvTrackSlider } from '../../components/common/HsvTrackSlider';
import { QuestionCardShell } from '../../components/common/QuestionCardShell';
import { Button } from '../../components/ui/button';
import { hsvToHex } from '../../core/color/colorUtils';
import { useCardTranslation } from '../../core/i18n';
import type { RelativeColorSettings } from '../../storage/settings';
import { PALETTE } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';

export interface RelLightnessInductionViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: [number, number, number]) => void;
  disabled?: boolean;
  settings: RelativeColorSettings;
}

export function RelLightnessInductionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: RelLightnessInductionViewProps) {
  const { t } = useCardTranslation('rel_lightness_induction');

  const [userRightH, setUserRightH] = useState<number>(question.targetLeftCenter[0]);
  const [userRightS, setUserRightS] = useState<number>(question.targetLeftCenter[1]);
  const [userRightV, setUserRightV] = useState<number>(question.targetLeftCenter[2]);

  useEffect(() => {
    setUserRightH(question.targetLeftCenter[0]);
    setUserRightS(question.targetLeftCenter[1]);
    setUserRightV(question.targetLeftCenter[2]);
  }, [question.targetLeftCenter]);

  const handleSubmit = useCallback(() => {
    if (disabled || showAnswer) return;
    onAnswer([userRightH, userRightS, userRightV]);
  }, [disabled, showAnswer, userRightH, userRightS, userRightV, onAnswer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !showAnswer && !disabled) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, handleSubmit]);

  const bgLeftHex = hsvToHex(...question.bgLeft);
  const bgRightHex = hsvToHex(...question.bgRight);
  const centerLeftHex = hsvToHex(...question.targetLeftCenter);

  const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
  const idealRightHex = hsvToHex(...question.idealRightCenter);
  const rightValGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(userRightH, 100, 100)})`;

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  return (
    <QuestionCardShell
      hintText={t('views.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <DualViewportContainer
        leftTitle={t('views.leftBase')}
        rightTitle={t('views.rightModulate')}
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        }
        rightContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
              style={{ backgroundColor: userRightHex }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: idealRightHex }}
                />
              )}
            </div>
          </div>
        }
      />

      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="V"
          gradient={rightValGradient}
          val={userRightV}
          max={100}
          unit="%"
          targetHSV={question.idealRightCenter}
          difficultyLevel={question.difficultyLevel}
          showAnswer={showAnswer}
          targetVal={question.idealRightCenter[2]}
          userVal={userRightV}
          isHit={userAnswer?.isHit}
          onValChange={setUserRightV}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>

      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/rel_lightness_induction/index.tsx
~~~~~
~~~~~typescript
import { Sun } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelLightnessInductionView } from './RelLightnessInductionView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const relLightnessInductionCard: CardManifest<
  QuestionData,
  HitResult,
  [number, number, number],
  RelativeColorSettings
> = {
  id: 'rel_lightness_induction',
  domain: 'color_and_value',
  icon: Sun,
  tags: {
    domain: ['color_and_value'],
    path: ['relational_mapping'],
    challenge: ['illusion_piercing'],
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
    evaluateAnswer: (userVal, q) => checkHit(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      bgLeft: q.bgLeft,
      bgRight: q.bgRight,
      targetLeftCenter: q.targetLeftCenter,
      idealRightCenter: q.idealRightCenter,
      userRightColor: userVal,
      deltaEError: hitResult.deltaEError,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelLightnessInductionView
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

export default relLightnessInductionCard;
~~~~~

#### Acts 4: 构建 `rel_vector_shift` 专属强类型与生成器

~~~~~act
write_file
src/cards/rel_vector_shift/types.ts
~~~~~
~~~~~typescript
export interface QuestionData {
  id: string;
  difficultyLevel: number;
  colorA: [number, number, number];
  colorB: [number, number, number];
  colorC: [number, number, number];
  targetD: [number, number, number];
  options: [number, number, number][];
  correctIndex: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userColor: [number, number, number];
  targetColor: [number, number, number];
  deltaEError: number;
  magnitudeError: number;
  angleErrorDeg: number;
  tolerance: number;
  selectedIndex: number;
}
~~~~~

~~~~~act
write_file
src/cards/rel_vector_shift/utils/generator.ts
~~~~~
~~~~~typescript
import {
  calcDeltaEOk,
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  getTargetDeltaEForLevel,
  hasGamutMargin,
  hsvToOkLab,
  okLabToHsv,
} from '../../../core/color/oklchUtils';
import { createShuffledChoices } from '../../../core/math/mathUtils';
import type { HitResult, QuestionData } from '../types';

export function generateQuestion(level: number): QuestionData {
  const id = `rcq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);
  const R = getDistractorDistanceForLevel(clampedLevel);
  const t = (clampedLevel - 1) / 34;

  let attempts = 0;
  let colorA: [number, number, number] = [0, 0, 0];
  let colorB: [number, number, number] = [0, 0, 0];
  let colorC: [number, number, number] = [0, 0, 0];
  let targetD: [number, number, number] = [0, 0, 0];
  let labTargetD: [number, number, number] = [0, 0, 0];
  let vAB: [number, number, number] = [0, 0, 0];

  while (attempts < 200) {
    attempts++;
    const hA = Math.floor(Math.random() * 360);
    const sA = Math.floor(Math.random() * 55) + 25;
    const vA = Math.floor(Math.random() * 55) + 30;
    colorA = [hA, sA, vA];

    const hB = (hA + (Math.floor(Math.random() * 60) - 30) + 360) % 360;
    const sB = Math.max(15, Math.min(90, sA + (Math.floor(Math.random() * 40) - 20)));
    const vB = Math.max(20, Math.min(95, vA + (Math.floor(Math.random() * 50) - 25)));
    colorB = [hB, sB, vB];

    const maxHueOffset = 10 + t * 170;
    const maxSatOffset = 5 + t * 35;
    const maxValOffset = 5 + t * 35;

    const hC_jitter = (Math.random() * 2 - 1) * maxHueOffset;
    const sC_jitter = (Math.random() * 2 - 1) * maxSatOffset;
    const vC_jitter = (Math.random() * 2 - 1) * maxValOffset;

    const hC = (hA + hC_jitter + 360) % 360;
    const sC = Math.max(15, Math.min(90, sA + sC_jitter));
    const vC = Math.max(20, Math.min(95, vA + vC_jitter));
    colorC = [Math.round(hC), Math.round(sC), Math.round(vC)];

    const labA = hsvToOkLab(...colorA);
    const labB = hsvToOkLab(...colorB);
    const labC = hsvToOkLab(...colorC);

    vAB = [labB[0] - labA[0], labB[1] - labA[1], labB[2] - labA[2]];
    const vMag = Math.sqrt(vAB[0] ** 2 + vAB[1] ** 2 + vAB[2] ** 2);
    if (vMag < 0.03) continue;

    labTargetD = [labC[0] + vAB[0], labC[1] + vAB[1], labC[2] + vAB[2]];
    if (hasGamutMargin(labTargetD, R * 0.95)) {
      targetD = okLabToHsv(labTargetD);
      break;
    }
  }

  if (!targetD || (targetD[0] === 0 && targetD[1] === 0 && targetD[2] === 0 && attempts >= 200)) {
    targetD = okLabToHsv(labTargetD);
  }

  const bestDistractors = generateTetrahedralDistractors(labTargetD, R);
  const { options, correctIndex } = createShuffledChoices(targetD, bestDistractors);

  return {
    id,
    difficultyLevel: clampedLevel,
    colorA,
    colorB,
    colorC,
    targetD,
    tolerance,
    options,
    correctIndex,
  };
}

export function checkHit(userColor: [number, number, number], question: QuestionData): HitResult {
  const labTargetD = hsvToOkLab(...question.targetD);
  const labUserD = hsvToOkLab(...userColor);
  const deltaEError = calcDeltaEOk(labTargetD, labUserD);

  const selectedIndex = question.options.findIndex(
    (opt) => opt[0] === userColor[0] && opt[1] === userColor[1] && opt[2] === userColor[2],
  );

  const isHit =
    selectedIndex !== -1
      ? selectedIndex === question.correctIndex
      : deltaEError <= question.tolerance;

  const labA = hsvToOkLab(...question.colorA);
  const labB = hsvToOkLab(...question.colorB);
  const labC = hsvToOkLab(...question.colorC);

  const vRef: [number, number, number] = [labB[0] - labA[0], labB[1] - labA[1], labB[2] - labA[2]];
  const vUser: [number, number, number] = [
    labUserD[0] - labC[0],
    labUserD[1] - labC[1],
    labUserD[2] - labC[2],
  ];

  const magRef = Math.sqrt(vRef[0] ** 2 + vRef[1] ** 2 + vRef[2] ** 2);
  const magUser = Math.sqrt(vUser[0] ** 2 + vUser[1] ** 2 + vUser[2] ** 2);
  const magnitudeError = Math.abs(magUser - magRef);

  let angleErrorDeg = 0;
  if (magRef > 1e-4 && magUser > 1e-4) {
    const dot = vRef[0] * vUser[0] + vRef[1] * vUser[1] + vRef[2] * vUser[2];
    const cosTheta = Math.max(-1, Math.min(1, dot / (magRef * magUser)));
    angleErrorDeg = Math.round((Math.acos(cosTheta) * 180) / Math.PI);
  }

  return {
    isHit,
    userColor,
    targetColor: question.targetD,
    deltaEError: Math.round(deltaEError * 1000) / 1000,
    magnitudeError: Math.round(magnitudeError * 1000) / 1000,
    angleErrorDeg,
    tolerance: question.tolerance,
    selectedIndex: selectedIndex !== -1 ? selectedIndex : 0,
  };
}
~~~~~

~~~~~act
write_file
src/cards/rel_vector_shift/RelVectorShiftView.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Shuffle } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { StandardNafcView } from '../../components/common/StandardNafcView';
import { hsvToHex } from '../../core/color/colorUtils';
import { useCardTranslation } from '../../core/i18n';
import type { HitResult, QuestionData } from './types';

export interface RelVectorShiftViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (userVal: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function RelVectorShiftView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: RelVectorShiftViewProps) {
  const { t } = useCardTranslation('rel_vector_shift');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const { colorA, colorB, colorC, targetD, options, correctIndex } = question;
  const activeColor = options[selectedIndex] ?? targetD;

  useEffect(() => {
    if (question.id) {
      setSelectedIndex(0);
    }
  }, [question.id]);

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);
  const hexSelectedD = hsvToHex(...activeColor);
  const hexTargetD = hsvToHex(...targetD);

  const nafcOptions = options.map((opt, idx) => {
    const isTarget = idx === correctIndex;
    const hexVal = hsvToHex(...opt);
    return {
      key: `vector-shift-opt-${idx}-${hexVal}`,
      title: t('common.candidateN', { num: idx + 1 }),
      value: opt,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hexVal }}
        />
      ),
    };
  });

  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText={t('views.prompt')}
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIndex}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText={t('common.confirmSpace')}
      onSelectIndex={(idx) => setSelectedIndex(idx)}
      onAnswer={() => {
        const chosenColor = options[selectedIndex] ?? targetD;
        onAnswer(chosenColor);
      }}
      preview={
        <div className="bg-muted/60 p-4 rounded-2xl border border-border/60 w-full flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
              style={{ backgroundColor: hexA }}
            />
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <div
              className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
              style={{ backgroundColor: hexB }}
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
              style={{ backgroundColor: hexC }}
            />
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <div
              className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md transition-all duration-150 relative overflow-hidden"
              style={{ backgroundColor: hexSelectedD }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: hexTargetD }}
                />
              )}
            </div>
          </div>
        </div>
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/cards/rel_vector_shift/index.tsx
~~~~~
~~~~~typescript
import { Shuffle } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelVectorShiftView } from './RelVectorShiftView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const relVectorShiftCard: CardManifest<
  QuestionData,
  HitResult,
  [number, number, number],
  RelativeColorSettings
> = {
  id: 'rel_vector_shift',
  domain: 'color_and_value',
  icon: Shuffle,
  tags: {
    domain: ['color_and_value'],
    path: ['relational_mapping'],
    challenge: ['illusion_piercing'],
    interaction: ['multi_choice'],
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
    evaluateAnswer: (userVal, q) => checkHit(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      colorA: q.colorA,
      colorB: q.colorB,
      colorC: q.colorC,
      targetD: q.targetD,
      userD: userVal,
      deltaEError: hitResult.deltaEError,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelVectorShiftView
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

export default relVectorShiftCard;
~~~~~

#### Acts 5: 删除废弃的 `src/core/color/relativeColor.ts`

所有相对色彩逻辑均已下沉至对应卡片内部，彻底消除中心化假多态集中营。

~~~~~act
delete_file
src/core/color/relativeColor.ts
~~~~~

#### Acts 6: 重构 `star_single`（消除 `evaluateAnswer` 契约逆转）

消除 View 提前调用并反向打包 `hitResult` 的做法，让 View 仅在有效吸附时触发 `onAnswer(point)`，判定收敛回 `checkHit`。

~~~~~act
write_file
src/cards/star_single/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  anchorA: Point;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
}

export interface HitResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
}
~~~~~

~~~~~act
write_file
src/cards/star_single/utils/generator.ts
~~~~~
~~~~~typescript
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2;
export const CY = CANVAS_SIZE / 2;
export const DEFAULT_GRID_DIM = 3;

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[];
  gridSize?: number;
}

export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  const S_MAX = 25;
  const S_MIN = 3.5;

  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34;
  const S = S_MAX - t * (S_MAX - S_MIN);

  const maxAngleStepRad = (15 * Math.PI) / 180;
  const angleStepRad = Math.min(S / R, maxAngleStepRad);
  const rStep = S;

  const points: Point[] = [];
  for (let rIdx = 0; rIdx < gridDim; rIdx++) {
    for (let aIdx = 0; aIdx < gridDim; aIdx++) {
      const curR = R + (rIdx - targetRow) * rStep;
      const curTheta = theta + (aIdx - targetCol) * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}

function selectAngleWithTargeting(options?: QuestionGenerateOptions): number {
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40;
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

export function generateQuestion(
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = options?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const anchorA: Point = { x: CX, y: CY };
  const angle = selectAngleWithTargeting(options);
  const distChoices = [60, 90, 120, 150, 180];
  const dist = distChoices[Math.floor(Math.random() * distChoices.length)];

  const rad = (angle * Math.PI) / 180;
  const targetB: Point = {
    x: Math.round((CX + dist * Math.cos(rad)) * 100) / 100,
    y: Math.round((CY + dist * Math.sin(rad)) * 100) / 100,
  };

  const distractorPoints = generatePolarGridPoints(
    anchorA,
    targetB,
    difficultyLevel,
    gridDim,
    randomRow,
    randomCol,
  );

  return {
    id,
    anchorA,
    targetB,
    gridStart: distractorPoints[0],
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree: angle,
    distanceRatio: dist,
  };
}

export function checkHit(userPoint: Point, question: QuestionData): HitResult {
  const res = evaluatePointGridHit(userPoint, question.targetB, question.distractorPoints);
  return {
    isHit: res.isHit,
    nearestGridPoint: res.nearestGridPoint,
    errorDistance: res.errorDistance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/star_single/StarSingleView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE } from './utils/generator';

export interface StarSingleViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: Point) => void;
  disabled?: boolean;
}

export function StarSingleView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarSingleViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(
          ctx,
          question.anchorA.x,
          question.anchorA.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.targetB.x,
          question.targetB.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      clickPoint,
      question.distractorPoints,
    );
    if (!isWithinRange) return;
    onAnswer(nearestPoint);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/star_single/index.tsx
~~~~~
~~~~~typescript
import { Target } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarSingleView } from './StarSingleView';
import { createStarSingleAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export const starSingleCard: CardManifest<QuestionData, HitResult, Point, StarSettings> = {
  id: 'star_single',
  domain: 'spatial_structure',
  icon: Target,
  tags: {
    domain: ['spatial_structure'],
    path: ['absolute_estimation'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: 'settings.gridSizeTitle',
      options: [
        { label: '2x2', value: 2 },
        { label: '3x3', value: 3 },
        { label: '4x4', value: 4 },
        { label: '5x5', value: 5 },
      ],
      gridCols: 'grid-cols-4',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: SECTOR_KEYS,
      gridCols: 'grid-cols-4',
    },
  ],
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) =>
      generateQuestion(level, {
        gridSize: settings.gridSize,
        targetingMode: settings.targetingMode,
        targetSectors: settings.manualTargetSectors,
      }),
    evaluateAnswer: (userPoint, question) => checkHit(userPoint, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [userVal.x, userVal.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <StarSingleView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarSingleAnalytics(),
  },
};

export default starSingleCard;
~~~~~

#### Acts 7: 重构 `star_double_h` 与 `star_double_r`（消除 `evaluateAnswer` 契约逆转）

~~~~~act
write_file
src/cards/star_double_h/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  anchorA: Point;
  anchorC: Point;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
  rotationAngle?: number;
}

export interface HitResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
}
~~~~~

~~~~~act
write_file
src/cards/star_double_h/utils/generator.ts
~~~~~
~~~~~typescript
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2;
export const CY = CANVAS_SIZE / 2;
export const DEFAULT_GRID_DIM = 3;

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[];
  gridSize?: number;
}

function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  const Ra = calcDistance(anchorA, targetB);
  const Rc = calcDistance(anchorC, targetB);

  const S_MAX = 20;
  const S_MIN = 3.5;

  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34;
  const S = S_MAX - t * (S_MAX - S_MIN);

  const maxAngleStepRad = (15 * Math.PI) / 180;
  const alphaStepRad = Math.min(S / Ra, maxAngleStepRad);
  const betaStepRad = Math.min(S / Rc, maxAngleStepRad);

  const points: Point[] = [];

  for (let aIdx = 0; aIdx < gridDim; aIdx++) {
    for (let cIdx = 0; cIdx < gridDim; cIdx++) {
      const alphaI = alpha + (aIdx - targetRow) * alphaStepRad;
      const betaJ = beta + (cIdx - targetCol) * betaStepRad;

      const v1x = Math.cos(alphaI);
      const v1y = Math.sin(alphaI);
      const v2x = Math.cos(betaJ);
      const v2y = Math.sin(betaJ);

      const dx = anchorC.x - anchorA.x;
      const dy = anchorC.y - anchorA.y;
      const det = v1x * v2y - v1y * v2x;

      if (Math.abs(det) < 1e-5) {
        points.push({
          x: Math.round((targetB.x + (aIdx - targetRow) * S) * 100) / 100,
          y: Math.round((targetB.y + (cIdx - targetCol) * S) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100;
        const y = Math.round((anchorA.y + t1 * v1y) * 100) / 100;
        points.push({ x, y });
      }
    }
  }
  return points;
}

export function generateQuestion(
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = options?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];

  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];

  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;

      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        const minDiff = Math.min(diff, 360 - diff);
        return minDiff <= 22.5;
      });

      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;

  const anchorA: Point = {
    x: Math.round((baseAx + CX) * 100) / 100,
    y: Math.round((baseAy + CY) * 100) / 100,
  };
  const anchorC: Point = {
    x: Math.round((baseCx + CX) * 100) / 100,
    y: Math.round((baseCy + CY) * 100) / 100,
  };
  const targetB: Point = {
    x: Math.round((px + CX) * 100) / 100,
    y: Math.round((py + CY) * 100) / 100,
  };

  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    difficultyLevel,
    gridDim,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    anchorA,
    anchorC,
    targetB,
    gridStart: distractorPoints[0],
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: 0,
  };
}

export function checkHit(userPoint: Point, question: QuestionData): HitResult {
  const res = evaluatePointGridHit(userPoint, question.targetB, question.distractorPoints);
  return {
    isHit: res.isHit,
    nearestGridPoint: res.nearestGridPoint,
    errorDistance: res.errorDistance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/star_double_h/StarDoubleHView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE } from './utils/generator';

export interface StarDoubleHViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: Point) => void;
  disabled?: boolean;
}

export function StarDoubleHView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarDoubleHViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(
          ctx,
          question.anchorA.x,
          question.anchorA.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.anchorC.x,
          question.anchorC.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.targetB.x,
          question.targetB.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      clickPoint,
      question.distractorPoints,
    );
    if (!isWithinRange) return;
    onAnswer(nearestPoint);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/star_double_h/index.tsx
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarDoubleHView } from './StarDoubleHView';
import { createStarDoubleHAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export const starDoubleHCard: CardManifest<QuestionData, HitResult, Point, StarSettings> = {
  id: 'star_double_h',
  domain: 'spatial_structure',
  icon: Crosshair,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: 'settings.gridSizeTitle',
      options: [
        { label: '2x2', value: 2 },
        { label: '3x3', value: 3 },
        { label: '4x4', value: 4 },
        { label: '5x5', value: 5 },
      ],
      gridCols: 'grid-cols-4',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: SECTOR_KEYS,
      gridCols: 'grid-cols-4',
    },
  ],
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) =>
      generateQuestion(level, {
        gridSize: settings.gridSize,
        targetingMode: settings.targetingMode,
        targetSectors: settings.manualTargetSectors,
      }),
    evaluateAnswer: (userPoint, question) => checkHit(userPoint, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      anchorC: [q.anchorC.x, q.anchorC.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [userVal.x, userVal.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <StarDoubleHView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarDoubleHAnalytics(),
  },
};

export default starDoubleHCard;
~~~~~

~~~~~act
write_file
src/cards/star_double_r/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  anchorA: Point;
  anchorC: Point;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
  rotationAngle?: number;
}

export interface HitResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
}
~~~~~

~~~~~act
write_file
src/cards/star_double_r/utils/generator.ts
~~~~~
~~~~~typescript
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2;
export const CY = CANVAS_SIZE / 2;
export const DEFAULT_GRID_DIM = 3;

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[];
  gridSize?: number;
}

function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;

  return {
    x: Math.round((center.x + dx * cos - dy * sin) * 100) / 100,
    y: Math.round((center.y + dx * sin + dy * cos) * 100) / 100,
  };
}

function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  const Ra = calcDistance(anchorA, targetB);
  const Rc = calcDistance(anchorC, targetB);

  const S_MAX = 20;
  const S_MIN = 3.5;

  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34;
  const S = S_MAX - t * (S_MAX - S_MIN);

  const maxAngleStepRad = (15 * Math.PI) / 180;
  const alphaStepRad = Math.min(S / Ra, maxAngleStepRad);
  const betaStepRad = Math.min(S / Rc, maxAngleStepRad);

  const points: Point[] = [];

  for (let aIdx = 0; aIdx < gridDim; aIdx++) {
    for (let cIdx = 0; cIdx < gridDim; cIdx++) {
      const alphaI = alpha + (aIdx - targetRow) * alphaStepRad;
      const betaJ = beta + (cIdx - targetCol) * betaStepRad;

      const v1x = Math.cos(alphaI);
      const v1y = Math.sin(alphaI);
      const v2x = Math.cos(betaJ);
      const v2y = Math.sin(betaJ);

      const dx = anchorC.x - anchorA.x;
      const dy = anchorC.y - anchorA.y;
      const det = v1x * v2y - v1y * v2x;

      if (Math.abs(det) < 1e-5) {
        points.push({
          x: Math.round((targetB.x + (aIdx - targetRow) * S) * 100) / 100,
          y: Math.round((targetB.y + (cIdx - targetCol) * S) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100;
        const y = Math.round((anchorA.y + t1 * v1y) * 100) / 100;
        points.push({ x, y });
      }
    }
  }
  return points;
}

export function generateQuestion(
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = options?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];

  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];

  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;

      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        const minDiff = Math.min(diff, 360 - diff);
        return minDiff <= 22.5;
      });

      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;

  const rotAngle = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];
  const center: Point = { x: 0, y: 0 };
  const rotatedA = rotatePoint({ x: baseAx, y: baseAy }, center, rotAngle);
  const rotatedC = rotatePoint({ x: baseCx, y: baseCy }, center, rotAngle);
  const rotatedB = rotatePoint({ x: px, y: py }, center, rotAngle);

  const anchorA: Point = {
    x: Math.round((rotatedA.x + CX) * 100) / 100,
    y: Math.round((rotatedA.y + CY) * 100) / 100,
  };
  const anchorC: Point = {
    x: Math.round((rotatedC.x + CX) * 100) / 100,
    y: Math.round((rotatedC.y + CY) * 100) / 100,
  };
  const targetB: Point = {
    x: Math.round((rotatedB.x + CX) * 100) / 100,
    y: Math.round((rotatedB.y + CY) * 100) / 100,
  };

  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    difficultyLevel,
    gridDim,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    anchorA,
    anchorC,
    targetB,
    gridStart: distractorPoints[0],
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
}

export function checkHit(userPoint: Point, question: QuestionData): HitResult {
  const res = evaluatePointGridHit(userPoint, question.targetB, question.distractorPoints);
  return {
    isHit: res.isHit,
    nearestGridPoint: res.nearestGridPoint,
    errorDistance: res.errorDistance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/star_double_r/StarDoubleRView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE } from './utils/generator';

export interface StarDoubleRViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: Point) => void;
  disabled?: boolean;
}

export function StarDoubleRView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarDoubleRViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(
          ctx,
          question.anchorA.x,
          question.anchorA.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.anchorC.x,
          question.anchorC.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );

        drawDot(
          ctx,
          question.targetB.x,
          question.targetB.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      clickPoint,
      question.distractorPoints,
    );
    if (!isWithinRange) return;
    onAnswer(nearestPoint);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/star_double_r/index.tsx
~~~~~
~~~~~typescript
import { RotateCw } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarDoubleRView } from './StarDoubleRView';
import { createStarDoubleRAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export const starDoubleRCard: CardManifest<QuestionData, HitResult, Point, StarSettings> = {
  id: 'star_double_r',
  domain: 'spatial_structure',
  icon: RotateCw,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    challenge: ['dimensional_translation'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'buttonGroup',
      key: 'gridSize',
      title: 'settings.gridSizeTitle',
      options: [
        { label: '2x2', value: 2 },
        { label: '3x3', value: 3 },
        { label: '4x4', value: 4 },
        { label: '5x5', value: 5 },
      ],
      gridCols: 'grid-cols-4',
    },
    {
      type: 'targeting',
      modeKey: 'targetingMode',
      sectorsKey: 'manualTargetSectors',
      title: 'settings.targetingTitle',
      subTitle: 'settings.targetingSubTitle',
      sectors: SECTOR_KEYS,
      gridCols: 'grid-cols-4',
    },
  ],
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) =>
      generateQuestion(level, {
        gridSize: settings.gridSize,
        targetingMode: settings.targetingMode,
        targetSectors: settings.manualTargetSectors,
      }),
    evaluateAnswer: (userPoint, question) => checkHit(userPoint, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      anchorC: [q.anchorC.x, q.anchorC.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [userVal.x, userVal.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <StarDoubleRView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarDoubleRAnalytics(),
  },
};

export default starDoubleRCard;
~~~~~

#### Acts 8: 重构 `neg_vertex_fitting`（消除 `evaluateAnswer` 契约逆转）

让 View 仅在有效吸附后抛出 `Point`，计算与命中判定回到 `evaluateAnswer`。

~~~~~act
write_file
src/cards/neg_vertex_fitting/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export const FITTING_CANVAS_SIZE = 340;

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  canvasArea: number;
  vertices: Point[];
  targetVertexIndex: number;
  targetPoint: Point;
  truncatedVertices: Point[];
  distractorPoints: Point[];
  gridDim: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  clickPoint: Point;
  nearestGridPoint: Point;
  errorDistance: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/neg_vertex_fitting/utils/generator.ts
~~~~~
~~~~~typescript
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import { FITTING_CANVAS_SIZE, type HitResult, type QuestionData } from '../types';

export function generateRandomPolygon(level: number, canvasSize = FITTING_CANVAS_SIZE): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;

  const minVerts = 4 + Math.floor(t * 2);
  const maxVerts = 4 + Math.floor(t * 4);
  const vertexCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const cx = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);
  const cy = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);

  const baseRadius = canvasSize * 0.28 + Math.random() * (canvasSize * 0.1);
  const irregularity = 0.2 + t * 0.45;

  const angles: number[] = [];
  const angleStep = (Math.PI * 2) / vertexCount;
  for (let i = 0; i < vertexCount; i++) {
    const rawA = i * angleStep + (Math.random() - 0.5) * angleStep * 0.7;
    angles.push((rawA + Math.PI * 2) % (Math.PI * 2));
  }
  angles.sort((a, b) => a - b);

  const vertices: Point[] = [];
  for (const a of angles) {
    const rJitter = 1 + (Math.random() * 2 - 1) * irregularity;
    const r = Math.max(canvasSize * 0.1, Math.min(canvasSize * 0.42, baseRadius * rJitter));
    const x = Math.round(Math.max(15, Math.min(canvasSize - 15, cx + r * Math.cos(a))));
    const y = Math.round(Math.max(15, Math.min(canvasSize - 15, cy + r * Math.sin(a))));
    vertices.push({ x, y });
  }

  return vertices;
}

export function generateQuestion(difficultyLevel: number): QuestionData {
  const id = `nsq_fit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, difficultyLevel));
  const canvasArea = FITTING_CANVAS_SIZE * FITTING_CANVAS_SIZE;
  const vertices = generateRandomPolygon(clampedLevel, FITTING_CANVAS_SIZE);
  const n = vertices.length;

  const targetVertexIndex = Math.floor(Math.random() * n);
  const targetPoint = vertices[targetVertexIndex];

  const prevIdx = (targetVertexIndex - 1 + n) % n;
  const nextIdx = (targetVertexIndex + 1) % n;
  const prevPoint = vertices[prevIdx];
  const nextPoint = vertices[nextIdx];

  const cutRatio = 0.45;
  const cutPrev: Point = {
    x: Math.round(prevPoint.x + (targetPoint.x - prevPoint.x) * (1 - cutRatio)),
    y: Math.round(prevPoint.y + (targetPoint.y - prevPoint.y) * (1 - cutRatio)),
  };
  const cutNext: Point = {
    x: Math.round(nextPoint.x + (targetPoint.x - nextPoint.x) * (1 - cutRatio)),
    y: Math.round(nextPoint.y + (targetPoint.y - nextPoint.y) * (1 - cutRatio)),
  };

  const truncatedVertices: Point[] = [];
  for (let i = 0; i < n; i++) {
    if (i === targetVertexIndex) {
      truncatedVertices.push(cutPrev);
      truncatedVertices.push(cutNext);
    } else {
      truncatedVertices.push(vertices[i]);
    }
  }

  const gridDim = 3;
  const S_MAX = 24;
  const S_MIN = 3.5;
  const t = (clampedLevel - 1) / 34;
  const S = S_MAX * (S_MIN / S_MAX) ** t;

  const targetRow = Math.floor(Math.random() * gridDim);
  const targetCol = Math.floor(Math.random() * gridDim);
  const distractorPoints: Point[] = [];

  for (let r = 0; r < gridDim; r++) {
    for (let c = 0; c < gridDim; c++) {
      const x = Math.round((targetPoint.x + (c - targetCol) * S) * 100) / 100;
      const y = Math.round((targetPoint.y + (r - targetRow) * S) * 100) / 100;
      distractorPoints.push({ x, y });
    }
  }

  return {
    id,
    difficultyLevel: clampedLevel,
    canvasArea,
    vertices,
    targetVertexIndex,
    targetPoint,
    truncatedVertices,
    distractorPoints,
    gridDim,
    tolerance: S / 2,
  };
}

export function evaluateAnswer(userPoint: Point, question: QuestionData): HitResult {
  const targetPoint = question.targetPoint;
  const distractorPoints = question.distractorPoints;

  const hitRes = evaluatePointGridHit(userPoint, targetPoint, distractorPoints);
  return {
    isHit: hitRes.isHit,
    clickPoint: userPoint,
    nearestGridPoint: hitRes.nearestGridPoint,
    errorDistance: hitRes.errorDistance,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/neg_vertex_fitting/NegVertexFittingView.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { drawPolygonCanvas } from '../../core/canvas/drawPolygon';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import type { Point } from '../../types';
import { CANVAS_THEME, hexToRgba } from '../../utils/theme';
import { FITTING_CANVAS_SIZE, type HitResult, type QuestionData } from './types';

export interface NegVertexFittingViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userPoint: Point) => void;
  disabled?: boolean;
}

export function NegVertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: NegVertexFittingViewProps) {
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!question.vertices) return;
    drawPolygonCanvas({
      canvas: leftFittingRef.current,
      vertices: question.vertices,
      size: FITTING_CANVAS_SIZE,
      fillColor: CANVAS_THEME.shape.fill,
      strokeColor: CANVAS_THEME.shape.stroke,
    });
  }, [question.vertices]);

  const handleCustomOverlayRender = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (question.truncatedVertices && question.truncatedVertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(question.truncatedVertices[0].x, question.truncatedVertices[0].y);
        for (let i = 1; i < question.truncatedVertices.length; i++) {
          ctx.lineTo(question.truncatedVertices[i].x, question.truncatedVertices[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = CANVAS_THEME.shape.fill;
        ctx.fill();
        ctx.strokeStyle = CANVAS_THEME.shape.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (showAnswer && question.vertices) {
        ctx.beginPath();
        ctx.moveTo(question.vertices[0].x, question.vertices[0].y);
        for (let i = 1; i < question.vertices.length; i++) {
          ctx.lineTo(question.vertices[i].x, question.vertices[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = hexToRgba(CANVAS_THEME.status.hit, 0.7);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [question.truncatedVertices, question.vertices, showAnswer],
  );

  const handleCommitPoint = useCallback(
    (clickPoint: Point) => {
      const { nearestPoint, isWithinRange } = findNearestPointInGrid(
        clickPoint,
        question.distractorPoints,
      );
      if (!isWithinRange) return;
      onAnswer(nearestPoint);
    },
    [question.distractorPoints, onAnswer],
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={FITTING_CANVAS_SIZE}
          gridPoints={question.distractorPoints || []}
          targetPoint={question.targetPoint}
          userNearestPoint={userAnswer?.nearestGridPoint}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          customOverlayRender={handleCustomOverlayRender}
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/neg_vertex_fitting/index.tsx
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { NegVertexFittingView } from './NegVertexFittingView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const negVertexFittingCard: CardManifest<
  QuestionData,
  HitResult,
  Point,
  BaseModuleSettings
> = {
  id: 'neg_vertex_fitting',
  domain: 'form_and_proportion',
  icon: Crosshair,
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['absolute_estimation'],
    challenge: ['figure_ground_reversal'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userPoint, question) => evaluateAnswer(userPoint, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetVertexIndex: q.targetVertexIndex,
      targetPoint: [q.targetPoint.x, q.targetPoint.y],
      userClick: [userVal.x, userVal.y],
      errorPixelDistance: hitResult.errorDistance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegVertexFittingView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default negVertexFittingCard;
~~~~~

### 下一步建议
1. **构建与测试验证**：运行 `npm run build` 和 `npm test` 确认类型安全与单元测试全量绿灯通过。
2. **推进 P1 治理**：排期处理 `colorUtils.ts` 中的标量与三元组联合问题（`ColorMode = 'H' | 'S' | 'V' | 'ALL'`），将 `color_all` 拾色逻辑彻底正交拆分；同时为 `UnifiedTrialRecord` 的 `details` 增加强类型映射与校验。
