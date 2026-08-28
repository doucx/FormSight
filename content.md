我已梳理形式与抽象感知扩展包（`abstraction` pack）中的所有硬编码文案与组件依赖，接下来将对其进行全量国际化与双语词典改造。

## [WIP] refactor(pack/abstraction): 完善形式与抽象感知扩展包双语国际化与视图重构

### 用户需求

对形式与抽象感知扩展包（`abstraction` pack）进行全方位双语国际化改造，消除各视图、组件与配置中的硬编码中文文本，接入 `useTranslation()` 与 `packs.abstraction` 命名空间，使卡片描述、题干提示、组件标题与设置项在多语言切换时无缝响应。

### 评论

这是完成全系统所有 Pack 国际化闭环的关键一步。通过将 `abstraction` 的 8 个核心模块及其实验性 2AFC/N-AFC 视图与设置项标准化收敛进双语词典，确保了用户无论在中文还是英文界面下，都能获得一致且专业的视知觉训练体验。

### 目标

1. 扩充 `src/packs/abstraction/locales/zh-CN.json` 与 `src/packs/abstraction/locales/en-US.json`，补充所有卡片的提示词、视口标头、选项标题与专属设置文案。
2. 重构 `GestureAxisView.tsx`、`NotanThresholdView.tsx`、`PaletteClusteringView.tsx`、`TopDown2AfcView.tsx` 和 `TopDownPatternView.tsx`，移除硬编码文本并接入 `useTranslation()`。
3. 更新 `src/packs/abstraction/index.ts` 中的动态设置 Schemas 与卡片定义，支持多语言 key 解析。

### 基本原理

1. **命名空间聚合**：所有扩展包私有文案均以 `packs.abstraction.*` 作为命名空间在 `i18n` 查表中解析。
2. **通用词条复用**：选项代号（如“区域 A”、“画面 1”等）复用 `common.areaA`、`common.screenN`，保持系统全局风格统一。
3. **动态 Schema 键值化**：将设置项中的 `title` 与 `description` 改用 i18n key，由 `DynamicDomainSettings` 动态翻译渲染。

### 标签

#intent/refine #flow/ready #priority/medium #comp/interfaces #comp/ui #scope/ux #ai/instruct #task/domain/ui #task/object/abstraction-pack-i18n #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 扩充中英文双语词典

为形式与抽象扩展包补充完整的视图提示、标签及设置文案。

