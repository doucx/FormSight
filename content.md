我将生成一个 Quipu 计划，将**调性基底归位** (`TD_PALETTE_2AFC`) 重构为主调色群提炼的精确反向任务：顶部仅呈现单个提炼基准主色块，下方升级为 4 选 1 (4AFC) 拼贴图案匹配矩阵。

## [WIP] feat(abstraction): 将调性基底归位重构成 4AFC 单色基准寻源模式

### 用户需求
- **调性基底归位**需作为**主调色群提炼**的精确逆向任务：
  1. 提炼出的概括基准 (Prompt) 从原先的 3 色色谱条改为只提供**单个加权基准主色**。
  2. 候选区从 2AFC 升级为 **4AFC**（从 4 幅复杂混色拼贴图案中，辨识出以此基准色为主调的唯一正确画面）。

### 评论
将“调性基底归位”重构为 4AFC 单色寻源，使其与“主调色群提炼”（多色拼贴 -> 单色质心提炼）在认知心理学上形成了闭环的互逆映射（Top-Down vs Bottom-Up）。4AFC 矩阵显著降低了随机猜测率（从 50% 降至 25%），大幅提升了细化感知训练的辨识度与挑战性。

### 目标
1. **`abstractionUtils.ts`**:
   - 在 `AbstractionQuestionData` 中引入 `promptDominantColor?: [number, number, number]`、`palettePatternOptions?: PaletteTile[][]` 和 `correctPatternIndex?: number`。
   - 重构 `generateAbstractionQuestion` 中的 `TD_PALETTE_2AFC` 逻辑：生成 1 个目标基准主色，并构造 4 组不同主调的拼贴图案（1 个目标主调 + 3 个差异化干扰主调）。
   - 更新 `checkAbstractionHit` 对 4AFC 索引模式的判定。
2. **`AbstractionCanvas.tsx`**:
   - 顶部 Prompt 区域渲染优雅的单个基准主色块展示区。
   - 新增 4AFC 拼贴图案渲染管线，支持 4 个候选画布的独立绘制。
   - 支持键盘 `1, 2, 3, 4` 与点击直选交互，并在揭晓时呈现精确的真理与错误反馈。
3. **`cards.ts`**:
   - 更新卡片描述与交互标签 (`choice_nafc`)。

### 基本原理
- 4AFC 候选图案的生成复用 OKLab 感知色差难度映射，3 个干扰图案的主调在色相环与饱和度维度做等比阶梯偏移，每个图案内部的瓦片均围绕各自的主调进行混色扰动。
- 选项画布采用 $2\times 2$ 响应式网格布局，与系统现有 UI 风格统一，既保证了马赛克细节的清晰可辨，又确保了键盘与鼠标操作的高效性。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/abstraction-td-palette #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 更新卡片元数据定义

