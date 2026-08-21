## [COMMIT] refactor(relative-color): 拆分相对色感巨石文件

### 评论
将原本庞大的 `RelativeColorCanvas.tsx` 和 `relativeColorUtils.ts` 进行了高内聚的模块化重构，拆分为了独立的视图组件 (`VectorShiftView`, `AlbersInductionView`, `Decontextual2AfcView`) 与工具模块，极大提升了相对色感模块的可维护性与可读性。

### 目标
1. 创建 `src/utils/relativeColor/` 目录并建立 `types.ts`, `inductionMath.ts`, `generators.ts`, `hitDetection.ts`, `index.ts`。
2. 创建 `src/components/relativeColor/` 目录并实现 `VectorShiftView.tsx`, `AlbersInductionView.tsx`, `Decontextual2AfcView.tsx`。
3. 精简重构 `RelativeColorCanvas.tsx` 作为纯路由分发容器。
4. 更新 `src/utils/relativeColorUtils.ts` 重新导出新模块。

### 基本原理
按照 P3 优先级拆分策略，将相对色感各独立交互模式（矢量推移、阿尔伯斯诱导补偿、2AFC 穿透判别）物理隔离到各自的组件文件中，使每个文件职责单一。

### 标签
#intent/refine #flow/ready #priority/medium #comp/engine #concept/ui #scope/core #ai/instruct #task/domain/ui #task/object/relative-color-refactor #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建相对色感拆分目录与代码文件
我们已经成功创建了相对色感模块的子目录、工具库与视图组件，并更新了顶层包装组件。

~~~~~act
write_file
src/utils/relativeColor/types.ts
~~~~~
~~~~~typescript
export type RelativeColorMode =
  | 'VECTOR_SHIFT'
  | 'LIGHTNESS_INDUCTION'
  | 'HUE_INDUCTION'
  | 'DECONTEXTUAL_2AFC';

export interface RelativeColorQuestionData {
  id: string;
  mode: RelativeColorMode;
  difficultyLevel: number;

  // VECTOR_SHIFT 模式字段
  colorA: [number, number, number]; // [H, S, V]
  colorB: [number, number, number]; // [H, S, V]
  colorC: [number, number, number]; // [H, S, V]
  targetD: [number, number, number]; // [H, S, V]
  options?: [number, number, number][]; // 4 个候选 HSV tuple
  correctIndex?: number; // 正确选项的索引 (0~3)

  // 阿尔伯斯同时对比共有字段
  bgLeft?: [number, number, number]; // 左侧背景 HSV
  bgRight?: [number, number, number]; // 右侧背景 HSV
  targetLeftCenter?: [number, number, number]; // 左侧固定中心色 HSV
  idealRightCenter?: [number, number, number]; // 右侧理想补偿中心色 HSV

  // DECONTEXTUAL_2AFC 模式字段
  centerColorA?: [number, number, number]; // 实际物理中心色 A
  centerColorB?: [number, number, number]; // 实际物理中心色 B
  largerPhysicalSide?: 'A' | 'B'; // 物理上更亮的一侧
  physicalValueDiff?: number; // 物理明度差异百分比

  tolerance: number; // 允许误差
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

  // 2AFC 结果
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  physicalValueDiff?: number;
}
~~~~~

~~~~~act
write_file
src/utils/relativeColor/inductionMath.ts
~~~~~
~~~~~typescript
import { hsvToOkLab } from '../oklchUtils';

/**
 * 根据难度等级 (Level 1..35) 计算干扰项的绝对 OKLab 距离 Radius R
 */
export function getDistractorDistanceForLevel(level: number): number {
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;
  const maxR = 0.14;
  const minR = 0.015;
  return maxR * (minR / maxR) ** t;
}

/**
 * 计算背景对中心色的感知诱导偏移 (OKLab 空间侧抑制模型)
 * 诱导方向与背景相反，强度与色差成正比 (系数约 0.22)
 */
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

