我已完成相关逻辑设计与影响范围分析。

我们将：
1. 将目录 `src/cards/abs_td_palette_2afc` 规范重命名为 `src/cards/abs_td_palette_4afc`，同步更新组件名、词典作用域与卡片清单标识为 `abs_td_palette_4afc`，并全局更新所有项目内引用；
2. 为“主调色群提炼”(`abs_palette_clustering`) 与“调性基底归位”(`abs_td_palette_4afc`) 的色块扰动引入归一化难度参数 $t \in [0, 1]$，使低难度时随机散差极大压缩，随着层阶提升才逐步放大混色干扰。

## [WIP] refactor: 微调色块聚类生成抖动并更正调性归位卡片 ID 为 4afc

### 用户需求
1. **色块抖动难度自适应**：“主调色群提炼”和“调性基底归位”在低难度时，马赛克随机色块需要被压缩在更窄、更纯粹、更容易辨识的色彩区间中；高难度下才逐步增强随机混色干扰。
2. **修正卡片标识**：“调性基底归位”实际为 4 选 1（4AFC）形态，需将原卡片 ID `abs_td_palette_2afc` 更正为 `abs_td_palette_4afc`，允许历史测试数据作废。

### 评论
当前两张卡片中每个小瓦片的色相/饱和度/明度抖动跨度是固定的常量数值，使得低难度下的图面色块噪点与高难度同样分散，违反了认知负荷循序渐进的自适应训练原则。将其改为与难度等级线性挂钩的插值模型能显著改善初学阶段的辨识体验。同时纠正 4AFC 卡片命名可保证系统认知本体契约的准确性。

### 目标
1. 迁移目录与文件命名：将 `src/cards/abs_td_palette_2afc/` 改为 `src/cards/abs_td_palette_4afc/`，更新视图组件为 `AbsTdPalette4afcView`，并将卡片 ID 统一更改为 `abs_td_palette_4afc`。
2. 全局批量同步项目中所有对 `abs_td_palette_2afc` 和 `AbsTdPalette2afc` 的引用。
3. 改造 `abs_palette_clustering/utils/generator.ts`：以当前难度层阶为权重控制 4x4 色块的 H/S/V 抖动范围（Level 1 为 $\pm 4^\circ / \pm 3\%$，随等级逐步扩大至 Level 35 的 $\pm 24^\circ / \pm 18\%$）。
4. 改造 `abs_td_palette_4afc/utils/generator.ts`：以当前难度层阶为权重控制 3x3 色块的 H/S/V 抖动范围（Level 1 为 $\pm 3^\circ / \pm 2\%$，随等级逐步扩大至 Level 35 的 $\pm 22^\circ / \pm 16\%$）。

### 基本原理
- **认知难度自适应梯度**：计算归一化进度 $t = (\text{clampedLevel} - 1) / 34$。通过线性映射控制扰动上限（$J_{\text{range}} = J_{\min} + t \cdot (J_{\max} - J_{\min})$）。低层阶呈现同类色微质感拼贴，直观揭示基准色调；高层阶产生错综复杂的色点冲撞，逼迫用户调用面积加权空间概括能力。
- **无破坏性 ID 重构**：使用重命名与全局扫描替换，确保新注册的卡片 ID 与卡片目录完全对齐，并保持 SDK 和 UI 层的类型稳定。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/color #task/object/palette-clustering-and-4afc #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重命名调性基底归位卡片目录与视图文件，并全局替换引用

执行目录重命名，将旧的 2afc 路径和代码标识批量替换为 4afc。

~~~~~act
run_command
~~~~~
~~~~~
if [ -d "src/cards/abs_td_palette_2afc" ]; then
  mv src/cards/abs_td_palette_2afc src/cards/abs_td_palette_4afc
fi
if [ -f "src/cards/abs_td_palette_4afc/AbsTdPalette2afcView.tsx" ]; then
  mv src/cards/abs_td_palette_4afc/AbsTdPalette2afcView.tsx src/cards/abs_td_palette_4afc/AbsTdPalette4afcView.tsx
fi
find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) -exec sed -i 's/abs_td_palette_2afc/abs_td_palette_4afc/g' {} +
find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) -exec sed -i 's/AbsTdPalette2afc/AbsTdPalette4afc/g' {} +
find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) -exec sed -i 's/absTdPalette2afc/absTdPalette4afc/g' {} +
~~~~~

#### Acts 2: 改造主调色群提炼卡片的马赛克抖动生成算法

重构 `src/cards/abs_palette_clustering/utils/generator.ts`，让瓦片颜色扰动与难度等级联动。

~~~~~act
write_file
src/cards/abs_palette_clustering/utils/generator.ts
~~~~~
~~~~~typescript
import {
  CANVAS_THEME,
  createShuffledChoices,
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  hexToRgba,
  hsvToHex,
  hsvToOkLab,
  setup2DCanvas,
} from '@formsight/card-sdk';
import type { HitResult, PaletteTile, QuestionData } from '../types';

