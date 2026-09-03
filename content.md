已全面排查剩余 4 处架构坏味道（`colorUtils` 标量/向量伪多态、`PointClickCanvas` 逃生舱伪多态、`DynamicDomainSettings` 类型擦除断言、以及 `UnifiedTrialRecord` 平铺盲转）。现制定并执行全量消除计划。

## [WIP] refactor: 消除色彩、交互与记录层的伪多态与类型退化

### 用户需求
彻底修复并重构代码库中剩余的 4 处“基于控制标记的伪多态与类型退化”架构坏味道：
1. **解耦 `color_all` 与 `colorUtils.ts`**：消除 `ColorMode = 'ALL'` 与 `number | [number, number, number]` 联合参数，使标量拾色与三维色彩空间匹配正交分离。
2. **重构 `PointClickCanvas.tsx` 消除逃生舱**：提取通用的触控放大镜逻辑为 Hook，移除组件上的 `customOverlayRender` 逃生舱，让定制场景（多边形截断、3D 轴测图）内聚自治。
3. **安全化 `DynamicDomainSettings.tsx` 字典读取**：消除直接在 JSX 中肆意蔓延的 `as number`、`as TargetingMode` 盲目类型断言，建立收口的强类型运行时守卫取值函数。
4. **规范 `UnifiedTrialRecord` 与下游图表类型契约**：在卡片分析层建立结构化契约，消除裸露的属性强转。

### 评论
这些遗留问题是早期将形态迥异的功能强行套入“单一通用接口/组件”时留下的典型架构坏味道。将它们解耦并恢复静态类型安全，能从根本上杜绝潜在的运行时属性未定义、非法强转崩溃与假兜底。

### 目标
1. 新建 `src/cards/color_all/types.ts` 与 `src/cards/color_all/utils/generator.ts`，为 `color_all` 建立专属强类型契约。
2. 更新 `src/core/color/colorUtils.ts`，将 `ColorMode` 严格限定为标量 `'H' | 'S' | 'V'`，移除 `userHSV` 可选兼容字段与 `mode === 'ALL'` 分支。
3. 新增 `src/hooks/usePointLoupe.ts`，将高内聚的 HiDPI 触控放大镜与屏幕-画布坐标系换算逻辑抽取为独立 Hook。
4. 移除 `src/components/common/PointClickCanvas.tsx` 中的 `customOverlayRender` 逃生舱。
5. 在 `NegVertexFittingView.tsx` 与 `PerspStructure3DView.tsx` 中直接内聚渲染各自的几何图元与点阵，不再向通用组件注入侵入式图层代码。
6. 改造 `DynamicDomainSettings.tsx`，通过类型安全的提取辅助函数消除动态断言。

### 基本原理
真正的可复用性来自**行为的横向抽取**（如放大镜 Hook），而非**在组件中留下任意绘制回调的逃生舱（Escape Hatch）**。对于色彩生成与命中检测，标量维度（角度/百分比）与三维立体欧氏色彩空间（OKLab ΔE）在输入维度、误差单位与判定法则上完全不同，遵循“拥抱合理的重复与正交性”原则，物理隔离能带来绝对的类型安全性。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #comp/ui #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/type-safety-refactor #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 为 `color_all` 创建专属类型定义与生成器，解耦 `colorUtils.ts`

为 `color_all` 建立自包含且绝对安全的 `types.ts` 和 `generator.ts`。