~~~~~act
write_file
src/packs/abstraction/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "形式与抽象感知",
    "subTitle": "Visual Abstraction & Refinement",
    "desc": "贯通「自底向上提炼」与「自顶向下寻源」双向视知觉闭环，训练对动态势线、极简低模、黑白Notan与色彩基调的穿透与具象推演能力。"
  },
  "settings": {
    "showToleranceBandTitle": "显示滑块容错感应区",
    "showToleranceBandDesc": "在悬停光标两侧实时显示动态容错区间"
  },
  "cards": {
    "abs_gesture_axis": {
      "title": "动态势线提取",
      "desc": "从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。",
      "instruction": "旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)",
      "badge": "动态势线提取",
      "hint": "旋转主轴对齐粒子群动态流向 (0°~180°)",
      "label": "动态势线角度:"
    },
    "abs_polygon_decimation": {
      "title": "折线低模大形",
      "desc": "从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。",
      "instruction": "观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项",
      "badge": "折线低模大形",
      "hint": "选择保留了主要转折大形的精简项",
      "promptTitle": "多边形原图"
    },
    "abs_notan_threshold": {
      "title": "黑白素描归组",
      "desc": "调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。",
      "instruction": "调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态",
      "badge": "黑白素描归组",
      "hint": "观察左侧灰阶原图，在下方滑块点击/调节右侧最佳黑白二值截断点",
      "label": "二值化截断阈值:",
      "rawScene": "灰阶原图 (Raw Scene)",
      "notanOutput": "二值显影 (Notan Output)"
    },
    "abs_palette_clustering": {
      "title": "主调色群提炼",
      "desc": "穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。",
      "instruction": "在下方 4 个候选项中，选出代表画面全局主调的加权主色",
      "badge": "主调色群提炼",
      "hint": "选出最能代表全局主调的加权主色 (键 1-4)"
    },
    "abs_td_gesture_2afc": {
      "title": "动态势线寻源",
      "desc": "给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。",
      "instruction": "观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势",
      "badge": "动态势线寻源",
      "hint": "判别哪一侧具象细节符合上方骨架",
      "promptTitle": "概括基准 (Prompt)"
    },
    "abs_td_hull_2afc": {
      "title": "几何大模寻形",
      "desc": "给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。",
      "instruction": "观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形",
      "badge": "几何大模寻形",
      "hint": "判别哪一侧具象细节符合上方骨架",
      "promptTitle": "概括基准 (Prompt)"
    },
    "abs_td_notan_2afc": {
      "title": "黑白素描骨架",
      "desc": "给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。",
      "instruction": "观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构",
      "badge": "黑白素描骨架",
      "hint": "判别哪一侧具象细节符合上方骨架",
      "promptTitle": "概括基准 (Prompt)"
    },
    "abs_td_palette_2afc": {
      "title": "调性基底归位",
      "desc": "给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。",
      "instruction": "观察上方基准主调色，选出以此为色彩基底的拼贴画面",
      "badge": "调性基底归位",
      "hint": "观察上方基准主色，选出以此为基调的拼贴画面 (键 1-4)",
      "promptTitle": "基准主调色"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/abstraction/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Visual Abstraction & Refinement",
    "subTitle": "Visual Abstraction & Refinement",
    "desc": "Close the loop between Bottom-Up Extraction and Top-Down Concretization. Master gesture axes, convex hulls, Notan structures, and dominant color clustering."
  },
  "settings": {
    "showToleranceBandTitle": "Show Slider Tolerance Band",
    "showToleranceBandDesc": "Display dynamic tolerance interval around the hover cursor"
  },
  "cards": {
    "abs_gesture_axis": {
      "title": "Gesture Axis Extraction",
      "desc": "Extract the primary PCA gesture axis angle from flowing particle fields.",
      "instruction": "Rotate the primary axis to align with the main particle flow (0°~180°).",
      "badge": "Gesture Axis",
      "hint": "Rotate the primary axis to align with the particle flow (0°~180°)",
      "label": "Gesture Axis Angle:"
    },
    "abs_polygon_decimation": {
      "title": "Polygon Hull Decimation",
      "desc": "Filter high-frequency noise from intricate silhouettes to identify the optimal low-poly hull.",
      "instruction": "Select the simplified polygon that best preserves key structural vertices.",
      "badge": "Polygon Hull",
      "hint": "Select the simplified polygon that best preserves key structural vertices",
      "promptTitle": "Detailed Silhouette"
    },
    "abs_notan_threshold": {
      "title": "Notan Value Thresholding",
      "desc": "Modulate the binarization cutoff threshold to extract solid Notan value groupings.",
      "instruction": "Adjust the threshold slider to find the most balanced Notan state.",
      "badge": "Notan Threshold",
      "hint": "Observe the raw scene on the left, then adjust the Notan threshold slider below",
      "label": "Binarization Threshold:",
      "rawScene": "Raw Grayscale Scene",
      "notanOutput": "Notan Output"
    },
    "abs_palette_clustering": {
      "title": "Dominant Color Clustering",
      "desc": "Pierce mosaic noise to identify the area-weighted dominant centroid color (4AFC).",
      "instruction": "Select the dominant color that represents the overall scene palette.",
      "badge": "Color Clustering",
      "hint": "Select the dominant color representing the overall palette (Keys 1-4)"
    },
    "abs_td_gesture_2afc": {
      "title": "Top-Down Gesture Match",
      "desc": "Given an abstract spine, identify which complex particle field follows that dynamic.",
      "instruction": "Identify which particle field conforms to the prompt spine (Keys 1 / 2).",
      "badge": "Top-Down Gesture",
      "hint": "Identify which detailed field conforms to the prompt spine above",
      "promptTitle": "Prompt Spine"
    },
    "abs_td_hull_2afc": {
      "title": "Top-Down Hull Match",
      "desc": "Given a minimalist convex hull, match its detailed organic silhouette.",
      "instruction": "Identify which detailed silhouette conforms to the prompt hull (Keys 1 / 2).",
      "badge": "Top-Down Hull",
      "hint": "Identify which detailed silhouette conforms to the prompt hull above",
      "promptTitle": "Prompt Low-Poly Hull"
    },
    "abs_td_notan_2afc": {
      "title": "Top-Down Notan Match",
      "desc": "Given a binary Notan silhouette, match the grayscale scene with that value foundation.",
      "instruction": "Identify which grayscale scene shares this Notan foundation (Keys 1 / 2).",
      "badge": "Top-Down Notan",
      "hint": "Identify which grayscale scene shares the Notan foundation above",
      "promptTitle": "Prompt Notan Silhouette"
    },
    "abs_td_palette_2afc": {
      "title": "Top-Down Palette Match",
      "desc": "Given a prompt dominant color, match the mosaic pattern sharing that tonality.",
      "instruction": "Select the mosaic pattern with the matching dominant color base (Keys 1-4).",
      "badge": "Top-Down Palette",
      "hint": "Observe the dominant color above and select the matching mosaic pattern (Keys 1-4)",
      "promptTitle": "Prompt Dominant Color"
    }
  }
}
~~~~~

