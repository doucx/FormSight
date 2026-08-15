好的，我将为你生成实现“综合拾色训练（Full Color Matching Training）”功能的具体规划与执行脚本。

## [WIP] feat(color): 实现色感训练“综合拾色”模式及多维交互体系

### 用户需求
在 FormSight 色感训练模块中新增“综合拾色”模式（`ALL`），允许用户在同一界面中同时调整色相 (H)、饱和度 (S) 与明度 (V) 三个滑块，逼近真理目标色，并通过显式提交（按钮或空格键）完成试题判定，同时建立对应的 IndexedDB 数据持久化、看板展示与统计分析。

### 评论
该功能打破了单一色彩维度的隔离训练模式，极大地提升了色感训练在真实创作与调色场景下的应用价值。通过 OKLab 均匀色彩空间的欧氏色差 $\Delta E_{OK}$ 进行综合判定，能够精准评估用户在三维色彩空间中的空间定位能力与感知敏锐度。

### 目标
1. 扩展 `ColorMode` 类型为 `'H' | 'S' | 'V' | 'ALL'`，完善基于 OKLab 色差的试题生成与判题算法。
2. 适配 IndexedDB 数据持久化逻辑，支持 `'ALL'` 模式会话、日志与能力看板保存。
3. 改造 `ColorCanvas.tsx` 组件，在 `'ALL'` 模式下呈现目标色与用户调制色并列对比、3 轨独立交互及提交控制。
4. 改造 `ColorTrainingView.tsx`，支持双阶段空格键响应（第一阶段：提交当前调色；第二阶段：切换下一题）。
5. 在 `ColorDashboard.tsx` 与 `GlobalStatsModal.tsx` 中添加“综合拾色”卡片与筛选项。
6. 补全单元测试，确保测试套件绿灯通过。

### 基本原理
- **色差评价**：在 OKLab 空间中计算目标色与用户调制色的 3D 欧氏色差 $\Delta E_{OK}$，与难度 Level 对应的容错阈值 $\Delta E_{target}$ 进行对比。
- **状态联动**：`ColorCanvas` 内部维护用户实时 H/S/V 状态，在 `'ALL'` 模式下实时更新调制色块与滑块轨道背景，点击提交时将最终 HSV 数组传递给上层处理。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/ui #concept/state #concept/ui #scope/core #scope/ux #ai/instruct #task/domain/color-recognition #task/object/comprehensive-color-matching #task/action/feature-implementation #task/state/begin

---

### Script

#### Acts 1: 扩展色感核心算法与类型定义

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript.old
export type ColorMode = 'H' | 'S' | 'V';

export interface ColorQuestionData {
  id: string;
  mode: ColorMode;
  difficultyLevel: number; // 1..35
  targetH: number; // 0..359
  targetS: number; // 0..100
  targetV: number; // 0..100
  tolerance: number; // 允许的感知色差阈值 ΔE_target
}

export interface ColorHitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number; // 绝对数值误差 (角度或百分比)
  tolerance: number;
}
~~~~~
~~~~~typescript.new
export type ColorMode = 'H' | 'S' | 'V' | 'ALL';

export interface ColorQuestionData {
  id: string;
  mode: ColorMode;
  difficultyLevel: number; // 1..35
  targetH: number; // 0..359
  targetS: number; // 0..100
  targetV: number; // 0..100
  tolerance: number; // 允许的感知色差阈值 ΔE_target
}

export interface ColorHitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number; // 绝对数值误差 (角度、百分比或 OKLab ΔE)
  tolerance: number;
  userHSV?: [number, number, number];
}
~~~~~

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript.old
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    if (mode === 'H') {
      targetS = Math.floor(Math.random() * 81) + 20; // 20..100
      targetV = Math.floor(Math.random() * 81) + 20; // 20..100

      // 检验 OKLab 彩度：必须保证彩度足够大，否则色相被低 S/V 遮蔽不可辩
      const lab = hsvToOkLab(targetH, targetS, targetV);
      if (getOkChroma(lab) >= tolerance * 1.5) {
        break;
      }
    } else if (mode === 'V') {
      targetS = Math.floor(Math.random() * 71) + 30; // S >= 30% 防止纯灰无明度变化感
      targetV = Math.floor(Math.random() * 101);
      break;
    } else {
      // mode === 'S'
      targetV = Math.floor(Math.random() * 71) + 30; // V >= 30% 防止纯黑无饱和度感
      targetS = Math.floor(Math.random() * 101);
      break;
    }
  }