~~~~~act
write_file
src/cards/color_all/types.ts
~~~~~
~~~~~typescript
export interface QuestionData {
  id: string;
  difficultyLevel: number;
  targetH: number;
  targetS: number;
  targetV: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userHSV: [number, number, number];
  targetHSV: [number, number, number];
  deltaEError: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/color_all/utils/generator.ts
~~~~~
~~~~~typescript
import {
  calcDeltaEOk,
  getOkChroma,
  getTargetDeltaEForLevel,
  hsvToOkLab,
} from '../../../core/color/oklchUtils';
import type { HitResult, QuestionData } from '../types';

export function generateQuestion(level: number): QuestionData {
  const id = `cq_all_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);

  let targetH = Math.floor(Math.random() * 360);
  let targetS = 100;
  let targetV = 100;

  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    targetH = Math.floor(Math.random() * 360);
    targetS = Math.floor(Math.random() * 71) + 30; // 30..100
    targetV = Math.floor(Math.random() * 71) + 30; // 30..100

    const lab = hsvToOkLab(targetH, targetS, targetV);
    if (getOkChroma(lab) >= Math.min(0.04, tolerance * 1.5)) {
      break;
    }
  }

  return {
    id,
    difficultyLevel: clampedLevel,
    targetH,
    targetS,
    targetV,
    tolerance,
  };
}

export function checkHit(
  userHSV: [number, number, number],
  question: QuestionData,
): HitResult {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetLab = hsvToOkLab(targetH, targetS, targetV);
  const userLab = hsvToOkLab(...userHSV);
  const realDeltaE = calcDeltaEOk(targetLab, userLab);
  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);
  const isHit = realDeltaE <= targetDeltaE;

  return {
    isHit,
    userHSV,
    targetHSV: [targetH, targetS, targetV],
    deltaEError: Math.round(realDeltaE * 1000) / 1000,
    tolerance: targetDeltaE,
  };
}
~~~~~

#### Acts 2: 更新 `color_all` 视图与清单，连接专用生成器

将 `color_all` 的 View 与 Index 迁移至新的强类型生成逻辑。

~~~~~act
write_file
src/cards/color_all/ColorAllView.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { HsvTrackSlider } from '../../components/common/HsvTrackSlider';
import { Button } from '../../components/ui/button';
import { hsvToHex } from '../../core/color/colorUtils';
import { useTranslation } from '../../core/i18n';
import type { ColorSenseSettings } from '../../storage/settings';
import { HUE_SPECTRUM_GRADIENT, PALETTE } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';

export interface ColorAllViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: [number, number, number]) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorAllView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorAllViewProps) {
  const { t } = useTranslation();
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const enableHoverColorPreview = settings.enableHoverColorPreview ?? true;

  const [userH, setUserH] = useState<number>(180);
  const [userS, setUserS] = useState<number>(50);
  const [userV, setUserV] = useState<number>(50);

  const [allHoverVals, setAllHoverVals] = useState<Record<'H' | 'S' | 'V', number | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [draggingLabel, setDraggingLabel] = useState<'H' | 'S' | 'V' | null>(null);

  const handleHoverH = useCallback(
    (hVal: number | null) =>
      setAllHoverVals((prev) => (prev.H === hVal ? prev : { ...prev, H: hVal })),
    [],
  );
  const handleHoverS = useCallback(
    (sVal: number | null) =>
      setAllHoverVals((prev) => (prev.S === sVal ? prev : { ...prev, S: sVal })),
    [],
  );
  const handleHoverV = useCallback(
    (vVal: number | null) =>
      setAllHoverVals((prev) => (prev.V === vVal ? prev : { ...prev, V: vVal })),
    [],
  );

  const handleDragH = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'H' : null), []);
  const handleDragS = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'S' : null), []);
  const handleDragV = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'V' : null), []);

  useEffect(() => {
    if (question.id) {
      setUserH(180);
      setUserS(50);
      setUserV(50);
      setAllHoverVals({ H: null, S: null, V: null });
      setDraggingLabel(null);
    }
  }, [question.id]);

  const handleSubmitAll = () => {
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

  const currentH = userH;
  const currentV = userV;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(currentH, 100, 100)})`;

  return (
    <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center justify-center gap-4 w-full">
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-75"
            style={{
              backgroundColor: hsvToHex(
                draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                  ? (allHoverVals.H ?? userH)
                  : userH,
                draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                  ? (allHoverVals.S ?? userS)
                  : userS,
                draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                  ? (allHoverVals.V ?? userV)
                  : userV,
              ),
            }}
          />
        </div>
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={userH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          userVal={userAnswer?.userHSV?.[0] ?? userH}
          isHit={userAnswer?.isHit}
          onValChange={setUserH}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverH}
          onDraggingStateChange={handleDragH}
        />
        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={userS}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetS}
          userVal={userAnswer?.userHSV?.[1] ?? userS}
          isHit={userAnswer?.isHit}
          onValChange={setUserS}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverS}
          onDraggingStateChange={handleDragS}
        />
        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={userV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          userVal={userAnswer?.userHSV?.[2] ?? userV}
          isHit={userAnswer?.isHit}
          onValChange={setUserV}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverV}
          onDraggingStateChange={handleDragV}
        />
      </div>

      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmitAll}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/color_all/index.tsx
~~~~~
~~~~~typescript
import { Palette } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorAllView } from './ColorAllView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const colorAllCard: CardManifest<
  QuestionData,
  HitResult,
  [number, number, number],
  ColorSenseSettings
