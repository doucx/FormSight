好的，我将为你生成执行此改动的 Quipu Plan 并实施代码重构。

## [WIP] feat: 将相对色感模块改造为四选一候选色问答模式

### 用户需求
在相对色感（色彩矢量迁移）模块中，用户难以直接通过调节 HSV 滑块做出精准的色彩推移。需求将填空式的 HSV 手动滑块调节改造为“四选一”候选色对比选择模式：
1. 在 OKLab 色彩空间中根据当前难度等级生成 1 个真理目标色与 3 个具辨析度的干扰色。
2. 调整页面布局，将 HSV 滑块仪表盘放置在 4 选项色块卡片的上方，锁定为只读联动展示。
3. 采用轻量级的反馈样式（细边框与低调 Tag），避免重彩与粗框给用户带来视觉疲劳。
4. 保持与现有 IndexedDB 数据结构 100% 兼容。

### 评论
将连续维度的色彩调节转化为离散的候选色辨析，极大地提升了相对色感练习的艺术训练效果与趣味性。布局重构与轻量级视觉反馈的加入进一步优化了用户体验。

### 目标
1. 升级 `src/utils/relativeColorUtils.ts` 中的数据接口与题目生成函数，支持 OKLab 空间干扰项生成。
2. 重构 `src/components/RelativeColorCanvas.tsx` 页面布局与交互逻辑，提供 4 选项卡片与 HSV 只读观察仪表盘。
3. 更新 `src/utils/__tests__/relativeColorUtils.test.ts` 单元测试，确保自动化测试全部通过。

### 基本原理
1. 在 `generateRelativeColorQuestion` 中根据当前 difficulty level 导出干扰参数，生成模长偏差、明度偏差及色相偏转 3 种典型的 OKLab 矢量干扰项。
2. 将选中的候选色 HSV 实时绑定到上方 `HsvTrackSlider` 只读轨道的展示值中，作为成份拆解仪表盘。
3. 支持键盘 `1~4` 选择选项与 `Space` 空格交卷，符合流畅训练的快捷键惯例。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/relative-color-picker #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 更新相对色感工具算法 `relativeColorUtils.ts`

~~~~~act
write_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from './oklchUtils';

export type RelativeColorMode = 'VECTOR_SHIFT';

export interface RelativeColorQuestionData {
  id: string;
  mode: RelativeColorMode;
  difficultyLevel: number;
  colorA: [number, number, number]; // [H, S, V]
  colorB: [number, number, number]; // [H, S, V]
  colorC: [number, number, number]; // [H, S, V]
  targetD: [number, number, number]; // [H, S, V]
  tolerance: number; // ΔE_target
  options: [number, number, number][]; // 4 个候选 HSV tuple
  correctIndex: number; // 正确选项的索引 (0~3)
}

export interface RelativeColorHitResult {
  isHit: boolean;
  userD: [number, number, number];
  targetD: [number, number, number];
  deltaEError: number;
  magnitudeError: number;
  angleErrorDeg: number;
  tolerance: number;
  selectedIndex?: number;
}

/**
 * 将 OKLab 坐标逆向近似换算为可显示 sRGB / HSV
 */
