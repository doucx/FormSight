明白，这次调整包含了两个要点：
1. **设置 UI 顺序调整**：将“鼠标靠近磁性吸附”控件移至“自动切换下一题/切换延迟”下方，排在“自适应算子模式”上方。
2. **光标隐藏与高亮跟随逻辑**：
   - 只要鼠标进入网格点感应区（`isWithinRange`），系统光标统一隐藏（`cursor-none`）。
   - 在**磁性吸附开启**时，高亮准星吸附锁定在网格点中心 `(hoverPoint.x, hoverPoint.y)`。
   - 在**磁性吸附关闭**时，高亮准星在鼠标真实位置 `(rawCursor.x, rawCursor.y)` 上平滑跟随。

我将为你生成修改计划。

## [WIP] feat: 调整设置选项排序与两种模式下的感应区光标隐藏逻辑

### 用户需求
1. 在 `SettingsModal.tsx` 中，将“鼠标靠近磁性吸附”切换控制排在“切换延迟”下方、在“自适应算子模式”上方。
2. 在 `StarCanvas.tsx` 中，不论是否开启磁性吸附，只要鼠标靠近网格点（处于感应区内），均触发 `cursor-none` 隐藏系统默认光标。
3. 开启吸附时，高亮圆点吸附在网格点中心；关闭吸附时，高亮圆点平滑跟随真实鼠标坐标。

### 评论
统一在感应区内隐藏系统指针并使用蓝紫色圆点替代，能提供更加纯粹无干扰的视线聚焦体验；在不吸附模式下平滑跟随真实鼠标坐标，既能保持高亮提示，又能保留连续操控的手感。

### 目标
1. 调整 `SettingsModal.tsx` 中 DOM 节点的顺序，符合指定的设置布局规则。
2. 在 `StarCanvas.tsx` 中新增 `rawCursor` 状态存储当前真实鼠标 Canvas 坐标。
3. 调整 Canvas `className` 的 `cursor-none` 判定条件为 `hoverPoint !== null`。
4. 调整绘图逻辑，根据 `snapCursor` 参数选择绘制网格点坐标 `hoverPoint` 或真实坐标 `rawCursor`。

### 基本原理
1. 在 `handleRightCanvasMouseMove` 事件中，同时保存经 `findNearestGridPoint` 得到的最近网格点 `nearestPoint` 和转换后的鼠标逻辑坐标 `currentPoint`。
2. 只要处于感应范围内（`isWithinRange`），就赋予 `hoverPoint` 与 `rawCursor`，并在 Canvas 的 CSS class 中应用 `cursor-none` 样式。
3. 渲染图层 1.5 时，如开启 `snapCursor` 则以 `hoverPoint` 为圆心，如关闭 `snapCursor` 则以 `rawCursor` 为圆心渲染高亮蓝紫色准星。

### 标签
#intent/build #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/cursor-snapping #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 调整设置弹窗中的控件排列顺序

在 `SettingsModal.tsx` 中，将“鼠标靠近磁性吸附”挪至“切换延迟”的下方、“自适应算子模式”的上方。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
        <div className="space-y-5">
          {/* 自动翻页 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">自动切换下一题</div>
              <div className="text-xs text-slate-400">点击答题后无需手动按空格</div>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoNext}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {current.autoNext ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          {/* 鼠标网格点吸附 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">鼠标靠近磁性吸附</div>
              <div className="text-xs text-slate-400">靠近点位时自动锁定准心，提供精准视觉反馈</div>
            </div>
            <button
              type="button"
              onClick={handleToggleSnapCursor}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(current.snapCursor ?? true) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          {/* 自动翻页延迟 */}
          {current.autoNext && (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span>切换延迟</span>
                <span className="font-mono text-indigo-600 font-bold">
                  {current.autoNextDelay} ms
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={current.autoNextDelay}
                onInput={handleDelayChange}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          )}

          {/* 训练算子模式 */}