export const CANVAS_SIZE = 400;

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = CANVAS_SIZE,
) {
  if (!tiles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = hexToRgba(CANVAS_THEME.bg.primary, 0.4);
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_pc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34; // 0..1 归一化难度

  const baseH = Math.floor(Math.random() * 360);
  const baseS = Math.floor(Math.random() * 40) + 40;
  const baseV = Math.floor(Math.random() * 40) + 40;

  const dominantColorHsv: [number, number, number] = [baseH, baseS, baseV];
  const paletteTiles: PaletteTile[] = [];
  const gridSize = 4;
  const tileSize = CANVAS_SIZE / gridSize;

  // 动态计算色相、饱和度、明度的随机抖动幅度：低难度收敛于同类色，高难度大幅发散
  const hJitterMax = Math.round(4 + t * 20); // Level 1: ±4°, Level 35: ±24°
  const sJitterMax = Math.round(3 + t * 15); // Level 1: ±3%, Level 35: ±18%
  const vJitterMax = Math.round(3 + t * 15); // Level 1: ±3%, Level 35: ±18%

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const jitterH =
        (baseH + (Math.floor(Math.random() * (hJitterMax * 2 + 1)) - hJitterMax) + 360) % 360;
      const jitterS = Math.max(
        10,
        Math.min(100, baseS + (Math.floor(Math.random() * (sJitterMax * 2 + 1)) - sJitterMax)),
      );
      const jitterV = Math.max(
        15,
        Math.min(100, baseV + (Math.floor(Math.random() * (vJitterMax * 2 + 1)) - vJitterMax)),
      );
      paletteTiles.push({
        x: c * tileSize,
        y: r * tileSize,
        w: tileSize,
        h: tileSize,
        hsv: [jitterH, jitterS, jitterV],
        weight: 1,
      });
    }
  }

  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
  const labDom = hsvToOkLab(...dominantColorHsv);
  const distractors = generateTetrahedralDistractors(labDom, distractorDeltaE);
  const { options: paletteOptions, correctIndex: correctPaletteIndex } = createShuffledChoices(
    dominantColorHsv,
    distractors,
  );

  return {
    id,
    difficultyLevel: clampedLevel,
    paletteTiles,
    dominantColorHsv,
    paletteOptions,
    correctPaletteIndex,
    tolerance: distractorDeltaE,
  };
}

export function checkHit(userChoiceIndex: number, question: QuestionData): HitResult {
  const isHit = userChoiceIndex === question.correctPaletteIndex;
  return {
    isHit,
    userChoiceIndex,
    correctIndex: question.correctPaletteIndex,
    errorValue: isHit ? 0 : 1,
    tolerance: question.tolerance,
  };
}
~~~~~

#### Acts 3: 改造调性基底归位卡片的 3x3 随机色块与生成算法

重构 `src/cards/abs_td_palette_4afc/utils/generator.ts`，将 3x3 图案的扰动幅度与难度挂钩，并同步更新 Question ID 前缀。

~~~~~act
write_file
src/cards/abs_td_palette_4afc/utils/generator.ts
~~~~~
~~~~~typescript
import {
  CANVAS_THEME,
  createShuffledChoices,
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  hexToRgba,
  hsvToHex,
  hsvToOkLab,
  setup2DCanvas,
} from '@formsight/card-sdk';
import type { HitResult, PaletteTile, QuestionData } from '../types';

export const OPTION_SIZE = 260;

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = OPTION_SIZE,
) {
  if (!tiles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = hexToRgba(CANVAS_THEME.bg.primary, 0.4);
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_tdp4_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34; // 0..1 归一化难度

  const baseH = Math.floor(Math.random() * 360);
  const baseS = Math.floor(Math.random() * 40) + 40;
  const baseV = Math.floor(Math.random() * 40) + 40;
  const promptDominantColor: [number, number, number] = [baseH, baseS, baseV];

  // 3x3 色块在低难度压缩在极窄区间，高难度放大扰动
  const hJitterMax = Math.round(3 + t * 19); // Level 1: ±3°, Level 35: ±22°
  const sJitterMax = Math.round(2 + t * 14); // Level 1: ±2%, Level 35: ±16%
  const vJitterMax = Math.round(2 + t * 14); // Level 1: ±2%, Level 35: ±16%

  const makePatternTiles = (domH: number, domS: number, domV: number) => {
    const tiles: PaletteTile[] = [];
    const gridSize = 3;
    const tileDim = OPTION_SIZE / gridSize;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const jitterH =
          (domH + (Math.floor(Math.random() * (hJitterMax * 2 + 1)) - hJitterMax) + 360) % 360;
        const jitterS = Math.max(
          10,
          Math.min(100, domS + (Math.floor(Math.random() * (sJitterMax * 2 + 1)) - sJitterMax)),
        );
        const jitterV = Math.max(
          15,
          Math.min(100, domV + (Math.floor(Math.random() * (vJitterMax * 2 + 1)) - vJitterMax)),
        );
        tiles.push({
          x: c * tileDim,
          y: r * tileDim,
          w: tileDim,
          h: tileDim,
          hsv: [jitterH, jitterS, jitterV],
          weight: 1,
        });
      }
    }
    return tiles;
  };

  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
  const labDom = hsvToOkLab(...promptDominantColor);
  const distractorsDom = generateTetrahedralDistractors(labDom, distractorDeltaE);

  const { options: palettePatternOptions, correctIndex: correctPatternIndex } =
    createShuffledChoices(makePatternTiles(baseH, baseS, baseV), [
      makePatternTiles(...distractorsDom[0]),
      makePatternTiles(...distractorsDom[1]),
      makePatternTiles(...distractorsDom[2]),
    ]);

  return {
    id,
    difficultyLevel: clampedLevel,
    promptDominantColor,
    palettePatternOptions,
    correctPatternIndex,
    tolerance: 0,
  };
}