#### Acts 2: 重构 Abstraction Pack 的组件与视图

替换所有硬编码文案为 `useTranslation()` 调用。

~~~~~act
write_file
src/packs/abstraction/components/GestureAxisView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { useTranslation } from '../../../core/i18n';
import { drawParticlesCanvas } from '../canvas/drawParticles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface GestureAxisViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showCanvasHints?: boolean;
}

export function GestureAxisView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: GestureAxisViewProps) {
  const { t } = useTranslation();
  const [activeSliderVal, setActiveSliderVal] = useState<number>(90);

  const targetVal = question.targetAngleDeg ?? 0;
  const userVal = userAnswer?.userValue ?? activeSliderVal;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.abstraction.cards.abs_gesture_axis.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('packs.abstraction.cards.abs_gesture_axis.label')}
      max={180}
      step={0.5}
      initialValue={90}
      unit="°"
      targetValue={targetVal}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userAnswer?.userValue}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onValueChange={(_val, active) => setActiveSliderVal(active)}
      onAnswer={onAnswer}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
            draw={(canvas) => {
              drawParticlesCanvas(
                canvas,
                question.particles,
                ABSTRACTION_CANVAS_SIZE,
                showAnswer ? targetVal : activeSliderVal,
                showAnswer ? '#22C55E' : '#6366F1',
                showAnswer ? userVal : undefined,
                isHit,
              );
            }}
            deps={[question.particles, activeSliderVal, showAnswer, targetVal, userVal, isHit]}
          />
        </div>
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/packs/abstraction/components/NotanThresholdView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { useTranslation } from '../../../core/i18n';
import { drawNotanNoiseField, drawRawGrayscaleNoiseField } from '../canvas/drawNotanField';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface NotanThresholdViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showCanvasHints?: boolean;
}