~~~~~
~~~~~typescript.new
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    if (mode === 'H' || mode === 'ALL') {
      targetS = Math.floor(Math.random() * 81) + 20; // 20..100
      targetV = Math.floor(Math.random() * 81) + 20; // 20..100

      // 检验 OKLab 彩度：必须保证彩度足够大，否则色相被低 S/V 遮蔽不可辩
      const lab = hsvToOkLab(targetH, targetS, targetV);
      if (getOkChroma(lab) >= tolerance * 1.5) {
        break;
      }
    } else if (mode === 'V') {
      targetS = Math.floor(Math.random() * 71) + 30; // S >= 30% 防止纯灰无明度变化感
      targetV = Math.floor(Math.random() * 101);
      break;
    } else {
      // mode === 'S'
      targetV = Math.floor(Math.random() * 71) + 30; // V >= 30% 防止纯黑无饱和度感
      targetS = Math.floor(Math.random() * 101);
      break;
    }
  }
~~~~~

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript.old
export function checkColorHit(
  mode: ColorMode,
  userVal: number,
  question: ColorQuestionData,
): ColorHitResult {
  const { targetH, targetS, targetV, difficultyLevel } = question;

  const userH = mode === 'H' ? userVal : targetH;
  const userS = mode === 'S' ? userVal : targetS;
  const userV = mode === 'V' ? userVal : targetV;

  const targetLab = hsvToOkLab(targetH, targetS, targetV);
  const userLab = hsvToOkLab(userH, userS, userV);
  const realDeltaE = calcDeltaEOk(targetLab, userLab);

  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);
  const isHit = realDeltaE <= targetDeltaE;

  let targetVal = targetH;
  let errorVal = 0;

  if (mode === 'H') {
    targetVal = targetH;
    const diff = Math.abs(userVal - targetVal);
    errorVal = Math.min(diff, 360 - diff);
  } else if (mode === 'V') {
    targetVal = targetV;
    errorVal = Math.abs(userVal - targetVal);
  } else {
    targetVal = targetS;
    errorVal = Math.abs(userVal - targetVal);
  }

  return {
    isHit,
    userValue: userVal,
    targetValue: targetVal,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: targetDeltaE,
  };
}
~~~~~
~~~~~typescript.new
export function checkColorHit(
  mode: ColorMode,
  userVal: number | [number, number, number],
  question: ColorQuestionData,
): ColorHitResult {
  const { targetH, targetS, targetV, difficultyLevel } = question;

  let userH: number;
  let userS: number;
  let userV: number;

  if (mode === 'ALL' && Array.isArray(userVal)) {
    [userH, userS, userV] = userVal;
  } else {
    const singleVal = typeof userVal === 'number' ? userVal : userVal[0];
    userH = mode === 'H' ? singleVal : targetH;
    userS = mode === 'S' ? singleVal : targetS;
    userV = mode === 'V' ? singleVal : targetV;
  }

  const targetLab = hsvToOkLab(targetH, targetS, targetV);
  const userLab = hsvToOkLab(userH, userS, userV);
  const realDeltaE = calcDeltaEOk(targetLab, userLab);

  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);
  const isHit = realDeltaE <= targetDeltaE;

  let targetVal = targetH;
  let errorVal = 0;

  if (mode === 'ALL') {
    targetVal = 0;
    errorVal = Math.round(realDeltaE * 1000) / 1000;
  } else if (mode === 'H') {
    targetVal = targetH;
    const diff = Math.abs((userVal as number) - targetVal);
    errorVal = Math.min(diff, 360 - diff);
  } else if (mode === 'V') {
    targetVal = targetV;
    errorVal = Math.abs((userVal as number) - targetVal);
  } else {
    targetVal = targetS;
    errorVal = Math.abs((userVal as number) - targetVal);
  }

  return {
    isHit,
    userValue: typeof userVal === 'number' ? userVal : userH,
    targetValue: targetVal,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: targetDeltaE,
    userHSV: [userH, userS, userV],
  };
}
~~~~~

