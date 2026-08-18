在 FormSight 中为“正负形感知”模块新增**负形面积二分判别 (2AFC - Two-Alternative Forced Choice)** 模式。通过生成形状各异、但留白面积严格控制在微妙差异率 $\delta$ ($35\% \to 2\%$) 内的多边形负形，支持按键 `1`/`2` 或鼠标点击快速裁决，训练对不规则留白负形面积的敏锐直觉。

## [WIP] feat(negative-space): 实现负形面积二分判别 (2AFC) 训练模式

### 用户需求
在正负形空间感知模块中，实现方案 2 中的“负形面积二分判别（2AFC）”模式。提供左右两块形状迥异但负形留白面积极度接近的不规则图形，用户通过按键 `1`（选择 A 面积更大）或 `2`（选择 B 面积更大）或点击卡片快速判别。难度从 Level 1（相差 35%）指数逼近至 Level 35（相差仅 2%）。

### 评论
2AFC（二选一强制选择法）是心理物理学实验（Psychophysics）中测试人类感知阈限（JND - Just Noticeable Difference）的经典范式。相比滑块调节，2AFC 能更真实地刺激视皮层对空间面积的直觉估算能力，节奏更快、心流更强，是正负形模块极佳的互补维度。

### 目标
1. 在 `negativeSpaceUtils.ts` 中实现多边形质心几何缩放与微小面积差异生成算法，支持 2AFC 题目生成与判定。
2. 在 `domains.ts` 与 `trainingPlugins.tsx` 中注册 `AREA_COMPARISON_2AFC` 模式元数据及插件判定逻辑。
3. 升级 `NegativeSpaceCanvas.tsx`，支持在 2AFC 模式下渲染双画框布局、按键 `1`/`2` 快捷选择与答案揭晓视觉反馈。

### 基本原理
1. **多边形精确面积缩放**：生成两个随机凹凸多边形后，使用鞋带公式求出当前正形面积，再基于各自多边形质心进行齐次坐标缩放：缩放比例 $k = \sqrt{\frac{TargetPosArea}{CurrentPosArea}}$，从而将白色留白（负形）面积严格精准锁定至目标值。
2. **感知难度衰减公式**：差异率 $\delta = \delta_{max} \cdot \left(\frac{\delta_{min}}{\delta_{max}}\right)^{\frac{Level-1}{34}}$，其中 $\delta_{max}=0.35, \delta_{min}=0.02$。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/interfaces #concept/executor #scope/core #scope/ux #ai/instruct #task/domain/ui #task/object/negative-space-2afc #task/action/build #task/state/begin

---

### Script

#### Acts 1: 扩展负形空间几何工具库 `negativeSpaceUtils.ts`

实现多边形精确面积缩放、2AFC 题目生成算法及答题命中检测逻辑。

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
export type NegativeSpaceMode = 'RATIO_ESTIMATION';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;

export interface NegativeSpaceQuestionData {
  id: string;
  mode: NegativeSpaceMode;
  difficultyLevel: number;
  vertices: Point[]; // 正形多边形顶点序列
  canvasArea: number; // 画布总面积 (400 * 400 = 160000)
  positiveArea: number; // 正形多边形面积
  negativeArea: number; // 负形面积
  targetNegativeRatio: number; // 负形占总面积百分比 (0~100)
  tolerance: number; // 允许的绝对百分比误差 (例如 ±5.0%)
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio: number;
  targetRatio: number;
  errorValue: number; // |userRatio - targetRatio|
  tolerance: number;
}
~~~~~
~~~~~typescript.new
export type NegativeSpaceMode = 'RATIO_ESTIMATION' | 'AREA_COMPARISON_2AFC';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;
export const TWO_AFC_CANVAS_SIZE = 280;

export interface NegativeSpaceQuestionData {
  id: string;
  mode: NegativeSpaceMode;
  difficultyLevel: number;
  // 单图滑块估算模式字段
  vertices?: Point[];
  canvasArea: number;
  positiveArea?: number;
  negativeArea?: number;
  targetNegativeRatio?: number;
  tolerance: number;

  // 2AFC 二分判别模式字段
  verticesA?: Point[];
  verticesB?: Point[];
  negAreaA?: number;
  negAreaB?: number;
  negRatioA?: number;
  negRatioB?: number;
  largerSide?: 'A' | 'B';
  areaDeltaPercent?: number; // 相对面积差异百分比 (例如 12.5%)
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
}
~~~~~

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 生成负形空间练习题目
 */
