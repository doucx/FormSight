我们将“负形轮廓记忆匹配”模式从 4 选 1 调整为 **2 选 1 (2AFC)**，并将候选卡片的画布尺寸调整为与参考卡片**完全一致的 1:1 原生尺寸**，彻底消除缩放造成的心理比例失真。

## [WIP] refactor(negative-space): 将轮廓记忆匹配重构为 1:1 等大 2AFC 模式

### 用户需求
1. **缩减为 2AFC**：将做答选项从 4 个缩减为 2 个（A / B），降低无谓的视觉搜寻负担，专注于两张图之间的微差辨识。
2. **1:1 原生比例呈现**：候选卡片的 Canvas 逻辑尺寸与展示卡片完全一致（均为 400×400），避免因尺寸缩放带来的感知比例干扰。

### 评论
从 4AFC 缩减为 2AFC 并保持 1:1 等大是非常专业且符合视知觉心理物理学实验（Psychophysics Experiments）的改进：
- **消除比例换算干扰**：当展示图与候选图等大时，大脑不需要进行“心理空间缩放（Mental Rescaling）”，可以直接对比留白弧度与边角比例。
- **加快训练节奏**：2AFC 结合按键 `1`/`2`，能让用户在极短曝光后凭借直觉进行极速决策（Fast Intuitive Decision），训练效率更高。

### 目标
1. 在 `src/config/domains.ts`、`src/utils/negativeSpaceUtils.ts`、`src/config/trainingPlugins.tsx` 中将模式标识升级为 `SHAPE_MATCH_2AFC`。
2. 将干扰项生成改为 1 个高相似扰动多边形，与真实多边形随机分配至 A、B 两侧。
3. 在 `src/components/NegativeSpaceCanvas.tsx` 中为候选卡片使用与刺激图完全一致的 `NEGATIVE_SPACE_CANVAS_SIZE` (400px)，布局采用左右并排双卡片（键 1 / 键 2）。

### 基本原理
- **物理尺寸对齐**: 刺激图与 A/B 两张候选图均在 `NEGATIVE_SPACE_CANVAS_SIZE`（400×400）下绘制，内部顶点坐标无需任何转换，保证 100% 的几何形态等价性。
- **极简 2AFC 交互**: 曝光倒计时结束后立即呈现 A / B 两张对比大卡片，支持按键 `1` / `2` 或点击。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/negative-space #task/object/shape-match-2afc #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 更新模式注册元数据

在 `src/config/domains.ts` 中将模式更新为 `SHAPE_MATCH_2AFC`。

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
      {
        id: 'SHAPE_MATCH_4AFC',
        title: '负形轮廓记忆匹配',
        desc: '瞬时记忆负形空隙轮廓，在相似干扰项中快速识别出与之完全一致的形状。',
        icon: Sparkles,
      },
~~~~~
~~~~~typescript.new
      {
        id: 'SHAPE_MATCH_2AFC',
        title: '负形轮廓记忆匹配',
        desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
        icon: Sparkles,
      },
~~~~~

#### Acts 2: 更新负形工具库为 2AFC 逻辑

在 `src/utils/negativeSpaceUtils.ts` 中更新类型、将干扰项生成缩减为 1 个，并生成 2 个等大多边形选项。

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
export type NegativeSpaceMode =
  | 'RATIO_ESTIMATION'
  | 'AREA_COMPARISON_2AFC'
  | 'NEGATIVE_VERTEX_FITTING'
  | 'SHAPE_MATCH_4AFC';
~~~~~
~~~~~typescript.new
export type NegativeSpaceMode =
  | 'RATIO_ESTIMATION'
  | 'AREA_COMPARISON_2AFC'
  | 'NEGATIVE_VERTEX_FITTING'
  | 'SHAPE_MATCH_2AFC';
