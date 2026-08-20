我将生成一个 Quipu 计划，对视知觉概括感知模块（`AbstractionCanvas` 与 `abstractionUtils`）进行精细打磨，以满足全部 4 项体验优化要求。

## [WIP] feat(abstraction): 打磨视知觉概括模块的交互与视觉呈现

### 用户需求
1. **动态势线提取 (`GESTURE_AXIS`)**：取消底部多余的“确认提交”按钮，转为类似色相轨道的交互逻辑，用户点击或拖拽释放滑块即刻自动提交。
2. **折线低模大形 (`POLYGON_DECIMATION`)**：修复选项答案多边形坐标聚集在画布右下角的问题，将其精准居中呈现在 2AFC 选项画布中。
3. **主调色群提炼 (`PALETTE_CLUSTERING`)**：移除初始状态下选项 A 的默认高亮状态，直到用户实际点击或选择。
4. **动态势线寻源 (`TD_GESTURE_2AFC`)**：顶部骨架基准展示区应呈现为清晰连贯的动态主轴势线，而非离散的两个黑点。

### 评论
这些细节打磨显著提升了视知觉概括训练的即时反馈感与视觉传达准确性。消除多余按钮和误导性默认高亮降低了用户的认知负担，而坐标系缩放居中与势线可视化则确保了知觉刺激的清晰度。

### 目标
1. 在 `abstractionUtils.ts` 中，为 `POLYGON_DECIMATION` 生成的 2AFC 候选项应用画布尺寸适配映射（从 400x400 缩放到 260x260 居中）。
2. 在 `AbstractionCanvas.tsx` 中：
   - 增加专用的 `drawSpinePrompt` 绘图函数，将 `promptSpine` 绘制为两端圆润的加粗势线。
   - 将 `selected4AfcIdx` 初始状态设为 `null`，避免初次渲染时选项 A 出现选中态边框。
   - `useTrackPointer` 挂载 `onCommit` 回调，在 `GESTURE_AXIS` 模式下点击/松开轨道时立即触发 `onAnswer`。
   - 在 `GESTURE_AXIS` 模式下移除底部的常驻提交按钮，仅在 `NOTAN_THRESHOLD` 模式下保留。

### 基本原理
- 候选项多边形偏向右下角是因为其生成坐标系基准为原图尺寸（400x400，中心 200, 200），绘制在 260x260 的 2AFC 画布上未经换算。按 `260 / 400 = 0.65` 等比缩放后中心将准确对齐至 (130, 130)。
- 势线骨架在 `promptSpine` 中定义为线段的起止两点，通过 Canvas `beginPath / moveTo / lineTo` 及 `lineCap = 'round'` 绘制可呈现优雅连贯的势线骨架。
- 利用 `useTrackPointer` 已具备的 `onCommit` 事件捕获 pointerUp，实现无缝的即点即选答题体验。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/abstraction-canvas #task/action/polish #task/state/begin

---

### Script

#### Acts 1: 修复 `POLYGON_DECIMATION` 选项坐标居中映射

我们将修复 `POLYGON_DECIMATION` 中 2AFC 候选项多边形的缩放比例，使其在 260x260 的选项画布中完全居中。

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
    const isA = Math.random() < 0.5;
    const simplifiedOptions = isA ? [simplified, distractor] : [distractor, simplified];

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      detailedPolygon,
      simplifiedOptions,
      correctPolyIndex: isA ? 0 : 1,
      correctPolyChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
~~~~~
~~~~~typescript
    const isA = Math.random() < 0.5;
    const scaleTo2Afc = ABSTRACTION_2AFC_SIZE / ABSTRACTION_CANVAS_SIZE;
    const mapTo2Afc = (pts: Point[]) =>
      pts.map((p) => ({
        x: Math.round(p.x * scaleTo2Afc),
        y: Math.round(p.y * scaleTo2Afc),
      }));

    const simplifiedOptions = isA
      ? [mapTo2Afc(simplified), mapTo2Afc(distractor)]
      : [mapTo2Afc(distractor), mapTo2Afc(simplified)];

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      detailedPolygon,
      simplifiedOptions,
      correctPolyIndex: isA ? 0 : 1,
      correctPolyChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
~~~~~

#### Acts 2: 优化 `AbstractionCanvas.tsx` 交互与视觉呈现

