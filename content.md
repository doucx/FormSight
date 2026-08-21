好的，我们将继续把 `star`、`color`、`relative_color`、`negative_space` 与 `abstraction` 等所有领域的专用 Canvas 视图、生成与评估算法、以及 Plugin 胶水层全面收敛至各自的 `src/domains/<domain>/` 目录中，完成全领域的垂直切片改造。

## [WIP] refactor: 全面收敛各领域专属算法、Canvas 视图与插件至 Domain 包

### 用户需求
将 `star`、`color`、`relative_color`、`negative_space`、`abstraction` 等所有领域的业务视图、算法逻辑和插件定义收敛至 `src/domains/<domain>/`，实现各领域的彻底自包含，并保持向后兼容性。

### 评论
完成全量领域的垂直切片迁移后，FormSight 体系将正式成为标准的模块化单体架构。新增、修改或移除任何一个感知训练领域，只需在其独立的 `src/domains/<name>/` 目录内增删改文件，彻底摆脱跨目录散落代码的维护困难。

### 目标
1. 在 `src/domains/star/` 中建立 `views/StarCanvas.tsx`、`plugin.tsx` 并更新 `index.ts`。
2. 在 `src/domains/color/` 中建立 `views/ColorCanvas.tsx`、`plugin.tsx` 并更新 `index.ts`。
3. 在 `src/domains/relative_color/` 中收敛 `views/`、`utils/`、`plugin.tsx` 并更新 `index.ts`。
4. 在 `src/domains/negative_space/` 中收敛 `views/`、`utils/`、`plugin.tsx` 并更新 `index.ts`。
5. 在 `src/domains/abstraction/` 中收敛 `views/`、`utils/`、`plugin.tsx` 并更新 `index.ts` 和 `concretization/index.ts`。
6. 更新全局别名映射以确保平滑兼容。

### 基本原理
每个领域由 4 个标准层构成：
- `utils/`：该领域的数学模型、数据结构、题目生成与 Hit 判定算法。
- `views/`：该领域所有的 UI 交互与 Canvas 渲染组件。
- `plugin.tsx`：实现 `TrainingPlugin` 接口的胶水层，负责串联数据与视图。
- `index.ts`：导出符合 `DomainManifest` 规范的模块描述对象，供 `src/core/registry.ts` 自动扫描加载。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/domain-slices #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 收敛 `star` 寻星练习领域至 `src/domains/star/`

建立 `src/domains/star/views/StarCanvas.tsx`、`src/domains/star/plugin.tsx` 并更新 `src/domains/star/index.ts`。

~~~~~act
write_file
src/domains/star/views/StarCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import type { HitResult, Point, QuestionData } from '../../../types';
import { drawDot } from '../../../utils/canvas/drawPointGrid';
import { CANVAS_SIZE, checkHit, getDynamicDotRadius } from '../../../utils/geometry';

export interface StarCanvasProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (clickPoint: Point, hitResult: HitResult) => void;
  disabled?: boolean;
}

export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', dotRadius);

        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', dotRadius);
        }

        drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', dotRadius);
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);
    if (!hitResult.isWithinRange) return;
    onAnswer(clickPoint, hitResult);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner"
        />
      </div>

      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/domains/star/plugin.tsx
~~~~~
~~~~~typescript
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { HitResult, Point, QuestionData } from '../../types';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../../utils/geometry';
import type { StarSettings } from '../../utils/settings';
import { StarCanvas } from './views/StarCanvas';

export const starPlugin: TrainingPlugin<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  domain: 'star',
  title: '寻星练习',
  getModeBadge: (mode) => mode,
  isTargeting: (_mode, settings) => settings.targetingMode === 'manual',
  generateQuestion: (mode, level, settings) => {
    const opts: QuestionGenerateOptions = {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
      gridSize: settings.gridSize,
    };
    return generateQuestion(mode as 'single' | 'double_h' | 'double_r', level, opts);
  },
  evaluateAnswer: (userVal) => userVal.hitResult,
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult) => ({
    anchorA: [q.anchorA.x, q.anchorA.y],
    anchorC: q.anchorC ? [q.anchorC.x, q.anchorC.y] : undefined,
    targetB: [q.targetB.x, q.targetB.y],
    userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
    angleDegree: q.angleDegree,
    distanceRatio: q.distanceRatio,
    errorPixelDistance: hitResult.errorDistance,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
    <StarCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={
        userAnswer ? { clickPoint: userAnswer.nearestGridPoint, hitResult: userAnswer } : null
      }
      onAnswer={(clickPoint) => {
        const hitRes = checkHit(clickPoint, question.targetB, question.distractorPoints);
        if (hitRes.isWithinRange) {
          onAnswer({ clickPoint, hitResult: hitRes });
        }
      }}
      disabled={disabled}
    />
  ),
};
~~~~~