/**
 * 计算右侧中心色需要的理论物理补偿值，使得左右在感知上完全一致：
 * Perceived(Left) = Lab_L + Shift(Bg_L, Lab_L)
 * Perceived(Right) = Lab_R + Shift(Bg_R, Lab_R)
 * 求解 Lab_R
 */
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
  const idealLabR: [number, number, number] = [
    (perceivedL[0] + intensity * bgRightLab[0]) / factor,
    (perceivedL[1] + intensity * bgRightLab[1]) / factor,
    (perceivedL[2] + intensity * bgRightLab[2]) / factor,
  ];

  return idealLabR;
}
~~~~~

~~~~~act
write_file
src/utils/relativeColor/generators.ts
~~~~~
~~~~~typescript
import {
  calcCompensatedRightColor,
  getDistractorDistanceForLevel,
} from './inductionMath';
import type { RelativeColorMode, RelativeColorQuestionData } from './types';
import {
  generateTetrahedralDistractors,
  getTargetDeltaEForLevel,
  hasGamutMargin,
  hsvToOkLab,
  okLabToHsv,
} from '../oklchUtils';

/**
 * 随机生成色彩矢量迁移题目
 */
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
  const rawOptions: [number, number, number][] = [targetD, ...bestDistractors];
  const indexedOptions = rawOptions.map((opt, index) => ({ opt, isTarget: index === 0 }));
  for (let i = indexedOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
  }

  const options = indexedOptions.map((o) => o.opt);
  const correctIndex = indexedOptions.findIndex((o) => o.isTarget);

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

/**
 * 生成阿尔伯斯明度反差补偿题目 (LIGHTNESS_INDUCTION)
 */
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

/**
 * 生成补色残像与色相诱导补偿题目 (HUE_INDUCTION)
 */
