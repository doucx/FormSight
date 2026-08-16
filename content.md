好的，我们将基于已经升级的通用 IDB 数据库 API，全面开发**“相对色感 (Relative Color Perception)”**主卡片以及**“色彩矢量迁移 (Color Vector Translation)”**训练模块！

下面为您生成 `[WIP]` 计划：

## [WIP] feat(relative-color): 实现相对色感训练板块与“色彩矢量迁移”模式

### 用户需求
在 FormSight 中集成相对色感训练能力，引入全新的顶层主卡片“相对色感 (Relative Color Perception)”，并实现第一阶段核心功能——**“色彩矢量迁移 (Color Vector Translation)”模式**，训练用户在不同固有色之间保持客观光照/明暗推移矢量的视觉心理感知力。

### 评论
绘画的核心在于对相对色彩关系（色彩矢量偏转与明度阶梯推移）的精准捕捉，而非拟合绝对色值。本功能填补了视知觉训练工具在实战色彩关系上的空白，大幅提升了 FormSight 在绘画与设计实战中的指导价值。

### 目标
1. **矢量算法封装 (`relativeColorUtils.ts`)**：
   - 在 OKLab 均匀空间中实现色彩推移矢量 $\vec{v}_{AB} = \mathbf{Lab}_B - \mathbf{Lab}_A$ 的推导与真理点 $D_{\text{target}}$ 计算。
   - 实现包含色差 $\Delta E$、矢量模长误差与方向夹角偏转（色温偏向）的评分判定函数。
2. **交互画布组件 (`RelativeColorCanvas.tsx`)**：
   - 直观展示基准组色彩推移关系 $A \to B$ 与目标组色彩推移关系 $C \to D$。
   - 提供 H/S/V 多轨道调制面板与揭晓阶段真理色对比。
3. **主视图与看板组件**：
   - 创建 `RelativeColorDashboard.tsx` 模式选择看板。
   - 创建 `RelativeColorTrainingView.tsx` 训练交互视图，使用通用 DB API `saveTrialRecord({ domain: 'relative_color', ... })` 保存做答记录。
4. **顶层入口集成**：
   - 在 `Home.tsx` 中添加“相对色感训练”主卡片。
   - 在 `App.tsx` 中接通相对色感模块的导航路由与能力 Profile 加载。

### 基本原理
利用 OKLab 感知均匀色彩空间，将基准色彩对 $(A, B)$ 的转换抽象为一个三维空间矢量 $\vec{v}_{AB}$。在给定新的固有色 $C$ 时，理想答题点 $D_{\text{target}} = C + \vec{v}_{AB}$。通过计算用户调制点 $D_{\text{user}}$ 产生的实际矢量 $\vec{v}_{CD_{\text{user}}}$ 与 $\vec{v}_{AB}$ 的模长与方向差异，对用户的相对色彩推移直觉进行多维度量化评估。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/executor #scope/ux #scope/core #ai/instruct #task/domain/relative-color #task/object/color-vector-translation #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建相对色感矢量算法工具集

创建 `src/utils/relativeColorUtils.ts`，实现色彩矢量推导、生成器与评分函数。

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
}

export interface RelativeColorHitResult {
  isHit: boolean;
  userD: [number, number, number];
  targetD: [number, number, number];
  deltaEError: number;
  magnitudeError: number;
  angleErrorDeg: number;
  tolerance: number;
}

