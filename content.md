我们将继续完成**阶段 3 的后半部分：相对环境色（Relative Color）4 张卡片展平迁移**。

我们将把 `src/packs/relative_color/` 下的 4 种训练模式解耦并展平为 4 张标准自包含单卡：
1. `src/cards/rel_vector_shift/`（色彩矢量迁移）
2. `src/cards/rel_lightness_induction/`（明度反差补偿）
3. `src/cards/rel_hue_induction/`（补色残像调和）
4. `src/cards/rel_decontextual_2afc/`（环境穿透判别）

并将核心几何/色彩数学推演能力沉淀至 `src/core/color/relativeColor.ts`，最后安全移除旧版 `src/packs/relative_color/`。

## [WIP] feat: 展平重构相对色彩感知域 4 张单卡为一等公民卡片

### 用户需求
按路线图阶段 3 要求：
1. 抽离相对色彩核心计算模型至 `src/core/color/relativeColor.ts`。
2. 建立 `src/cards/rel_vector_shift/`、`src/cards/rel_lightness_induction/`、`src/cards/rel_hue_induction/` 与 `src/cards/rel_decontextual_2afc/` 4 个平铺单卡目录。
3. 迁移自包含多语言词典（纯相对 key）与 Preact 视图组件（保证 `.tsx` 后缀）。
4. 绞杀删除 `src/packs/relative_color/` 目录。

### 评论
相对色彩模块（包含同时对比、阿尔伯斯侧抑制模型与色矢量推移）此前高度耦合在单一 `RelativeColorCanvas.tsx` 中。本次展平重构彻底打破大 `switch(mode)` 分发，使得每个独立的认知抗性模型都能自治维护，且无需在卡片内部硬编码全局作用域前缀。

### 目标
1. 创建 `src/core/color/relativeColor.ts`，导出通用的出题、打分与感知诱导推演函数。
2. 创建 `rel_vector_shift`、`rel_lightness_induction`、`rel_hue_induction` 和 `rel_decontextual_2afc` 4 张卡片的 `locales/`、View 视图组件与 `index.tsx`。
3. 移除 `src/packs/relative_color/` 存量旧文件。

### 基本原理
注册中心 `registry.ts` 会自动扫描新单卡并无缝接管，视图内通过 `useCardTranslation` 解析局部作用域多语言（如 `views.hint`），实现零配置热插拔与绞杀者模式平滑迁移。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #scope/core #ai/instruct #task/domain/color #task/object/relative-color-cards #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 沉淀相对色彩核心算法库至 `src/core/color/relativeColor.ts`

~~~~~act
write_file
src/core/color/relativeColor.ts
~~~~~
~~~~~ts
import {
  calcDeltaEOk,
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  getTargetDeltaEForLevel,
  hasGamutMargin,
  hsvToOkLab,
  okLabToHsv,
} from './oklchUtils';
import { createShuffledChoices } from '../math/mathUtils';

export type RelativeColorMode =
  | 'VECTOR_SHIFT'
  | 'LIGHTNESS_INDUCTION'
  | 'HUE_INDUCTION'
  | 'DECONTEXTUAL_2AFC';

export interface RelativeColorQuestionData {
  id: string;
  mode: RelativeColorMode;
  difficultyLevel: number;
  colorA: [number, number, number];
  colorB: [number, number, number];
  colorC: [number, number, number];
  targetD: [number, number, number];
  options?: [number, number, number][];
  correctIndex?: number;
  bgLeft?: [number, number, number];
  bgRight?: [number, number, number];
  targetLeftCenter?: [number, number, number];
  idealRightCenter?: [number, number, number];
  centerColorA?: [number, number, number];
  centerColorB?: [number, number, number];
  largerPhysicalSide?: 'A' | 'B';
  physicalValueDiff?: number;
  tolerance: number;
}

export interface RelativeColorHitResult {
  isHit: boolean;
  userD?: [number, number, number];
  targetD?: [number, number, number];
  deltaEError: number;
  magnitudeError?: number;
  angleErrorDeg?: number;
  tolerance: number;
  selectedIndex?: number;
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  physicalValueDiff?: number;
}

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

export function generateVectorShiftQuestion(level: number): RelativeColorQuestionData {
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
    mode: 'VECTOR_SHIFT',
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

export function generateLightnessInductionQuestion(level: number): RelativeColorQuestionData {
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
    mode: 'LIGHTNESS_INDUCTION',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: targetLeftCenter,
    colorC: bgRight,
    targetD: idealRightCenter,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    tolerance,
  };
}

export function generateHueInductionQuestion(level: number): RelativeColorQuestionData {
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
    mode: 'HUE_INDUCTION',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: targetLeftCenter,
    colorC: bgRight,
    targetD: idealRightCenter,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    options,
    correctIndex,
    tolerance,
  };
}