~~~~~
~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
  // 4AFC 记忆匹配模式字段
  targetPolygon?: Point[];
  optionsPolygons?: Point[][];
  correctOptionIndex?: number;
  displayTimeMs?: number;
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

  // 4AFC 结果字段
  userChoiceIndex?: number;
  correctOptionIndex?: number;
}
~~~~~
~~~~~typescript.new
  // 记忆匹配 2AFC 模式字段
  targetPolygon?: Point[];
  optionsPolygons?: Point[][]; // [polyA, polyB]
  correctOptionIndex?: number; // 0 (A) or 1 (B)
  correctChoice?: 'A' | 'B';
  displayTimeMs?: number;
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

  // 记忆匹配 2AFC 结果字段
  userChoiceIndex?: number;
  correctOptionIndex?: number;
}
~~~~~
~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
  if (mode === 'SHAPE_MATCH_4AFC') {
    const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;
    const targetPolygon = generateRandomPolygon(clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE);

    const distractors = [
      perturbPolygon(targetPolygon, clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE),
      perturbPolygon(targetPolygon, clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE),
      perturbPolygon(targetPolygon, clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE),
    ];

    const rawOptions = [targetPolygon, ...distractors];
    const indexedOptions = rawOptions.map((opt, index) => ({ opt, isTarget: index === 0 }));
    for (let i = indexedOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
    }

    const optionsPolygons = indexedOptions.map((o) => o.opt);
    const correctOptionIndex = indexedOptions.findIndex((o) => o.isTarget);

    const t = (clampedLevel - 1) / 34;
    const maxDisplayMs = 2400;
    const minDisplayMs = 450;
    const displayTimeMs = Math.round(maxDisplayMs * (minDisplayMs / maxDisplayMs) ** t);

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      targetPolygon,
      optionsPolygons,
      correctOptionIndex,
      displayTimeMs,
      tolerance: 0,
    };
  }
~~~~~
~~~~~typescript.new
  if (mode === 'SHAPE_MATCH_2AFC') {
    const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;
    const targetPolygon = generateRandomPolygon(clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE);
    const distractorPolygon = perturbPolygon(targetPolygon, clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE);

    const isTargetA = Math.random() < 0.5;
    const optionsPolygons = isTargetA
      ? [targetPolygon, distractorPolygon]
      : [distractorPolygon, targetPolygon];
    const correctOptionIndex = isTargetA ? 0 : 1;
    const correctChoice = isTargetA ? 'A' : 'B';

    const t = (clampedLevel - 1) / 34;
    const maxDisplayMs = 2400;
    const minDisplayMs = 450;
    const displayTimeMs = Math.round(maxDisplayMs * (minDisplayMs / maxDisplayMs) ** t);

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      targetPolygon,
      optionsPolygons,
      correctOptionIndex,
      correctChoice,
      displayTimeMs,
      tolerance: 0,
    };
  }