我们将添加势线绘制函数、将 4AFC 初始高亮设为 `null`、为势线提取实现点击即提交并移除冗余按钮。

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
// 辅助绘图：绘制色彩拼贴图案
function drawPaletteTiles(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = ABSTRACTION_CANVAS_SIZE,
) {
  if (!canvas || !tiles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}

export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
}: AbstractionCanvasProps) {
  const { mode } = question;

  // 1. 角度与滑块交互状态
  const [sliderVal, setSliderVal] = useState<number>(0);
  const canvasMainRef = useRef<HTMLCanvasElement | null>(null);

  // 2. 2AFC 状态
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const canvasThumbRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [selected4AfcIdx, setSelected4AfcIdx] = useState<number>(0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: mode === 'GESTURE_AXIS' ? 180 : 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
  });

  useEffect(() => {
    if (question.id) {
      setSliderVal(mode === 'GESTURE_AXIS' ? 90 : 50);
      setHoverVal(null);
      setSelectedChoice(null);
      setSelected4AfcIdx(0);
    }
  }, [question.id, mode, setHoverVal]);
~~~~~
~~~~~typescript
// 辅助绘图：绘制色彩拼贴图案
function drawPaletteTiles(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = ABSTRACTION_CANVAS_SIZE,
) {
  if (!canvas || !tiles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}

// 辅助绘图：绘制基准骨架势线
function drawSpinePrompt(
  canvas: HTMLCanvasElement | null,
  spine?: Point[],
  size = ABSTRACTION_THUMB_SIZE,
) {
  if (!canvas || !spine || spine.length < 2) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const [p1, p2] = spine;
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
}: AbstractionCanvasProps) {
  const { mode } = question;

  // 1. 角度与滑块交互状态
  const [sliderVal, setSliderVal] = useState<number>(0);
  const canvasMainRef = useRef<HTMLCanvasElement | null>(null);

  // 2. 2AFC 状态
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const canvasThumbRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [selected4AfcIdx, setSelected4AfcIdx] = useState<number | null>(null);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: mode === 'GESTURE_AXIS' ? 180 : 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal) => {
      if (mode === 'GESTURE_AXIS' && !disabled && !showAnswer) {
        onAnswer(committedVal);
      }
    },
  });

  useEffect(() => {
    if (question.id) {
      setSliderVal(mode === 'GESTURE_AXIS' ? 90 : 50);
      setHoverVal(null);
      setSelectedChoice(null);
      setSelected4AfcIdx(null);
    }
  }, [question.id, mode, setHoverVal]);
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
    } else if (mode === 'PALETTE_CLUSTERING') {
      drawPaletteTiles(canvasMainRef.current, question.paletteTiles, ABSTRACTION_CANVAS_SIZE);
    } else if (mode === 'TD_GESTURE_2AFC') {
      drawParticles(canvasThumbRef.current, question.promptSpine, ABSTRACTION_THUMB_SIZE);
      drawParticles(canvasRefA.current, question.particlesA, ABSTRACTION_2AFC_SIZE);
      drawParticles(canvasRefB.current, question.particlesB, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_HULL_2AFC') {
~~~~~
~~~~~typescript
    } else if (mode === 'PALETTE_CLUSTERING') {
      drawPaletteTiles(canvasMainRef.current, question.paletteTiles, ABSTRACTION_CANVAS_SIZE);
    } else if (mode === 'TD_GESTURE_2AFC') {
      drawSpinePrompt(canvasThumbRef.current, question.promptSpine, ABSTRACTION_THUMB_SIZE);
      drawParticles(canvasRefA.current, question.particlesA, ABSTRACTION_2AFC_SIZE);
      drawParticles(canvasRefB.current, question.particlesB, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_HULL_2AFC') {
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (mode === 'PALETTE_CLUSTERING') {
          onAnswer(selected4AfcIdx);
        } else if (mode === 'GESTURE_AXIS' || mode === 'NOTAN_THRESHOLD') {
          onAnswer(activeVal);
        }
      }
    };
~~~~~
~~~~~typescript
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (mode === 'PALETTE_CLUSTERING') {
          if (selected4AfcIdx !== null) onAnswer(selected4AfcIdx);
        } else if (mode === 'GESTURE_AXIS' || mode === 'NOTAN_THRESHOLD') {
          onAnswer(activeVal);
        }
      }
    };
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
      {!showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(activeVal);
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
~~~~~typescript
      {!showAnswer && !isGesture && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(activeVal);
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
1. 运行测试套件与代码检查，确保修改符合规范且无类型或构建错误。
2. 在浏览器中打开训练界面，验证“动态势线提取”、“折线低模大形”、“主调色群提炼”和“动态势线寻源”四项改动的交互与视觉表现。