export function NotanThresholdView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: NotanThresholdViewProps) {
  const { t } = useTranslation();
  const [activeVal, setActiveVal] = useState<number>(50);

  const targetVal = question.idealNotanThreshold ?? 50;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.abstraction.cards.abs_notan_threshold.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      label={t('packs.abstraction.cards.abs_notan_threshold.label')}
      max={100}
      step={0.5}
      initialValue={50}
      unit="%"
      targetValue={targetVal}
      showAnswer={showAnswer}
      isHit={Boolean(userAnswer?.isHit)}
      userValue={userAnswer?.userValue}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onValueChange={(_val, active) => setActiveVal(active)}
      onAnswer={onAnswer}
      preview={
        <DualViewportContainer
          leftTitle={t('packs.abstraction.cards.abs_notan_threshold.rawScene')}
          rightTitle={t('packs.abstraction.cards.abs_notan_threshold.notanOutput')}
          leftContent={
            <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
              <CanvasView
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
                draw={(canvas) => {
                  if (question.notanBuffer) {
                    drawRawGrayscaleNoiseField(
                      canvas,
                      question.notanBuffer,
                      question.notanFieldDim ?? 120,
                      ABSTRACTION_2AFC_SIZE,
                    );
                  }
                }}
                deps={[question.notanBuffer, question.notanFieldDim]}
              />
            </div>
          }
          rightContent={
            <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
              <CanvasView
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
                draw={(canvas) => {
                  if (question.notanBuffer) {
                    drawNotanNoiseField(
                      canvas,
                      question.notanBuffer,
                      question.notanFieldDim ?? 120,
                      showAnswer ? targetVal : activeVal,
                      ABSTRACTION_2AFC_SIZE,
                    );
                  }
                }}
                deps={[
                  question.notanBuffer,
                  question.notanFieldDim,
                  targetVal,
                  activeVal,
                  showAnswer,
                ]}
              />
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
src/packs/abstraction/components/PaletteClusteringView.tsx
~~~~~
~~~~~tsx
import { Sparkles } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import { drawPaletteTilesCanvas } from '../canvas/drawPaletteTiles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface PaletteClusteringViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PaletteClusteringView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PaletteClusteringViewProps) {
  const { t } = useTranslation();

  const nafcOptions = (question.paletteOptions || []).map((hsv, idx) => {
    const hex = hsvToHex(...hsv);
    const isTarget = idx === question.correctPaletteIndex;
    return {
      key: `palette-opt-${idx}-${hex}`,
      value: idx,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-square rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hex }}
        />
      ),
    };
  });

  return (
    <StandardNafcView
      questionId={question.id}
      hintText={t('packs.abstraction.cards.abs_palette_clustering.hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      columns={4}
      options={nafcOptions}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="immediate"
      onAnswer={(idx) => onAnswer(idx)}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
            draw={(canvas) =>
              drawPaletteTilesCanvas(canvas, question.paletteTiles, ABSTRACTION_CANVAS_SIZE)
            }
            deps={[question.paletteTiles]}
          />
        </div>
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/packs/abstraction/components/TopDown2AfcView.tsx
~~~~~
~~~~~tsx
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTranslation } from '../../../core/i18n';
import { drawRawGrayscaleNoiseField } from '../canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../canvas/drawParticles';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface TopDown2AfcViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function TopDown2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDown2AfcViewProps) {
  const { t } = useTranslation();
  const { mode } = question;
  const isPoly = mode === 'POLYGON_DECIMATION';

  const isTargetA = isPoly
    ? question.correctPolyChoice === 'A'
    : userAnswer?.correctChoice === 'A' ||
      question.correctParticleChoice === 'A' ||
      question.correctHullChoice === 'A' ||
      question.correctNotanChoice === 'A';
  const isTargetB = !isTargetA;

  const renderPrompt = () => {
    if (isPoly && question.detailedPolygon) {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_polygon_decimation.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-40 h-40 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.detailedPolygon,
                size: ABSTRACTION_CANVAS_SIZE,
              })
            }
            deps={[question.detailedPolygon]}
          />
        </div>
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_gesture_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawSpinePromptCanvas(canvas, question.promptSpine, ABSTRACTION_THUMB_SIZE)
            }
            deps={[question.promptSpine]}
          />
        </div>
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_hull_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.promptHull,
                size: ABSTRACTION_THUMB_SIZE,
                fillColor: '#4F46E5',
                strokeColor: '#3730A3',
              })
            }
            deps={[question.promptHull]}
          />
        </div>
      );
    }

    if (mode === 'TD_NOTAN_2AFC' && question.promptNotanBuffer) {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_notan_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawRawGrayscaleNoiseField(
                canvas,
                question.promptNotanBuffer,
                question.notanFieldDim ?? 120,
                ABSTRACTION_THUMB_SIZE,
              )
            }
            deps={[question.promptNotanBuffer, question.notanFieldDim]}
          />
        </div>
      );
    }

    return null;
  };

  const renderOptionCanvas = (choice: 'A' | 'B') => {
    if (isPoly && question.simplifiedOptions) {
      const verts = choice === 'A' ? question.simplifiedOptions[0] : question.simplifiedOptions[1];
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
              fillColor: '#4F46E5',
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      const particles = choice === 'A' ? question.particlesA : question.particlesB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) => drawParticlesCanvas(canvas, particles, ABSTRACTION_2AFC_SIZE)}
          deps={[particles]}
        />
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      const verts = choice === 'A' ? question.hullDetailedA : question.hullDetailedB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_NOTAN_2AFC') {
      const buf = choice === 'A' ? question.notanSceneBufferA : question.notanSceneBufferB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) =>
            drawRawGrayscaleNoiseField(
              canvas,
              buf,
              question.notanFieldDim ?? 120,
              ABSTRACTION_2AFC_SIZE,
            )
          }
          deps={[buf, question.notanFieldDim]}
        />
      );
    }

    return null;
  };

  const hint = isPoly
    ? t('packs.abstraction.cards.abs_polygon_decimation.hint')
    : t('packs.abstraction.cards.abs_td_gesture_2afc.hint');

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={hint}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={renderPrompt()}
      optionA={{
        title: `${t('common.areaA')} (${t('common.optionA')})`,
        isCorrect: isTargetA,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            {renderOptionCanvas('A')}
          </div>
        ),
      }}
      optionB={{
        title: `${t('common.areaB')} (${t('common.optionB')})`,
        isCorrect: isTargetB,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            {renderOptionCanvas('B')}
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
write_file
src/packs/abstraction/components/TopDownPatternView.tsx
~~~~~
~~~~~tsx
import { Sparkles } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import { drawPaletteTilesCanvas } from '../canvas/drawPaletteTiles';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface TopDownPatternViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function TopDownPatternView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDownPatternViewProps) {
  const { t } = useTranslation();
  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : '#6366F1';
  const targetIdx = question.correctPatternIndex ?? 0;

  const nafcOptions = (question.palettePatternOptions || []).map((pat, idx) => {
    const isTarget = idx === targetIdx;
    return {
      key: `td-pattern-${question.id}-${idx}`,
      title: t('common.screenN', { num: idx + 1 }),
      value: idx,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-square bg-white p-1 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
          <CanvasView
            width={ABSTRACTION_2AFC_SIZE}
            height={ABSTRACTION_2AFC_SIZE}
            className="w-full aspect-square rounded-lg shadow-sm"
            draw={(canvas) => drawPaletteTilesCanvas(canvas, pat, ABSTRACTION_2AFC_SIZE)}
            deps={[pat]}
          />
        </div>
      ),
    };
  });

  return (
    <StandardNafcView
      questionId={question.id}
      hintText={t('packs.abstraction.cards.abs_td_palette_2afc.hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      columns={4}
      options={nafcOptions}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="immediate"
      onAnswer={(idx) => onAnswer(idx)}
      preview={
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_palette_2afc.promptTitle')}
          </span>
          <div
            className="w-16 h-16 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200"
            style={{ backgroundColor: promptHex }}
          />
        </div>
      }
    />
  );
}
~~~~~

#### Acts 3: 适配 Pack 配置与 Schemas 键值定义

将 Pack 配置中 Setting schemas 的标题与描述改用语言包 key。

~~~~~act
patch_file
src/packs/abstraction/index.ts
~~~~~
~~~~~ts
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];
~~~~~
~~~~~ts
const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.abstraction.settings.showToleranceBandTitle',
    description: 'packs.abstraction.settings.showToleranceBandDesc',
  },
];
~~~~~

### 下一步建议

1. **统一类型检查与构建验证**：运行 `npm run check` 确保所有新增与重构的 preact / i18n 代码均通过 Biome 规范与 TypeScript 类型检查。
2. **端到端多语言切换审查**：在浏览器中切换简体中文与 English，全面测试 7 个 Pack 的卡片题干、滑块、2AFC / N-AFC 交互以及设置弹窗。