export function generateDecontextual2AfcQuestion(level: number): RelativeColorQuestionData {
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
    mode: 'DECONTEXTUAL_2AFC',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: centerColorA,
    colorC: bgRight,
    targetD: centerColorB,
    bgLeft,
    bgRight,
    centerColorA,
    centerColorB,
    largerPhysicalSide,
    physicalValueDiff: diffPercent,
    tolerance: diffPercent,
  };
}

export function checkRelativeColorHit(
  mode: RelativeColorMode,
  userAnswer: [number, number, number] | 'A' | 'B',
  question: RelativeColorQuestionData,
): RelativeColorHitResult {
  if (mode === 'DECONTEXTUAL_2AFC') {
    const userChoice = userAnswer as 'A' | 'B';
    const isHit = userChoice === question.largerPhysicalSide;
    return {
      isHit,
      userChoice,
      correctChoice: question.largerPhysicalSide,
      physicalValueDiff: question.physicalValueDiff,
      deltaEError: isHit ? 0 : (question.physicalValueDiff ?? 0),
      tolerance: question.tolerance,
    };
  }

  const userD = userAnswer as [number, number, number];
  const { colorA, colorB, colorC, targetD, difficultyLevel, options, correctIndex } = question;

  const labTargetD = hsvToOkLab(...targetD);
  const labUserD = hsvToOkLab(...userD);

  const selectedIndex = options?.findIndex(
    (opt) => opt[0] === userD[0] && opt[1] === userD[1] && opt[2] === userD[2],
  );

  const deltaEError = calcDeltaEOk(labTargetD, labUserD);
  const tolerance = getTargetDeltaEForLevel(difficultyLevel);
  const isHit =
    selectedIndex !== undefined && selectedIndex !== -1
      ? selectedIndex === correctIndex
      : deltaEError <= tolerance;

  const labA = hsvToOkLab(...colorA);
  const labB = hsvToOkLab(...colorB);
  const labC = hsvToOkLab(...colorC);

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
    userD,
    targetD,
    deltaEError: Math.round(deltaEError * 1000) / 1000,
    magnitudeError: Math.round(magnitudeError * 1000) / 1000,
    angleErrorDeg,
    tolerance,
    selectedIndex,
  };
}
~~~~~

#### Acts 2: 创建 `rel_vector_shift` 卡片

~~~~~act
write_file
src/cards/rel_vector_shift/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "色彩矢量迁移",
  "desc": "保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉",
  "instruction": "观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色",
  "settings": {
    "showToleranceBandTitle": "显示容错感应区",
    "showToleranceBandDesc": "在候选色块上标示容错参考"
  },
  "views": {
    "prompt": "观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色"
  }
}
~~~~~

~~~~~act
write_file
src/cards/rel_vector_shift/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Color Vector Shift",
  "desc": "Observe color vector shift A->B and select matching parallel shift C->D.",
  "instruction": "Observe vector A->B and find matching vector C->D below.",
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Indicator Band",
    "showToleranceBandDesc": "Display tolerance reference on swatches"
  },
  "views": {
    "prompt": "Observe vector shift A➔B and pick the matching C➔D shift below"
  }
}
~~~~~

~~~~~act
write_file
src/cards/rel_vector_shift/RelVectorShiftView.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Shuffle } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { StandardNafcView } from '../../components/common/StandardNafcView';
import { hsvToHex } from '../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../core/color/relativeColor';
import { useCardTranslation } from '../../core/i18n';

export interface RelVectorShiftViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
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
  const activeColor = options?.[selectedIndex] ?? targetD;

  useEffect(() => {
    setSelectedIndex(0);
  }, [question.id]);

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);
  const hexSelectedD = hsvToHex(...activeColor);
  const hexTargetD = hsvToHex(...targetD);

  const nafcOptions = (options || []).map((opt, idx) => {
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
        const chosenColor = options?.[selectedIndex] ?? targetD;
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
~~~~~tsx
import { Shuffle } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type RelativeColorHitResult,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateVectorShiftQuestion,
} from '../../core/color/relativeColor';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelVectorShiftView } from './RelVectorShiftView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const relVectorShiftCard: CardManifest<
  RelativeColorQuestionData,
  RelativeColorHitResult,
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
    generateQuestion: (level) => generateVectorShiftQuestion(level),
    evaluateAnswer: (userVal, q) => checkRelativeColorHit('VECTOR_SHIFT', userVal, q),
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

#### Acts 3: 创建 `rel_lightness_induction` 卡片