export function generateHueInductionQuestion(level: number): RelativeColorQuestionData {
  const id = `ahi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);

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
    tolerance,
  };
}

/**
 * 生成环境穿透判别二选一题目 (DECONTEXTUAL_2AFC)
 */
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

/**
 * 统一根据模式生成题目
 */
export function generateRelativeColorQuestion(
  mode: RelativeColorMode,
  level: number,
): RelativeColorQuestionData {
  switch (mode) {
    case 'LIGHTNESS_INDUCTION':
      return generateLightnessInductionQuestion(level);
    case 'HUE_INDUCTION':
      return generateHueInductionQuestion(level);
    case 'DECONTEXTUAL_2AFC':
      return generateDecontextual2AfcQuestion(level);
    default:
      return generateVectorShiftQuestion(level);
  }
}
~~~~~

~~~~~act
write_file
src/utils/relativeColor/hitDetection.ts
~~~~~
~~~~~typescript
import { getTargetDeltaEForLevel, hsvToOkLab } from '../oklchUtils';
import type { RelativeColorHitResult, RelativeColorMode, RelativeColorQuestionData } from './types';
import { calcDeltaEOk } from '../oklchUtils';

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

~~~~~act
write_file
src/utils/relativeColor/index.ts
~~~~~
~~~~~typescript
export * from './types';
export * from './inductionMath';
export * from './generators';
export * from './hitDetection';
export { okLabToHsv, isOkLabInGamut } from '../oklchUtils';
~~~~~

~~~~~act
write_file
src/components/relativeColor/VectorShiftView.tsx
~~~~~
~~~~~typescript
import { ArrowRight } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { HsvTrackSlider } from '../HsvTrackSlider';

interface VectorShiftViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function VectorShiftView({
  question,
  showAnswer,
  userAnswer,
  selectedIndex,
  onSelectIndex,
  onSubmit,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: VectorShiftViewProps) {
  const { colorA, colorB, colorC, targetD, options, correctIndex, difficultyLevel } = question;
  const activeColor = options?.[selectedIndex] ?? targetD;
  const userH = activeColor[0];
  const userS = activeColor[1];
  const userV = activeColor[2];

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);

  const hexSelectedD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const cH = colorC[0];
  const cS = colorC[1];
  const cV = colorC[2];

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  const cSatGradient = `linear-gradient(to right, ${hsvToHex(cH, 0, cV)}, ${hsvToHex(cH, 100, cV)})`;
  const cValGradient = `linear-gradient(to right, #000000, ${hsvToHex(cH, 100, 100)})`;

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色
        </div>
      )}

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
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

      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 md:pr-4 md:border-r border-slate-200/60">
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={cH}
              max={360}
              unit="°"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cH}
              userVal={cH}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
            <HsvTrackSlider
              label="S"
              gradient={cSatGradient}
              val={cS}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cS}
              userVal={cS}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
            <HsvTrackSlider
              label="V"
              gradient={cValGradient}
              val={cV}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cV}
              userVal={cV}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
          </div>

          <div className="space-y-3">
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userH}
              max={360}
              unit="°"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[0]}
              userVal={userAnswer?.userD?.[0] ?? userH}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
            <HsvTrackSlider
              label="S"
              gradient={satGradient}
              val={userS}
              max={100}
              unit="%"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[1]}
              userVal={userAnswer?.userD?.[1] ?? userS}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
            <HsvTrackSlider
              label="V"
              gradient={valGradient}
              val={userV}
              max={100}
              unit="%"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[2]}
              userVal={userAnswer?.userD?.[2] ?? userV}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 w-full">
        {options?.map((opt, idx) => {
          const isSelected = selectedIndex === idx;
          const isTarget = idx === correctIndex;
          const hexVal = hsvToHex(...opt);

          let borderStyle = 'border-slate-200 hover:border-slate-300';
          let ringStyle = '';

          if (showAnswer) {
            if (isTarget) {
              borderStyle = 'border-emerald-500';
              ringStyle = 'ring-2 ring-emerald-500/40';
            } else if (isSelected && !isTarget) {
              borderStyle = 'border-rose-400';
              ringStyle = 'ring-1 ring-rose-400/40 opacity-80';
            } else {
              borderStyle = 'border-slate-200 opacity-40';
            }
          } else if (isSelected) {
            borderStyle = 'border-indigo-600';
            ringStyle = 'ring-2 ring-indigo-500/30 shadow-sm';
          }

          return (
            <button
              key={`${idx}-${hexVal}`}
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => onSelectIndex(idx)}
              className={`p-1.5 rounded-2xl border bg-white transition-all duration-150 active:scale-95 cursor-pointer ${borderStyle} ${ringStyle}`}
            >
              <div
                className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hexVal }}
              />
            </button>
          );
        })}
      </div>

      {!showAnswer && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/relativeColor/AlbersInductionView.tsx
~~~~~
~~~~~typescript
import { Check, Eye, X } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { HsvTrackSlider } from '../HsvTrackSlider';

interface AlbersInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  userRightH: number;
  userRightS: number;
  userRightV: number;
  onUserRightHChange: (val: number) => void;
  onUserRightSChange: (val: number) => void;
  onUserRightVChange: (val: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AlbersInductionView({
  question,
  showAnswer,
  userAnswer,
  userRightH,
  userRightS,
  userRightV,
  onUserRightHChange,
  onUserRightSChange,
  onUserRightVChange,
  onSubmit,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AlbersInductionViewProps) {
  const isLightnessMode = question.mode === 'LIGHTNESS_INDUCTION';

  const bgLeftHex = hsvToHex(...(question.bgLeft ?? [0, 0, 100]));
  const bgRightHex = hsvToHex(...(question.bgRight ?? [0, 0, 0]));
  const centerLeftHex = hsvToHex(...(question.targetLeftCenter ?? [0, 0, 50]));

  const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
  const idealRightHex = hsvToHex(...(question.idealRightCenter ?? question.targetD));

  const rightSatGradient = `linear-gradient(to right, ${hsvToHex(userRightH, 0, userRightV)}, ${hsvToHex(userRightH, 100, userRightV)})`;
  const rightValGradient = `linear-gradient(to right, #000000, ${hsvToHex(userRightH, 100, 100)})`;
  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';

  return (
    <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          {isLightnessMode ? (
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-purple-600" />
          )}
          {isLightnessMode
            ? '调节右侧中心明度，使左右两块视觉感知看起来完全一致'
            : '调节右侧中心色彩，反向补偿背景诱导达成视觉感知一致'}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            左侧固定基准
          </span>
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
            右侧调制区 (达成感知一致)
          </span>
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
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
        </div>
      </div>

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {!isLightnessMode && (
          <HsvTrackSlider
            label="H"
            gradient={hueGradient}
            val={userRightH}
            max={360}
            unit="°"
            targetHSV={question.targetD}
            difficultyLevel={question.difficultyLevel}
            showAnswer={showAnswer}
            targetVal={question.idealRightCenter?.[0] ?? question.targetD[0]}
            userVal={userRightH}
            isHit={userAnswer?.isHit}
            onValChange={onUserRightHChange}
            disabled={disabled}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        )}

        {!isLightnessMode && (
          <HsvTrackSlider
            label="S"
            gradient={rightSatGradient}
            val={userRightS}
            max={100}
            unit="%"
            targetHSV={question.targetD}
            difficultyLevel={question.difficultyLevel}
            showAnswer={showAnswer}
            targetVal={question.idealRightCenter?.[1] ?? question.targetD[1]}
            userVal={userRightS}
            isHit={userAnswer?.isHit}
            onValChange={onUserRightSChange}
            disabled={disabled}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        )}

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
          onValChange={onUserRightVChange}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>

      {showAnswer && (
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '精准补偿环境视错觉！' : '环境补偿偏转出现误差'}
              </span>
              <span className="text-slate-400 ml-2">
                (色差 ΔE ={' '}
                <strong className="font-mono text-slate-700">{userAnswer?.deltaEError}</strong>)
              </span>
            </div>
          </div>
        </div>
      )}

      {!showAnswer && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/relativeColor/Decontextual2AfcView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { AnswerDiagnosticBar } from '../common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';

interface Decontextual2AfcViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  selectedChoice: 'A' | 'B' | null;
  onSelectChoice: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function Decontextual2AfcView({
  question,
  showAnswer,
  userAnswer,
  selectedChoice,
  onSelectChoice,
  disabled = false,
  showCanvasHints = true,
}: Decontextual2AfcViewProps) {
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
  const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
  const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
  const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」
        </div>
      )}

      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '区域 A',
          isCorrect: isAHit,
          badge: isAHit
            ? `物理明度更高 (V: ${question.centerColorA?.[2]}%)`
            : `物理更暗 (V: ${question.centerColorA?.[2]}%)`,
          content: (
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
            >
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
            </div>
          ),
        }}
        optionB={{
          key: 'B',
          title: '区域 B',
          isCorrect: isBHit,
          badge: isBHit
            ? `物理明度更高 (V: ${question.centerColorB?.[2]}%)`
            : `物理更暗 (V: ${question.centerColorB?.[2]}%)`,
          content: (
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
            >
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
            </div>
          ),
        }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        onSelect={onSelectChoice}
      />

      {showAnswer && (
        <AnswerDiagnosticBar
          isHit={Boolean(userAnswer?.isHit)}
          successTitle="成功穿透背景视错觉！"
          failTitle="受背景诱导产生了认知偏差"
          subText={`(已统一切换至中性灰背景对比，物理明度差 ΔV = ${question.physicalValueDiff}%)`}
        />
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/relativeColor';
import { AlbersInductionView } from './relativeColor/AlbersInductionView';
import { Decontextual2AfcView } from './relativeColor/Decontextual2AfcView';
import { VectorShiftView } from './relativeColor/VectorShiftView';

interface RelativeColorCanvasProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (userD: [number, number, number] | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
  showCanvasHints?: boolean;
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: RelativeColorCanvasProps) {
  const { mode } = question;

  // === 1. VECTOR_SHIFT 模式状态 ===
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // === 2. 阿尔伯斯诱导补偿模式状态 (调节右侧中心色) ===
  const [userRightH, setUserRightH] = useState<number>(180);
  const [userRightS, setUserRightS] = useState<number>(50);
  const [userRightV, setUserRightV] = useState<number>(50);

  // === 3. DECONTEXTUAL_2AFC 模式状态 ===
  const [selected2AfcChoice, setSelected2AfcChoice] = useState<'A' | 'B' | null>(null);

  // 题目切换时重置状态
  useEffect(() => {
    if (question.id) {
      setSelectedIndex(0);
      setSelected2AfcChoice(null);

      if (question.targetLeftCenter) {
        setUserRightH(question.targetLeftCenter[0]);
        setUserRightS(question.targetLeftCenter[1]);
        setUserRightV(question.targetLeftCenter[2]);
      }
    }
  }, [question.id, question.targetLeftCenter]);

  // 2AFC 选择处理
  const handleSelect2Afc = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelected2AfcChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 提交调制结果
  const handleSubmitInduction = useCallback(() => {
    if (disabled || showAnswer) return;
    onAnswer([userRightH, userRightS, userRightV]);
  }, [disabled, showAnswer, userRightH, userRightS, userRightV, onAnswer]);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (disabled || showAnswer) return;

      if (mode === 'DECONTEXTUAL_2AFC') {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelect2Afc('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelect2Afc('B');
        }
        return;
      }

      if (mode === 'VECTOR_SHIFT') {
        let targetIdx: number | null = null;
        if (['1', '2', '3', '4'].includes(e.key)) {
          targetIdx = Number.parseInt(e.key, 10) - 1;
        } else if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
          const num = Number.parseInt(e.code.replace(/\D/g, ''), 10);
          if (num >= 1 && num <= 4) {
            targetIdx = num - 1;
          }
        }

        if (targetIdx !== null && question.options && targetIdx < question.options.length) {
          e.preventDefault();
          setSelectedIndex(targetIdx);
          return;
        }

        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          const chosenColor = question.options?.[selectedIndex] ?? question.targetD;
          onAnswer(chosenColor);
        }
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleSubmitInduction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    showAnswer,
    disabled,
    selectedIndex,
    question.options,
    question.targetD,
    onAnswer,
    handleSelect2Afc,
    handleSubmitInduction,
  ]);

  if (mode === 'DECONTEXTUAL_2AFC') {
    return (
      <Decontextual2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        selectedChoice={selected2AfcChoice}
        onSelectChoice={handleSelect2Afc}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
    return (
      <AlbersInductionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        userRightH={userRightH}
        userRightS={userRightS}
        userRightV={userRightV}
        onUserRightHChange={setUserRightH}
        onUserRightSChange={setUserRightS}
        onUserRightVChange={setUserRightV}
        onSubmit={handleSubmitInduction}
        disabled={disabled}
        hitMargin={hitMargin}
        showToleranceBand={showToleranceBand}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <VectorShiftView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      selectedIndex={selectedIndex}
      onSelectIndex={setSelectedIndex}
      onSubmit={() => {
        const chosenColor = question.options?.[selectedIndex] ?? question.targetD;
        onAnswer(chosenColor);
      }}
      disabled={disabled}
      hitMargin={hitMargin}
      showToleranceBand={showToleranceBand}
      showCanvasHints={showCanvasHints}
    />
  );
}
~~~~~

~~~~~act
write_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
export * from './relativeColor/index';
~~~~~