~~~~~
~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
  if (question.mode === 'SHAPE_MATCH_4AFC') {
    const userChoiceIndex = typeof userAnswer === 'number' ? userAnswer : 0;
    const isHit = userChoiceIndex === question.correctOptionIndex;

    return {
      isHit,
      userChoiceIndex,
      correctOptionIndex: question.correctOptionIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }
~~~~~
~~~~~typescript.new
  if (question.mode === 'SHAPE_MATCH_2AFC') {
    let userChoiceIndex: number;
    if (typeof userAnswer === 'number') {
      userChoiceIndex = userAnswer;
    } else if (userAnswer === 'A') {
      userChoiceIndex = 0;
    } else if (userAnswer === 'B') {
      userChoiceIndex = 1;
    } else {
      userChoiceIndex = 0;
    }

    const isHit = userChoiceIndex === question.correctOptionIndex;
    const userChoice = userChoiceIndex === 0 ? 'A' : 'B';

    return {
      isHit,
      userChoice,
      userChoiceIndex,
      correctChoice: question.correctChoice,
      correctOptionIndex: question.correctOptionIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }
~~~~~

#### Acts 3: 适配插件模式徽标与记录详情

在 `src/config/trainingPlugins.tsx` 中适配 `SHAPE_MATCH_2AFC`。

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'SHAPE_MATCH_4AFC'
          ? '负形轮廓记忆匹配'
          : '负形占比估算',
~~~~~
~~~~~typescript.new
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'SHAPE_MATCH_2AFC'
          ? '负形轮廓记忆匹配'
          : '负形占比估算',
~~~~~
~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
    if (mode === 'SHAPE_MATCH_4AFC') {
      return {
        mode: 'SHAPE_MATCH_4AFC',
        userChoiceIndex: userVal,
        correctOptionIndex: q.correctOptionIndex,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
~~~~~
~~~~~typescript.new
    if (mode === 'SHAPE_MATCH_2AFC') {
      return {
        mode: 'SHAPE_MATCH_2AFC',
        userChoice: userVal === 0 || userVal === 'A' ? 'A' : 'B',
        correctChoice: q.correctChoice,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
~~~~~

#### Acts 4: 重构 Canvas 为 1:1 等大 2AFC 视图

在 `src/components/NegativeSpaceCanvas.tsx` 中：
1. 候选卡片 A 和 B 均使用 `NEGATIVE_SPACE_CANVAS_SIZE`（400×400）绘制，实现 1:1 原生无缩放呈现。
2. 简化为 2 选项状态与 `1`/`2`（或 A/B）快捷键。

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  const is2AFC = question.mode === 'AREA_COMPARISON_2AFC';
  const isFitting = question.mode === 'NEGATIVE_VERTEX_FITTING';
  const is4AFC = question.mode === 'SHAPE_MATCH_4AFC';

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

  // === 3. 定点反切模式专属画布与状态 ===
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
  const rightFittingRef = useRef<HTMLCanvasElement | null>(null);
  const [fittingHoverPoint, setFittingHoverPoint] = useState<Point | null>(null);

  // === 4. 4AFC 记忆匹配模式专属画布与状态 ===
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selected4AfcIndex, setSelected4AfcIndex] = useState<number | null>(null);
  const option0Ref = useRef<HTMLCanvasElement | null>(null);
  const option1Ref = useRef<HTMLCanvasElement | null>(null);
  const option2Ref = useRef<HTMLCanvasElement | null>(null);
  const option3Ref = useRef<HTMLCanvasElement | null>(null);
  const optionRefs = [option0Ref, option1Ref, option2Ref, option3Ref];

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
      setFittingHoverPoint(null);
      setMatchPhase('stimulus');
      setSelected4AfcIndex(null);
    }
  }, [question.id, setHoverVal]);

  // 4AFC 曝光倒计时处理
  useEffect(() => {
    if (is4AFC && matchPhase === 'stimulus' && !showAnswer) {
      const timer = setTimeout(() => {
        setMatchPhase('recall');
      }, question.displayTimeMs || 1500);
      return () => clearTimeout(timer);
    }
  }, [is4AFC, matchPhase, question.displayTimeMs, showAnswer]);
~~~~~
~~~~~typescript.new
  const is2AFC = question.mode === 'AREA_COMPARISON_2AFC';
  const isFitting = question.mode === 'NEGATIVE_VERTEX_FITTING';
  const is2AfcMatch = question.mode === 'SHAPE_MATCH_2AFC';

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

  // === 3. 定点反切模式专属画布与状态 ===
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
  const rightFittingRef = useRef<HTMLCanvasElement | null>(null);
  const [fittingHoverPoint, setFittingHoverPoint] = useState<Point | null>(null);

  // === 4. 2AFC 记忆匹配模式专属画布与状态 ===
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selectedMatchChoice, setSelectedMatchChoice] = useState<'A' | 'B' | null>(null);
  const matchOptionRefA = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefB = useRef<HTMLCanvasElement | null>(null);

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
      setFittingHoverPoint(null);
      setMatchPhase('stimulus');
      setSelectedMatchChoice(null);
    }
  }, [question.id, setHoverVal]);

  // 记忆匹配曝光倒计时处理
  useEffect(() => {
    if (is2AfcMatch && matchPhase === 'stimulus' && !showAnswer) {
      const timer = setTimeout(() => {
        setMatchPhase('recall');
      }, question.displayTimeMs || 1500);
      return () => clearTimeout(timer);
    }
  }, [is2AfcMatch, matchPhase, question.displayTimeMs, showAnswer]);