~~~~~act
write_file
src/cards/rel_lightness_induction/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "明度反差补偿",
  "desc": "在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致",
  "instruction": "调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」",
  "settings": {
    "showToleranceBandTitle": "显示滑块容错感应区",
    "showToleranceBandDesc": "在悬停光标两侧实时显示动态容错区间"
  },
  "views": {
    "hint": "调节右侧中心明度，使左右两块视觉感知看起来完全一致",
    "leftBase": "左侧固定基准",
    "rightModulate": "右侧调制区 (达成感知一致)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/rel_lightness_induction/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Lightness Induction",
  "desc": "Compensate for background illusion to achieve perceived lightness constancy.",
  "instruction": "Adjust right center value so both center squares appear perceptually identical.",
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Indicator Band",
    "showToleranceBandDesc": "Display live dynamic tolerance bands on either side of the slider thumb"
  },
  "views": {
    "hint": "Adjust right center lightness until both center swatches appear identical",
    "leftBase": "Left Anchor Reference",
    "rightModulate": "Right Modulation (Match Perception)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/rel_lightness_induction/RelLightnessInductionView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { DualViewportContainer } from '../../components/common/DualViewportContainer';
import { HsvTrackSlider } from '../../components/common/HsvTrackSlider';
import { QuestionCardShell } from '../../components/common/QuestionCardShell';
import { Button } from '../../components/ui/button';
import { hsvToHex } from '../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../core/color/relativeColor';
import { useCardTranslation } from '../../core/i18n';
import type { RelativeColorSettings } from '../../storage/settings';
import { PALETTE } from '../../utils/theme';

export interface RelLightnessInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
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

  const [userRightH, setUserRightH] = useState<number>(180);
  const [userRightS, setUserRightS] = useState<number>(50);
  const [userRightV, setUserRightV] = useState<number>(50);

  useEffect(() => {
    if (question.targetLeftCenter) {
      setUserRightH(question.targetLeftCenter[0]);
      setUserRightS(question.targetLeftCenter[1]);
      setUserRightV(question.targetLeftCenter[2]);
    }
  }, [question.id, question.targetLeftCenter]);

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

  const bgLeftHex = hsvToHex(...(question.bgLeft ?? [0, 0, 100]));
  const bgRightHex = hsvToHex(...(question.bgRight ?? [0, 0, 0]));
  const centerLeftHex = hsvToHex(...(question.targetLeftCenter ?? [0, 0, 50]));

  const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
  const idealRightHex = hsvToHex(...(question.idealRightCenter ?? question.targetD));
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
          targetHSV={question.targetD}
          difficultyLevel={question.difficultyLevel}
          showAnswer={showAnswer}
          targetVal={question.idealRightCenter?.[2] ?? question.targetD[2]}
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
~~~~~tsx
import { Sun } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type RelativeColorHitResult,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateLightnessInductionQuestion,
} from '../../core/color/relativeColor';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelLightnessInductionView } from './RelLightnessInductionView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const relLightnessInductionCard: CardManifest<
  RelativeColorQuestionData,
  RelativeColorHitResult,
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
    generateQuestion: (level) => generateLightnessInductionQuestion(level),
    evaluateAnswer: (userVal, q) => checkRelativeColorHit('LIGHTNESS_INDUCTION', userVal, q),
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

#### Acts 4: 创建 `rel_hue_induction` 卡片

~~~~~act
write_file
src/cards/rel_hue_induction/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "补色残像调和",
  "desc": "在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力",
  "instruction": "观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)",
  "views": {
    "hint": "观察左侧基准，在下方切换选项预览并确认提交 (键 1-4 切换，Space 提交)",
    "leftBase": "左侧固定基准",
    "rightPreview": "右侧环境补偿区 (实时预览)",
    "splitComparisonTooltip": "上半部为您的选择，下半部为理论真理色"
  }
}
~~~~~

~~~~~act
write_file
src/cards/rel_hue_induction/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Hue Induction & Harmony",
  "desc": "Select the compensated target color to counteract chromatic induction (4AFC).",
  "instruction": "Select the hue that compensates for the colored background (Keys 1-4).",
  "views": {
    "hint": "Observe reference and preview candidate compensations below (Keys 1-4, Space)",
    "leftBase": "Left Anchor Reference",
    "rightPreview": "Right Compensated Area (Live Preview)",
    "splitComparisonTooltip": "Top half is your selection, bottom half is ground truth"
  }
}
~~~~~

~~~~~act
write_file
src/cards/rel_hue_induction/RelHueInductionView.tsx
~~~~~
~~~~~tsx
import { Sparkles } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { DualViewportContainer } from '../../components/common/DualViewportContainer';
import { StandardNafcView } from '../../components/common/StandardNafcView';
import { hsvToHex } from '../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../core/color/relativeColor';
import { useCardTranslation } from '../../core/i18n';