export function generateNegativeSpaceQuestion(
  mode: NegativeSpaceMode,
  level: number,
): NegativeSpaceQuestionData {
  const id = `nsq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getNegativeSpaceToleranceForLevel(clampedLevel);
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;

  let vertices = generateRandomPolygon(clampedLevel);
  let posArea = calcPolygonArea(vertices);

  // 保证正形占据一定比例 (20% ~ 80%)，避免极端不可辨识情况
  let attempts = 0;
  while ((posArea / canvasArea < 0.15 || posArea / canvasArea > 0.8) && attempts < 10) {
    attempts++;
    vertices = generateRandomPolygon(clampedLevel);
    posArea = calcPolygonArea(vertices);
  }

  const negArea = canvasArea - posArea;
  const targetNegativeRatio = Math.round((negArea / canvasArea) * 1000) / 10; // 保留一位小数

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    vertices,
    canvasArea,
    positiveArea: Math.round(posArea),
    negativeArea: Math.round(negArea),
    targetNegativeRatio,
    tolerance,
  };
}

/**
 * 答题结果检测与评估
 */
export function checkNegativeSpaceHit(
  userRatio: number,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  const targetRatio = question.targetNegativeRatio;
  const errorValue = Math.round(Math.abs(userRatio - targetRatio) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userRatio,
    targetRatio,
    errorValue,
    tolerance: question.tolerance,
  };
}
~~~~~
~~~~~typescript.new
/**
 * 根据 Level (1..35) 计算 2AFC 负形面积相对差异率 delta
 * Level 1: delta = 0.35 (35%), Level 35: delta = 0.02 (2%)
 */
export function get2AfcdeltaForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34; // 0..1
  const maxDelta = 0.35;
  const minDelta = 0.02;
  return maxDelta * (minDelta / maxDelta) ** t;
}

/**
 * 计算多边形质心
 */
export function calcPolygonCentroid(vertices: Point[]): Point {
  let cx = 0;
  let cy = 0;
  for (const p of vertices) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / vertices.length, y: cy / vertices.length };
}

/**
 * 将任意多边形围绕质心缩放，使其面积精准等于 targetArea
 */
export function scalePolygonToArea(
  vertices: Point[],
  targetArea: number,
  canvasSize = TWO_AFC_CANVAS_SIZE,
): Point[] {
  const currentArea = calcPolygonArea(vertices);
  if (currentArea <= 0) return vertices;

  const k = Math.sqrt(targetArea / currentArea);
  const centroid = calcPolygonCentroid(vertices);
  const canvasCenter = canvasSize / 2;

  return vertices.map((p) => {
    // 质心缩放
    const scaledX = centroid.x + (p.x - centroid.x) * k;
    const scaledY = centroid.y + (p.y - centroid.y) * k;
    // 平移回画布中央
    const centeredX = scaledX - centroid.x + canvasCenter;
    const centeredY = scaledY - centroid.y + canvasCenter;
    return {
      x: Math.round(Math.max(6, Math.min(canvasSize - 6, centeredX))),
      y: Math.round(Math.max(6, Math.min(canvasSize - 6, centeredY))),
    };
  });
}

/**
 * 生成负形空间练习题目 (支持 RATIO_ESTIMATION 与 AREA_COMPARISON_2AFC)
 */
export function generateNegativeSpaceQuestion(
  mode: NegativeSpaceMode,
  level: number,
): NegativeSpaceQuestionData {
  const id = `nsq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  if (mode === 'AREA_COMPARISON_2AFC') {
    const canvasArea = TWO_AFC_CANVAS_SIZE * TWO_AFC_CANVAS_SIZE;
    const delta = get2AfcdeltaForLevel(clampedLevel);

    // 随机决定哪一侧负形面积更大
    const largerSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';

    // 基准负形留白占比：设定在 45% ~ 75% 之间
    const baseNegRatio = 0.45 + Math.random() * 0.3;
    const halfDelta = delta / 2;

    const negRatioA = largerSide === 'A' ? baseNegRatio * (1 + halfDelta) : baseNegRatio * (1 - halfDelta);
    const negRatioB = largerSide === 'B' ? baseNegRatio * (1 + halfDelta) : baseNegRatio * (1 - halfDelta);

    const clampedRatioA = Math.max(0.2, Math.min(0.88, negRatioA));
    const clampedRatioB = Math.max(0.2, Math.min(0.88, negRatioB));

    const negAreaA = Math.round(canvasArea * clampedRatioA);
    const negAreaB = Math.round(canvasArea * clampedRatioB);

    const posAreaA = canvasArea - negAreaA;
    const posAreaB = canvasArea - negAreaB;

    // 分别为 A、B 生成形态各异的基础多边形并精准缩放至正形目标面积
    const rawPolyA = generateRandomPolygon(clampedLevel);
    const rawPolyB = generateRandomPolygon(clampedLevel);

    const verticesA = scalePolygonToArea(rawPolyA, posAreaA, TWO_AFC_CANVAS_SIZE);
    const verticesB = scalePolygonToArea(rawPolyB, posAreaB, TWO_AFC_CANVAS_SIZE);

    // 重新校准实际缩放后多边形的真实负形面积
    const actualPosA = calcPolygonArea(verticesA);
    const actualPosB = calcPolygonArea(verticesB);
    const actualNegA = canvasArea - actualPosA;
    const actualNegB = canvasArea - actualPosB;

    const finalRatioA = Math.round((actualNegA / canvasArea) * 1000) / 10;
    const finalRatioB = Math.round((actualNegB / canvasArea) * 1000) / 10;
    const finalLarger: 'A' | 'B' = actualNegA >= actualNegB ? 'A' : 'B';
    const actualDeltaPercent = Math.round((Math.abs(actualNegA - actualNegB) / ((actualNegA + actualNegB) / 2)) * 1000) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      verticesA,
      verticesB,
      negAreaA: Math.round(actualNegA),
      negAreaB: Math.round(actualNegB),
      negRatioA: finalRatioA,
      negRatioB: finalRatioB,
      largerSide: finalLarger,
      areaDeltaPercent: actualDeltaPercent,
      tolerance: delta,
    };
  }

  // 默认 RATIO_ESTIMATION 滑块评估模式
  const tolerance = getNegativeSpaceToleranceForLevel(clampedLevel);
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;

  let vertices = generateRandomPolygon(clampedLevel);
  let posArea = calcPolygonArea(vertices);

  let attempts = 0;
  while ((posArea / canvasArea < 0.15 || posArea / canvasArea > 0.8) && attempts < 10) {
    attempts++;
    vertices = generateRandomPolygon(clampedLevel);
    posArea = calcPolygonArea(vertices);
  }

  const negArea = canvasArea - posArea;
  const targetNegativeRatio = Math.round((negArea / canvasArea) * 1000) / 10;

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    vertices,
    canvasArea,
    positiveArea: Math.round(posArea),
    negativeArea: Math.round(negArea),
    targetNegativeRatio,
    tolerance,
  };
}