/**
 * 将 OKLab 坐标坐标逆向近似换算为可显示 sRGB / HSV
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
 * 随机生成色彩矢量迁移题目
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

    const vAB: [number, number, number] = [
      labB[0] - labA[0],
      labB[1] - labA[1],
      labB[2] - labA[2],
    ];

    const targetLabD: [number, number, number] = [
      labC[0] + vAB[0],
      labC[1] + vAB[1],
      labC[2] + vAB[2],
    ];

    if (targetLabD[0] >= 0.1 && targetLabD[0] <= 0.95) {
      targetD = okLabToHsv(targetLabD);
      break;
    }
  }

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    colorA,
    colorB,
    colorC,
    targetD,
    tolerance,
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
  const { colorA, colorB, colorC, targetD, difficultyLevel } = question;

  const labA = hsvToOkLab(...colorA);
  const labB = hsvToOkLab(...colorB);
  const labC = hsvToOkLab(...colorC);
  const labTargetD = hsvToOkLab(...targetD);
  const labUserD = hsvToOkLab(...userD);

  const deltaEError = calcDeltaEOk(labTargetD, labUserD);
  const tolerance = getTargetDeltaEForLevel(difficultyLevel);
  const isHit = deltaEError <= tolerance;

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
  };
}
~~~~~

#### Acts 2: 创建相对色感交互画布组件

创建 `src/components/RelativeColorCanvas.tsx` 展示 $A \to B$ 基准推移与 $C \to D$ 用户调制。

~~~~~act
write_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript
import { ArrowRight } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/relativeColorUtils';

interface RelativeColorCanvasProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (userD: [number, number, number]) => void;
  disabled?: boolean;
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: RelativeColorCanvasProps) {
  const { colorA, colorB, colorC, targetD } = question;

  const [userH, setUserH] = useState<number>(colorC[0]);
  const [userS, setUserS] = useState<number>(colorC[1]);
  const [userV, setUserV] = useState<number>(colorC[2]);

  // 题目切换时重置 D 为 C 的初始状态
  useEffect(() => {
    setUserH(colorC[0]);
    setUserS(colorC[1]);
    setUserV(colorC[2]);
  }, [colorC]);

  const handleSubmit = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, userH, userS, userV, onAnswer]);

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);
  const hexUserD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 上方对比展示区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* 基准推移组 (A -> B) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            1. 基准色彩矢量推移 (A ➔ B)
          </span>
          <div className="flex items-center justify-center gap-3 w-full">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
                style={{ backgroundColor: hexA }}
              />
              <span className="text-[10px] font-mono text-slate-400">固有色 A</span>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-500" />
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
                style={{ backgroundColor: hexB }}
              />
              <span className="text-[10px] font-mono text-slate-400">推移色 B</span>
            </div>
          </div>
        </div>

        {/* 目标推移组 (C -> D) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            2. 目标色彩矢量推移 (C ➔ D)
          </span>
          <div className="flex items-center justify-center gap-3 w-full">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
                style={{ backgroundColor: hexC }}
              />
              <span className="text-[10px] font-mono text-slate-400">固有色 C</span>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-500" />
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-75 relative"
                style={{ backgroundColor: hexUserD }}
              >
                {showAnswer && (
                  <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: hexTargetD }}
                    title="真理色彩 D"
                  />
                )}
              </div>
              <span className="text-[10px] font-mono text-indigo-600 font-bold">待调色 D</span>
            </div>
          </div>
        </div>
      </div>

      {/* 揭晓答案诊断数据 */}
      {showAnswer && userAnswer && (
        <div
          className={`w-full p-3.5 rounded-2xl border text-xs flex justify-between items-center ${
            userAnswer.isHit
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="font-bold">
            {userAnswer.isHit ? '✅ 矢量匹配成功！' : '❌ 矢量偏转较大'}
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>感知色差 ΔE: {userAnswer.deltaEError}</span>
            <span>矢量模长差: {userAnswer.magnitudeError}</span>
            <span>色温偏角: {userAnswer.angleErrorDeg}°</span>
          </div>
        </div>
      )}

      {/* 下方 D 颜色调制滑块轨道 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* H 轨 */}
        <div className="flex items-center gap-3 w-full">
          <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">H</span>
          <div className="relative flex-1 flex items-center">
            <div
              className="w-full h-7 rounded-xl border border-slate-200/80 shadow-inner"
              style={{ background: hueGradient }}
            />
            <input
              type="range"
              min="0"
              max="360"
              value={userH}
              disabled={disabled || showAnswer}
              onInput={(e) => setUserH(Number.parseInt((e.target as HTMLInputElement).value, 10))}
              className="absolute inset-0 w-full h-7 opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 pointer-events-none rounded-full shadow-md z-10"
              style={{ left: `${(userH / 360) * 100}%` }}
            />
          </div>
          <span className="w-12 text-right font-mono font-bold text-xs text-amber-500">
            {userH}°
          </span>
        </div>

        {/* S 轨 */}
        <div className="flex items-center gap-3 w-full">
          <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">S</span>
          <div className="relative flex-1 flex items-center">
            <div
              className="w-full h-7 rounded-xl border border-slate-200/80 shadow-inner"
              style={{ background: satGradient }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={userS}
              disabled={disabled || showAnswer}
              onInput={(e) => setUserS(Number.parseInt((e.target as HTMLInputElement).value, 10))}
              className="absolute inset-0 w-full h-7 opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 pointer-events-none rounded-full shadow-md z-10"
              style={{ left: `${userS}%` }}
            />
          </div>
          <span className="w-12 text-right font-mono font-bold text-xs text-amber-500">
            {userS}%
          </span>
        </div>

        {/* V 轨 */}
        <div className="flex items-center gap-3 w-full">
          <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">V</span>
          <div className="relative flex-1 flex items-center">
            <div
              className="w-full h-7 rounded-xl border border-slate-200/80 shadow-inner"
              style={{ background: valGradient }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={userV}
              disabled={disabled || showAnswer}
              onInput={(e) => setUserV(Number.parseInt((e.target as HTMLInputElement).value, 10))}
              className="absolute inset-0 w-full h-7 opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 pointer-events-none rounded-full shadow-md z-10"
              style={{ left: `${userV}%` }}
            />
          </div>
          <span className="w-12 text-right font-mono font-bold text-xs text-amber-500">
            {userV}%
          </span>
        </div>
      </div>

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

#### Acts 3: 创建相对色感 Dashboard 看板与 View 训练视图

创建 `src/views/RelativeColorDashboard.tsx` 与 `src/views/RelativeColorTrainingView.tsx`。

~~~~~act
write_file
src/views/RelativeColorDashboard.tsx
~~~~~
~~~~~typescript
import { Award, ArrowLeft, Play, Sliders, Target, TrendingUp, Shuffle } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { getProfilesByDomain, getTrialRecords, type UnifiedProfileData } from '../utils/db';
import type { RelativeColorMode } from '../utils/relativeColorUtils';

interface RelativeColorDashboardProps {
  onStart: (mode: RelativeColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}

export function RelativeColorDashboard({
  onStart,
  onBackToHome,
  onOpenSettings,
}: RelativeColorDashboardProps) {
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData | null>>({});
  const [todayCount, setTodayCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const pList = await getProfilesByDomain('relative_color');
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.mode] = p;
      }

      const records = await getTrialRecords('relative_color');
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const count = records.filter((r) => r.timestamp >= startOfToday).length;

      if (isMounted) {
        setProfiles(pMap);
        setTodayCount(count);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const profile = profiles.VECTOR_SHIFT;
  const totalCards = profile?.totalTrainedCards || 0;
  const accuracy = totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
  const currentLevel = profile?.currentLevel || 5;

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
            <ArrowLeft className="w-4 h-4" />
            返回主页
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              相对色感 <span className="text-indigo-600 font-light text-xl">Relative Color</span>
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="偏好设置"
        >
          <Sliders className="w-4 h-4" />
          偏好设置
        </button>
      </div>

      {/* 相对色感子模式卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group bg-white border border-gray-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Shuffle className="w-6 h-6" />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold text-slate-400">今日刷题</div>
                <div className="text-xs font-bold text-slate-500 font-mono">{todayCount} 题</div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">色彩矢量迁移</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">
              保持固有色推移矢量 $\vec{v}_{AB}$ 在全场施加统一推移，建立光影相对偏转直觉。
            </p>

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
              onClick={() => onStart('VECTOR_SHIFT', 'training')}
              className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              开始自适应训练
            </button>
            <button
              type="button"
              onClick={() => onStart('VECTOR_SHIFT', 'benchmark')}
              className="w-full py-2.5 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5 text-gray-500" />
              20 题基准测试
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { type SessionHistoryItem, SessionSummaryModal } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveSession, saveTrialRecord } from '../utils/db';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../utils/relativeColorUtils';
import type { UserSettings } from '../utils/settings';

interface RelativeColorTrainingViewProps {
  mode: RelativeColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: UserSettings;
  onExit: () => void;
}

export function RelativeColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: RelativeColorTrainingViewProps) {
  const sessionIdRef = useRef<string>(`rcsession_${Date.now()}`);
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

  const [question, setQuestion] = useState<RelativeColorQuestionData>(() =>
    generateRelativeColorQuestion(mode, initialLevel),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<RelativeColorHitResult | null>(null);

  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (showAnswer && !isFinished) {
          e.preventDefault();
          handleNextQuestion();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleFinishSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished]);

  const handleAnswer = async (userD: [number, number, number]) => {
    const responseTimeMs = Date.now() - questionStartTime;
    const hitResult = checkRelativeColorHit(mode, userD, question);

    setUserAnswer(hitResult);
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hitResult.isHit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    // 通用 DB API 提交
    await saveTrialRecord({
      id: `rcrec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      domain: 'relative_color',
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      isHit: hitResult.isHit,
      responseTimeMs,
      details: {
        colorA: question.colorA,
        colorB: question.colorB,
        colorC: question.colorC,
        targetD: question.targetD,
        userD,
        deltaEError: hitResult.deltaEError,
      },
    });

    setSessionHistory((prev) => [
      ...prev,
      {
        trialIndex: newTotal,
        level: question.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
      },
    ]);

    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    const delay = settings.colorAutoNextDelay ?? settings.autoNextDelay;

    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        setShowSummaryModal(true);
      }, delay);
    } else if (settings.autoNext) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, delay);
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
    setQuestion(generateRelativeColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    await saveSession({
      id: sessionIdRef.current,
      domain: 'relative_color',
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    });
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
    sessionIdRef.current = `rcsession_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateRelativeColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
            色彩矢量迁移 | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>

        {/* 监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* 相对色彩矢量 Canvas */}
      <RelativeColorCanvas
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
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一题
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 结算弹窗 */}
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

#### Acts 4: 集成顶层主页与 App 路由管理

更新 `src/views/Home.tsx` 和 `src/app.tsx`。

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
import { ArrowRight, BarChart2, Clock, Compass, Palette, Sliders, Sparkles } from 'lucide-preact';
import { formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  starHoppingTimeMs: number;
  colorTimeMs: number;
  onNavigate: (app: 'star-hopping' | 'color-sense') => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}
~~~~~
~~~~~typescript
import { ArrowRight, BarChart2, Clock, Compass, Palette, Shuffle, Sliders, Sparkles } from 'lucide-preact';
import { formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  starHoppingTimeMs: number;
  colorTimeMs: number;
  relativeColorTimeMs: number;
  onNavigate: (app: 'star-hopping' | 'color-sense' | 'relative-color') => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
        {/* 2. 色感练习 */}
        <button
          type="button"
          onClick={() => onNavigate('color-sense')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                <Palette className="w-8 h-8" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                色感训练 (Color Recognition)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation)
                的分级递进识别，全面建立微小色彩差异感知力。
              </p>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>累计练习: {formatTotalTime(colorTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入色感练习看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript
        {/* 2. 绝对色感练习 */}
        <button
          type="button"
          onClick={() => onNavigate('color-sense')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                <Palette className="w-8 h-8" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                绝对色感 (Color Recognition)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation)
                的分级递进识别，全面建立微小色彩差异感知力。
              </p>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>累计练习: {formatTotalTime(colorTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入绝对色感看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* 3. 相对色感训练 */}
        <button
          type="button"
          onClick={() => onNavigate('relative-color')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left md:col-span-2"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
                <Shuffle className="w-8 h-8" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                相对色感 (Relative Color Perception)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 ($\vec{v}_{AB}$)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。
              </p>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>累计练习: {formatTotalTime(relativeColorTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入相对色感看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
import { ColorDashboard } from './views/ColorDashboard';
import { ColorTrainingView } from './views/ColorTrainingView';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense';
~~~~~
~~~~~typescript
import { getProfilesByDomain, getTrainingTimeMs } from './utils/db';
import type { RelativeColorMode } from './utils/relativeColorUtils';
import { ColorDashboard } from './views/ColorDashboard';
import { ColorTrainingView } from './views/ColorTrainingView';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { RelativeColorDashboard } from './views/RelativeColorDashboard';
import { RelativeColorTrainingView } from './views/RelativeColorTrainingView';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense' | 'relative-color';
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    setProfiles(data);
    setColorProfiles(cData);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
  }, []);
~~~~~
~~~~~typescript
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);
  const [relativeColorTimeMs, setRelativeColorTimeMs] = useState<number>(0);

  // 相对色感状态
  const [activeRelativeMode, setActiveRelativeMode] = useState<RelativeColorMode>('VECTOR_SHIFT');
  const [relativeSessionType, setRelativeSessionType] = useState<'training' | 'benchmark'>('training');

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    setProfiles(data);
    setColorProfiles(cData);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
  }, []);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
      {currentApp === 'home' && (
        <Home
          totalTimeMs={starHoppingTimeMs + colorTimeMs}
          starHoppingTimeMs={starHoppingTimeMs}
          colorTimeMs={colorTimeMs}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}
~~~~~
~~~~~typescript
      {currentApp === 'home' && (
        <Home
          totalTimeMs={starHoppingTimeMs + colorTimeMs + relativeColorTimeMs}
          starHoppingTimeMs={starHoppingTimeMs}
          colorTimeMs={colorTimeMs}
          relativeColorTimeMs={relativeColorTimeMs}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsContext('color-sense');
              setIsSettingsOpen(true);
            }}
            onOpenAnalytics={() => setIsColorAnalyticsOpen(true)}
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
~~~~~
~~~~~typescript
      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsContext('color-sense');
              setIsSettingsOpen(true);
            }}
            onOpenAnalytics={() => setIsColorAnalyticsOpen(true)}
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

      {currentApp === 'relative-color' &&
        (currentView === 'dashboard' ? (
          <RelativeColorDashboard
            onStart={(relMode, type) => {
              setActiveRelativeMode(relMode);
              setRelativeSessionType(type);
              setCurrentView('training');
            }}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsContext('color-sense');
              setIsSettingsOpen(true);
            }}
          />
        ) : (
          <RelativeColorTrainingView
            mode={activeRelativeMode}
            sessionType={relativeSessionType}
            initialLevel={5}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}
~~~~~

#### Acts 5: 补充相对色感算子单元测试

创建 `src/utils/__tests__/relativeColorUtils.test.ts`。

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
  it('generateRelativeColorQuestion - should generate valid color vector shift question', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    expect(q.mode).toBe('VECTOR_SHIFT');
    expect(q.colorA).toBeDefined();
    expect(q.colorB).toBeDefined();
    expect(q.colorC).toBeDefined();
    expect(q.targetD).toBeDefined();
    expect(q.tolerance).toBeGreaterThan(0);
  });

  it('checkRelativeColorHit - should detect exact match and yield zero deltaEError', () => {
    const q = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    const result = checkRelativeColorHit('VECTOR_SHIFT', q.targetD, q);
    expect(result.isHit).toBe(true);
    expect(result.deltaEError).toBeLessThan(0.05);
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
- **自动化测试**: 运行 `npm run test` 验证 `relativeColorUtils` 算法与全新通用 DB 的单元测试。
- **界面体验调试**: 在开发环境中启动应用，进入“相对色感 (Relative Color Perception)”主卡片，试玩“色彩矢量迁移”题型，体验光影推移矢量的互动感受。