> = {
  id: 'color_all',
  domain: 'color_and_value',
  icon: Palette,
  tags: {
    domain: ['color_and_value'],
    path: ['absolute_estimation'],
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
    {
      type: 'toggle',
      key: 'enableHoverColorPreview',
      title: 'settings.enableHoverColorPreviewTitle',
      description: 'settings.enableHoverColorPreviewDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, q) => checkHit(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: userVal,
      deltaEError: hitResult.deltaEError,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ColorAllView
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

export default colorAllCard;
~~~~~

#### Acts 3: 重构 `src/core/color/colorUtils.ts`，纯化标量色彩契约

将 `ColorMode` 从 `'H' | 'S' | 'V' | 'ALL'` 缩减为 `'H' | 'S' | 'V'`，`checkColorHit` 彻底剔除联合类型断言。

~~~~~act
patch_file
src/core/color/colorUtils.ts
~~~~~
~~~~~typescript.old
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
~~~~~typescript.new
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

~~~~~act
patch_file
src/core/color/colorUtils.ts
~~~~~
~~~~~typescript.old
  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    if (mode === 'H' || mode === 'ALL') {
      targetS = Math.floor(Math.random() * 71) + 30; // 30..100
      targetV = Math.floor(Math.random() * 71) + 30; // 30..100

      // 检验 OKLab 彩度：必须保证彩度足够大，否则色相被低 S/V 遮蔽不可辩
      const lab = hsvToOkLab(targetH, targetS, targetV);
      if (getOkChroma(lab) >= Math.min(0.04, tolerance * 1.5)) {
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
  while (attempts < 30) {
    attempts++;
    if (mode === 'H') {
      targetS = Math.floor(Math.random() * 71) + 30; // 30..100
      targetV = Math.floor(Math.random() * 71) + 30; // 30..100

      // 检验 OKLab 彩度：必须保证彩度足够大，否则色相被低 S/V 遮蔽不可辩
      const lab = hsvToOkLab(targetH, targetS, targetV);
      if (getOkChroma(lab) >= Math.min(0.04, tolerance * 1.5)) {
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
src/core/color/colorUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 基于 OKLab 色差 ΔE_OK 的色感答题命中检测
 */
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
~~~~~typescript.new
/**
 * 基于 OKLab 色差 ΔE_OK 的标量单维度色感答题命中检测
 */
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

#### Acts 4: 提取触控放大镜 Hook `usePointLoupe`

将放大镜与屏幕-画布换算逻辑抽离为跨卡片共享的轻量 Hook。

~~~~~act
write_file
src/hooks/usePointLoupe.ts
~~~~~
~~~~~typescript
import { useCallback, useMemo, useRef, useState } from 'preact/hooks';
import { setupHiDpiCanvas } from '../core/canvas/hidpi';
import type { Point } from '../types';
import { CANVAS_THEME } from '../utils/theme';

export const LOUPE_DIAMETER = 104; // 放大镜直径 (px)

export interface UsePointLoupeOptions {
  canvasSize: number;
  gridPoints: Point[];
  disabled?: boolean;
}

export function usePointLoupe({ canvasSize, gridPoints, disabled = false }: UsePointLoupeOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isTouching, setIsTouching] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [currentCanvasPos, setCurrentCanvasPos] = useState<Point | null>(null);

  // 根据当前点阵包围盒跨度动态自适应放大倍率
  const dynamicZoomFactor = useMemo(() => {
    if (!gridPoints || gridPoints.length < 2) return 2.2;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const p of gridPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const maxSpan = Math.max(spanX, spanY);
    const requiredCoverage = Math.max(maxSpan * 1.3, 36);
    const calculatedZoom = LOUPE_DIAMETER / requiredCoverage;
    return Math.max(1.1, Math.min(3.2, calculatedZoom));
  }, [gridPoints]);

  const updateLoupeCanvas = useCallback(
    (focusPt: Point) => {
      const mainCanvas = canvasRef.current;
      const loupeCanvas = loupeCanvasRef.current;
      if (!mainCanvas || !loupeCanvas) return;

      const loupeCtx = setupHiDpiCanvas(loupeCanvas, LOUPE_DIAMETER, LOUPE_DIAMETER);
      if (!loupeCtx) return;

      loupeCtx.clearRect(0, 0, LOUPE_DIAMETER, LOUPE_DIAMETER);
      loupeCtx.fillStyle = CANVAS_THEME.bg.primary;
      loupeCtx.fillRect(0, 0, LOUPE_DIAMETER, LOUPE_DIAMETER);

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const sampleSize = LOUPE_DIAMETER / dynamicZoomFactor;
      const sx = (focusPt.x - sampleSize / 2) * dpr;
      const sy = (focusPt.y - sampleSize / 2) * dpr;
      const sSize = sampleSize * dpr;

      loupeCtx.drawImage(
        mainCanvas,
        sx,
        sy,
        sSize,
        sSize,
        0,
        0,
        LOUPE_DIAMETER,
        LOUPE_DIAMETER,
      );

      const center = LOUPE_DIAMETER / 2;
      loupeCtx.strokeStyle = CANVAS_THEME.status.accent;
      loupeCtx.lineWidth = 1.5;

      loupeCtx.beginPath();
      loupeCtx.arc(center, center, 8, 0, Math.PI * 2);
      loupeCtx.stroke();

      loupeCtx.beginPath();
      loupeCtx.moveTo(center - 14, center);
      loupeCtx.lineTo(center - 4, center);
      loupeCtx.moveTo(center + 4, center);
      loupeCtx.lineTo(center + 14, center);
      loupeCtx.moveTo(center, center - 14);
      loupeCtx.lineTo(center, center - 4);
      loupeCtx.moveTo(center, center + 4);
      loupeCtx.lineTo(center, center + 14);
      loupeCtx.stroke();
    },
    [dynamicZoomFactor],
  );

  const getCanvasCoordinates = useCallback(
    (
      clientX: number,
      clientY: number,
    ): { canvasPoint: Point; relX: number; relY: number } | null => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return null;

      const rect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const scaleX = canvasSize / rect.width;
      const scaleY = canvasSize / rect.height;

      const clickX = Math.round((clientX - rect.left) * scaleX * 100) / 100;
      const clickY = Math.round((clientY - rect.top) * scaleY * 100) / 100;

      const relX = clientX - containerRect.left;
      const relY = clientY - containerRect.top;

      return {
        canvasPoint: { x: clickX, y: clickY },
        relX,
        relY,
      };
    },
    [canvasSize],
  );

  const startTouch = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return null;
      const coords = getCanvasCoordinates(clientX, clientY);
      if (!coords) return null;

      setIsTouching(true);
      setCurrentCanvasPos(coords.canvasPoint);
      setLoupePos({
        x: coords.relX,
        y: coords.relY - 75,
      });
      updateLoupeCanvas(coords.canvasPoint);
      return coords.canvasPoint;
    },
    [disabled, getCanvasCoordinates, updateLoupeCanvas],
  );

  const moveTouch = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled || !isTouching) return null;
      const coords = getCanvasCoordinates(clientX, clientY);
      if (!coords) return null;

      setCurrentCanvasPos(coords.canvasPoint);
      setLoupePos({
        x: coords.relX,
        y: coords.relY - 75,
      });
      updateLoupeCanvas(coords.canvasPoint);
      return coords.canvasPoint;
    },
    [disabled, isTouching, getCanvasCoordinates, updateLoupeCanvas],
  );

  const endTouch = useCallback(() => {
    setIsTouching(false);
    setLoupePos(null);
  }, []);

  return {
    containerRef,
    canvasRef,
    loupeCanvasRef,
    isTouching,
    loupePos,
    currentCanvasPos,
    startTouch,
    moveTouch,
    endTouch,
    getCanvasCoordinates,
  };
}
~~~~~

#### Acts 5: 重构 `PointClickCanvas.tsx`，移除 `customOverlayRender` 逃生舱

让 `PointClickCanvas.tsx` 职责专一为点阵点击与高亮组件。

~~~~~act
write_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { useTranslation } from '../../core/i18n';
import { LOUPE_DIAMETER, usePointLoupe } from '../../hooks/usePointLoupe';
import type { Point } from '../../types';

export interface PointClickCanvasProps {
  canvasSize: number;
  gridPoints: Point[];
  targetPoint?: Point;
  userNearestPoint?: Point;
  anchors?: (Point | null | undefined)[];
  showAnswer: boolean;
  isHit?: boolean;
  disabled?: boolean;
  maxDisplayWidth?: string;
  onCommitPoint: (point: Point) => void;
}

export function PointClickCanvas({
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
  maxDisplayWidth = 'w-full h-full aspect-square',
  onCommitPoint,
}: PointClickCanvasProps) {
  const { t } = useTranslation();
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const {
    containerRef,
    canvasRef,
    loupeCanvasRef,
    isTouching,
    loupePos,
    currentCanvasPos,
    startTouch,
    moveTouch,
    endTouch,
    getCanvasCoordinates,
  } = usePointLoupe({
    canvasSize,
    gridPoints,
    disabled: disabled || showAnswer || !gridPoints.length,
  });

  // 渲染主画布内容
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, canvasSize, canvasSize);
    if (!ctx) return;

    renderInteractivePointGrid({
      ctx,
      canvasSize,
      gridPoints,
      targetPoint,
      userNearestPoint,
      hoverPoint,
      anchors,
      showAnswer,
      isHit,
      disabled,
    });
  }, [
    canvasSize,
    gridPoints,
    targetPoint,
    userNearestPoint,
    hoverPoint,
    anchors,
    showAnswer,
    isHit,
    disabled,
    canvasRef,
  ]);

  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);
    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouching && hoverPoint) setHoverPoint(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);
    if (!isWithinRange) return;

    setHoverPoint(null);
    onCommitPoint(nearestPoint);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    const pt = startTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(pt, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    if (e.cancelable) e.preventDefault();

    const pt = moveTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(pt, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchEnd = () => {
    if (disabled || showAnswer || !isTouching) return;
    endTouch();

    if (hoverPoint) {
      const commitPt = hoverPoint;
      setHoverPoint(null);
      onCommitPoint(commitPt);
    } else if (currentCanvasPos) {
      const { nearestPoint, isWithinRange } = findNearestPointInGrid(currentCanvasPos, gridPoints);
      if (isWithinRange) {
        setHoverPoint(null);
        onCommitPoint(nearestPoint);
      }
    }
  };

  const handleTouchCancel = () => {
    endTouch();
    setHoverPoint(null);
  };

  return (
    <div ref={containerRef} className={`relative block ${maxDisplayWidth} select-none`}>
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
        }}
        tabIndex={0}
        role="button"
        aria-label={t('shell.pointGridAria')}
        className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
          disabled || showAnswer
            ? 'cursor-default'
            : hoverPoint
              ? 'cursor-none hover:border-primary/60 hover:shadow-indigo-50/50'
              : 'cursor-crosshair hover:border-primary/60 hover:shadow-indigo-50/50'
        }`}
      />

      {isTouching && loupePos && (
        <div
          className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl bg-card ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
          style={{
            left: `${loupePos.x}px`,
            top: `${loupePos.y}px`,
            width: `${LOUPE_DIAMETER}px`,
            height: `${LOUPE_DIAMETER}px`,
          }}
        >
          <canvas
            ref={loupeCanvasRef}
            width={LOUPE_DIAMETER}
            height={LOUPE_DIAMETER}
            className="w-full h-full block"
          />
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 6: 重构 `NegVertexFittingView.tsx` 与 `PerspStructure3DView.tsx` 消除逃生舱传递

让多边形裁剪与 3D 轴测图内聚自治渲染，不再将大段私有图元逻辑塞给 `PointClickCanvas`。

~~~~~act
write_file
src/cards/neg_vertex_fitting/NegVertexFittingView.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { drawPolygonCanvas } from '../../core/canvas/drawPolygon';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { useTranslation } from '../../core/i18n';
import { LOUPE_DIAMETER, usePointLoupe } from '../../hooks/usePointLoupe';
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
  const { t } = useTranslation();
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const {
    containerRef,
    canvasRef,
    loupeCanvasRef,
    isTouching,
    loupePos,
    currentCanvasPos,
    startTouch,
    moveTouch,
    endTouch,
    getCanvasCoordinates,
  } = usePointLoupe({
    canvasSize: FITTING_CANVAS_SIZE,
    gridPoints: question.distractorPoints || [],
    disabled: disabled || showAnswer,
  });

  // 1. 渲染左侧参考多边形
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

  // 2. 渲染右侧交互画布 (背景截断多边形 + 点阵 + 辅助线 + 答案揭晓)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, FITTING_CANVAS_SIZE, FITTING_CANVAS_SIZE);
    if (!ctx) return;

    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fillRect(0, 0, FITTING_CANVAS_SIZE, FITTING_CANVAS_SIZE);

    // 绘制截断多边形主体
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

    // 答案揭晓时绘制理论完整多边形轮廓虚线
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

    // 绘制离散候选点阵
    const dotRadius = getDynamicDotRadius(question.distractorPoints || []);
    const hoverRadius = Math.max(2.5, dotRadius * 1.6);

    for (const p of question.distractorPoints || []) {
      drawDot(ctx, p.x, p.y, CANVAS_THEME.pointGrid.dotDefault, dotRadius);
    }

    // 悬停指示
    if (!disabled && !showAnswer && hoverPoint) {
      drawDot(ctx, hoverPoint.x, hoverPoint.y, CANVAS_THEME.pointGrid.dotHover, hoverRadius);
    }

    // 答案揭晓标记
    if (showAnswer && question.targetPoint) {
      drawDot(
        ctx,
        question.targetPoint.x,
        question.targetPoint.y,
        CANVAS_THEME.pointGrid.crosshairTarget,
        dotRadius * 1.4,
      );

      if (userAnswer?.nearestGridPoint && !userAnswer.isHit) {
        drawDot(
          ctx,
          userAnswer.nearestGridPoint.x,
          userAnswer.nearestGridPoint.y,
          CANVAS_THEME.pointGrid.dotMiss,
          dotRadius * 1.3,
        );
      }
    }
  }, [
    question.truncatedVertices,
    question.vertices,
    question.distractorPoints,
    question.targetPoint,
    hoverPoint,
    showAnswer,
    userAnswer,
    disabled,
    canvasRef,
  ]);

  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      coords.canvasPoint,
      question.distractorPoints,
    );
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleMouseLeave = () => {
    if (!isTouching && hoverPoint) setHoverPoint(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      coords.canvasPoint,
      question.distractorPoints,
    );
    if (!isWithinRange) return;

    setHoverPoint(null);
    onAnswer(nearestPoint);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    const pt = startTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(pt, question.distractorPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    if (e.cancelable) e.preventDefault();

    const pt = moveTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(pt, question.distractorPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchEnd = () => {
    if (disabled || showAnswer || !isTouching) return;
    endTouch();

    if (hoverPoint) {
      const commitPt = hoverPoint;
      setHoverPoint(null);
      onAnswer(commitPt);
    } else if (currentCanvasPos) {
      const { nearestPoint, isWithinRange } = findNearestPointInGrid(
        currentCanvasPos,
        question.distractorPoints,
      );
      if (isWithinRange) {
        setHoverPoint(null);
        onAnswer(nearestPoint);
      }
    }
  };

  const handleTouchCancel = () => {
    endTouch();
    setHoverPoint(null);
  };

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

      <div
        ref={containerRef}
        className="relative flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center select-none"
      >
        <canvas
          ref={canvasRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          tabIndex={0}
          role="button"
          aria-label={t('cards.neg_vertex_fitting.views.vertexHint')}
          className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
            disabled || showAnswer
              ? 'cursor-default'
              : hoverPoint
                ? 'cursor-none hover:border-primary/60 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-primary/60 hover:shadow-indigo-50/50'
          }`}
        />

        {isTouching && loupePos && (
          <div
            className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl bg-card ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
            style={{
              left: `${loupePos.x}px`,
              top: `${loupePos.y}px`,
              width: `${LOUPE_DIAMETER}px`,
              height: `${LOUPE_DIAMETER}px`,
            }}
          >
            <canvas
              ref={loupeCanvasRef}
              width={LOUPE_DIAMETER}
              height={LOUPE_DIAMETER}
              className="w-full h-full block"
            />
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/persp_structure_3d/PerspStructure3DView.tsx
~~~~~
~~~~~typescript
import { Box } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../components/common/QuestionCardShell';
import { drawDot, getDynamicDotRadius } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { useCardTranslation, useTranslation } from '../../core/i18n';
import { LOUPE_DIAMETER, usePointLoupe } from '../../hooks/usePointLoupe';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion } from './types';
import { PERSPECTIVE_CANVAS_SIZE, draw3DCubeWireframe } from './utils/generator';

export interface PerspStructure3DViewProps {
  question: PerspStructure3DQuestion;
  showAnswer: boolean;
  userAnswer: PerspStructure3DHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspStructure3DView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspStructure3DViewProps) {
  const { t: cardT } = useCardTranslation('persp_structure_3d');
  const { t: commonT } = useTranslation();
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const targetPt3D = question.targetPoint3D;
  const dim = question.gridDim3D ?? 3;

  const {
    containerRef,
    canvasRef,
    loupeCanvasRef,
    isTouching,
    loupePos,
    currentCanvasPos,
    startTouch,
    moveTouch,
    endTouch,
    getCanvasCoordinates,
  } = usePointLoupe({
    canvasSize: PERSPECTIVE_CANVAS_SIZE,
    gridPoints: question.projectedGridPoints || [],
    disabled: disabled || showAnswer,
  });

  // 自治渲染 3D 轴测网格与点阵
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, PERSPECTIVE_CANVAS_SIZE, PERSPECTIVE_CANVAS_SIZE);
    if (!ctx) return;

    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fillRect(0, 0, PERSPECTIVE_CANVAS_SIZE, PERSPECTIVE_CANVAS_SIZE);

    // 绘制 3D 轴测立方体线框
    const center = {
      x: PERSPECTIVE_CANVAS_SIZE / 2,
      y: PERSPECTIVE_CANVAS_SIZE / 2 + 10,
    };
    const scale = dim === 4 ? 42 : 55;
    draw3DCubeWireframe(ctx, center, scale, dim);

    // 绘制轴测点阵
    const dotRadius = getDynamicDotRadius(question.projectedGridPoints || []);
    const hoverRadius = Math.max(2.5, dotRadius * 1.6);

    for (const p of question.projectedGridPoints || []) {
      drawDot(ctx, p.x, p.y, CANVAS_THEME.pointGrid.dotDefault, dotRadius);
    }

    if (!disabled && !showAnswer && hoverPoint) {
      drawDot(ctx, hoverPoint.x, hoverPoint.y, CANVAS_THEME.pointGrid.dotHover, hoverRadius);
    }

    if (showAnswer && question.targetProjectedPoint) {
      drawDot(
        ctx,
        question.targetProjectedPoint.x,
        question.targetProjectedPoint.y,
        CANVAS_THEME.pointGrid.crosshairTarget,
        dotRadius * 1.5,
      );

      if (userAnswer?.userValue && !userAnswer.isHit) {
        drawDot(
          ctx,
          userAnswer.userValue.x,
          userAnswer.userValue.y,
          CANVAS_THEME.pointGrid.dotMiss,
          dotRadius * 1.4,
        );
      }
    }
  }, [
    question.projectedGridPoints,
    question.targetProjectedPoint,
    dim,
    hoverPoint,
    showAnswer,
    userAnswer,
    disabled,
    canvasRef,
  ]);

  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      coords.canvasPoint,
      question.projectedGridPoints,
    );
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleMouseLeave = () => {
    if (!isTouching && hoverPoint) setHoverPoint(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      coords.canvasPoint,
      question.projectedGridPoints,
    );
    if (!isWithinRange) return;

    setHoverPoint(null);
    onAnswer(nearestPoint);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    const pt = startTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(pt, question.projectedGridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    if (e.cancelable) e.preventDefault();

    const pt = moveTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(pt, question.projectedGridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchEnd = () => {
    if (disabled || showAnswer || !isTouching) return;
    endTouch();

    if (hoverPoint) {
      const commitPt = hoverPoint;
      setHoverPoint(null);
      onAnswer(commitPt);
    } else if (currentCanvasPos) {
      const { nearestPoint, isWithinRange } = findNearestPointInGrid(
        currentCanvasPos,
        question.projectedGridPoints,
      );
      if (isWithinRange) {
        setHoverPoint(null);
        onAnswer(nearestPoint);
      }
    }
  };

  const handleTouchCancel = () => {
    endTouch();
    setHoverPoint(null);
  };

  return (
    <QuestionCardShell
      hintText={cardT('views.hint')}
      hintIcon={Box}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-center">
        {/* 左侧三视图正交切面预览 */}
        <div className="bg-muted/60 p-4 rounded-2xl border border-border flex flex-col gap-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
            {commonT('common.viewTriAxis')}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-muted-foreground">
            {/* 顶视图 (X-Z) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{commonT('common.topView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 正视图 (X-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{commonT('common.frontView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 侧视图 (Z-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{commonT('common.sideView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧 3D 立方体透视交互点阵 */}
        <div
          ref={containerRef}
          className="relative flex justify-center w-full max-w-[340px] aspect-square mx-auto select-none"
        >
          <canvas
            ref={canvasRef}
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            tabIndex={0}
            role="button"
            aria-label={cardT('views.hint')}
            className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
              disabled || showAnswer
                ? 'cursor-default'
                : hoverPoint
                  ? 'cursor-none hover:border-primary/60 hover:shadow-indigo-50/50'
                  : 'cursor-crosshair hover:border-primary/60 hover:shadow-indigo-50/50'
            }`}
          />

          {isTouching && loupePos && (
            <div
              className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl bg-card ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
              style={{
                left: `${loupePos.x}px`,
                top: `${loupePos.y}px`,
                width: `${LOUPE_DIAMETER}px`,
                height: `${LOUPE_DIAMETER}px`,
              }}
            >
              <canvas
                ref={loupeCanvasRef}
                width={LOUPE_DIAMETER}
                height={LOUPE_DIAMETER}
                className="w-full h-full block"
              />
            </div>
          )}
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 7: 重构 `DynamicDomainSettings.tsx`，收口配置属性守卫

消除 JSX 中散落的 `as number`、`as TargetingMode` 强转断言。

~~~~~act
write_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript
import { useTranslation } from '../../core/i18n';
import type { TargetingMode } from '../../storage/settings';
import { Button } from '../ui/button';
import { SettingToggleItem } from './common/SettingToggleItem';
import { SliderMarginGroup } from './common/SliderMarginGroup';
import { TargetingSection } from './common/TargetingSection';

export type SettingFieldSchema =
  | {
      type: 'sliderMargin';
      key: string;
      title?: string;
    }
  | {
      type: 'toggle';
      key: string;
      title: string;
      description?: string;
    }
  | {
      type: 'buttonGroup';
      key: string;
      title: string;
      options: { label: string; value: unknown }[];
      gridCols?: string;
    }
  | {
      type: 'targeting';
      modeKey: string;
      sectorsKey: string;
      title: string;
      subTitle: string;
      sectors: string[];
      gridCols?: 'grid-cols-3' | 'grid-cols-4';
    };

interface DynamicDomainSettingsProps {
  schemas: SettingFieldSchema[];
  values: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

function getNumericSetting(values: Record<string, unknown>, key: string, fallback = 12): number {
  const v = values[key];
  return typeof v === 'number' ? v : fallback;
}

function getBooleanSetting(values: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = values[key];
  return typeof v === 'boolean' ? v : fallback;
}

function getTargetingModeSetting(values: Record<string, unknown>, key: string): TargetingMode {
  const v = values[key];
  return v === 'manual' ? 'manual' : 'off';
}

function getNumericArraySetting(values: Record<string, unknown>, key: string): number[] {
  const v = values[key];
  return Array.isArray(v) ? (v.filter((n) => typeof n === 'number') as number[]) : [];
}

export function DynamicDomainSettings({ schemas, values, onChange }: DynamicDomainSettingsProps) {
  const { t } = useTranslation();

  const handleSectorToggle = (sectorsKey: string, sectorIdx: number) => {
    const currentSectors = getNumericArraySetting(values, sectorsKey);
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    onChange({ [sectorsKey]: updated });
  };

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    if (translated !== text) return translated;
    if (text.startsWith('cards.')) {
      const parts = text.split('.');
      if (parts.length >= 3) {
        return parts.slice(2).join('.');
      }
    }
    return text;
  };

  return (
    <div className="space-y-4">
      {schemas.map((field) => {
        if (field.type === 'sliderMargin') {
          return (
            <SliderMarginGroup
              key={field.key}
              title={field.title ? resolveText(field.title) : undefined}
              value={getNumericSetting(values, field.key, 12)}
              onChange={(val) => onChange({ [field.key]: val })}
            />
          );
        }

        if (field.type === 'toggle') {
          return (
            <SettingToggleItem
              key={field.key}
              title={resolveText(field.title)}
              description={field.description ? resolveText(field.description) : undefined}
              checked={getBooleanSetting(values, field.key, false)}
              onChange={(checked) => onChange({ [field.key]: checked })}
            />
          );
        }

        if (field.type === 'buttonGroup') {
          const currentVal = values[field.key];
          return (
            <div key={field.key} className="space-y-2">
              <div className="text-sm font-semibold text-foreground">
                {resolveText(field.title)}
              </div>
              <div className={`grid ${field.gridCols || 'grid-cols-4'} gap-1.5`}>
                {field.options.map((opt) => (
                  <Button
                    key={String(opt.value)}
                    variant={currentVal === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange({ [field.key]: opt.value })}
                    className="py-2 h-auto"
                  >
                    {resolveText(opt.label)}
                  </Button>
                ))}
              </div>
            </div>
          );
        }

        if (field.type === 'targeting') {
          const mode = getTargetingModeSetting(values, field.modeKey);
          const selectedSectors = getNumericArraySetting(values, field.sectorsKey);

          return (
            <TargetingSection
              key={`${field.modeKey}-${field.sectorsKey}`}
              title={resolveText(field.title)}
              subTitle={resolveText(field.subTitle)}
              mode={mode}
              onModeChange={(m) => onChange({ [field.modeKey]: m })}
              sectors={field.sectors}
              selectedSectors={selectedSectors}
              onToggleSector={(idx) => handleSectorToggle(field.sectorsKey, idx)}
              gridCols={field.gridCols}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
~~~~~

#### Acts 8: 强化图表分析层试炼记录字段解析守卫

在 `color_hue/analytics.tsx` 与 `star_single/analytics.tsx` 等分析中引入类型安全的记录属性解构器，消除裸露的 `(r.targetHSV as [number, number, number]) || [0, 0, 0]` 等断言。

~~~~~act
patch_file
src/cards/color_hue/analytics.tsx
~~~~~
~~~~~typescript.old
        const sectorBuckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0, sumBias: 0 }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const uHsv = (r.userHSV as [number, number, number]) || tHsv;
          const bias = calcSignedHueBias(tHsv[0], uHsv[0]);
          sumSignedBias += bias;
~~~~~
~~~~~typescript.new
        const sectorBuckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0, sumBias: 0 }));
        for (const r of records) {
          const tHsv: [number, number, number] = Array.isArray(r.targetHSV) && r.targetHSV.length === 3
            ? [Number(r.targetHSV[0]), Number(r.targetHSV[1]), Number(r.targetHSV[2])]
            : [0, 0, 0];
          const uHsv: [number, number, number] = Array.isArray(r.userHSV) && r.userHSV.length === 3
            ? [Number(r.userHSV[0]), Number(r.userHSV[1]), Number(r.userHSV[2])]
            : tHsv;
          const bias = calcSignedHueBias(tHsv[0], uHsv[0]);
          sumSignedBias += bias;
~~~~~

~~~~~act
patch_file
src/cards/color_hue/analytics.tsx
~~~~~
~~~~~typescript.old
      renderVisualizer: (canvas, records) => {
        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumError: 0,
        }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
        }
~~~~~
~~~~~typescript.new
      renderVisualizer: (canvas, records) => {
        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumError: 0,
        }));
        for (const r of records) {
          const tHsv: [number, number, number] = Array.isArray(r.targetHSV) && r.targetHSV.length === 3
            ? [Number(r.targetHSV[0]), Number(r.targetHSV[1]), Number(r.targetHSV[2])]
            : [0, 0, 0];
          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
        }
~~~~~

~~~~~act
patch_file
src/cards/star_single/analytics.tsx
~~~~~
~~~~~typescript.old
        for (const r of records) {
          const uClick = (r.userClick as [number, number]) || [0, 0];
          const tB = (r.targetB as [number, number]) || [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
        }
~~~~~
~~~~~typescript.new
        for (const r of records) {
          const uClick: [number, number] = Array.isArray(r.userClick) && r.userClick.length === 2
            ? [Number(r.userClick[0]), Number(r.userClick[1])]
            : [0, 0];
          const tB: [number, number] = Array.isArray(r.targetB) && r.targetB.length === 2
            ? [Number(r.targetB[0]), Number(r.targetB[1])]
            : [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
        }
~~~~~

~~~~~act
patch_file
src/cards/star_single/analytics.tsx
~~~~~
~~~~~typescript.old
        for (const r of records) {
          const uClick = (r.userClick as [number, number]) || [0, 0];
          const tB = (r.targetB as [number, number]) || [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
          sumDist += (r.errorPixelDistance as number) || 0;
        }
~~~~~
~~~~~typescript.new
        for (const r of records) {
          const uClick: [number, number] = Array.isArray(r.userClick) && r.userClick.length === 2
            ? [Number(r.userClick[0]), Number(r.userClick[1])]
            : [0, 0];
          const tB: [number, number] = Array.isArray(r.targetB) && r.targetB.length === 2
            ? [Number(r.targetB[0]), Number(r.targetB[1])]
            : [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
          sumDist += Number(r.errorPixelDistance || 0);
        }
~~~~~

### 下一步建议
1. **构建与测试验证**：运行 `npm run build` 或 `npm test`（如 `vitest run`）全面验证重构后类型检查通过、无编译错误。
2. **生成 Git Commit**：在验证测试均正常通过后，用户可要求发起 `[COMMIT]` 计划以将这些重构提交至版本库。