我们将更新 `cards.ts` 中 `abs_td_palette_2afc` 的描述文案与交互标签。

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript
  {
    id: 'abs_td_palette_2afc',
    legacyDomain: 'concretization',
    legacyMode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定 3 阶基调色谱条，在两张复杂混色拼贴图案中二选一归位 (2AFC)。',
    icon: Sparkles,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~
~~~~~typescript
  {
    id: 'abs_td_palette_2afc',
    legacyDomain: 'concretization',
    legacyMode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
    icon: Sparkles,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~

#### Acts 2: 重构 `abstractionUtils.ts` 中的题目生成与结果判定

我们将实现单基准主色和 4 候选拼贴图案的生成逻辑。

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
  promptPaletteBand?: [number, number, number][]; // 题干 3 色色谱
  patternA?: PaletteTile[];
  patternB?: PaletteTile[];
  correctPatternChoice?: 'A' | 'B';
}
~~~~~
~~~~~typescript
  promptPaletteBand?: [number, number, number][]; // 兼容
  promptDominantColor?: [number, number, number]; // 题干单基准主色
  palettePatternOptions?: PaletteTile[][]; // 4 组候选图案
  correctPatternIndex?: number; // 0..3
  patternA?: PaletteTile[];
  patternB?: PaletteTile[];
  correctPatternChoice?: 'A' | 'B';
}
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
  // 8. TD_PALETTE_2AFC 自顶向下调性基底归位 (2AFC)
  const baseH = Math.floor(Math.random() * 360);
  const promptPaletteBand: [number, number, number][] = [
    [baseH, 70, 75],
    [(baseH + 45) % 360, 45, 60],
    [(baseH + 180) % 360, 80, 85],
  ];

  const makeTiles = (shiftH: number) => {
    const tiles: PaletteTile[] = [];
    const size = 3;
    const tileDim = ABSTRACTION_2AFC_SIZE / size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const pickIdx = (r + c) % 3;
        const color = promptPaletteBand[pickIdx];
        tiles.push({
          x: c * tileDim,
          y: r * tileDim,
          w: tileDim,
          h: tileDim,
          hsv: [(color[0] + shiftH + 360) % 360, color[1], color[2]],
          weight: 1,
        });
      }
    }
    return tiles;
  };

  const patternTarget = makeTiles(0);
  const patternDistractor = makeTiles(45 * (1 - t * 0.6));
  const isA = Math.random() < 0.5;

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    promptPaletteBand,
    patternA: isA ? patternTarget : patternDistractor,
    patternB: isA ? patternDistractor : patternTarget,
    correctPatternChoice: isA ? 'A' : 'B',
    tolerance: 0,
  };
}
~~~~~
~~~~~typescript
  // 8. TD_PALETTE_2AFC (4AFC) 自顶向下调性基底归位：主调色群提炼的精确逆向
  const baseH = Math.floor(Math.random() * 360);
  const baseS = Math.floor(Math.random() * 40) + 40;
  const baseV = Math.floor(Math.random() * 40) + 40;
  const promptDominantColor: [number, number, number] = [baseH, baseS, baseV];

  const makePatternTiles = (domH: number, domS: number, domV: number) => {
    const tiles: PaletteTile[] = [];
    const gridSize = 3;
    const tileDim = ABSTRACTION_2AFC_SIZE / gridSize;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const jitterH = (domH + (Math.floor(Math.random() * 36) - 18) + 360) % 360;
        const jitterS = Math.max(10, Math.min(100, domS + (Math.floor(Math.random() * 26) - 13)));
        const jitterV = Math.max(15, Math.min(100, domV + (Math.floor(Math.random() * 26) - 13)));
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

  // 生成 3 个干扰图案主调 (随 Level 逼近)
  const distractorDeltaH = 35 * (1 - t * 0.65);
  const distractorsDom: [number, number, number][] = [
    [(baseH + distractorDeltaH + 360) % 360, baseS, baseV],
    [(baseH - distractorDeltaH + 360) % 360, baseS, baseV],
    [baseH, Math.max(15, baseS - 35), Math.max(20, baseV - 30)],
  ];

  const rawPatterns: PaletteTile[][] = [
    makePatternTiles(baseH, baseS, baseV),
    makePatternTiles(...distractorsDom[0]),
    makePatternTiles(...distractorsDom[1]),
    makePatternTiles(...distractorsDom[2]),
  ];

  const indexedPatterns = rawPatterns.map((pat, idx) => ({ pat, isTarget: idx === 0 }));
  for (let i = indexedPatterns.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedPatterns[i], indexedPatterns[j]] = [indexedPatterns[j], indexedPatterns[i]];
  }

  const palettePatternOptions = indexedPatterns.map((item) => item.pat);
  const correctPatternIndex = indexedPatterns.findIndex((item) => item.isTarget);

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    promptDominantColor,
    palettePatternOptions,
    correctPatternIndex,
    tolerance: 0,
  };
}
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
  if (mode === 'PALETTE_CLUSTERING') {
    const chosenIndex = typeof userAnswer === 'number' ? userAnswer : 0;
    const isHit = chosenIndex === question.correctPaletteIndex;
    return {
      isHit,
      userChoiceIndex: chosenIndex,
      correctIndex: question.correctPaletteIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: question.tolerance,
    };
  }

  // 2AFC Top-Down 通用处理
  const choice = userAnswer as 'A' | 'B';
  let correctChoice: 'A' | 'B' = 'A';
  if (mode === 'TD_GESTURE_2AFC') correctChoice = question.correctParticleChoice ?? 'A';
  if (mode === 'TD_HULL_2AFC') correctChoice = question.correctHullChoice ?? 'A';
  if (mode === 'TD_NOTAN_2AFC') correctChoice = question.correctNotanChoice ?? 'A';
  if (mode === 'TD_PALETTE_2AFC') correctChoice = question.correctPatternChoice ?? 'A';
