我将为你生成完整的实施计划，在“正负形感知 (`negative_space`)”领域中新增“负形形状一致性判定”模式（`NEGATIVE_SHAPE_MATCH`）。

## [WIP] feat: 添加负形形状一致性判定选择题训练模式

### 用户需求
在正负形空间感知模块中，新增“负形形状一致性判定-选择题”训练模式。通过短时闪现目标负形多边形，随后进行视觉遮蔽，要求用户在 4 个包含高相似度形变干扰项中选出正确的原始负形，以强化视知觉瞬时记忆与负形轮廓表象捕捉能力。

### 评论
该功能的加入有效弥补了现有静态评估模式的不足，引入了视知觉工作记忆（Working Memory）与对抗性形变识别机制。通过随着 Level 提升自适应缩短闪现观察时间、降低顶点扰动幅度（$\Delta\text{px}$），能够显著提升用户对复杂形态轮廓边界的敏锐度。

### 目标
1. **模型与算法扩展 (`negativeSpaceUtils.ts`)**：
   - 扩展 `NegativeSpaceMode`，加入 `NEGATIVE_SHAPE_MATCH`。
   - 扩充 `NegativeSpaceQuestionData` 与 `NegativeSpaceHitResult` 数据结构。
   - 实现对抗性顶点扰动算法 `generatePerturbedPolygon`，生成 3 个高相似度干扰项。
   - 在 `generateNegativeSpaceQuestion` 与 `checkNegativeSpaceHit` 中实现题目生成与校验逻辑。
2. **领域配置与插件适配 (`domains.ts`, `trainingPlugins.tsx`)**：
   - 在 `negative_space` 领域配置中添加新模式卡片。
   - 在 `trainingPlugins` 中适配模式徽章解析、做答判定与日志数据提取。
3. **交互画布扩展 (`NegativeSpaceCanvas.tsx`)**：
   - 实现观察记忆（倒计时进度条与目标图）、遮蔽作答（4 个选项卡片与 `1`~`4` 快捷键）与答案揭晓对比的多阶段交互流程。

### 基本原理
1. **记忆与遮蔽时序**：题目初始化时进入记忆阶段，按难度等级动态计算倒计时展示时长（Level 1 为 2400ms，Level 35 为 800ms）。倒计时结束后切换至作答阶段并模糊/遮蔽目标图，防止利用视网膜残像直接物理比对。
2. **对抗性高相似干扰生成**：干扰项基于原始多边形，随机挑选 1~2 个关键顶点施加受控法向扰动（Level 1 扰动 28px，Level 35 扰动 3.5px），保证干扰项既具备极高相似度又存在可辩差异。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/negative-shape-match #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 扩展算法与题目生成器 (`negativeSpaceUtils.ts`)

在工具模块中新增模式枚举、干扰多边形扰动生成函数及题目生成判定逻辑。

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript
export type NegativeSpaceMode =
  | 'RATIO_ESTIMATION'
  | 'AREA_COMPARISON_2AFC'
  | 'NEGATIVE_VERTEX_FITTING';
~~~~~
~~~~~typescript
export type NegativeSpaceMode =
  | 'RATIO_ESTIMATION'
  | 'AREA_COMPARISON_2AFC'
  | 'NEGATIVE_VERTEX_FITTING'
  | 'NEGATIVE_SHAPE_MATCH';
~~~~~

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript
  // 负形反切定点模式字段
  targetVertexIndex?: number;
  targetPoint?: Point;
  truncatedVertices?: Point[]; // 右侧截断残缺多边形
  distractorPoints?: Point[]; // 围绕 targetPoint 的干扰网格点
  gridDim?: number;
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio?: number;
  targetRatio?: number;
  errorValue: number;
  tolerance: number;

  // 2AFC 结果字段
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  negRatioA?: number;
  negRatioB?: number;

  // 定点模式结果字段
  clickPoint?: Point;
  nearestGridPoint?: Point;
  isWithinRange?: boolean;
}
~~~~~
~~~~~typescript
  // 负形反切定点模式字段
  targetVertexIndex?: number;
  targetPoint?: Point;
  truncatedVertices?: Point[]; // 右侧截断残缺多边形
  distractorPoints?: Point[]; // 围绕 targetPoint 的干扰网格点
  gridDim?: number;

  // 负形形状一致性判定模式字段
  displayDurationMs?: number;
  targetVertices?: Point[];
  optionsVertices?: Point[][];
  correctShapeIndex?: number;
  perturbationPx?: number;
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio?: number;
  targetRatio?: number;
  errorValue: number;
  tolerance: number;

  // 2AFC 结果字段
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  negRatioA?: number;
  negRatioB?: number;

  // 定点模式结果字段
  clickPoint?: Point;
  nearestGridPoint?: Point;
  isWithinRange?: boolean;

  // 形状一致性结果字段
  selectedIndex?: number;
  correctIndex?: number;
}
~~~~~

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript
/**
 * 根据 Level (1..35) 计算 2AFC 负形面积相对差异率 delta
~~~~~
~~~~~typescript
/**
 * 基于基础多边形生成微小几何扰动的干扰多边形 (NEGATIVE_SHAPE_MATCH)
 */