~~~~~act
write_file
src/domains/star/index.ts
~~~~~
~~~~~typescript
import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import { CARD_ANALYTICS_PLUGINS } from '../../config/analyticsPlugins';
import { STAR_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { starPlugin } from './plugin';

export const starCards: CardDefinition[] = [
  {
    id: 'star_single',
    domain: 'star',
    mode: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
    icon: Target,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_h',
    domain: 'star',
    mode: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    instruction: '观察左侧水平双锚点几何关系，在右侧点阵中盲打定位',
    icon: Crosshair,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_r',
    domain: 'star',
    mode: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    instruction: '观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位',
    icon: RotateCw,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
];

export const starDomain: DomainManifest = {
  domain: 'star',
  meta: {
    domain: 'star',
    appId: 'star-hopping',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    homeTitle: '寻星练习 (Star-Hopping)',
    homeDesc:
      '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
    hasWeaknessAnalytics: true,
    get cards() {
      return starCards;
    },
  },
  cards: starCards,
  trainingPlugin: starPlugin as unknown as DomainManifest['trainingPlugin'],
  analyticsPlugins: {
    star_single: CARD_ANALYTICS_PLUGINS.star_single,
    star_double_h: CARD_ANALYTICS_PLUGINS.star_double_h,
    star_double_r: CARD_ANALYTICS_PLUGINS.star_double_r,
  },
};

export default starDomain;
~~~~~

#### Acts 2: 收敛 `color` 绝对色感领域至 `src/domains/color/`

建立 `src/domains/color/views/ColorCanvas.tsx`、`src/domains/color/plugin.tsx` 并更新 `src/domains/color/index.ts`。

~~~~~act
write_file
src/domains/color/views/ColorCanvas.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../../../core/color/colorUtils';

export interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number | [number, number, number]) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  enableHoverColorPreview = true,
}: ColorCanvasProps) {
  const { mode, targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

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
    if (mode === 'ALL') {
      setUserH(180);
      setUserS(50);
      setUserV(50);
      setAllHoverVals({ H: null, S: null, V: null });
      setDraggingLabel(null);
    }
  }, [mode]);

  const handleSubmitAll = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && mode === 'ALL' && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showAnswer, disabled, userH, userS, userV, onAnswer]);

  const currentH = mode === 'ALL' ? userH : targetH;
  const currentV = mode === 'ALL' ? userV : targetV;

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(currentH, 100, 100)})`;

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="flex flex-col items-center gap-2 w-full">
        {mode === 'ALL' ? (
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
              style={{ backgroundColor: targetHex }}
            />
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-75"
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
        ) : (
          <div
            className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
        )}
      </div>

      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {mode === 'ALL' ? (
          <>
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
          </>
        ) : (
          <>
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={targetH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={mode === 'H' ? userAnswer?.userValue : undefined}
              isHit={mode === 'H' ? userAnswer?.isHit : undefined}
              isInteractiveTarget={mode === 'H'}
              onCommit={(v) => {
                if (mode === 'H' && !showAnswer && !disabled) onAnswer(v);
              }}
              disabled={disabled || mode !== 'H'}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand && mode === 'H'}
            />

            {mode === 'S' && (
              <HsvTrackSlider
                label="S"
                gradient={satGradient}
                val={targetS}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetS}
                userVal={mode === 'S' ? userAnswer?.userValue : undefined}
                isHit={mode === 'S' ? userAnswer?.isHit : undefined}
                isInteractiveTarget={true}
                onCommit={(v) => {
                  if (!showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
            )}

            {(mode === 'V' || mode === 'S') && (
              <HsvTrackSlider
                label="V"
                gradient={valGradient}
                val={targetV}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetV}
                userVal={mode === 'V' ? userAnswer?.userValue : undefined}
                isHit={mode === 'V' ? userAnswer?.isHit : undefined}
                isInteractiveTarget={mode === 'V'}
                onCommit={(v) => {
                  if (mode === 'V' && !showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled || mode !== 'V'}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand && mode === 'V'}
              />
            )}
          </>
        )}
      </div>

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

~~~~~act
write_file
src/domains/color/plugin.tsx
~~~~~
~~~~~typescript
import type { TrainingPlugin } from '../../config/trainingPlugins';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../../core/color/colorUtils';
import type { ColorSenseSettings } from '../../utils/settings';
import { ColorCanvas } from './views/ColorCanvas';

export const colorPlugin: TrainingPlugin<
  ColorQuestionData,
  ColorHitResult,
  number | [number, number, number],
  ColorSenseSettings
> = {
  domain: 'color',
  title: '色感训练',
  getModeBadge: (mode) =>
    mode === 'H' ? '色相' : mode === 'V' ? '明度' : mode === 'S' ? '饱和度' : '综合拾色',
  isTargeting: (mode, settings) => settings.targetingMode === 'manual' && mode === 'H',
  generateQuestion: (mode, level, settings) =>
    generateColorQuestion(mode as ColorMode, level, {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
    }),
  evaluateAnswer: (userVal, q, mode) => checkColorHit(mode as ColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    const computedUserHSV: [number, number, number] =
      mode === 'ALL' && Array.isArray(userVal)
        ? userVal
        : [
            mode === 'H' ? (userVal as number) : q.targetH,
            mode === 'S' ? (userVal as number) : q.targetS,
            mode === 'V' ? (userVal as number) : q.targetV,
          ];
    return {
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: computedUserHSV,
      errorValue: hitResult.errorValue,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <ColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
    />
  ),
};
~~~~~

~~~~~act
write_file
src/domains/color/index.ts
~~~~~
~~~~~typescript
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import { colorHueAnalyticsPlugin } from '../../config/analyticsPlugins';
import { COLOR_ALL_SCHEMAS, HUE_SCHEMAS, SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { colorPlugin } from './plugin';

export const colorCards: CardDefinition[] = [
  {
    id: 'color_hue',
    domain: 'color',
    mode: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    instruction: '定位上方色块在 360° 色相环上的精准角度',
    icon: RotateCw,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: HUE_SCHEMAS,
  },
  {
    id: 'color_val',
    domain: 'color',
    mode: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    instruction: '评估上方色块的素描明度深浅比例 (0%~100%)',
    icon: Sun,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_sat',
    domain: 'color',
    mode: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    instruction: '评估上方色块的鲜艳纯度比例 (0%~100%)',
    icon: Droplet,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_all',
    domain: 'color',
    mode: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    instruction: '同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色',
    icon: Palette,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: COLOR_ALL_SCHEMAS,
  },
];

export const colorDomain: DomainManifest = {
  domain: 'color',
  meta: {
    domain: 'color',
    appId: 'color-sense',
    title: '色感训练',
    subTitle: 'Color Recognition',
    homeTitle: '绝对色感 (Color Recognition)',
    homeDesc:
      '拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。',
    themeColor: 'amber',
    icon: Palette,
    hasWeaknessAnalytics: true,
    get cards() {
      return colorCards;
    },
  },
  cards: colorCards,
  trainingPlugin: colorPlugin as unknown as DomainManifest['trainingPlugin'],
  analyticsPlugins: {
    color_hue: colorHueAnalyticsPlugin,
  },
};

export default colorDomain;
~~~~~

#### Acts 3: 收敛 `relative_color` 相对色感领域至 `src/domains/relative_color/`

建立 `src/domains/relative_color/views/RelativeColorCanvas.tsx`、`src/domains/relative_color/plugin.tsx` 并更新 `src/domains/relative_color/index.ts`。

~~~~~act
write_file
src/domains/relative_color/views/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AlbersInductionView } from '../../../components/relativeColor/AlbersInductionView';
import { Decontextual2AfcView } from '../../../components/relativeColor/Decontextual2AfcView';
import { HueInductionView } from '../../../components/relativeColor/HueInductionView';
import { VectorShiftView } from '../../../components/relativeColor/VectorShiftView';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../../../utils/relativeColor';

export interface RelativeColorCanvasProps {
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

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [userRightH, setUserRightH] = useState<number>(180);
  const [userRightS, setUserRightS] = useState<number>(50);
  const [userRightV, setUserRightV] = useState<number>(50);
  const [selected2AfcChoice, setSelected2AfcChoice] = useState<'A' | 'B' | null>(null);

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

  const handleSelect2Afc = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelected2AfcChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  const handleSubmitLightnessInduction = useCallback(() => {
    if (disabled || showAnswer) return;
    onAnswer([userRightH, userRightS, userRightV]);
  }, [disabled, showAnswer, userRightH, userRightS, userRightV, onAnswer]);

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

      if (mode === 'LIGHTNESS_INDUCTION') {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          handleSubmitLightnessInduction();
        }
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
    handleSubmitLightnessInduction,
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

  if (mode === 'HUE_INDUCTION') {
    return (
      <HueInductionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(chosenColor) => onAnswer(chosenColor)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'LIGHTNESS_INDUCTION') {
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
        onSubmit={handleSubmitLightnessInduction}
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
src/domains/relative_color/plugin.tsx
~~~~~
~~~~~typescript
import type { TrainingPlugin } from '../../config/trainingPlugins';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../../utils/relativeColorUtils';
import type { RelativeColorSettings } from '../../utils/settings';
import { RelativeColorCanvas } from './views/RelativeColorCanvas';

export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  domain: 'relative_color',
  title: '相对色感',
  getModeBadge: (mode) =>
    mode === 'LIGHTNESS_INDUCTION'
      ? '明度反差补偿'
      : mode === 'HUE_INDUCTION'
        ? '补色残像调和'
        : mode === 'DECONTEXTUAL_2AFC'
          ? '环境穿透判别'
          : '色彩矢量迁移',
  generateQuestion: (mode, level) =>
    generateRelativeColorQuestion(mode as RelativeColorMode, level),
  evaluateAnswer: (userVal, q, mode) =>
    checkRelativeColorHit(mode as RelativeColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'DECONTEXTUAL_2AFC') {
      return {
        mode,
        userChoice: userVal,
        correctChoice: q.largerPhysicalSide,
        physicalValueDiff: q.physicalValueDiff,
      };
    }
    if (mode === 'HUE_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        options: q.options,
        correctIndex: q.correctIndex,
        deltaEError: hitResult.deltaEError,
      };
    }
    if (mode === 'LIGHTNESS_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        deltaEError: hitResult.deltaEError,
      };
    }
    return {
      mode: 'VECTOR_SHIFT',
      colorA: q.colorA,
      colorB: q.colorB,
      colorC: q.colorC,
      targetD: q.targetD,
      userD: userVal,
      deltaEError: hitResult.deltaEError,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <RelativeColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
~~~~~

~~~~~act
write_file
src/domains/relative_color/index.ts
~~~~~
~~~~~typescript
import { Columns, Palette, Shuffle, Sun } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { relativeColorPlugin } from './plugin';

export const relativeColorCards: CardDefinition[] = [
  {
    id: 'rel_vector_shift',
    domain: 'relative_color',
    mode: 'VECTOR_SHIFT',
    title: '色彩矢量迁移',
    desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
    instruction: '观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色',
    icon: Shuffle,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_lightness_induction',
    domain: 'relative_color',
    mode: 'LIGHTNESS_INDUCTION',
    title: '明度反差补偿',
    desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
    instruction: '调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」',
    icon: Sun,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_hue_induction',
    domain: 'relative_color',
    mode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力。',
    instruction: '观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)',
    icon: Palette,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'rel_decontextual_2afc',
    domain: 'relative_color',
    mode: 'DECONTEXTUAL_2AFC',
    title: '环境穿透判别',
    desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
    instruction: '穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」',
    icon: Columns,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const relativeColorDomain: DomainManifest = {
  domain: 'relative_color',
  meta: {
    domain: 'relative_color',
    appId: 'relative-color',
    title: '相对色感',
    subTitle: 'Relative Color',
    homeTitle: '相对色感 (Relative Color Perception)',
    homeDesc:
      '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
    hasWeaknessAnalytics: true,
    get cards() {
      return relativeColorCards;
    },
  },
  cards: relativeColorCards,
  trainingPlugin: relativeColorPlugin as unknown as DomainManifest['trainingPlugin'],
};

export default relativeColorDomain;
~~~~~

#### Acts 4: 收敛 `negative_space` 正负形空间领域至 `src/domains/negative_space/`

建立 `src/domains/negative_space/views/NegativeSpaceCanvas.tsx`、`src/domains/negative_space/plugin.tsx` 并更新 `src/domains/negative_space/index.ts`。

~~~~~act
write_file
src/domains/negative_space/views/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
import { AreaComparison2AfcView } from '../../../components/negativeSpace/AreaComparison2AfcView';
import { RatioEstimationView } from '../../../components/negativeSpace/RatioEstimationView';
import { ShapeMemory2AfcView } from '../../../components/negativeSpace/ShapeMemory2AfcView';
import { VertexFittingView } from '../../../components/negativeSpace/VertexFittingView';
import type { Point } from '../../../types';
import type {
  NegativeSpaceHitResult,
  NegativeSpaceQuestionData,
} from '../../../utils/negativeSpace';

export interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B' | Point) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: NegativeSpaceCanvasProps) {
  const { mode } = question;

  if (mode === 'AREA_COMPARISON_2AFC') {
    return (
      <AreaComparison2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(choice) => onAnswer(choice)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'NEGATIVE_VERTEX_FITTING') {
    return (
      <VertexFittingView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(point) => onAnswer(point)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'SHAPE_MATCH_2AFC') {
    return (
      <ShapeMemory2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(choiceIdx) => onAnswer(choiceIdx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <RatioEstimationView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={(ratio) => onAnswer(ratio)}
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
src/domains/negative_space/plugin.tsx
~~~~~
~~~~~typescript
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { Point } from '../../types';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
} from '../../utils/negativeSpaceUtils';
import type { NegativeSpaceSettings } from '../../utils/settings';
import { NegativeSpaceCanvas } from './views/NegativeSpaceCanvas';

export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'SHAPE_MATCH_2AFC'
          ? '负形轮廓记忆匹配'
          : '负形占比估算',
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
      return {
        mode: 'NEGATIVE_VERTEX_FITTING',
        targetVertexIndex: q.targetVertexIndex,
        targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
        userClick: hitResult.nearestGridPoint
          ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
          : undefined,
        errorPixelDistance: hitResult.errorValue,
      };
    }
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    if (mode === 'SHAPE_MATCH_2AFC') {
      return {
        mode: 'SHAPE_MATCH_2AFC',
        userChoice: userVal === 0 || userVal === 'A' ? 'A' : 'B',
        correctChoice: q.correctChoice,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
~~~~~

~~~~~act
write_file
src/domains/negative_space/index.ts
~~~~~
~~~~~typescript
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import { negRatioAnalyticsPlugin } from '../../config/analyticsPlugins';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { negativeSpacePlugin } from './plugin';

export const negativeSpaceCards: CardDefinition[] = [
  {
    id: 'neg_ratio_estimation',
    domain: 'negative_space',
    mode: 'RATIO_ESTIMATION',
    title: '负形占比滑块评估',
    desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
    instruction: '估计黑色主体周围的白色留白（负形）占画面总面积的百分比',
    icon: Maximize2,
    tags: {
      target: ['negative_space'],
      skill: ['proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'neg_area_comparison_2afc',
    domain: 'negative_space',
    mode: 'AREA_COMPARISON_2AFC',
    title: '负形面积二分判别',
    desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
    instruction: '二选一判别哪一侧画面的白色留白（负形）面积更大',
    icon: Columns,
    tags: {
      target: ['negative_space'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_vertex_fitting',
    domain: 'negative_space',
    mode: 'NEGATIVE_VERTEX_FITTING',
    title: '负形边界反切定点',
    desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
    instruction: '观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点',
    icon: Crosshair,
    tags: {
      target: ['negative_space'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_shape_match_2afc',
    domain: 'negative_space',
    mode: 'SHAPE_MATCH_2AFC',
    title: '负形轮廓记忆匹配',
    desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
    instruction: '瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状',
    icon: Sparkles,
    tags: {
      target: ['negative_space'],
      skill: ['visual_memory', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const negativeSpaceDomain: DomainManifest = {
  domain: 'negative_space',
  meta: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: true,
    get cards() {
      return negativeSpaceCards;
    },
  },
  cards: negativeSpaceCards,
  trainingPlugin: negativeSpacePlugin as unknown as DomainManifest['trainingPlugin'],
  analyticsPlugins: {
    neg_ratio_estimation: negRatioAnalyticsPlugin,
  },
};

export default negativeSpaceDomain;
~~~~~

#### Acts 5: 收敛 `abstraction` 与 `concretization` 领域

建立 `src/domains/abstraction/views/AbstractionCanvas.tsx`、`src/domains/abstraction/plugin.tsx` 并更新对应 Manifest。

~~~~~act
write_file
src/domains/abstraction/views/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
import { GestureAxisView } from '../../../components/abstraction/GestureAxisView';
import { NotanThresholdView } from '../../../components/abstraction/NotanThresholdView';
import { PaletteClusteringView } from '../../../components/abstraction/PaletteClusteringView';
import { TopDown2AfcView } from '../../../components/abstraction/TopDown2AfcView';
import { TopDownPatternView } from '../../../components/abstraction/TopDownPatternView';
import type {
  AbstractionHitResult,
  AbstractionQuestionData,
} from '../../../utils/abstraction';

export interface AbstractionCanvasProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: AbstractionCanvasProps) {
  const { mode } = question;

  if (mode === 'GESTURE_AXIS') {
    return (
      <GestureAxisView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(val) => onAnswer(val)}
        disabled={disabled}
        hitMargin={hitMargin}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'NOTAN_THRESHOLD') {
    return (
      <NotanThresholdView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(val) => onAnswer(val)}
        disabled={disabled}
        hitMargin={hitMargin}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'PALETTE_CLUSTERING') {
    return (
      <PaletteClusteringView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(idx) => onAnswer(idx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'TD_PALETTE_2AFC') {
    return (
      <TopDownPatternView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(idx) => onAnswer(idx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <TopDown2AfcView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={(choice) => onAnswer(choice)}
      disabled={disabled}
      showCanvasHints={showCanvasHints}
    />
  );
}
~~~~~

~~~~~act
write_file
src/domains/abstraction/plugin.tsx
~~~~~
~~~~~typescript
import type { TrainingPlugin } from '../../config/trainingPlugins';
import {
  type AbstractionHitResult,
  type AbstractionMode,
  type AbstractionQuestionData,
  checkAbstractionHit,
  generateAbstractionQuestion,
} from '../../utils/abstractionUtils';
import type { BaseModuleSettings } from '../../utils/settings';
import { AbstractionCanvas } from './views/AbstractionCanvas';

export const abstractionPlugin: TrainingPlugin<
  AbstractionQuestionData,
  AbstractionHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  domain: 'abstraction',
  title: '视知觉概括',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      GESTURE_AXIS: '动态势线提取',
      POLYGON_DECIMATION: '折线低模大形',
      NOTAN_THRESHOLD: '黑白素描归组',
      PALETTE_CLUSTERING: '主调色群提炼',
      TD_GESTURE_2AFC: '动态势线寻源',
      TD_HULL_2AFC: '几何大模寻形',
      TD_NOTAN_2AFC: '黑白素描骨架',
      TD_PALETTE_2AFC: '调性基底归位',
    };
    return map[mode] || mode;
  },
  generateQuestion: (mode, level) => generateAbstractionQuestion(mode as AbstractionMode, level),
  evaluateAnswer: (userVal, q) => checkAbstractionHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <AbstractionCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={(settings.sliderHitMargin as number) ?? 12}
      showToleranceBand={(settings.showToleranceBand as boolean) ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
~~~~~

~~~~~act
write_file
src/domains/abstraction/index.ts
~~~~~
~~~~~typescript
import { Eye, Maximize2, Palette, RotateCw, Sun } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { abstractionPlugin } from './plugin';

export const abstractionCards: CardDefinition[] = [
  {
    id: 'abs_gesture_axis',
    domain: 'abstraction',
    mode: 'GESTURE_AXIS',
    title: '动态势线提取',
    desc: '从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。',
    instruction: '旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)',
    icon: RotateCw,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_polygon_decimation',
    domain: 'abstraction',
    mode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。',
    instruction: '观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项',
    icon: Maximize2,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_notan_threshold',
    domain: 'abstraction',
    mode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_palette_clustering',
    domain: 'abstraction',
    mode: 'PALETTE_CLUSTERING',
    title: '主调色群提炼',
    desc: '穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。',
    instruction: '在下方 4 个候选项中，选出代表画面全局主调的加权主色',
    icon: Palette,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const abstractionDomain: DomainManifest = {
  domain: 'abstraction',
  meta: {
    domain: 'abstraction',
    appId: 'visual-abstraction',
    title: '概括感知',
    subTitle: 'Visual Abstraction',
    homeTitle: '概括感知 (Visual Abstraction)',
    homeDesc:
      '自底向上过滤繁琐细节，训练对动态势线、极简低模折线、素描黑白块面与加权主调的本质提炼能力。',
    themeColor: 'indigo',
    icon: Eye,
    hasWeaknessAnalytics: false,
    get cards() {
      return abstractionCards;
    },
  },
  cards: abstractionCards,
  trainingPlugin: abstractionPlugin as unknown as DomainManifest['trainingPlugin'],
};

export default abstractionDomain;
~~~~~

~~~~~act
write_file
src/domains/concretization/index.ts
~~~~~
~~~~~typescript
import { Columns, Droplet, Layers, Shuffle, Sparkles } from 'lucide-preact';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { abstractionPlugin } from '../abstraction/plugin';

export const concretizationCards: CardDefinition[] = [
  {
    id: 'abs_td_gesture_2afc',
    domain: 'concretization',
    mode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    instruction: '观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势',
    icon: Shuffle,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    domain: 'concretization',
    mode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    domain: 'concretization',
    mode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    instruction: '观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构',
    icon: Droplet,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    domain: 'concretization',
    mode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
    instruction: '观察上方基准主调色，选出以此为色彩基底的拼贴画面',
    icon: Sparkles,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const concretizationDomain: DomainManifest = {
  domain: 'concretization',
  meta: {
    domain: 'concretization',
    appId: 'visual-refinement',
    title: '细化感知',
    subTitle: 'Visual Refinement',
    homeTitle: '细化感知 (Visual Refinement)',
    homeDesc:
      '自顶向下透视具象细节，训练基于势线骨架、几何大形、Notan 构图与调性基底在丰富画面中寻源辨识的能力。',
    themeColor: 'purple',
    icon: Layers,
    hasWeaknessAnalytics: false,
    get cards() {
      return concretizationCards;
    },
  },
  cards: concretizationCards,
  trainingPlugin: abstractionPlugin as unknown as DomainManifest['trainingPlugin'],
};

export default concretizationDomain;
~~~~~

#### Acts 6: 保持全局 Canvas 别名向下兼容

~~~~~act
write_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
export { StarCanvas, type StarCanvasProps } from '../domains/star/views/StarCanvas';
~~~~~

~~~~~act
write_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
export { ColorCanvas, type ColorCanvasProps } from '../domains/color/views/ColorCanvas';
~~~~~

~~~~~act
write_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript
export {
  RelativeColorCanvas,
  type RelativeColorCanvasProps,
} from '../domains/relative_color/views/RelativeColorCanvas';
~~~~~

~~~~~act
write_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
export {
  NegativeSpaceCanvas,
  type NegativeSpaceCanvasProps,
} from '../domains/negative_space/views/NegativeSpaceCanvas';
~~~~~

~~~~~act
write_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
export {
  AbstractionCanvas,
  type AbstractionCanvasProps,
} from '../domains/abstraction/views/AbstractionCanvas';
~~~~~

### 下一步建议
1. **测试与构建校验**：运行 `npm run check` 或 `npm test` 确认 TypeScript 类型与 Vite 编译完全通过。
2. **提交 Git 变更**：在用户确认后，创建清晰的 Git Commit 记录本次架构升级。