~~~~~
~~~~~typescript.new
        <div className="space-y-5">
          {/* 自动翻页 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">自动切换下一题</div>
              <div className="text-xs text-slate-400">点击答题后无需手动按空格</div>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoNext}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {current.autoNext ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          {/* 自动翻页延迟 */}
          {current.autoNext && (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span>切换延迟</span>
                <span className="font-mono text-indigo-600 font-bold">
                  {current.autoNextDelay} ms
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={current.autoNextDelay}
                onInput={handleDelayChange}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          )}

          {/* 鼠标网格点吸附 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">鼠标靠近磁性吸附</div>
              <div className="text-xs text-slate-400">靠近点位时自动锁定准心，提供精准视觉反馈</div>
            </div>
            <button
              type="button"
              onClick={handleToggleSnapCursor}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(current.snapCursor ?? true) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          {/* 训练算子模式 */}
~~~~~

#### Acts 2: 在 StarCanvas 中统一感应区光标隐藏与平滑跟随绘制逻辑

更新 `StarCanvas.tsx`，维护 `rawCursor` 状态，无论是否吸附均在感应区内隐藏系统光标；绘制时按 `snapCursor` 参数决定准星是在网格点中心还是真实鼠标坐标。

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
  snapCursor = true,
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
  snapCursor = true,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [rawCursor, setRawCursor] = useState<Point | null>(null);
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
        // 图层 1.5: 鼠标悬停高亮网格点（吸附模式或自由模式下在感应区内高亮）
        if (!disabled && hoverPoint) {
          drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
        }
~~~~~
~~~~~typescript.new
        // 图层 1.5: 鼠标悬停高亮网格点（吸附模式画网格点中心，不吸附模式画真实鼠标坐标）
        if (!disabled && hoverPoint) {
          const drawPos = snapCursor ? hoverPoint : (rawCursor || hoverPoint);
          drawDot(ctx, drawPos.x, drawPos.y, '#4F46E5', hoverRadius);
        }
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
  // === 交互事件：鼠标移动计算悬停高亮点 ===
  const handleRightCanvasMouseMove = (e: MouseEvent) => {
    if (disabled) {
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
  // === 交互事件：鼠标移动计算悬停高亮点 ===
  const handleRightCanvasMouseMove = (e: MouseEvent) => {
    if (disabled) {
      if (hoverPoint) setHoverPoint(null);
      if (rawCursor) setRawCursor(null);
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
      setRawCursor(currentPoint);
    } else {
      if (hoverPoint) setHoverPoint(null);
      if (rawCursor) setRawCursor(null);
    }
  };

  const handleRightCanvasMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
    if (rawCursor) setRawCursor(null);
  };
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
  // === 交互事件：点击右侧 Canvas 做答 ===
  const handleRightCanvasClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;

    const canvas = rightCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // 换算 CSS 实际像素到 Canvas 逻辑像素 (500x500)
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);

    // 忽略在有效感应范围之外的点击
    if (!hitResult.isWithinRange) return;

    setHoverPoint(null);
    onAnswer(clickPoint, hitResult);
  };
~~~~~
~~~~~typescript.new
  // === 交互事件：点击右侧 Canvas 做答 ===
  const handleRightCanvasClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;

    const canvas = rightCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // 换算 CSS 实际像素到 Canvas 逻辑像素 (500x500)
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);

    // 忽略在有效感应范围之外的点击
    if (!hitResult.isWithinRange) return;

    setHoverPoint(null);
    setRawCursor(null);
    onAnswer(clickPoint, hitResult);
  };
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled
              ? 'cursor-default'
              : snapCursor && hoverPoint
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
~~~~~
~~~~~typescript.new
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled
              ? 'cursor-default'
              : hoverPoint
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
~~~~~

### 下一步建议
1. 打开设置对话框，检查“鼠标靠近磁性吸附”选项已正确排在“切换延迟”与“自适应算子模式”之间。
2. 进入训练界面，分别测试开启吸附与关闭吸附时：
   - 鼠标移入感应区系统指针均消失。
   - 开启吸附时，高亮准星吸附在网格点上。
   - 关闭吸附时，高亮准星跟随鼠标真实位置移动。
