我将为你实现“鼠标磁性吸附”模式以及相关设置选项。

根据你的需求：
1. **设置扩展**：在 `UserSettings` 中增加 `magneticSnap` 字段（默认为开启 `true`），并在 `SettingsModal.tsx` 中（位于“切换延迟”下方、“自适应算子模式”上方）新增“鼠标靠近磁性吸附”开关。
2. **绘制与感知联动**：在 `StarCanvas.tsx` 中，鼠标划入网格点感应区（`isWithinRange === true`）时，系统光标均会触发 `cursor-none` 隐藏。
3. **坐标定位差异**：
   - **开启吸附**：高亮蓝紫点强制固定/跳变至 `(hoverPoint.x, hoverPoint.y)`。
   - **关闭吸附**：高亮蓝紫点实时跟随鼠标真实坐标 `(mousePos.x, mousePos.y)`，保持默认交互感。

以下是详细实施计划。

## [WIP] feat: 支持鼠标靠近磁性吸附模式与开关设置

### 用户需求
1. 支持两种鼠标定位交互模式：开启吸附时，靠近网格点感应区光标重定向吸附在点上；关闭吸附时，光标跟随鼠标真实坐标。
2. 两种模式下，鼠标划入感应区时，系统默认指针均隐藏（即样式包含 `cursor-none`）。
3. 使用现有的蓝紫色高亮点（`#4F46E5`），不增加套环或强光等其他额外视觉特效。
4. 在设置弹窗中添加“鼠标靠近磁性吸附”切换开关，其位置放在“切换延迟”下方，“自适应算子模式”上方。

### 评论
该功能极大地提升了手眼协调与鼠标精准点击训练中的视觉直觉反馈，同时保留开关选项照顾了不同习惯的用户群体。

### 目标
1. 在 `src/utils/settings.ts` 中扩展 `UserSettings` 配置接口及默认设置。
2. 在 `src/components/SettingsModal.tsx` 中的指定位置增加开关按钮。
3. 在 `src/components/StarCanvas.tsx` 中加入 `mousePos` 与 `isInSensoryRange` 状态控制，支持吸附与自由跟随绘制及感应区内系统光标隐藏。
4. 在 `src/views/TrainingView.tsx` 中将 `settings.magneticSnap` 传递至 `StarCanvas`。

### 基本原理
通过在 `StarCanvas` 的 MouseMove 事件处理中统一判断 `isWithinRange` 状态控制系统光标显隐（`cursor-none`），并结合 `magneticSnap` 配置决定蓝紫高亮点的绘制坐标是 `hoverPoint` 还是 `mousePos`，实现平滑无缝的吸附与非吸附体验。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/magnetic-snap #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在设置属性中添加 `magneticSnap` 配置项

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯 (12级), 'fine': 精细阶梯 (35级))
~~~~~
~~~~~typescript
export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms)
  magneticSnap: boolean; // 鼠标靠近磁性吸附
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯 (12级), 'fine': 精细阶梯 (35级))
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  magneticSnap: true,
  stepGranularity: 'standard',
~~~~~

#### Acts 2: 在设置弹窗 `SettingsModal` 中添加磁性吸附模式切换控制

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
  const handleDelayChange = (e: Event) => {
    const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
    setCurrent((prev) => ({ ...prev, autoNextDelay: val }));
  };

  const handleGranularityChange = (granularity: 'standard' | 'fine') => {
~~~~~
~~~~~typescript
  const handleDelayChange = (e: Event) => {
    const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
    setCurrent((prev) => ({ ...prev, autoNextDelay: val }));
  };

  const handleToggleMagneticSnap = () => {
    setCurrent((prev) => ({ ...prev, magneticSnap: !prev.magneticSnap }));
  };

  const handleGranularityChange = (granularity: 'standard' | 'fine') => {
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
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
~~~~~typescript
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

          {/* 鼠标靠近磁性吸附 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">鼠标靠近磁性吸附</div>
              <div className="text-xs text-slate-400">靠近网格点感应区时准心吸附在点上</div>
            </div>
            <button
              type="button"
              onClick={handleToggleMagneticSnap}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {current.magneticSnap ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          {/* 训练算子模式 */}
~~~~~

#### Acts 3: 在 `StarCanvas` 组件中实现高亮与磁性吸附渲染逻辑

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
interface StarCanvasProps {
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
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
~~~~~
~~~~~typescript
interface StarCanvasProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (clickPoint: Point, hitResult: HitResult) => void;
  disabled?: boolean;
  magneticSnap?: boolean;
}

export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  magneticSnap = true,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [isInSensoryRange, setIsInSensoryRange] = useState<boolean>(false);
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
        // 图层 1.5: 鼠标悬停高亮网格点
        if (!disabled && !showAnswer && hoverPoint) {
          drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
        }
~~~~~
~~~~~typescript
        // 图层 1.5: 鼠标悬停高亮网格点
        if (!disabled && !showAnswer && isInSensoryRange) {
          const drawPos = magneticSnap ? hoverPoint : mousePos;
          if (drawPos) {
            drawDot(ctx, drawPos.x, drawPos.y, '#4F46E5', hoverRadius);
          }
        }
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
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
~~~~~typescript
  // === 交互事件：鼠标移动计算悬停高亮点 ===
  const handleRightCanvasMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer) {
      if (isInSensoryRange) {
        setIsInSensoryRange(false);
        setHoverPoint(null);
        setMousePos(null);
      }
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
      setIsInSensoryRange(true);
      setHoverPoint(nearestPoint);
      setMousePos(currentPoint);
    } else {
      if (isInSensoryRange) {
        setIsInSensoryRange(false);
        setHoverPoint(null);
        setMousePos(null);
      }
    }
  };

  const handleRightCanvasMouseLeave = () => {
    if (isInSensoryRange) {
      setIsInSensoryRange(false);
      setHoverPoint(null);
      setMousePos(null);
    }
  };
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
    // 忽略在有效感应范围之外的点击
    if (!hitResult.isWithinRange) return;

    setHoverPoint(null);
    onAnswer(clickPoint, hitResult);
  };
~~~~~
~~~~~typescript
    // 忽略在有效感应范围之外的点击
    if (!hitResult.isWithinRange) return;

    setIsInSensoryRange(false);
    setHoverPoint(null);
    setMousePos(null);
    onAnswer(clickPoint, hitResult);
  };
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : hoverPoint
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
~~~~~
~~~~~typescript
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : isInSensoryRange
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
~~~~~

#### Acts 4: 在 `TrainingView` 中向 `StarCanvas` 传入 `magneticSnap` 设置

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
      {/* 核心双 Canvas 交互区 */}
      <StarCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />
~~~~~
~~~~~typescript
      {/* 核心双 Canvas 交互区 */}
      <StarCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
        magneticSnap={settings.magneticSnap}
      />
~~~~~

### 下一步建议
1. **测试体验**：你可以运行 `npm run dev` 启动测试，在“设置”页面中开关“鼠标靠近磁性吸附”，验证感应区内的吸附跳变与平滑跟随行为。
2. **Git 提交**：测试通过后，可以执行单独的 `[COMMIT]` 计划将此次变更提交到 Git。