export interface RelHueInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
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
    setSelectedIdx(0);
  }, [question.id]);

  const bgLeftHex = hsvToHex(...(bgLeft ?? [0, 0, 90]));
  const bgRightHex = hsvToHex(...(bgRight ?? [0, 0, 20]));
  const centerLeftHex = hsvToHex(...(targetLeftCenter ?? [0, 0, 50]));
  const idealRightHex = hsvToHex(...(idealRightCenter ?? [0, 0, 50]));

  const targetIdx = correctIndex ?? 0;
  const activeColor = options?.[selectedIdx] ?? idealRightCenter ?? [0, 0, 50];
  const activeRightHex = hsvToHex(...activeColor);

  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === targetIdx;
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
~~~~~tsx
import { Palette } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type RelativeColorHitResult,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateHueInductionQuestion,
} from '../../core/color/relativeColor';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelHueInductionView } from './RelHueInductionView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const relHueInductionCard: CardManifest<
  RelativeColorQuestionData,
  RelativeColorHitResult,
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
    generateQuestion: (level) => generateHueInductionQuestion(level),
    evaluateAnswer: (userVal, q) => checkRelativeColorHit('HUE_INDUCTION', userVal, q),
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

#### Acts 5: 创建 `rel_decontextual_2afc` 卡片

~~~~~act
write_file
src/cards/rel_decontextual_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "环境穿透判别",
  "desc": "穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理",
  "instruction": "穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」",
  "views": {
    "hint": "穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」",
    "physicallyBrighter": "物理明度更高 (V: {{v}}%)",
    "physicallyDarker": "物理更暗 (V: {{v}}%)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/rel_decontextual_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Decontextualized 2AFC",
  "desc": "Pierce through simultaneous contrast illusions to identify the objectively brighter color.",
  "instruction": "Identify which center square is physically brighter (Keys 1 / 2).",
  "views": {
    "hint": "Pierce background illusion and identify the objectively brighter center square",
    "physicallyBrighter": "Physically Brighter (V: {{v}}%)",
    "physicallyDarker": "Physically Darker (V: {{v}}%)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { hsvToHex } from '../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../core/color/relativeColor';
import { useCardTranslation } from '../../core/i18n';
import { PALETTE } from '../../utils/theme';

export interface RelDecontextual2AfcViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
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

  const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
  const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
  const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
  const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

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
              v: question.centerColorA?.[2] ?? 50,
            })
          : t('views.physicallyDarker', {
              v: question.centerColorA?.[2] ?? 50,
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
              v: question.centerColorB?.[2] ?? 50,
            })
          : t('views.physicallyDarker', {
              v: question.centerColorB?.[2] ?? 50,
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
~~~~~tsx
import { Columns } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type RelativeColorHitResult,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateDecontextual2AfcQuestion,
} from '../../core/color/relativeColor';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelDecontextual2AfcView } from './RelDecontextual2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const relDecontextual2AfcCard: CardManifest<
  RelativeColorQuestionData,
  RelativeColorHitResult,
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
    generateQuestion: (level) => generateDecontextual2AfcQuestion(level),
    evaluateAnswer: (userVal, q) => checkRelativeColorHit('DECONTEXTUAL_2AFC', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
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

#### Acts 6: 绞杀删除已迁移的 `src/packs/relative_color` 目录

~~~~~act
delete_file
src/packs/relative_color/components/AlbersInductionView.tsx
~~~~~

~~~~~act
delete_file
src/packs/relative_color/components/Decontextual2AfcView.tsx
~~~~~

~~~~~act
delete_file
src/packs/relative_color/components/HueInductionView.tsx
~~~~~

~~~~~act
delete_file
src/packs/relative_color/components/VectorShiftView.tsx
~~~~~

~~~~~act
delete_file
src/packs/relative_color/locales/en-US.json
~~~~~

~~~~~act
delete_file
src/packs/relative_color/locales/zh-CN.json
~~~~~

~~~~~act
delete_file
src/packs/relative_color/utils/generators.ts
~~~~~

~~~~~act
delete_file
src/packs/relative_color/utils/hitDetection.ts
~~~~~

~~~~~act
delete_file
src/packs/relative_color/utils/inductionMath.ts
~~~~~

~~~~~act
delete_file
src/packs/relative_color/utils/types.ts
~~~~~

~~~~~act
delete_file
src/packs/relative_color/utils/index.ts
~~~~~

~~~~~act
delete_file
src/packs/relative_color/views/RelativeColorCanvas.tsx
~~~~~

~~~~~act
delete_file
src/packs/relative_color/plugin.tsx
~~~~~

~~~~~act
delete_file
src/packs/relative_color/index.ts
~~~~~

### 下一步建议
1. 运行编译与测试指令（如 `pnpm tsc --noEmit`），验证色彩感知域（阶段 3）的全部 8 张卡片（4 张绝对色彩三要素 + 4 张相对环境色）类型无报错。
2. 进入阶段 4：图底与抽象域迁移（Negative Space 4 张卡片与 Abstraction 8 张卡片）。