#### Acts 2: 升级 IndexedDB 存储支持

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
export interface ColorSessionData {
  id: string;
  mode: 'H' | 'S' | 'V';
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface ColorTrialRecord {
  id: string;
  sessionId: string;
  mode: 'H' | 'S' | 'V';
  timestamp: number;
  difficultyLevel: number;
  targetHSV: [number, number, number];
  userHSV: [number, number, number];
  isHit: boolean;
  errorValue: number;
  responseTimeMs: number;
}

export interface ColorProfileData {
  mode: 'H' | 'S' | 'V';
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}
~~~~~
~~~~~typescript.new
export interface ColorSessionData {
  id: string;
  mode: 'H' | 'S' | 'V' | 'ALL';
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface ColorTrialRecord {
  id: string;
  sessionId: string;
  mode: 'H' | 'S' | 'V' | 'ALL';
  timestamp: number;
  difficultyLevel: number;
  targetHSV: [number, number, number];
  userHSV: [number, number, number];
  isHit: boolean;
  errorValue: number;
  responseTimeMs: number;
}

export interface ColorProfileData {
  mode: 'H' | 'S' | 'V' | 'ALL';
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}
~~~~~

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
  color_profiles: {
    key: 'H' | 'S' | 'V';
    value: ColorProfileData;
  };
~~~~~
~~~~~typescript.new
  color_profiles: {
    key: 'H' | 'S' | 'V' | 'ALL';
    value: ColorProfileData;
  };
~~~~~

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
export async function getAllColorProfiles(): Promise<
  Record<'H' | 'S' | 'V', ColorProfileData | null>
> {
  const db = await getDB();
  const h = (await db.get('color_profiles', 'H')) || null;
  const s = (await db.get('color_profiles', 'S')) || null;
  const v = (await db.get('color_profiles', 'V')) || null;

  return { H: h, S: s, V: v };
}

export async function getAllColorTrialRecords(mode?: 'H' | 'S' | 'V'): Promise<ColorTrialRecord[]> {
  const db = await getDB();
  if (mode) {
    return await db.getAllFromIndex('color_records', 'by-mode', mode);
  }
  return await db.getAll('color_records');
}

async function updateColorProfile(
  mode: 'H' | 'S' | 'V',
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
~~~~~
~~~~~typescript.new
export async function getAllColorProfiles(): Promise<
  Record<'H' | 'S' | 'V' | 'ALL', ColorProfileData | null>
> {
  const db = await getDB();
  const h = (await db.get('color_profiles', 'H')) || null;
  const s = (await db.get('color_profiles', 'S')) || null;
  const v = (await db.get('color_profiles', 'V')) || null;
  const all = (await db.get('color_profiles', 'ALL')) || null;

  return { H: h, S: s, V: v, ALL: all };
}

export async function getAllColorTrialRecords(mode?: 'H' | 'S' | 'V' | 'ALL'): Promise<ColorTrialRecord[]> {
  const db = await getDB();
  if (mode) {
    return await db.getAllFromIndex('color_records', 'by-mode', mode);
  }
  return await db.getAll('color_records');
}

async function updateColorProfile(
  mode: 'H' | 'S' | 'V' | 'ALL',
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
~~~~~

#### Acts 3: 升级 `ColorCanvas.tsx` 组件以支持 `'ALL'` 模式双色块与 3 轨调制

~~~~~act
write_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  type ColorHitResult,
  type ColorQuestionData,
  getToleranceSpan,
  hsvToHex,
} from '../utils/colorUtils';

interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number | [number, number, number]) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: ColorCanvasProps) {
  const { mode, targetH, targetS, targetV } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);