~~~~~
~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // 渲染单图滑块 Canvas 与 4AFC 刺激图
  useEffect(() => {
    if (!is2AFC && !isFitting && !is4AFC && question.vertices) {
      drawPolygonCanvas(
        canvasRef.current,
        question.vertices,
        NEGATIVE_SPACE_CANVAS_SIZE,
        showAnswer && userAnswer?.isHit,
      );
    } else if (is4AFC && matchPhase === 'stimulus' && question.targetPolygon) {
      drawPolygonCanvas(
        canvasRef.current,
        question.targetPolygon,
        NEGATIVE_SPACE_CANVAS_SIZE,
      );
    }
  }, [is2AFC, isFitting, is4AFC, matchPhase, question.vertices, question.targetPolygon, showAnswer, userAnswer]);

  // 渲染 4AFC 候选画布 (等比缩放 400 -> 280 坐标)
  useEffect(() => {
    if (is4AFC && (matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      const scale = TWO_AFC_CANVAS_SIZE / NEGATIVE_SPACE_CANVAS_SIZE;
      question.optionsPolygons.forEach((poly, idx) => {
        const scaledPoly = poly.map((p) => ({
          x: Math.round(p.x * scale),
          y: Math.round(p.y * scale),
        }));
        drawPolygonCanvas(optionRefs[idx].current, scaledPoly, TWO_AFC_CANVAS_SIZE);
      });
    }
  }, [is4AFC, matchPhase, showAnswer, question.optionsPolygons]);
~~~~~
~~~~~typescript.new
  // 渲染单图滑块 Canvas 与 记忆匹配刺激图
  useEffect(() => {
    if (!is2AFC && !isFitting && !is2AfcMatch && question.vertices) {
      drawPolygonCanvas(
        canvasRef.current,
        question.vertices,
        NEGATIVE_SPACE_CANVAS_SIZE,
        showAnswer && userAnswer?.isHit,
      );
    } else if (is2AfcMatch && matchPhase === 'stimulus' && question.targetPolygon) {
      drawPolygonCanvas(
        canvasRef.current,
        question.targetPolygon,
        NEGATIVE_SPACE_CANVAS_SIZE,
      );
    }
  }, [is2AFC, isFitting, is2AfcMatch, matchPhase, question.vertices, question.targetPolygon, showAnswer, userAnswer]);

  // 渲染 记忆匹配 2AFC 候选画布 (1:1 等大 NEGATIVE_SPACE_CANVAS_SIZE 原生渲染)
  useEffect(() => {
    if (is2AfcMatch && (matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      drawPolygonCanvas(matchOptionRefA.current, question.optionsPolygons[0], NEGATIVE_SPACE_CANVAS_SIZE);
      drawPolygonCanvas(matchOptionRefB.current, question.optionsPolygons[1], NEGATIVE_SPACE_CANVAS_SIZE);
    }
  }, [is2AfcMatch, matchPhase, showAnswer, question.optionsPolygons]);
~~~~~
~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // 处理 4AFC 点击选择
  const handleSelect4Afc = useCallback(
    (index: number) => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelected4AfcIndex(index);
      onAnswer(index);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );
~~~~~
~~~~~typescript.new
  // 处理 记忆匹配 2AFC 点击选择
  const handleSelectMatchChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelectedMatchChoice(choice);
      onAnswer(choice === 'A' ? 0 : 1);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );
~~~~~
~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else if (is4AFC && matchPhase === 'recall') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          handleSelect4Afc(Number.parseInt(e.key, 10) - 1);
        } else if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
          const num = Number.parseInt(e.code.replace(/\D/g, ''), 10);
          if (num >= 1 && num <= 4) {
            e.preventDefault();
            handleSelect4Afc(num - 1);
          }
        }
      } else if (!isFitting && !is4AFC) {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, isFitting, is4AFC, matchPhase, disabled, showAnswer, currentVal, onAnswer, handleSelectChoice, handleSelect4Afc]);
~~~~~
~~~~~typescript.new
      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else if (is2AfcMatch && matchPhase === 'recall') {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectMatchChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectMatchChoice('B');
        }
      } else if (!isFitting && !is2AfcMatch) {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, isFitting, is2AfcMatch, matchPhase, disabled, showAnswer, currentVal, onAnswer, handleSelectChoice, handleSelectMatchChoice]);