export function generatePerturbedPolygon(
  baseVertices: Point[],
  perturbationPx: number,
  canvasSize = NEGATIVE_SPACE_CANVAS_SIZE,
): Point[] {
  const perturbed = baseVertices.map((p) => ({ ...p }));
  const numToPerturb = Math.random() < 0.6 ? 1 : 2;
  const chosenIndices = new Set<number>();

  while (chosenIndices.size < Math.min(numToPerturb, perturbed.length)) {
    chosenIndices.add(Math.floor(Math.random() * perturbed.length));
  }

  for (const idx of chosenIndices) {
    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle) * perturbationPx;
    const dy = Math.sin(angle) * perturbationPx;
    perturbed[idx] = {
      x: Math.round(Math.max(15, Math.min(canvasSize - 15, perturbed[idx].x + dx))),
      y: Math.round(Math.max(15, Math.min(canvasSize - 15, perturbed[idx].y + dy))),
    };
  }

  return perturbed;
}

/**
 * 根据 Level (1..35) 计算 2AFC 负形面积相对差异率 delta
~~~~~

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript
  if (mode === 'NEGATIVE_VERTEX_FITTING') {
    const canvasArea = FITTING_CANVAS_SIZE * FITTING_CANVAS_SIZE;
~~~~~
~~~~~typescript
  if (mode === 'NEGATIVE_SHAPE_MATCH') {
    const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;
    const targetVertices = generateRandomPolygon(clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE);

    // 扰动像素幅度：Level 1 为 28px，Level 35 为 3.5px
    const t = (clampedLevel - 1) / 34;
    const perturbationPx = Math.max(3.5, Math.round(28 * (3.5 / 28) ** t * 10) / 10);

    // 展示时长：Level 1 为 2400ms，Level 35 为 800ms
    const displayDurationMs = Math.round(2400 - t * 1600);

    // 生成 3 个高相似度干扰多边形
    const distractors: Point[][] = [];
    for (let i = 0; i < 3; i++) {
      distractors.push(
        generatePerturbedPolygon(targetVertices, perturbationPx, NEGATIVE_SPACE_CANVAS_SIZE),
      );
    }

    const correctShapeIndex = Math.floor(Math.random() * 4);
    const optionsVertices: Point[][] = [];
    let dIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === correctShapeIndex) {
        optionsVertices.push(targetVertices);
      } else {
        optionsVertices.push(distractors[dIdx++]);
      }
    }

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      tolerance: perturbationPx,
      targetVertices,
      optionsVertices,
      correctShapeIndex,
      displayDurationMs,
      perturbationPx,
    };
  }

  if (mode === 'NEGATIVE_VERTEX_FITTING') {
    const canvasArea = FITTING_CANVAS_SIZE * FITTING_CANVAS_SIZE;
~~~~~

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript
export function checkNegativeSpaceHit(
  userAnswer: number | 'A' | 'B' | Point,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  if (question.mode === 'NEGATIVE_VERTEX_FITTING') {
~~~~~
~~~~~typescript
export function checkNegativeSpaceHit(
  userAnswer: number | 'A' | 'B' | Point,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  if (question.mode === 'NEGATIVE_SHAPE_MATCH') {
    const selectedIdx = typeof userAnswer === 'number' ? userAnswer : -1;
    const isHit = selectedIdx === question.correctShapeIndex;

    return {
      isHit,
      selectedIndex: selectedIdx,
      correctIndex: question.correctShapeIndex,
      errorValue: isHit ? 0 : (question.perturbationPx ?? 0),
      tolerance: question.tolerance,
    };
  }

  if (question.mode === 'NEGATIVE_VERTEX_FITTING') {
~~~~~

#### Acts 2: 更新看板领域元数据与插件适配 (`domains.ts` & `trainingPlugins.tsx`)

在 `domains.ts` 中为正负形感知增加该卡片，并在插件层中补充对应的 badge 显示与作答日志提取。

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript
import {
  Columns,
  Compass,
  Crosshair,
  Droplet,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sun,
  Target,
} from 'lucide-preact';
~~~~~
~~~~~typescript
import {
  Columns,
  Compass,
  Crosshair,
  Droplet,
  Eye,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sun,
  Target,
} from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript
      {
        id: 'NEGATIVE_VERTEX_FITTING',
        title: '负形边界反切定点',
        desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
        icon: Crosshair,
      },
    ],
  },
};
~~~~~
~~~~~typescript
      {
        id: 'NEGATIVE_VERTEX_FITTING',
        title: '负形边界反切定点',
        desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
        icon: Crosshair,
      },
      {
        id: 'NEGATIVE_SHAPE_MATCH',
        title: '负形形状一致性判定',
        desc: '闪现记忆不规则负形留白边界，在遮蔽后从 4 个高相似度干扰项中找出原始负形。',
        icon: Eye,
      },
    ],
  },
};
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : '负形占比估算',
~~~~~
~~~~~typescript
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'NEGATIVE_SHAPE_MATCH'
          ? '负形形状一致性'
          : '负形占比估算',
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
~~~~~
~~~~~typescript
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_SHAPE_MATCH') {
      return {
        mode: 'NEGATIVE_SHAPE_MATCH',
        userChoice: userVal,
        correctChoice: q.correctShapeIndex,
        perturbationPx: q.perturbationPx,
        displayDurationMs: q.displayDurationMs,
      };
    }
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
~~~~~

#### Acts 3: 扩展负形交互画布 (`NegativeSpaceCanvas.tsx`)

实现记忆阶段（目标展示 + 倒计时进度条）、遮蔽作答阶段（四选项卡片网格 + 快捷键 `1`~`4`）以及答案揭晓阶段的视觉反馈。

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
import { Check, Columns, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Columns, Eye, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
  const is2AFC = question.mode === 'AREA_COMPARISON_2AFC';
  const isFitting = question.mode === 'NEGATIVE_VERTEX_FITTING';

  // === 1. 单图滑块模式状态 ===
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentVal, setCurrentVal] = useState<number>(50.0);
~~~~~
~~~~~typescript
export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
  const is2AFC = question.mode === 'AREA_COMPARISON_2AFC';
  const isFitting = question.mode === 'NEGATIVE_VERTEX_FITTING';
  const isMatch = question.mode === 'NEGATIVE_SHAPE_MATCH';

  // === 0. 形状一致性模式专属状态 ===
  const [isMemorizing, setIsMemorizing] = useState<boolean>(true);
  const [memorizeProgress, setMemorizeProgress] = useState<number>(100);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const matchTargetRef = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // === 1. 单图滑块模式状态 ===
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentVal, setCurrentVal] = useState<number>(50.0);
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
      setFittingHoverPoint(null);
    }
  }, [question.id, setHoverVal]);
~~~~~
~~~~~typescript
  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
      setFittingHoverPoint(null);
      setSelectedOption(null);

      if (isMatch && question.displayDurationMs) {
        setIsMemorizing(true);
        setMemorizeProgress(100);

        const duration = question.displayDurationMs;
        const intervalTime = 20;
        const startTime = Date.now();

        const timer = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
          setMemorizeProgress(remaining);

          if (elapsed >= duration) {
            clearInterval(timer);
            setIsMemorizing(false);
          }
        }, intervalTime);

        return () => clearInterval(timer);
      }
    }
  }, [question.id, isMatch, question.displayDurationMs, setHoverVal]);

  // 渲染形状一致性画布群
  useEffect(() => {
    if (!isMatch) return;

    if (question.targetVertices) {
      drawPolygonCanvas(matchTargetRef.current, question.targetVertices, 240);
    }

    if (question.optionsVertices) {
      for (let i = 0; i < question.optionsVertices.length; i++) {
        const optionCanvas = matchOptionRefs.current[i];
        if (optionCanvas) {
          drawPolygonCanvas(optionCanvas, question.optionsVertices[i], 180);
        }
      }
    }
  }, [isMatch, question.targetVertices, question.optionsVertices]);
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;

      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else if (!isFitting) {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, isFitting, disabled, showAnswer, currentVal, onAnswer, handleSelectChoice]);
~~~~~
~~~~~typescript
  const handleSelectOption = useCallback(
    (idx: number) => {
      if (disabled || showAnswer || isMemorizing) return;
      setSelectedOption(idx);
      onAnswer(idx);
    },
    [disabled, showAnswer, isMemorizing, onAnswer],
  );

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;

      if (isMatch) {
        if (isMemorizing) return;
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const idx = Number.parseInt(e.key, 10) - 1;
          handleSelectOption(idx);
        } else if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
          const num = Number.parseInt(e.code.replace(/\D/g, ''), 10);
          if (num >= 1 && num <= 4) {
            e.preventDefault();
            handleSelectOption(num - 1);
          }
        }
        return;
      }

      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else if (!isFitting) {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMatch,
    isMemorizing,
    is2AFC,
    isFitting,
    disabled,
    showAnswer,
    currentVal,
    onAnswer,
    handleSelectChoice,
    handleSelectOption,
  ]);
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
  // =========================================================================
  // 模式 C：NEGATIVE_VERTEX_FITTING 负形反向还原顶点视图
  // =========================================================================
~~~~~
~~~~~typescript
  // =========================================================================
  // 模式 D：NEGATIVE_SHAPE_MATCH 负形形状一致性记忆与判定视图
  // =========================================================================
  if (isMatch) {
    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            {isMemorizing ? '观察并记忆上方的负形留白轮廓' : '凭记忆选择与刚刚一致的负形形状'}
          </div>
          <p className="text-xs text-slate-400">
            {isMemorizing
              ? '倒计时结束后图形将被遮挡，请迅速捕捉留白凹凸特征'
              : '按键盘快捷键 1 ~ 4 或点击卡片提交选择'}
          </p>
        </div>

        {/* 目标参考图 & 遮蔽倒计时 */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            目标负形轮廓
          </span>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner relative overflow-hidden flex items-center justify-center">
            <canvas
              ref={matchTargetRef}
              width={240}
              height={240}
              className={`w-[200px] h-[200px] rounded-xl transition-all duration-200 ${
                !isMemorizing && !showAnswer ? 'blur-md grayscale opacity-10' : ''
              }`}
            />
            {!isMemorizing && !showAnswer && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 font-bold text-slate-500 text-xs bg-slate-100/80 backdrop-blur-sm">
                <Eye className="w-5 h-5 text-slate-400" />
                <span>目标已遮蔽 (回忆作答中)</span>
              </div>
            )}
          </div>

          {/* 倒计时进度条 */}
          {isMemorizing && (
            <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-75"
                style={{ width: `${memorizeProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* 4 选 1 卡片网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-1">
          {question.optionsVertices?.map((_, idx) => {
            const isCorrect = idx === question.correctShapeIndex;
            const isSelected = selectedOption === idx;

            let cardStyle =
              'border-slate-200 hover:border-indigo-300 hover:shadow-md bg-slate-50 hover:bg-indigo-50/20';

            if (showAnswer) {
              if (isCorrect) {
                cardStyle = 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-md';
              } else if (isSelected) {
                cardStyle = 'border-rose-400 bg-rose-50/50 shadow-sm';
              } else {
                cardStyle = 'border-slate-200 bg-slate-50/60 opacity-50';
              }
            } else if (isSelected) {
              cardStyle = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isMemorizing || disabled || showAnswer}
                onClick={() => handleSelectOption(idx)}
                className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${cardStyle} ${
                  isMemorizing
                    ? 'opacity-40 cursor-not-allowed'
                    : 'active:scale-95 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between w-full px-1">
                  <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                    {idx + 1}
                  </span>
                  {showAnswer && isCorrect && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <Check className="w-3.5 h-3.5" /> 正确
                    </span>
                  )}
                  {showAnswer && isSelected && !isCorrect && (
                    <span className="text-[11px] font-bold text-rose-600 flex items-center gap-0.5">
                      <X className="w-3.5 h-3.5" /> 误选
                    </span>
                  )}
                </div>

                <div className="w-full bg-white p-1.5 rounded-xl border border-slate-200 shadow-inner flex justify-center">
                  <canvas
                    ref={(el) => {
                      matchOptionRefs.current[idx] = el;
                    }}
                    width={180}
                    height={180}
                    className="w-full aspect-square rounded-lg shadow-sm"
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* 答案揭晓诊断条 */}
        {showAnswer && (
          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-xl ${
                  userAnswer?.isHit
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  {userAnswer?.isHit ? '准确锁定原始负形形态！' : '受干扰项顶点形变诱导'}
                </span>
                <span className="text-slate-400 ml-2">
                  (干扰项形变幅度: <strong className="font-mono text-slate-700">{question.perturbationPx}px</strong>)
                </span>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-slate-600">
              正确选项: 选项 {(question.correctShapeIndex ?? 0) + 1}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 模式 C：NEGATIVE_VERTEX_FITTING 负形反向还原顶点视图
  // =========================================================================
~~~~~

### 下一步建议
1. 运行测试或构建脚本（例如 `npm run build` 或 `npm run test`）以验证类型系统及打包完整性。
2. 可以在实际训练中试玩几题，根据主观手感微调展示时长（$T_{\text{display}}$）与形变幅度（$\Delta\text{px}$）的难度衰减斜率。