~~~~~
~~~~~typescript
  if (mode === 'PALETTE_CLUSTERING') {
    const chosenIndex = typeof userAnswer === 'number' ? userAnswer : 0;
    const isHit = chosenIndex === question.correctPaletteIndex;
    return {
      isHit,
      userChoiceIndex: chosenIndex,
      correctIndex: question.correctPaletteIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: question.tolerance,
    };
  }

  if (mode === 'TD_PALETTE_2AFC') {
    const chosenIndex =
      typeof userAnswer === 'number'
        ? userAnswer
        : userAnswer === 'A'
          ? 0
          : userAnswer === 'B'
            ? 1
            : 0;
    const isHit = chosenIndex === question.correctPatternIndex;
    return {
      isHit,
      userChoiceIndex: chosenIndex,
      correctIndex: question.correctPatternIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }

  // 2AFC Top-Down 通用处理
  const choice = userAnswer as 'A' | 'B';
  let correctChoice: 'A' | 'B' = 'A';
  if (mode === 'TD_GESTURE_2AFC') correctChoice = question.correctParticleChoice ?? 'A';
  if (mode === 'TD_HULL_2AFC') correctChoice = question.correctHullChoice ?? 'A';
  if (mode === 'TD_NOTAN_2AFC') correctChoice = question.correctNotanChoice ?? 'A';
~~~~~

#### Acts 3: 在 `AbstractionCanvas.tsx` 中实现 4AFC 调性基底归位界面

我们将为 `TD_PALETTE_2AFC` 添加独立的 4AFC 候选画布网格，并更新基准展示与交互监听。

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
  // 2. 2AFC 状态
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const canvasThumbRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [selected4AfcIdx, setSelected4AfcIdx] = useState<number | null>(null);
~~~~~
~~~~~typescript
  // 2. 2AFC / 4AFC 状态
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const canvasThumbRef = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef0 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef3 = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [selected4AfcIdx, setSelected4AfcIdx] = useState<number | null>(null);
  const [selectedTdPatternIdx, setSelectedTdPatternIdx] = useState<number | null>(null);
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    if (question.id) {
      setSliderVal(mode === 'GESTURE_AXIS' ? 90 : 50);
      setHoverVal(null);
      setSelectedChoice(null);
      setSelected4AfcIdx(null);
    }
  }, [question.id, mode, setHoverVal]);
~~~~~
~~~~~typescript
  useEffect(() => {
    if (question.id) {
      setSliderVal(mode === 'GESTURE_AXIS' ? 90 : 50);
      setHoverVal(null);
      setSelectedChoice(null);
      setSelected4AfcIdx(null);
      setSelectedTdPatternIdx(null);
    }
  }, [question.id, mode, setHoverVal]);
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
    } else if (mode === 'TD_NOTAN_2AFC') {
      drawNotanScene(canvasThumbRef.current, question.promptNotanMask, 50, ABSTRACTION_THUMB_SIZE);
      drawNotanScene(canvasRefA.current, question.notanSceneA, 50, ABSTRACTION_2AFC_SIZE);
      drawNotanScene(canvasRefB.current, question.notanSceneB, 50, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_PALETTE_2AFC') {
      drawPaletteTiles(canvasRefA.current, question.patternA, ABSTRACTION_2AFC_SIZE);
      drawPaletteTiles(canvasRefB.current, question.patternB, ABSTRACTION_2AFC_SIZE);
    }
  }, [mode, question, activeVal, showAnswer]);
