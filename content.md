现在启动 **支线一：色感识别功能开发**。

我将为你实现 HSV 双向转换与难度递进对齐算法、支持极佳视觉渐变的交互式滑块组件、色感专属能力看板 Dashboard、自适应训练视图 TrainingView，以及 IndexedDB 的保存/查询配套逻辑。

## [WIP] feat: 实现色感识别训练 (HSV) 核心算法与交互界面

### 用户需求
1. 实现 HSV 色彩生成与难度映射算法，针对低饱和度/明度情境下 Hue 识别难度指数级上升的特点进行锥形难度对齐。
2. 开发具备丰富渐变渲染与精准点击反馈的交互式色彩滑块组件。
3. 提供色感练习的专属 Dashboard 能力看板（包含色相 Hue、明度 Value、饱和度 Saturation 三个子模式）。
4. 实现色感练习的 TrainingView 视图，复用 `AdaptiveEngine` 难度演进引擎并保存训练记录。
5. 整合进 `app.tsx` 建立完整且闭环的色感训练体验。

### 评论
通过精准映射色彩空间，并结合自适应步长算法，能大幅提升视觉色彩区分敏感度。复用现有的 `AdaptiveEngine` 与 `SessionSummaryModal`，能保持项目架构的强一致性与简洁性。

### 目标
1. 新建 `src/utils/colorUtils.ts`：包含 HSV 与 HEX 转换、基于 Level 映射出题范围与容错阈值的算子，以及 Hit Detection 判定算法。
2. 扩充 `src/utils/db.ts`：增加色感训练 Record、Session 和 Profile 的数据库存取函数。
3. 新建 `src/components/ColorCanvas.tsx`：实现包含目标色块预览、渐变色彩轨道以及点击选择/答案对比视效的交互组件。
4. 新建 `src/views/ColorDashboard.tsx` 与 `src/views/ColorTrainingView.tsx`：构建色感模块的看板与练习逻辑。
5. 更新 `src/app.tsx`：挂载完整的色感训练组件。

### 基本原理
1. **锥形难度对齐算法**：在低 Level 时，限制 Hue 模式在 $S \ge 75, V \ge 75$ 的高鲜艳度区域出题，并给予较大角度容错（如 $\pm 30^\circ$）；随 Level 升高，逐步下探开放低纯度/低明度区域（最低开放至 $S, V \ge 15$），并将容错收紧至 $\pm 4^\circ$。
2. **渐变轨道生成**：Value 轨道的渐变端点为 `#000000` 至 `hsvToHex(H, 100, 100)`；Saturation 轨道的渐变端点为 `hsvToHex(H, 0, V)` 至 `hsvToHex(H, 100, V)`，保持极佳的视觉感知准确度。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-recognition-feature #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建色感算子工具集 (colorUtils.ts)

新建 `src/utils/colorUtils.ts`，实现 HSV 与 HEX 转换、难度映射出题算子及命中判定。

~~~~~act
write_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript
export type ColorMode = 'H' | 'S' | 'V';

export interface ColorQuestionData {
  id: string;
  mode: ColorMode;
  difficultyLevel: number; // 1..35
  targetH: number; // 0..359
  targetS: number; // 0..100
  targetV: number; // 0..100
  tolerance: number; // 允许的误差阈值 (角度或百分比)
}

export interface ColorHitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number; // 绝对误差
  tolerance: number;
}

/**
 * HSV (0..360, 0..100, 0..100) 转 16 进制 Hex
 */