  // === 综合拾色 ('ALL') 模式本地调制状态 ===
  const [userH, setUserH] = useState<number>(180);
  const [userS, setUserS] = useState<number>(50);
  const [userV, setUserV] = useState<number>(50);

  // 当题目切换时，重置调制状态为中性灰或随机初始状态
  useEffect(() => {
    if (mode === 'ALL') {
      setUserH(180);
      setUserS(50);
      setUserV(50);
    }
  }, [question.id, mode]);

  const activeTrackRef = useRef<HTMLDivElement | null>(null);
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const maxVal = mode === 'H' ? 360 : 100;

  // 单维度鼠标悬停追踪
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !activeTrackRef.current || mode === 'ALL') return;
    const rect = activeTrackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const val = Math.round(ratio * maxVal);
    setHoverVal(val);
  };

  const handleMouseLeave = () => {
    setHoverVal(null);
  };

  // 点击单维度活动轨道
  const handleActiveTrackClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !activeTrackRef.current || mode === 'ALL') return;
    const rect = activeTrackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const selectedVal = Math.round(ratio * maxVal);

    setHoverVal(null);
    onAnswer(selectedVal);
  };

  // === ALL 模式下滑块拖拽处理 ===
  const handleAllSliderChange = (label: 'H' | 'S' | 'V', val: number) => {
    if (disabled || showAnswer) return;
    if (label === 'H') setUserH(val);
    else if (label === 'S') setUserS(val);
    else if (label === 'V') setUserV(val);
  };

  const handleSubmitAll = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };

  const getPercent = (val: number, max: number) => `${(val / max) * 100}%`;

  // === 渐变背景计算 ===
  const currentH = mode === 'ALL' ? userH : targetH;
  const currentS = mode === 'ALL' ? userS : targetS;
  const currentV = mode === 'ALL' ? userV : targetV;

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(currentH, 100, 100)})`;

  // 渲染单个 Slider 轨道行
  const renderSliderRow = (
    label: 'H' | 'S' | 'V',
    isTargetActiveMode: boolean,
    gradient: string,
    val: number,
    max: number,
    unit: string,
  ) => {
    const isInteractiveInAll = mode === 'ALL' && !showAnswer && !disabled;

    return (
      <div key={label} className="flex items-center gap-3 w-full">
        {/* Label */}
        <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

        {/* Track Extended Hit Area */}
        <div
          onClick={isTargetActiveMode && mode !== 'ALL' ? handleActiveTrackClick : undefined}
          onKeyDown={
            isTargetActiveMode && mode !== 'ALL'
              ? (e) => {
                  if (
                    (e.key === 'Enter' || e.key === ' ') &&
                    hoverVal !== null &&
                    !disabled &&
                    !showAnswer
                  ) {
                    e.preventDefault();
                    onAnswer(hoverVal);
                  }
                }
              : undefined
          }
          role={isTargetActiveMode && mode !== 'ALL' ? 'button' : undefined}
          tabIndex={isTargetActiveMode && mode !== 'ALL' && !showAnswer && !disabled ? 0 : undefined}
          onMouseMove={isTargetActiveMode && mode !== 'ALL' ? handleMouseMove : undefined}
          onMouseLeave={isTargetActiveMode && mode !== 'ALL' ? handleMouseLeave : undefined}
          style={
            hitMargin > 0
              ? {
                  paddingLeft: `${hitMargin}px`,
                  paddingRight: `${hitMargin}px`,
                  marginLeft: `-${hitMargin}px`,
                  marginRight: `-${hitMargin}px`,
                  paddingTop: '6px',
                  paddingBottom: '6px',
                  marginTop: '-6px',
                  marginBottom: '-6px',
                }
              : undefined
          }
          className={`relative flex-1 flex items-center ${
            isTargetActiveMode && mode !== 'ALL' && !showAnswer && !disabled ? 'cursor-none' : 'cursor-default'
          }`}
        >
          {/* Inner Track */}
          <div
            ref={isTargetActiveMode && mode !== 'ALL' ? activeTrackRef : null}
            className={`relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center ${
              isTargetActiveMode && mode !== 'ALL' && !showAnswer && !disabled
                ? 'hover:ring-2 ring-indigo-400/60'
                : ''
            }`}
            style={{ background: gradient }}
          >
            {/* 已知维度/单维度标记 (细长黑色竖条) */}
            {(!isTargetActiveMode || (mode !== 'ALL' && !isTargetActiveMode)) && mode !== 'ALL' && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 border border-white/80 rounded-sm shadow-sm"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* ALL 模式拖拽 Range Input */}
            {mode === 'ALL' && (
              <input
                type="range"
                min="0"
                max={max}
                value={val}
                disabled={disabled || showAnswer}
                onChange={(e) =>
                  handleAllSliderChange(label, Number.parseInt((e.target as HTMLInputElement).value, 10))
                }
                onInput={(e) =>
                  handleAllSliderChange(label, Number.parseInt((e.target as HTMLInputElement).value, 10))
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default z-30"
              />
            )}

            {/* ALL 模式调制中的当前游标 (纯色竖条) */}
            {mode === 'ALL' && !showAnswer && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 bg-indigo-600 border border-white rounded-md shadow-md pointer-events-none z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* 单维度悬停容错感应区 */}
            {mode !== 'ALL' &&
              isTargetActiveMode &&
              !showAnswer &&
              hoverVal !== null &&
              showToleranceBand &&
              (() => {
                const span = getToleranceSpan(mode, hoverVal, question);
                const isWrapMode = mode === 'H';

                const leftVal = isWrapMode
                  ? (hoverVal - span.halfSpan + max) % max
                  : Math.max(0, hoverVal - span.halfSpan);
                const rightVal = isWrapMode
                  ? (hoverVal + span.halfSpan + max) % max
                  : Math.min(max, hoverVal + span.halfSpan);

                const leftPct = (leftVal / max) * 100;
                const rightPct = (rightVal / max) * 100;

                return (
                  <>
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${leftPct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${rightPct}%` }}
                    />
                  </>
                );
              })()}

            {/* 单维度悬停准心 */}
            {mode !== 'ALL' && isTargetActiveMode && !showAnswer && hoverVal !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-indigo-600/90 shadow-sm pointer-events-none z-30"
                style={{ left: getPercent(hoverVal, max) }}
              />
            )}

            {/* 答题揭晓阶段标记 */}
            {showAnswer && (
              <>
                {/* 真理目标位 (绿色细竖线) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 bg-emerald-500 border-x border-white shadow-md z-10"
                  style={{
                    left: getPercent(
                      label === 'H' ? targetH : label === 'S' ? targetS : targetV,
                      max,
                    ),
                  }}
                />

                {/* 用户提交位 (红色或绿色细竖线) */}
                {userAnswer && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 border-x border-white ${
                      userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    } shadow-md z-20`}
                    style={{
                      left: getPercent(
                        mode === 'ALL'
                          ? (userAnswer.userHSV?.[label === 'H' ? 0 : label === 'S' ? 1 : 2] ?? val)
                          : userAnswer.userValue,
                        max,
                      ),
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* 数值 Label */}
        <span
          className={`w-12 text-right font-mono font-bold text-xs ${
            isInteractiveInAll || (isTargetActiveMode && !showAnswer)
              ? showAnswer
                ? userAnswer?.isHit
                  ? 'text-emerald-600'
                  : 'text-rose-600'
                : 'text-amber-500'
              : 'text-slate-700'
          }`}
        >
          {mode === 'ALL'
            ? `${val}${unit}`
            : isTargetActiveMode && !showAnswer
              ? hoverVal !== null
                ? `${hoverVal}${unit}`
                : '?'
              : `${val}${unit}`}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 目标色块 / 双色块对比 */}
      <div className="flex flex-col items-center gap-2 w-full">
        {mode === 'ALL' ? (
          <div className="flex items-center justify-center gap-4 w-full">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                目标色 (Truth)
              </span>
              <div
                className="w-full h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
                style={{ backgroundColor: targetHex }}
              />
            </div>
            <div className="text-slate-300 font-black text-xl pt-5">VS</div>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                你的调制 (Match)
              </span>
              <div
                className="w-full h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-150"
                style={{ backgroundColor: hsvToHex(userH, userS, userV) }}
              />
            </div>
          </div>
        ) : (
          <div
            className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
        )}
      </div>

      {/* 递进显隐/三轨交互 Slider */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* H 行 */}
        {renderSliderRow('H', mode === 'H' || mode === 'ALL', hueGradient, mode === 'ALL' ? userH : targetH, 360, '°')}

        {/* S 行 */}
        {(mode === 'S' || mode === 'ALL') &&
          renderSliderRow('S', mode === 'S' || mode === 'ALL', satGradient, mode === 'ALL' ? userS : targetS, 100, '%')}

        {/* V 行 */}
        {(mode === 'V' || mode === 'S' || mode === 'ALL') &&
          renderSliderRow('V', mode === 'V' || mode === 'ALL', valGradient, mode === 'ALL' ? userV : targetV, 100, '%')}
      </div>

      {/* ALL 模式显式提交控制按钮 */}
      {mode === 'ALL' && !showAnswer && (
        <button
          type="button"
          onClick={handleSubmitAll}
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

#### Acts 4: 升级 `ColorTrainingView.tsx` 双阶段按键响应逻辑

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript.old
  // 键盘响应
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (showAnswer && !isFinished) handleNextQuestion();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleFinishSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished]);

  // 作答响应
  const handleAnswer = async (userVal: number) => {
    const responseTimeMs = Date.now() - questionStartTime;
    const hitResult = checkColorHit(mode, userVal, question);

    setUserAnswer(hitResult);
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hitResult.isHit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    // 数据库存盘
    const record: ColorTrialRecord = {
      id: `crec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      targetHSV: [question.targetH, question.targetS, question.targetV],
      userHSV: [
        mode === 'H' ? userVal : question.targetH,
        mode === 'S' ? userVal : question.targetS,
        mode === 'V' ? userVal : question.targetV,
      ],
      isHit: hitResult.isHit,
      errorValue: hitResult.errorValue,
      responseTimeMs,
    };
~~~~~
~~~~~typescript.new
  // 键盘响应 (Space 双阶段支持)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!showAnswer && mode === 'ALL') {
          // 第一阶段：ALL 模式下触发显式提交按钮事件
          const submitBtn = document.querySelector('button[onClick]') as HTMLButtonElement | null;
          submitBtn?.click();
        } else if (showAnswer && !isFinished) {
          // 第二阶段：切题
          handleNextQuestion();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleFinishSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished, mode]);

  // 作答响应
  const handleAnswer = async (userVal: number | [number, number, number]) => {
    const responseTimeMs = Date.now() - questionStartTime;
    const hitResult = checkColorHit(mode, userVal, question);

    setUserAnswer(hitResult);
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hitResult.isHit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    const computedUserHSV: [number, number, number] =
      mode === 'ALL' && Array.isArray(userVal)
        ? userVal
        : [
            mode === 'H' ? (userVal as number) : question.targetH,
            mode === 'S' ? (userVal as number) : question.targetS,
            mode === 'V' ? (userVal as number) : question.targetV,
          ];

    // 数据库存盘
    const record: ColorTrialRecord = {
      id: `crec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      targetHSV: [question.targetH, question.targetS, question.targetV],
      userHSV: computedUserHSV,
      isHit: hitResult.isHit,
      errorValue: hitResult.errorValue,
      responseTimeMs,
    };
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript.old
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode === 'H' ? '色相' : mode === 'V' ? '明度' : '饱和度'} |{' '}
            {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
~~~~~
~~~~~typescript.new
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode === 'H' ? '色相' : mode === 'V' ? '明度' : mode === 'S' ? '饱和度' : '综合拾色'} |{' '}
            {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
~~~~~

#### Acts 5: 在 Dashboard 与 全局统计中集成卡片与选项

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
import {
  Award,
  BarChart2,
  Droplet,
  Play,
  RotateCw,
  Sliders,
  Sun,
  Target,
  TrendingUp,
} from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import type { ColorMode } from '../utils/colorUtils';
import { type ColorProfileData, getAllColorTrialRecords } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}

const COLOR_MODES_CONFIG: Array<{
  id: ColorMode;
  title: string;
  desc: string;
  icon: typeof RotateCw;
}> = [
  {
    id: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    icon: RotateCw,
  },
  {
    id: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    icon: Sun,
  },
  {
    id: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    icon: Droplet,
  },
];
~~~~~
~~~~~typescript.new
import {
  Award,
  BarChart2,
  Droplet,
  Palette,
  Play,
  RotateCw,
  Sliders,
  Sun,
  Target,
  TrendingUp,
} from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import type { ColorMode } from '../utils/colorUtils';
import { type ColorProfileData, getAllColorTrialRecords } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}

const COLOR_MODES_CONFIG: Array<{
  id: ColorMode;
  title: string;
  desc: string;
  icon: typeof RotateCw;
}> = [
  {
    id: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    icon: RotateCw,
  },
  {
    id: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    icon: Sun,
  },
  {
    id: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    icon: Droplet,
  },
  {
    id: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    icon: Palette,
  },
];
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
  const [todayStats, setTodayStats] = useState<
    Record<ColorMode, { count: number; timeMs: number }>
  >({
    H: { count: 0, timeMs: 0 },
    V: { count: 0, timeMs: 0 },
    S: { count: 0, timeMs: 0 },
  });

  useEffect(() => {
    let isMounted = true;
    const fetchTodayStats = async () => {
      const records = await getAllColorTrialRecords();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const stats: Record<ColorMode, { count: number; timeMs: number }> = {
        H: { count: 0, timeMs: 0 },
        V: { count: 0, timeMs: 0 },
        S: { count: 0, timeMs: 0 },
      };
~~~~~
~~~~~typescript.new
  const [todayStats, setTodayStats] = useState<
    Record<ColorMode, { count: number; timeMs: number }>
  >({
    H: { count: 0, timeMs: 0 },
    V: { count: 0, timeMs: 0 },
    S: { count: 0, timeMs: 0 },
    ALL: { count: 0, timeMs: 0 },
  });

  useEffect(() => {
    let isMounted = true;
    const fetchTodayStats = async () => {
      const records = await getAllColorTrialRecords();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const stats: Record<ColorMode, { count: number; timeMs: number }> = {
        H: { count: 0, timeMs: 0 },
        V: { count: 0, timeMs: 0 },
        S: { count: 0, timeMs: 0 },
        ALL: { count: 0, timeMs: 0 },
      };
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
      {/* 3 个色彩子模式卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
~~~~~
~~~~~typescript.new
      {/* 4 个色彩子模式卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  const [colorProfiles, setColorProfiles] = useState<Record<ColorMode, ColorProfileData | null>>({
    H: null,
    S: null,
    V: null,
  });
~~~~~
~~~~~typescript.new
  const [colorProfiles, setColorProfiles] = useState<Record<ColorMode, ColorProfileData | null>>({
    H: null,
    S: null,
    V: null,
    ALL: null,
  });
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
type FilterOption =
  | 'all'
  | 'star_all'
  | 'star_single'
  | 'star_double_h'
  | 'star_double_r'
  | 'color_all'
  | 'color_H'
  | 'color_V'
  | 'color_S';

const FILTER_LABELS: Record<FilterOption, string> = {
  all: '全部练习项目',
  star_all: '寻星练习 (全部模式)',
  star_single: '寻星 • 单锚点',
  star_double_h: '寻星 • 水平双锚点',
  star_double_r: '寻星 • 旋转双锚点',
  color_all: '色感训练 (全部模式)',
  color_H: '色感 • 色相 (Hue)',
  color_V: '色感 • 明度 (Value)',
  color_S: '色感 • 饱和度 (Sat)',
};
~~~~~
~~~~~typescript.new
type FilterOption =
  | 'all'
  | 'star_all'
  | 'star_single'
  | 'star_double_h'
  | 'star_double_r'
  | 'color_all'
  | 'color_H'
  | 'color_V'
  | 'color_S'
  | 'color_ALL';

const FILTER_LABELS: Record<FilterOption, string> = {
  all: '全部练习项目',
  star_all: '寻星练习 (全部模式)',
  star_single: '寻星 • 单锚点',
  star_double_h: '寻星 • 水平双锚点',
  star_double_r: '寻星 • 旋转双锚点',
  color_all: '色感训练 (全部模式)',
  color_H: '色感 • 色相 (Hue)',
  color_V: '色感 • 明度 (Value)',
  color_S: '色感 • 饱和度 (Sat)',
  color_ALL: '色感 • 综合拾色 (Match)',
};
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
                <optgroup label="色感训练">
                  <option value="color_all">色感训练 (全部)</option>
                  <option value="color_H">色相 (Hue)</option>
                  <option value="color_V">明度 (Value)</option>
                  <option value="color_S">饱和度 (Saturation)</option>
                </optgroup>
~~~~~
~~~~~typescript.new
                <optgroup label="色感训练">
                  <option value="color_all">色感训练 (全部)</option>
                  <option value="color_H">色相 (Hue)</option>
                  <option value="color_V">明度 (Value)</option>
                  <option value="color_S">饱和度 (Saturation)</option>
                  <option value="color_ALL">综合拾色 (Match)</option>
                </optgroup>
~~~~~

#### Acts 6: 更新与补充单元测试

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript.old
    // Linear V mode test
    const questionV = generateColorQuestion('V', 35);
    questionV.targetV = 50;
    const hitVSuccess = checkColorHit('V', 50, questionV);
    expect(hitVSuccess.isHit).toBe(true);
  });
~~~~~
~~~~~typescript.new
    // Linear V mode test
    const questionV = generateColorQuestion('V', 35);
    questionV.targetV = 50;
    const hitVSuccess = checkColorHit('V', 50, questionV);
    expect(hitVSuccess.isHit).toBe(true);
  });

  it('checkColorHit - should evaluate ALL mode using OKLab delta E with full user HSV tuple', () => {
    const questionALL = generateColorQuestion('ALL', 1);
    questionALL.targetH = 0;
    questionALL.targetS = 100;
    questionALL.targetV = 100;

    // Exact match in ALL mode
    const hitExact = checkColorHit('ALL', [0, 100, 100], questionALL);
    expect(hitExact.isHit).toBe(true);
    expect(hitExact.errorValue).toBe(0);

    // Large deviation in ALL mode
    const hitFar = checkColorHit('ALL', [180, 20, 20], questionALL);
    expect(hitFar.isHit).toBe(false);
    expect(hitFar.errorValue).toBeGreaterThan(0.2);
  });
~~~~~

~~~~~act
patch_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript.old
    const colorProfiles = await getAllColorProfiles();
    expect(colorProfiles.H).not.toBeNull();
    expect(colorProfiles.S).toBeNull();
    expect(colorProfiles.V).toBeNull();
~~~~~
~~~~~typescript.new
    const colorProfiles = await getAllColorProfiles();
    expect(colorProfiles.H).not.toBeNull();
    expect(colorProfiles.S).toBeNull();
    expect(colorProfiles.V).toBeNull();
    expect(colorProfiles.ALL).toBeNull();
~~~~~

### 下一步建议
- **运行单元测试**：使用 `npm run test` 确保所有单元测试保持 100% 绿灯。
- **构建校验**：运行 `npm run build` 确保 TypeScript 类型与 Vite 打包均正常。
- **动效体验验证**：在浏览器中启动 `npm run dev`，体验综合拾色模式的拖拽流畅性与双色块对比体验。
