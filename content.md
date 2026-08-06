这两个改进想法非常贴合实际交互逻辑！

为了实现这一效果，我们将原生光标隐藏与 Canvas 内部绘制结合：
1. **磁性吸附准心 (Magnetic Snap)**：当鼠标划入网格点感应区时，系统光标隐藏，Canvas 在该网格点的精确物理坐标处绘制一个**双层磁吸高亮准心（套环 + 强光点）**。当鼠标移向另一个点时，准心会即时跳变吸附到新点上，给用户“鼠标已精确锁定在点上”的直觉。
2. **做答后防遮挡 (Post-answer Stealth)**：在答题结束（显示答案）后，只要鼠标依然处于点附近，系统光标继续维持隐藏状态，避免遮挡深绿色正确十字或红色误差线；只有将鼠标移至空白背景时，原生光标才恢复。

下面为您生成的 Quipu 执行计划：

## [WIP] feat: 实现网格点磁性吸附准心与做答后防遮挡光标

### 用户需求
1. 鼠标靠近网格点时，准心应磁性吸附在网格点的精确坐标上，移动到新点时自动跳变吸附，直观呈现“鼠标精确在点上”。
2. 点击作答后，只要鼠标还在点附近，就继续保持指针隐藏，防止遮挡做答结果与误差反馈，只有移至空白背景时才恢复显示。

### 评论
磁性吸附准心（Magnetic Snap Cursor）极大提升了手眼协调练习的交互精度，解决了高密度点阵下微小偏移带来的疑惑；而做答后的持续防遮挡机制则确保了反馈信息的完整呈现。

### 目标
1. 在 `StarCanvas.tsx` 中添加 `mousePos` 状态，并在 `showAnswer` 状态下继续保持感应区检测。
2. 在 `!showAnswer` 且 `hoverPoint` 存在时，在 Canvas 上绘制双层磁吸准心（小高亮点 + 吸附瞄准光环）。
3. 改进 `isCursorHidden` 判定逻辑，使 `showAnswer` 期间靠近点时依然应用 `cursor-none` 样式。

### 基本原理
通过 `findNearestGridPoint` 计算鼠标与网格点的距离。当距离小于感应半径时，忽略鼠标自身的微小抖动，将光标渲染坐标强制重定向（Snap）为 `(hoverPoint.x, hoverPoint.y)`，并绘制磁吸外环；控制 `cursor-none` 的触发条件为 `hoverPoint !== null`，覆盖作答前与作答后的全过程。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/magnetic-snap-cursor #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在 `StarCanvas.tsx` 中实现磁性吸附准心与做答后光标隐藏

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
~~~~~
~~~~~typescript.new
export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
        // 图层 1.5: 鼠标悬停高亮网格点
        if (!disabled && !showAnswer && hoverPoint) {
          drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
        }
~~~~~
~~~~~typescript.new
        // 图层 1.5: 磁性吸附准心 (未作答状态下吸附在网格点上)
        if (!disabled && !showAnswer) {
          if (hoverPoint) {
            // 1. 磁吸实体核心点
            drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
            // 2. 磁吸包围光环 (强视觉提示：鼠标已精确锁定在点上)
            ctx.strokeStyle = '#6366F1';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(hoverPoint.x, hoverPoint.y, hoverRadius + 3.5, 0, Math.PI * 2);
            ctx.stroke();
          } else if (mousePos) {
            // 空白区域：绘制跟随实际鼠标的极淡微型准心
            drawDot(ctx, mousePos.x, mousePos.y, 'rgba(99, 102, 241, 0.35)', 2);
          }
        }
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
  // === 交互事件：鼠标移动计算悬停高亮点 ===
  const handleRightCanvasMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer) {
      if (hoverPoint) setHoverPoint(null);
      return;
    }

    const canvas = rightCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const currentPoint: Point = { x: clickX, y: clickY };
    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      currentPoint,
      question.distractorPoints,
    );

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleRightCanvasMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
  };
~~~~~
~~~~~typescript.new
  // === 交互事件：鼠标移动计算悬停吸附与指针隐藏 ===
  const handleRightCanvasMouseMove = (e: MouseEvent) => {
    if (disabled) {
      if (hoverPoint) setHoverPoint(null);
      if (mousePos) setMousePos(null);
      return;
    }

    const canvas = rightCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const currentPoint: Point = { x: clickX, y: clickY };
    setMousePos(currentPoint);

    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      currentPoint,
      question.distractorPoints,
    );

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else {
      setHoverPoint(null);
    }
  };

  const handleRightCanvasMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
    if (mousePos) setMousePos(null);
  };
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      {/* 左侧参考 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner"
        />
      </div>

      {/* 右侧交互 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={rightCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleRightCanvasClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="右侧做答画布"
          onMouseMove={handleRightCanvasMouseMove}
          onMouseLeave={handleRightCanvasMouseLeave}
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : hoverPoint
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
        />
      </div>
    </div>
  );
~~~~~
~~~~~typescript.new
  const isCursorHidden = !disabled && hoverPoint !== null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      {/* 左侧参考 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner"
        />
      </div>

      {/* 右侧交互 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={rightCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleRightCanvasClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="右侧做答画布"
          onMouseMove={handleRightCanvasMouseMove}
          onMouseLeave={handleRightCanvasMouseLeave}
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled
              ? 'cursor-default'
              : isCursorHidden
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
        />
      </div>
    </div>
  );
~~~~~

### 下一步建议
1. 在答题交互中移动鼠标，感受当鼠标进入点附近时，套线准心精准磁吸跳变到网格点上的手感。
2. 点击答题后，保持鼠标在点附近不动，验证系统指针是否依然保持隐形状态，防止遮挡深绿十字与红色误差连线。