~~~~~
~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 模式 D：SHAPE_MATCH_4AFC 负形轮廓记忆匹配视图
  // =========================================================================
  if (is4AFC) {
    const isRevealed = showAnswer;

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            {matchPhase === 'stimulus' && !isRevealed
              ? '观察并瞬时记忆负形空隙轮廓特征'
              : '匹配回忆：选择与刚才展示完全相同的形状'}
          </div>
          <p className="text-xs text-slate-400">
            {matchPhase === 'stimulus' && !isRevealed
              ? `曝光记忆倒计时中 (${question.displayTimeMs}ms)`
              : '按按键 1、2、3、4 或直接点击卡片选择'}
          </p>
        </div>

        {matchPhase === 'stimulus' && !isRevealed ? (
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner flex flex-col items-center gap-3">
            <canvas
              ref={canvasRef}
              width={NEGATIVE_SPACE_CANVAS_SIZE}
              height={NEGATIVE_SPACE_CANVAS_SIZE}
              className="w-full max-w-[320px] aspect-square rounded-2xl border border-slate-200 shadow-sm"
            />
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                key={`${question.id}-${matchPhase}`}
                className="bg-indigo-600 h-full"
                style={{
                  width: '100%',
                  animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full">
            {[0, 1, 2, 3].map((idx) => {
              const isTarget = question.correctOptionIndex === idx;
              const isSelected = selected4AfcIndex === idx || userAnswer?.userChoiceIndex === idx;

              let cardStyle =
                'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]';

              if (isRevealed) {
                if (isTarget) {
                  cardStyle = 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20';
                } else if (isSelected) {
                  cardStyle = 'bg-rose-50/50 border-rose-400 shadow-sm';
                } else {
                  cardStyle = 'bg-slate-50/60 border-slate-200 opacity-50';
                }
              } else if (isSelected) {
                cardStyle = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled || showAnswer}
                  onClick={() => handleSelect4Afc(idx)}
                  className={`group relative flex flex-col items-center gap-2.5 p-3.5 rounded-3xl border transition-all duration-200 text-left ${cardStyle}`}
                >
                  <div className="flex items-center justify-between w-full px-1">
                    <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                      <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                        {idx + 1}
                      </span>
                      选项 {idx + 1}
                    </span>
                    {isRevealed && isTarget && (
                      <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-4 h-4" /> 真实目标
                      </span>
                    )}
                  </div>
                  <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                    <canvas
                      ref={optionRefs[idx]}
                      width={TWO_AFC_CANVAS_SIZE}
                      height={TWO_AFC_CANVAS_SIZE}
                      className="w-full max-w-[170px] aspect-square rounded-xl shadow-sm"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {isRevealed && (
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
                  {userAnswer?.isHit ? '瞬时记忆与形态识别完全正确！' : '记忆形态判断出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (正确选项为: 选项 {(question.correctOptionIndex ?? 0) + 1})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 模式 D：SHAPE_MATCH_2AFC 负形轮廓记忆匹配视图 (1:1 等大)
  // =========================================================================
  if (is2AfcMatch) {
    const isRevealed = showAnswer;
    const isTargetA = question.correctOptionIndex === 0;
    const isTargetB = question.correctOptionIndex === 1;

    const isSelectedA = selectedMatchChoice === 'A' || userAnswer?.userChoice === 'A' || userAnswer?.userChoiceIndex === 0;
    const isSelectedB = selectedMatchChoice === 'B' || userAnswer?.userChoice === 'B' || userAnswer?.userChoiceIndex === 1;

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            {matchPhase === 'stimulus' && !isRevealed
              ? '观察并瞬时记忆负形轮廓特征'
              : '匹配回忆：哪一侧与刚才展示完全相同？'}
          </div>
          <p className="text-xs text-slate-400">
            {matchPhase === 'stimulus' && !isRevealed
              ? `曝光记忆倒计时中 (${question.displayTimeMs}ms)`
              : '按快捷键 1 选择 A，按 2 选择 B，或直接点击卡片'}
          </p>
        </div>

        {matchPhase === 'stimulus' && !isRevealed ? (
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner flex flex-col items-center gap-3 w-full max-w-sm">
            <canvas
              ref={canvasRef}
              width={NEGATIVE_SPACE_CANVAS_SIZE}
              height={NEGATIVE_SPACE_CANVAS_SIZE}
              className="w-full aspect-square rounded-2xl border border-slate-200 shadow-sm"
            />
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                key={`${question.id}-${matchPhase}`}
                className="bg-indigo-600 h-full"
                style={{
                  width: '100%',
                  animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
            {/* 卡片 A */}
            <button
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => handleSelectMatchChoice('A')}
              className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
                isRevealed
                  ? isTargetA
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : isSelectedA
                      ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                  : isSelectedA
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

                {isRevealed && isTargetA && (
                  <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" />
                    真实目标
                  </span>
                )}
              </div>

              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefA}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            </button>

            {/* 卡片 B */}
            <button
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => handleSelectMatchChoice('B')}
              className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
                isRevealed
                  ? isTargetB
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : isSelectedB
                      ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                  : isSelectedB
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

                {isRevealed && isTargetB && (
                  <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" />
                    真实目标
                  </span>
                )}
              </div>

              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefB}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            </button>
          </div>
        )}

        {isRevealed && (
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
                  {userAnswer?.isHit ? '瞬时形态记忆完全正确！' : '记忆形态判断出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (正确目标为: 区域 {question.correctChoice})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
~~~~~

### 下一步建议
1. 在正负形感知模块中体验新重构的“负形轮廓记忆匹配”卡片，确认：
   - 曝光倒计时结束后平滑呈现等大 A/B 左右双大卡片。
   - 按快捷键 `1` 和 `2`（或点击）能流畅作答，无任何尺寸缩放偏差。
2. 验证通过后，可提交 Git 变更。