~~~~~
~~~~~typescript
    } else if (mode === 'TD_NOTAN_2AFC') {
      drawNotanScene(canvasThumbRef.current, question.promptNotanMask, 50, ABSTRACTION_THUMB_SIZE);
      drawNotanScene(canvasRefA.current, question.notanSceneA, 50, ABSTRACTION_2AFC_SIZE);
      drawNotanScene(canvasRefB.current, question.notanSceneB, 50, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_PALETTE_2AFC' && question.palettePatternOptions) {
      drawPaletteTiles(patternCanvasRef0.current, question.palettePatternOptions[0], ABSTRACTION_2AFC_SIZE);
      drawPaletteTiles(patternCanvasRef1.current, question.palettePatternOptions[1], ABSTRACTION_2AFC_SIZE);
      drawPaletteTiles(patternCanvasRef2.current, question.palettePatternOptions[2], ABSTRACTION_2AFC_SIZE);
      drawPaletteTiles(patternCanvasRef3.current, question.palettePatternOptions[3], ABSTRACTION_2AFC_SIZE);
    }
  }, [mode, question, activeVal, showAnswer]);
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (e.key === '1' || e.code === 'Digit1') {
        e.preventDefault();
        handleSelectChoice('A');
      } else if (e.key === '2' || e.code === 'Digit2') {
        e.preventDefault();
        handleSelectChoice('B');
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (mode === 'PALETTE_CLUSTERING') {
          if (selected4AfcIdx !== null) onAnswer(selected4AfcIdx);
        } else if (mode === 'GESTURE_AXIS' || mode === 'NOTAN_THRESHOLD') {
          onAnswer(activeVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, mode, activeVal, selected4AfcIdx, handleSelectChoice, onAnswer]);
~~~~~
~~~~~typescript
  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (mode === 'TD_PALETTE_2AFC') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const idx = Number.parseInt(e.key, 10) - 1;
          setSelectedTdPatternIdx(idx);
          onAnswer(idx);
        }
        return;
      }
      if (mode === 'PALETTE_CLUSTERING') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const idx = Number.parseInt(e.key, 10) - 1;
          setSelected4AfcIdx(idx);
          onAnswer(idx);
          return;
        }
      }
      if (e.key === '1' || e.code === 'Digit1') {
        e.preventDefault();
        handleSelectChoice('A');
      } else if (e.key === '2' || e.code === 'Digit2') {
        e.preventDefault();
        handleSelectChoice('B');
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (mode === 'PALETTE_CLUSTERING') {
          if (selected4AfcIdx !== null) onAnswer(selected4AfcIdx);
        } else if (mode === 'GESTURE_AXIS' || mode === 'NOTAN_THRESHOLD') {
          onAnswer(activeVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, mode, activeVal, selected4AfcIdx, handleSelectChoice, onAnswer]);
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
  // =========================================================================
  // 视图 A：Top-Down 2AFC 逆向匹配系列
  // =========================================================================
  if (mode.startsWith('TD_') || mode === 'POLYGON_DECIMATION') {
    const isPoly = mode === 'POLYGON_DECIMATION';
    const isTargetA = isPoly
      ? question.correctPolyChoice === 'A'
      : userAnswer?.correctChoice === 'A' ||
        question.correctParticleChoice === 'A' ||
        question.correctHullChoice === 'A' ||
        question.correctNotanChoice === 'A' ||
        question.correctPatternChoice === 'A';
    const isTargetB = !isTargetA;

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Columns className="w-5 h-5 text-indigo-600" />
            {isPoly
              ? '观察左侧细碎多边形，选择右侧保留了主要转折大形的概括项'
              : '观察上方提炼的本质基准，快速判别哪一侧具象细节符合该骨架'}
          </div>
          <p className="text-xs text-slate-400">
            按快捷键{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              1
            </kbd>{' '}
            选择 A，按{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              2
            </kbd>{' '}
            选择 B
          </p>
        </div>

        {/* 顶部题干或基准展示 */}
        {!isPoly && (
          <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              提炼出的概括基准 (Prompt)
            </span>
            {mode === 'TD_PALETTE_2AFC' && question.promptPaletteBand ? (
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                {question.promptPaletteBand.map((c, i) => (
                  <div
                    key={`prompt-band-${i}-${c.join('-')}`}
                    className="w-12 h-12 rounded-lg border border-slate-300 shadow-inner"
                    style={{ backgroundColor: hsvToHex(...c) }}
                  />
                ))}
              </div>
            ) : (
              <canvas
                ref={canvasThumbRef}
                width={ABSTRACTION_THUMB_SIZE}
                height={ABSTRACTION_THUMB_SIZE}
                className="w-28 h-28 rounded-xl border border-slate-200 shadow-sm"
              />
            )}
          </div>
        )}
~~~~~
~~~~~typescript
  // =========================================================================
  // 视图 A-1：TD_PALETTE_2AFC (4AFC) 调性基底归位视图
  // =========================================================================
  if (mode === 'TD_PALETTE_2AFC') {
    const promptHex = question.promptDominantColor
      ? hsvToHex(...question.promptDominantColor)
      : '#6366F1';
    const targetIdx = question.correctPatternIndex ?? 0;
    const chosenIdx = userAnswer?.userChoiceIndex ?? selectedTdPatternIdx;
    const patternCanvasRefs = [
      patternCanvasRef0,
      patternCanvasRef1,
      patternCanvasRef2,
      patternCanvasRef3,
    ];

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            观察上方基准主调色，在下方 4 个复杂画面中选出以此为基调的拼贴图案
          </div>
          <p className="text-xs text-slate-400">
            按快捷键 <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">1</kbd> ~ <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">4</kbd> 或直接点击卡片
          </p>
        </div>

        {/* 顶部单色基准展示 */}
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            提炼出的基准主调色 (Prompt)
          </span>
          <div
            className="w-20 h-20 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200"
            style={{ backgroundColor: promptHex }}
          />
        </div>

        {/* 4 候选拼贴图案网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {question.palettePatternOptions?.map((_pat, idx) => {
            const isSelected = chosenIdx === idx;
            const isTarget = idx === targetIdx;
            const keyLabel = (idx + 1).toString();

            let border = 'border-slate-200/90 hover:border-indigo-300 hover:shadow-md bg-slate-50';
            if (showAnswer) {
              if (isTarget) {
                border = 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
              } else if (isSelected) {
                border = 'bg-rose-50/50 border-rose-400 shadow-sm';
              } else {
                border = 'bg-slate-50/60 border-slate-200 opacity-50';
              }
            } else if (isSelected) {
              border = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
            }

            return (
              <button
                key={`td-pattern-card-${idx}`}
                type="button"
                disabled={disabled || showAnswer}
                onClick={() => {
                  setSelectedTdPatternIdx(idx);
                  onAnswer(idx);
                }}
                className={`group flex flex-col items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] ${border}`}
              >
                <div className="flex items-center justify-between w-full px-1">
                  <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                    <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                      {keyLabel}
                    </span>
                    画面 {keyLabel}
                  </span>
                  {showAnswer && isTarget && (
                    <Check className="w-4 h-4 text-emerald-600 font-extrabold" />
                  )}
                </div>

                <div className="w-full aspect-square bg-white p-1 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
                  <canvas
                    ref={patternCanvasRefs[idx]}
                    width={ABSTRACTION_2AFC_SIZE}
                    height={ABSTRACTION_2AFC_SIZE}
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
                  {userAnswer?.isHit ? '调性基底寻源匹配完全正确！' : '色彩调性感知出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (正确匹配为: 画面 {targetIdx + 1})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 视图 A-2：Top-Down 2AFC 逆向匹配系列 (GESTURE / HULL / NOTAN)
  // =========================================================================
  if (mode.startsWith('TD_') || mode === 'POLYGON_DECIMATION') {
    const isPoly = mode === 'POLYGON_DECIMATION';
    const isTargetA = isPoly
      ? question.correctPolyChoice === 'A'
      : userAnswer?.correctChoice === 'A' ||
        question.correctParticleChoice === 'A' ||
        question.correctHullChoice === 'A' ||
        question.correctNotanChoice === 'A';
    const isTargetB = !isTargetA;

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Columns className="w-5 h-5 text-indigo-600" />
            {isPoly
              ? '观察左侧细碎多边形，选择右侧保留了主要转折大形的概括项'
              : '观察上方提炼的本质基准，快速判别哪一侧具象细节符合该骨架'}
          </div>
          <p className="text-xs text-slate-400">
            按快捷键{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              1
            </kbd>{' '}
            选择 A，按{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              2
            </kbd>{' '}
            选择 B
          </p>
        </div>

        {/* 顶部题干或基准展示 */}
        {!isPoly && (
          <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              提炼出的概括基准 (Prompt)
            </span>
            <canvas
              ref={canvasThumbRef}
              width={ABSTRACTION_THUMB_SIZE}
              height={ABSTRACTION_THUMB_SIZE}
              className="w-28 h-28 rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        )}
~~~~~

### 下一步建议
1. 运行测试套件与代码格式检查，确保无类型错误或回归问题。
2. 启动开发服务器并在“细化感知 -> 调性基底归位”中进行实操，验证单色块基准展示与 4AFC 图案网格的交互体验。