export function okLabToHsv(lab: [number, number, number]): [number, number, number] {
  const [L, a, b] = lab;

  const lCbrt = L + 0.3963377774 * a + 0.2158037573 * b;
  const mCbrt = L - 0.1055613458 * a - 0.0638541728 * b;
  const sCbrt = L - 0.0894841775 * a - 1.291485548 * b;

  const lCone = lCbrt ** 3;
  const mCone = mCbrt ** 3;
  const sCone = sCbrt ** 3;

  let rLin = +4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone;
  let gLin = -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone;
  let bLin = -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone;

  rLin = Math.max(0, Math.min(1, rLin));
  gLin = Math.max(0, Math.min(1, gLin));
  bLin = Math.max(0, Math.min(1, bLin));

  const toSrgb = (val: number) =>
    val <= 0.0031308 ? val * 12.92 : 1.055 * val ** (1 / 2.4) - 0.055;
  const rSrgb = Math.max(0, Math.min(1, toSrgb(rLin)));
  const gSrgb = Math.max(0, Math.min(1, toSrgb(gLin)));
  const bSrgb = Math.max(0, Math.min(1, toSrgb(bLin)));

  const max = Math.max(rSrgb, gSrgb, bSrgb);
  const min = Math.min(rSrgb, gSrgb, bSrgb);
  const delta = max - min;

  let h = 0;
  if (delta > 1e-5) {
    if (max === rSrgb) {
      h = 60 * (((gSrgb - bSrgb) / delta) % 6);
    } else if (max === gSrgb) {
      h = 60 * ((bSrgb - rSrgb) / delta + 2);
    } else {
      h = 60 * ((rSrgb - gSrgb) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return [Math.round(h), Math.round(s * 100), Math.round(v * 100)];
}

/**
 * 随机生成色彩矢量迁移题目与 4 个 candidate 干扰选项
 */
export function generateRelativeColorQuestion(
  mode: RelativeColorMode,
  level: number,
): RelativeColorQuestionData {
  const id = `rcq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);

  let attempts = 0;
  let colorA: [number, number, number] = [0, 0, 0];
  let colorB: [number, number, number] = [0, 0, 0];
  let colorC: [number, number, number] = [0, 0, 0];
  let targetD: [number, number, number] = [0, 0, 0];
  let labTargetD: [number, number, number] = [0, 0, 0];
  let vAB: [number, number, number] = [0, 0, 0];

  while (attempts < 100) {
    attempts++;
    // 生成 A (固有色 1)
    const hA = Math.floor(Math.random() * 360);
    const sA = Math.floor(Math.random() * 60) + 30; // 30..90
    const vA = Math.floor(Math.random() * 60) + 30; // 30..90
    colorA = [hA, sA, vA];

    // 生成 B (在 A 基础上有明暗与色相矢量推移)
    const hB = (hA + (Math.floor(Math.random() * 60) - 30) + 360) % 360;
    const sB = Math.max(10, Math.min(100, sA + (Math.floor(Math.random() * 40) - 20)));
    const vB = Math.max(10, Math.min(100, vA + (Math.floor(Math.random() * 50) - 25)));
    colorB = [hB, sB, vB];

    // 生成 C (全新的固有色 2)
    const hC = Math.floor(Math.random() * 360);
    const sC = Math.floor(Math.random() * 60) + 30;
    const vC = Math.floor(Math.random() * 60) + 30;
    colorC = [hC, sC, vC];

    // 计算 OKLab 矢量: v_AB = Lab(B) - Lab(A)
    const labA = hsvToOkLab(...colorA);
    const labB = hsvToOkLab(...colorB);
    const labC = hsvToOkLab(...colorC);

    vAB = [labB[0] - labA[0], labB[1] - labA[1], labB[2] - labA[2]];

    labTargetD = [labC[0] + vAB[0], labC[1] + vAB[1], labC[2] + vAB[2]];

    if (labTargetD[0] >= 0.1 && labTargetD[0] <= 0.95) {
      targetD = okLabToHsv(labTargetD);
      break;
    }
  }

  // === 干扰项生成逻辑 (OKLab 空间中基于 Level 递减的扰动) ===
  const t = (clampedLevel - 1) / 34;
  const spreadScale = 0.08 * (1 - t * 0.75) + 0.015;

  // 干扰项 1: 推移模长/幅度误差 (Magnitude error)
  const magFactor = Math.random() > 0.5 ? 1 + spreadScale * 1.5 : Math.max(0.2, 1 - spreadScale * 1.5);
  const labD1: [number, number, number] = [
    Math.max(0.05, Math.min(0.98, labTargetD[0] + vAB[0] * (magFactor - 1))),
    labTargetD[1] + vAB[1] * (magFactor - 1),
    labTargetD[2] + vAB[2] * (magFactor - 1),
  ];

  // 干扰项 2: 明度单维度偏差 (Lightness error)
  const lightShift = (Math.random() > 0.5 ? 1 : -1) * spreadScale * 1.2;
  const labD2: [number, number, number] = [
    Math.max(0.05, Math.min(0.98, labTargetD[0] + lightShift)),
    labTargetD[1],
    labTargetD[2],
  ];

  // 干扰项 3: 色相/色偏旋转误差 (Hue/Direction error)
  const rotAngle = (Math.random() > 0.5 ? 1 : -1) * (15 + (1 - t) * 30) * (Math.PI / 180);
  const cosA = Math.cos(rotAngle);
  const sinA = Math.sin(rotAngle);
  const rotatedA = vAB[1] * cosA - vAB[2] * sinA;
  const rotatedB = vAB[1] * sinA + vAB[2] * cosA;
  const labD3: [number, number, number] = [
    labTargetD[0],
    labTargetD[1] + (rotatedA - vAB[1]),
    labTargetD[2] + (rotatedB - vAB[2]),
  ];

  const rawOptions: [number, number, number][] = [
    targetD,
    okLabToHsv(labD1),
    okLabToHsv(labD2),
    okLabToHsv(labD3),
  ];

  // 打乱选项并计算正确的索引
  const indexedOptions = rawOptions.map((opt, index) => ({ opt, isTarget: index === 0 }));
  for (let i = indexedOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
  }

  const options = indexedOptions.map((o) => o.opt);
  const correctIndex = indexedOptions.findIndex((o) => o.isTarget);

  return {
    id,
    mode,
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
 * 基于 OKLab 空间色差与矢量特性的答题判定函数
 */
export function checkRelativeColorHit(
  _mode: RelativeColorMode,
  userD: [number, number, number],
  question: RelativeColorQuestionData,
): RelativeColorHitResult {
  const { colorA, colorB, colorC, targetD, difficultyLevel, options, correctIndex } = question;

  const labA = hsvToOkLab(...colorA);
  const labB = hsvToOkLab(...colorB);
  const labC = hsvToOkLab(...colorC);
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

  // 测量矢量模长误差与方向夹角
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

#### Acts 2: 重构相对色感视图组件 `RelativeColorCanvas.tsx`

~~~~~act
write_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~tsx
import { ArrowRight } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/relativeColorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';

interface RelativeColorCanvasProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (userD: [number, number, number]) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: RelativeColorCanvasProps) {
  const { colorA, colorB, colorC, targetD, options, correctIndex, difficultyLevel } = question;

  // 默认选中第 0 个选项
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // 题目切换时重置为第 0 项
  useEffect(() => {
    setSelectedIndex(0);
  }, [question.id]);

  const activeColor = options?.[selectedIndex] ?? targetD;
  const userH = activeColor[0];
  const userS = activeColor[1];
  const userV = activeColor[2];

  const handleSubmit = () => {
    if (disabled || showAnswer) return;
    onAnswer(activeColor);
  };

  // 键盘响应 (1/2/3/4 选择选项，Space 提交)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const idx = Number.parseInt(e.code.replace('Digit', ''), 10) - 1;
        if (options && idx < options.length) {
          setSelectedIndex(idx);
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        onAnswer(activeColor);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, activeColor, options, onAnswer]);

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);

  const hexSelectedD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 1. 上方对比展示区 (A -> B  VS  C -> D) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* 基准推移组 (A -> B) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            基准推移 (A ➔ B)
          </div>
          <div className="flex items-center justify-center gap-3 w-full">
            <div
              className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexA }}
            />
            <ArrowRight className="w-5 h-5 text-indigo-400" />
            <div
              className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexB }}
            />
          </div>
        </div>

        {/* 目标推移组 (C -> D) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            目标推移 (C ➔ D)
          </div>
          <div className="flex items-center justify-center gap-3 w-full">
            <div
              className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexC }}
            />
            <ArrowRight className="w-5 h-5 text-indigo-400" />
            <div
              className="w-24 h-24 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
              style={{ backgroundColor: hexSelectedD }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2 border-t border-white/40"
                  style={{ backgroundColor: hexTargetD }}
                  title="下方半区为真理目标色 D"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 中间 HSV 滑块轨道区 (锁定为观察仪表盘，跟着上方选中的 candidate 实时联动) */}
      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="text-[11px] font-bold text-slate-400 mb-1">
          当前选中色彩的分色成分 (Locked Slider):
        </div>
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

      {/* 3. 下方 4 个色彩候选选项卡片 (轻量级反馈) */}
      <div className="w-full space-y-2">
        <div className="text-xs font-bold text-slate-600 flex justify-between items-center px-1">
          <span>选择符合矢量推移规律的正确颜色 D：</span>
          <span className="text-[10px] text-slate-400 font-normal">支持键盘数字键 1~4 选择</span>
        </div>

        <div className="grid grid-cols-4 gap-3 w-full">
          {options?.map((opt, idx) => {
            const isSelected = selectedIndex === idx;
            const isTarget = idx === correctIndex;
            const hexVal = hsvToHex(...opt);

            // 揭晓答案后的轻量级样式
            let borderStyle = 'border-slate-200 hover:border-slate-300';
            let bgStyle = 'bg-white';
            let statusBadge = null;

            if (showAnswer) {
              if (isTarget) {
                // 正确选项：细绿框 + 极简绿点标记
                borderStyle = 'border-emerald-500 ring-1 ring-emerald-500/30';
                bgStyle = 'bg-emerald-50/20';
                statusBadge = (
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                    正确
                  </span>
                );
              } else if (isSelected && !isTarget) {
                // 选错项：淡红框 + 选错小标记
                borderStyle = 'border-rose-300';
                bgStyle = 'bg-rose-50/20';
                statusBadge = (
                  <span className="text-[10px] font-medium text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded">
                    选择
                  </span>
                );
              } else {
                // 其他未选中的非目标项：轻微降低不透明度
                borderStyle = 'border-slate-100 opacity-40';
              }
            } else if (isSelected) {
              // 答题中选中项：优雅的 Indigo 细边框 + 轻微阴影
              borderStyle = 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm';
              bgStyle = 'bg-indigo-50/10';
            }

            return (
              <button
                key={`${idx}-${hexVal}`}
                type="button"
                disabled={disabled || showAnswer}
                onClick={() => setSelectedIndex(idx)}
                className={`relative flex flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all duration-150 active:scale-95 text-left ${borderStyle} ${bgStyle}`}
              >
                {/* 顶部按键角标 & 揭晓状态 Badge */}
                <div className="w-full flex justify-between items-center px-0.5">
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isSelected && !showAnswer ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  {statusBadge}
                </div>

                {/* 色块卡片 */}
                <div
                  className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
                  style={{ backgroundColor: hexVal }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. 提交按钮 */}
      {!showAnswer && (
        <button
          type="button"
          onClick={handleSubmit}
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

#### Acts 3: 更新单元测试 `relativeColorUtils.test.ts`

~~~~~act
write_file
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  okLabToHsv,
} from '../relativeColorUtils';

describe('relativeColorUtils', () => {
  it('generateRelativeColorQuestion - should generate valid color vector shift question with 4 candidate options', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    expect(q.mode).toBe('VECTOR_SHIFT');
    expect(q.colorA).toBeDefined();
    expect(q.colorB).toBeDefined();
    expect(q.colorC).toBeDefined();
    expect(q.targetD).toBeDefined();
    expect(q.tolerance).toBeGreaterThan(0);
    expect(q.options.length).toBe(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThanOrEqual(3);
  });

  it('checkRelativeColorHit - should detect target option choice correctly', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    const correctOption = q.options[q.correctIndex];
    const result = checkRelativeColorHit('VECTOR_SHIFT', correctOption, q);
    expect(result.isHit).toBe(true);
  });

  it('okLabToHsv - should convert OKLab bounds back to valid HSV tuple', () => {
    const hsv = okLabToHsv([0.7, 0, 0]);
    expect(hsv[0]).toBeGreaterThanOrEqual(0);
    expect(hsv[0]).toBeLessThanOrEqual(360);
    expect(hsv[1]).toBeGreaterThanOrEqual(0);
    expect(hsv[2]).toBeGreaterThanOrEqual(0);
  });
});
~~~~~

### 下一步建议
1. 运行系统的单元测试，验证修改后的函数及数据结构完全符合预期。
2. 启动本地开发服务，在浏览器中测试四选一做答与键盘 `1~4` 快捷键的平滑联动情况。