/**
 * 答题结果检测与评估
 */
export function checkNegativeSpaceHit(
  userAnswer: number | 'A' | 'B',
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  if (question.mode === 'AREA_COMPARISON_2AFC') {
    const userChoice = userAnswer as 'A' | 'B';
    const isHit = userChoice === question.largerSide;

    return {
      isHit,
      userChoice,
      correctChoice: question.largerSide,
      negRatioA: question.negRatioA,
      negRatioB: question.negRatioB,
      errorValue: isHit ? 0 : (question.areaDeltaPercent ?? 0),
      tolerance: question.tolerance,
    };
  }

  const userRatio = typeof userAnswer === 'number' ? userAnswer : 50;
  const targetRatio = question.targetNegativeRatio ?? 50;
  const errorValue = Math.round(Math.abs(userRatio - targetRatio) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userRatio,
    targetRatio,
    errorValue,
    tolerance: question.tolerance,
  };
}
~~~~~

#### Acts 2: 更新模块配置 `domains.ts` 与训练插件 `trainingPlugins.tsx`

在正负形空间感知中注册 `AREA_COMPARISON_2AFC` 模式，并接入联合答题数据类型与记录导出。

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
import {
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
~~~~~typescript.new
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

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
    modes: [
      {
        id: 'RATIO_ESTIMATION',
        title: '负形占比滑块评估',
        desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
        icon: Maximize2,
      },
    ],
~~~~~
~~~~~typescript.new
    modes: [
      {
        id: 'RATIO_ESTIMATION',
        title: '负形占比滑块评估',
        desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
        icon: Maximize2,
      },
      {
        id: 'AREA_COMPARISON_2AFC',
        title: '负形面积二分判别',
        desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
        icon: Columns,
      },
    ],
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
// 4. 正负形感知插件
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: () => '负形占比估算',
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userRatio, q) => checkNegativeSpaceHit(userRatio, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal) => ({
    targetNegativeRatio: q.targetNegativeRatio,
    userRatio: userVal,
    errorValue: hitResult.errorValue,
    positiveArea: q.positiveArea,
    negativeArea: q.negativeArea,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
    />
  ),
};
~~~~~
~~~~~typescript.new
// 4. 正负形感知插件
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B',
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) => (mode === 'AREA_COMPARISON_2AFC' ? '负形面积二分判别' : '负形占比估算'),
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
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
    />
  ),
};
~~~~~