export function hsvToHex(h: number, s: number, v: number): string {
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

/**
 * 根据 Level (1..35) 计算允许的容错阈值
 */
export function getToleranceForLevel(mode: ColorMode, level: number): number {
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34; // 0..1

  if (mode === 'H') {
    // Hue 模式: Level 1 容错 ±30°，Level 35 缩紧至 ±4°
    return Math.max(4, Math.round(30 - t * 26));
  }
  // S / V 模式: Level 1 容错 ±15%，Level 35 缩紧至 ±2%
  return Math.max(2, Math.round(15 - t * 13));
}

/**
 * 生成色感练习题目 (包含锥形难度对齐策略)
 */
export function generateColorQuestion(mode: ColorMode, level: number): ColorQuestionData {
  const id = `cq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tolerance = getToleranceForLevel(mode, level);
  const clampedLevel = Math.max(1, Math.min(35, level));

  let targetH = Math.floor(Math.random() * 360);
  let targetS = 100;
  let targetV = 100;

  if (mode === 'H') {
    // 低 Level 限制在高鲜艳度区 (S/V 处于 75~100)；高 Level 逐渐下探至低 S/V 区
    const minSV = Math.max(15, Math.round(75 - ((clampedLevel - 1) / 34) * 60));
    targetS = Math.floor(Math.random() * (100 - minSV + 1)) + minSV;
    targetV = Math.floor(Math.random() * (100 - minSV + 1)) + minSV;
  } else if (mode === 'V') {
    // 考察 V 时，S 保持在 30 以上防止纯灰无明度变化感
    targetS = Math.floor(Math.random() * 71) + 30;
    targetV = Math.floor(Math.random() * 101);
  } else {
    // 考察 S 时，V 保持在 30 以上防止纯黑无饱和度感
    targetV = Math.floor(Math.random() * 71) + 30;
    targetS = Math.floor(Math.random() * 101);
  }

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    targetH,
    targetS,
    targetV,
    tolerance,
  };
}

/**
 * 色感答题命中检测
 */
export function checkColorHit(
  mode: ColorMode,
  userVal: number,
  question: ColorQuestionData,
): ColorHitResult {
  let targetVal = question.targetH;
  let errorVal = 0;

  if (mode === 'H') {
    targetVal = question.targetH;
    // 环形 0..360° 最小角距离
    const diff = Math.abs(userVal - targetVal);
    errorVal = Math.min(diff, 360 - diff);
  } else if (mode === 'V') {
    targetVal = question.targetV;
    errorVal = Math.abs(userVal - targetVal);
  } else {
    targetVal = question.targetS;
    errorVal = Math.abs(userVal - targetVal);
  }

  const isHit = errorVal <= question.tolerance;

  return {
    isHit,
    userValue: userVal,
    targetValue: targetVal,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: question.tolerance,
  };
}
~~~~~

#### Acts 2: 扩展 IndexedDB 色感存取 API

更新 `src/utils/db.ts` 增加色感专属保存与读取方法。

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.done;
}
~~~~~
~~~~~typescript.new
// === API 10: 色感训练数据库操作 ===
export async function saveColorTrialRecord(record: ColorTrialRecord): Promise<void> {
  const db = await getDB();
  await db.put('color_records', record);
  await updateColorProfile(record.mode, record.isHit, record.difficultyLevel);
}

export async function saveColorSession(session: ColorSessionData): Promise<void> {
  const db = await getDB();
  await db.put('color_sessions', session);
}

export async function getAllColorProfiles(): Promise<Record<'H' | 'S' | 'V', ColorProfileData | null>> {
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
  const db = await getDB();
  const existing = await db.get('color_profiles', mode);

  if (!existing) {
    const newProfile: ColorProfileData = {
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await db.put('color_profiles', newProfile);
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) {
      existing.bestLevel = currentLevel;
    }
    existing.updatedAt = Date.now();
    await db.put('color_profiles', existing);
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['sessions', 'records', 'user_profiles', 'color_sessions', 'color_records', 'color_profiles'],
    'readwrite',
  );
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.objectStore('color_sessions').clear();
  await tx.objectStore('color_records').clear();
  await tx.objectStore('color_profiles').clear();
  await tx.done;
}
~~~~~

#### Acts 3: 新建交互式色彩画布与滑块组件 (ColorCanvas.tsx)

新建 `src/components/ColorCanvas.tsx`，支持动态色彩预览、滑动交互与答案揭晓动画。

~~~~~act
write_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~tsx
import { useRef } from 'preact/hooks';
import { type ColorHitResult, type ColorQuestionData, hsvToHex } from '../utils/colorUtils';

interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
}

export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: ColorCanvasProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const { mode, targetH, targetS, targetV } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);

  // 轨道参数
  const maxVal = mode === 'H' ? 360 : 100;

  const handleTrackClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const selectedVal = Math.round(ratio * maxVal);

    onAnswer(selectedVal);
  };

  // 生成轨道 CSS 背景样式
  const getTrackBackground = () => {
    if (mode === 'H') {
      return 'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
    }
    if (mode === 'V') {
      const endHex = hsvToHex(targetH, targetS, 100);
      return `linear-gradient(to right, #000000, ${endHex})`;
    }
    // mode === 'S'
    const startHex = hsvToHex(targetH, 0, targetV);
    const endHex = hsvToHex(targetH, 100, targetV);
    return `linear-gradient(to right, ${startHex}, ${endHex})`;
  };

  // 角度/百分比位置计算
  const getThumbPosPercent = (val: number) => {
    return `${(val / maxVal) * 100}%`;
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 1. 目标色块展示 */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-36 h-36 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300 scale-100 hover:scale-105"
          style={{ backgroundColor: targetHex }}
        />
        <div className="font-mono text-xs font-bold text-slate-400">
          {showAnswer ? targetHex : '???'}
        </div>
      </div>

      {/* 2. 当前已知维度展示 */}
      <div className="w-full grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center font-mono text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block font-sans">色相 (H)</span>
          <span className={`font-bold ${mode === 'H' && !showAnswer ? 'text-amber-500' : 'text-slate-800'}`}>
            {mode === 'H' ? (showAnswer ? `${targetH}°` : '?') : `${targetH}°`}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-sans">饱和度 (S)</span>
          <span className={`font-bold ${mode === 'S' && !showAnswer ? 'text-amber-500' : 'text-slate-800'}`}>
            {mode === 'S' ? (showAnswer ? `${targetS}%` : '?') : `${targetS}%`}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-sans">明度 (V)</span>
          <span className={`font-bold ${mode === 'V' && !showAnswer ? 'text-amber-500' : 'text-slate-800'}`}>
            {mode === 'V' ? (showAnswer ? `${targetV}%` : '?') : `${targetV}%`}
          </span>
        </div>
      </div>

      {/* 3. 滑块点击交互轨道 */}
      <div className="w-full space-y-2 pt-2">
        <div className="flex justify-between text-xs font-bold text-slate-500">
          <span>{mode === 'H' ? '色相选区 (0° ~ 360°)' : mode === 'V' ? '明度选区 (0% ~ 100%)' : '饱和度选区 (0% ~ 100%)'}</span>
          <span className="text-indigo-600 font-mono">容错: ±{question.tolerance}{mode === 'H' ? '°' : '%'}</span>
        </div>

        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className={`relative w-full h-8 rounded-xl shadow-inner border border-slate-200 cursor-pointer transition-all ${
            disabled || showAnswer ? 'cursor-default opacity-90' : 'hover:ring-2 ring-indigo-400/50'
          }`}
          style={{ background: getTrackBackground() }}
        >
          {/* 揭晓答案后的标记位 */}
          {showAnswer && (
            <>
              {/* 正确真理标记位 */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-emerald-500 shadow-md flex items-center justify-center z-10"
                style={{ left: getThumbPosPercent(mode === 'H' ? targetH : mode === 'V' ? targetV : targetS) }}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              {/* 用户点击标记位 (若未完全重合) */}
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 ${
                    userAnswer.isHit ? 'border-emerald-500' : 'border-rose-500'
                  } shadow-md flex items-center justify-center z-20`}
                  style={{ left: getThumbPosPercent(userAnswer.userValue) }}
                >
                  <div className={`w-2 h-2 rounded-full ${userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 新建色感练习 Dashboard 页面 (ColorDashboard.tsx)

新建 `src/views/ColorDashboard.tsx`，展示三个色彩子模式的能力卡片。

~~~~~act
write_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~tsx
import { Award, Clock, Play, RotateCw, Target, TrendingUp } from 'lucide-preact';
import type { ColorMode } from '../utils/colorUtils';
import { type ColorProfileData, formatTotalTime } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  totalTimeMs: number;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
}

const COLOR_MODES_CONFIG: Array<{
  id: ColorMode;
  title: string;
  subtitle: string;
  desc: string;
  badgeColor: string;
}> = [
  {
    id: 'H',
    title: '1-色相 (Hue)',
    subtitle: 'Hue Sensing',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'V',
    title: '2-明度 (Value)',
    subtitle: 'Value Contrast',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'S',
    title: '3-饱和度 (Sat)',
    subtitle: 'Saturation Perception',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
];

export function ColorDashboard({
  profiles,
  totalTimeMs,
  onStart,
  onBackToHome,
}: ColorDashboardProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToHome}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
          >
            ← 返回主页
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              色感训练 <span className="text-indigo-600 font-light text-xl">Color Recognition</span>
            </h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>{formatTotalTime(totalTimeMs)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 个色彩子模式卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLOR_MODES_CONFIG.map((config) => {
          const profile = profiles[config.id];
          const totalCards = profile?.totalTrainedCards || 0;
          const accuracy =
            totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
          const currentLevel = profile?.currentLevel || 5;

          return (
            <div
              key={config.id}
              className="group bg-white border border-gray-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <RotateCw className="w-6 h-6" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${config.badgeColor}`}>
                    {config.subtitle}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">{config.desc}</p>

                {/* 核心指标 */}
                <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                      <TrendingUp className="w-3 h-3 text-indigo-500" />
                      能力层阶
                    </div>
                    <div className="text-xl font-black text-slate-800">Level {currentLevel}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                      <Award className="w-3 h-3 text-emerald-500" />
                      正确率
                    </div>
                    <div className="text-xl font-black text-slate-800">{accuracy}%</div>
                  </div>
                </div>
              </div>

              {/* 动作按钮区 */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => onStart(config.id, 'training')}
                  className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  开始自适应训练
                </button>
                <button
                  type="button"
                  onClick={() => onStart(config.id, 'benchmark')}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5 text-gray-500" />
                  20 题基准测试
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 新建色感练习 TrainingView 页面 (ColorTrainingView.tsx)

新建 `src/views/ColorTrainingView.tsx`，管理题目演进与答题结算。

~~~~~act
write_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~tsx
import { ArrowLeft, ChevronRight, Clock } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ColorCanvas } from '../components/ColorCanvas';
import { type SessionHistoryItem, SessionSummaryModal } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../utils/colorUtils';
import { type ColorSessionData, type ColorTrialRecord, saveColorSession, saveColorTrialRecord } from '../utils/db';
import type { UserSettings } from '../utils/settings';

interface ColorTrainingViewProps {
  mode: ColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: UserSettings;
  onExit: () => void;
}

export function ColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: ColorTrainingViewProps) {
  const sessionIdRef = useRef<string>(`csession_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      settings.stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize,
    ),
  );
  const autoNextTimerRef = useRef<number | null>(null);

  const [question, setQuestion] = useState<ColorQuestionData>(() =>
    generateColorQuestion(mode, initialLevel),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<ColorHitResult | null>(null);

  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // 计时器逻辑
  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished]);

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
    await saveColorTrialRecord(record);

    setSessionHistory((prev) => [
      ...prev,
      { trialIndex: newTotal, level: question.difficultyLevel, isHit: hitResult.isHit, responseTimeMs },
    ]);

    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      setShowSummaryModal(true);
    } else if (settings.autoNext) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, settings.autoNextDelay);
    }
  };

  const handleNextQuestion = () => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    const sessionData: ColorSessionData = {
      id: sessionIdRef.current,
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    };
    await saveColorSession(sessionData);
  };

  const handleRequestFinish = async () => {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  };

  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };

  const handleRestartSession = () => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    sessionIdRef.current = `csession_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentAccuracy = totalTrials > 0 ? Math.round((hitTrials / totalTrials) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode === 'H' ? '色相' : mode === 'V' ? '明度' : '饱和度'} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>

        {/* 监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">已练题数</span>
            <span className="font-black text-gray-800">{totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">总正确率</span>
            <span className="font-black text-gray-800">{currentAccuracy}%</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">当前难度</span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* 色彩交互 Canvas */}
      <ColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />

      {/* 底部控制栏 */}
      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一题
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 练习结算弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          mode="single"
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
    </div>
  );
}
~~~~~

#### Acts 6: 整合至入口逻辑 (app.tsx)

修改 `src/app.tsx`，将色感模块视图打通。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { SettingsModal } from './components/SettingsModal';
import type { TrainingMode } from './types';
import { type UserProfileData, getAllUserProfiles, getTotalTrainingTimeMs } from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense';

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);

  // 刷新用户能力度数与总练习时长
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const timeMs = await getTotalTrainingTimeMs();
    setProfiles(data);
    setTotalTimeMs(timeMs);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 动态同步页面标题 Document Title
  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 造型构图与色彩感知训练系统';
    } else if (currentApp === 'star-hopping') {
      document.title = '寻星练习 (Star-Hopping) - FormSight';
    } else if (currentApp === 'color-sense') {
      document.title = '色感训练 (Color Recognition) - FormSight';
    }
  }, [currentApp]);

  // 打开弱点分析
  const handleOpenAnalytics = (mode?: TrainingMode) => {
    setAnalyticsMode(mode || 'all');
    setIsAnalyticsOpen(true);
  };

  // 启动训练
  const handleStartTraining = (mode: TrainingMode, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  // 退出训练返回寻星 Dashboard
  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const activeLevel = profiles[activeMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          onNavigate={(app) => setCurrentApp(app)}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
        />
      )}

      {currentApp === 'star-hopping' &&
        (currentView === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
            totalTimeMs={totalTimeMs}
            onStart={handleStartTraining}
            onRefreshProfiles={refreshProfiles}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAnalytics={handleOpenAnalytics}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <TrainingView
            mode={activeMode}
            sessionType={sessionType}
            initialLevel={activeLevel}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}

      {currentApp === 'color-sense' && (
        <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col items-center gap-6">
          <div className="w-full flex justify-between items-center border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setCurrentApp('home')}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all"
            >
              ← 返回主页
            </button>
            <h1 className="text-xl font-bold text-slate-800">色感训练 (Color Recognition)</h1>
            <div className="w-20" />
          </div>
          <div className="py-16 text-center space-y-3">
            <div className="text-indigo-600 font-black text-2xl">色感模块开发准备中</div>
            <p className="text-slate-400 text-xs">基础架构与数据库已就绪，即将支持 H/S/V 分级算法与滑块识别！</p>
          </div>
        </div>
      )}

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
          onDataCleared={refreshProfiles}
        />
      )}

      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}
    </div>
  );
}
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { SettingsModal } from './components/SettingsModal';
import type { TrainingMode } from './types';
import type { ColorMode } from './utils/colorUtils';
import {
  type ColorProfileData,
  type UserProfileData,
  getAllColorProfiles,
  getAllUserProfiles,
  getTotalTrainingTimeMs,
} from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { ColorDashboard } from './views/ColorDashboard';
import { ColorTrainingView } from './views/ColorTrainingView';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense';

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');

  // 寻星状态
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  // 色感状态
  const [activeColorMode, setActiveColorMode] = useState<ColorMode>('H');
  const [colorSessionType, setColorSessionType] = useState<'training' | 'benchmark'>('training');

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });
  const [colorProfiles, setColorProfiles] = useState<Record<ColorMode, ColorProfileData | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const timeMs = await getTotalTrainingTimeMs();
    setProfiles(data);
    setColorProfiles(cData);
    setTotalTimeMs(timeMs);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 动态同步 Title
  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 造型构图与色彩感知训练系统';
    } else if (currentApp === 'star-hopping') {
      document.title = '寻星练习 (Star-Hopping) - FormSight';
    } else if (currentApp === 'color-sense') {
      document.title = '色感训练 (Color Recognition) - FormSight';
    }
  }, [currentApp]);

  const handleOpenAnalytics = (mode?: TrainingMode) => {
    setAnalyticsMode(mode || 'all');
    setIsAnalyticsOpen(true);
  };

  const handleStartTraining = (mode: TrainingMode, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  const handleStartColorTraining = (mode: ColorMode, type: 'training' | 'benchmark') => {
    setActiveColorMode(mode);
    setColorSessionType(type);
    setCurrentView('training');
  };

  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const activeLevel = profiles[activeMode]?.currentLevel || 5;
  const activeColorLevel = colorProfiles[activeColorMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
        />
      )}

      {currentApp === 'star-hopping' &&
        (currentView === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
            totalTimeMs={totalTimeMs}
            onStart={handleStartTraining}
            onRefreshProfiles={refreshProfiles}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAnalytics={handleOpenAnalytics}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <TrainingView
            mode={activeMode}
            sessionType={sessionType}
            initialLevel={activeLevel}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}

      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            totalTimeMs={totalTimeMs}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <ColorTrainingView
            mode={activeColorMode}
            sessionType={colorSessionType}
            initialLevel={activeColorLevel}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
          onDataCleared={refreshProfiles}
        />
      )}

      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. **测试色感功能**：请测试主页“色感训练”入口，验证 Hue、Value 和 Saturation 三个子模式的生成、滑动点击交互、答案揭晓以及能力层阶上升/下降。
2. **构建色感弱点分析 (Optional)**：可以为色感模块也接入类似的极角/明暗区间弱点分析图表。