export function checkHit(userChoiceIndex: number, question: QuestionData): HitResult {
  const isHit = userChoiceIndex === question.correctPatternIndex;
  return {
    isHit,
    userChoiceIndex,
    correctIndex: question.correctPatternIndex,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
~~~~~

#### Acts 4: 更新调性基底归位的视图组件与清单契约文件

写入 `src/cards/abs_td_palette_4afc/AbsTdPalette4afcView.tsx` 与 `src/cards/abs_td_palette_4afc/index.tsx`。

~~~~~act
write_file
src/cards/abs_td_palette_4afc/AbsTdPalette4afcView.tsx
~~~~~
~~~~~typescript
import { Check, Sparkles } from 'lucide-preact';
import { useState } from 'preact/hooks';

import {
  Badge,
  CANVAS_THEME,
  CanvasView,
  ChoiceCard,
  ColorSwatch,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { OPTION_SIZE, drawPaletteTilesCanvas } from './utils/generator';

export interface AbsTdPalette4afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdPalette4afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdPalette4afcViewProps) {
  const { t } = useCardTranslation('abs_td_palette_4afc');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
    if (disabled || showAnswer) return;
    setSelectedIndex(idx);
    onAnswer(idx);
  };

  useChoiceShortcuts({
    optionsCount: (question.palettePatternOptions || []).length,
    disabled: disabled || showAnswer,
    onSelect: handleSelect,
  });

  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : CANVAS_THEME.status.accentHover;
  const targetIdx = question.correctPatternIndex ?? 0;
  const effectiveIndex =
    selectedIndex ?? (userAnswer?.isHit !== undefined ? userAnswer.userChoiceIndex : null);

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {/* 题干上方基准主调色块 */}
      <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <ColorSwatch color={promptHex} size="sm" />
      </div>

      {/* 4AFC 候选图案网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {(question.palettePatternOptions || []).map((pat, idx) => {
          const isTarget = idx === targetIdx;
          const isSelected = effectiveIndex === idx;
          const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

          return (
            <ChoiceCard
              key={`td-pattern-${question.id}-${idx}`}
              state={state}
              size="sm"
              disabled={disabled || showAnswer}
              onClick={() => handleSelect(idx)}
            >
              <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
                <Badge
                  variant="secondary"
                  size="sm"
                  className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
                >
                  {idx + 1}
                </Badge>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
                )}
              </div>

              <div className="w-full aspect-square bg-white p-1 rounded-xl border border-border shadow-inner flex items-center justify-center">
                <CanvasView
                  width={OPTION_SIZE}
                  height={OPTION_SIZE}
                  className="w-full aspect-square rounded-lg shadow-sm"
                  draw={(canvas) => drawPaletteTilesCanvas(canvas, pat, OPTION_SIZE)}
                  deps={[pat]}
                />
              </div>
            </ChoiceCard>
          );
        })}
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_palette_4afc/index.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';

import type { BaseModuleSettings, CardManifest } from '@formsight/card-sdk';
import { AbsTdPalette4afcView } from './AbsTdPalette4afcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absTdPalette4afcCard: CardManifest<
  QuestionData,
  HitResult,
  number,
  BaseModuleSettings
> = {
  id: 'abs_td_palette_4afc',
  domain: 'color_and_value',
  tags: {
    domain: ['color_and_value'],
    path: ['concretization'],
    interaction: ['multi_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  engine: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userAnswer: userVal,
      correctIndex: q.correctPatternIndex,
      errorValue: hitResult.errorValue,
    }),
  },
  ui: {
    icon: Sparkles,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdPalette4afcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default absTdPalette4afcCard;
~~~~~

---

### 下一步建议
1. **启动本地开发环境体验**：运行开发服务器，进入这两种卡片的自适应练习（Adaptive Training），在 Level 1 和 Level 35 之间切换对比色块离散度的平滑过渡效果。
2. **提交 Git 变更**：在人工确认功能与视觉效果符合预期后，我可以为你生成专用的 `[COMMIT]` 提交计划。