#### Acts 3: 升级 `NegativeSpaceCanvas.tsx` 支持 2AFC 双画框视图与键盘快捷键

支持左右两个 A / B 画框对比渲染，快捷键 `1` / `2` 及 Space 提交，答案揭晓时高亮获胜方并展示精准面积差异。

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (userRatio: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
  const { vertices, targetNegativeRatio, tolerance } = question;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: setCurrentVal,
  });

  // 切换题目时重置滑块初始值
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
    }
  }, [question.id, setHoverVal]);

  // === Canvas 绘图渲染 ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清屏绘制纯白画框（即负形底色）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, NEGATIVE_SPACE_CANVAS_SIZE, NEGATIVE_SPACE_CANVAS_SIZE);

    // 绘制正形多边形 (正形填充深色)
    if (vertices.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = '#0F172A'; // Slate-900 黑色正形
      ctx.fill();

      // 边缘描边
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 揭晓答案时的视觉反馈辅助
      if (showAnswer) {
        ctx.strokeStyle = userAnswer?.isHit ? '#22C55E' : '#EF4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }, [vertices, showAnswer, userAnswer]);

  const handleSubmit = () => {
    if (disabled || showAnswer) return;
    onAnswer(currentVal);
  };

  // 空格快捷键提交
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (!showAnswer && !disabled) {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, currentVal, onAnswer]);

  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 提示文案 */}
      <div className="text-center space-y-1">
        <div className="text-sm font-bold text-slate-800">
          估计白色背景（负形）占整幅画面的面积百分比
        </div>
        <div className="text-xs text-slate-400">黑色为正形主体，白色空隙为负形</div>
      </div>

      {/* 画布区域 */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={NEGATIVE_SPACE_CANVAS_SIZE}
          height={NEGATIVE_SPACE_CANVAS_SIZE}
          className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      {/* 占比滑块调节区 */}
      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>负形空间占比估计:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userRatio ?? currentVal}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0%</span>

          <div
            {...pointerProps}
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
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              {/* 进度底色 */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${activeVal}%` }}
              />

              {/* 当前设定游标线 */}
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${currentVal}%` }}
                />
              )}

              {/* 容错区间指示 */}
              {!showAnswer && showToleranceBand && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.max(0, activeVal - tolerance)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.min(100, activeVal + tolerance)}%` }}
                  />
                </>
              )}

              {/* 揭晓答案标记 */}
              {showAnswer && (
                <>
                  {/* 真理值 (绿色标线) */}
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${targetNegativeRatio}%` }}
                  />
                  {/* 用户提交值 */}
                  {userAnswer && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                        userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: `${userAnswer.userRatio}%` }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
        </div>

        {/* 揭晓答案对比条 */}
        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              真实负形占比:{' '}
              <span className="font-bold text-slate-800 font-mono">{targetNegativeRatio}%</span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}% (容错: ±{tolerance}%)
            </span>
          </div>
        )}
      </div>

      {/* 确认提交按钮 */}
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
~~~~~typescript.new
import { Check, Columns, Sparkles, X } from 'lucide-preact';
import type { Point } from '../types';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  TWO_AFC_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/negativeSpaceUtils';

interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

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

  // === 1. 单图滑块模式状态 ===
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: setCurrentVal,
  });

  // === 2. 2AFC 模式专属画布与状态 ===
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
    }
  }, [question.id, setHoverVal]);

  // 辅助绘图函数：在给定 canvas 上绘制多边形正形与白色负形底
  const drawPolygonCanvas = (
    canvas: HTMLCanvasElement | null,
    vertices: Point[] | undefined,
    size: number,
    isHighlighted?: boolean,
  ) => {
    if (!canvas || !vertices || vertices.length < 3) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清屏绘制纯白底色（白色留白即负形）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // 绘制正形多边形
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = '#0F172A'; // Slate-900 黑色正形
    ctx.fill();

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 高亮加粗外边框反馈
    if (isHighlighted) {
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  // 渲染单图滑块 Canvas
  useEffect(() => {
    if (!is2AFC && question.vertices) {
      drawPolygonCanvas(
        canvasRef.current,
        question.vertices,
        NEGATIVE_SPACE_CANVAS_SIZE,
        showAnswer && userAnswer?.isHit,
      );
    }
  }, [is2AFC, question.vertices, showAnswer, userAnswer]);

  // 渲染 2AFC 双 Canvas
  useEffect(() => {
    if (is2AFC) {
      drawPolygonCanvas(canvasRefA.current, question.verticesA, TWO_AFC_CANVAS_SIZE);
      drawPolygonCanvas(canvasRefB.current, question.verticesB, TWO_AFC_CANVAS_SIZE);
    }
  }, [is2AFC, question.verticesA, question.verticesB]);

  // 处理 2AFC 点击选择
  const handleSelectChoice = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

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
      } else {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, disabled, showAnswer, currentVal, onAnswer]);

  // =========================================================================
  // 模式 A：2AFC 负形面积二分判别视图
  // =========================================================================
  if (is2AFC) {
    const largerSide = question.largerSide;
    const isAHit = largerSide === 'A';
    const isBHit = largerSide === 'B';

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        {/* 提示文案 */}
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Columns className="w-5 h-5 text-indigo-600" />
            判别哪一侧的白色留白 (负形) 面积更大？
          </div>
          <p className="text-xs text-slate-400">
            按快捷键 <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">1</kbd> 选择 A，按 <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">2</kbd> 选择 B，或直接点击卡片
          </p>
        </div>

        {/* 左右双卡片对比区 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isAHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selectedChoice === 'A'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selectedChoice === 'A'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  A
                </span>
                区域 A (键 1)
              </span>

              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isAHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isAHit ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      留白更大 ({question.negRatioA}%)
                    </>
                  ) : (
                    `留白 (${question.negRatioA}%)`
                  )}
                </span>
              )}
            </div>

            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={TWO_AFC_CANVAS_SIZE}
                height={TWO_AFC_CANVAS_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          </button>

          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isBHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selectedChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selectedChoice === 'B'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  B
                </span>
                区域 B (键 2)
              </span>

              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isBHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isBHit ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      留白更大 ({question.negRatioB}%)
                    </>
                  ) : (
                    `留白 (${question.negRatioB}%)`
                  )}
                </span>
              )}
            </div>

            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={TWO_AFC_CANVAS_SIZE}
                height={TWO_AFC_CANVAS_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          </button>
        </div>

        {/* 答案揭晓诊断条 */}
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
                  {userAnswer?.isHit ? '瞬时直觉判断正确！' : '直觉判断出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (留白实际差异率 Δ = <strong className="font-mono text-slate-700">{question.areaDeltaPercent}%</strong>)
                </span>
              </div>
            </div>

            <div className="text-xs font-mono font-bold text-slate-600">
              A: {question.negRatioA}% vs B: {question.negRatioB}%
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 模式 B：单图滑块评估视图 (RATIO_ESTIMATION)
  // =========================================================================
  const { targetNegativeRatio, tolerance } = question;
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 提示文案 */}
      <div className="text-center space-y-1">
        <div className="text-sm font-bold text-slate-800">
          估计白色背景（负形）占整幅画面的面积百分比
        </div>
        <div className="text-xs text-slate-400">黑色为正形主体，白色空隙为负形</div>
      </div>

      {/* 画布区域 */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={NEGATIVE_SPACE_CANVAS_SIZE}
          height={NEGATIVE_SPACE_CANVAS_SIZE}
          className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      {/* 占比滑块调节区 */}
      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>负形空间占比估计:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userRatio ?? currentVal}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0%</span>

          <div
            {...pointerProps}
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
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              {/* 进度底色 */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${activeVal}%` }}
              />

              {/* 当前设定游标线 */}
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${currentVal}%` }}
                />
              )}

              {/* 容错区间指示 */}
              {!showAnswer && showToleranceBand && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.max(0, activeVal - tolerance)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.min(100, activeVal + tolerance)}%` }}
                  />
                </>
              )}

              {/* 揭晓答案标记 */}
              {showAnswer && (
                <>
                  {/* 真理值 (绿色标线) */}
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${targetNegativeRatio}%` }}
                  />
                  {/* 用户提交值 */}
                  {userAnswer && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                        userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: `${userAnswer.userRatio}%` }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
        </div>

        {/* 揭晓答案对比条 */}
        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              真实负形占比:{' '}
              <span className="font-bold text-slate-800 font-mono">{targetNegativeRatio}%</span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}% (容错: ±{tolerance}%)
            </span>
          </div>
        )}
      </div>

      {/* 确认提交按钮 */}
      {!showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(currentVal);
          }}
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

### 下一步建议
1. 运行测试或进行交互验证，确认按键 `1` / `2` 与鼠标点击在 2AFC 模式下响应流畅，且做答反馈及难度升级计算正常。
2. 考虑未来为正负形感知模块添加弱点分析面板（例如长宽比盲区与凹凸度偏置统计）。
