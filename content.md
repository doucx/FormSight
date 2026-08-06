这个需求非常清晰合理。通过引入“鼠标吸附网格点”的开关和渲染逻辑，我们可以在保持系统原生十字光标模式的同时，支持高精度的光标磁性吸附锁定，从而兼顾不同习惯用户的作答直觉。

我将为你生成一个执行计划，在设置项中添加鼠标吸附开关，并调整 Canvas 中的光标重定向与样式逻辑。

## [WIP] feat: 增加鼠标网格点吸附功能及设置切换开关

### 用户需求
1. 当鼠标移入网格点感应区时，在吸附模式下隐藏系统光标（`cursor-none`），并将准星精确重定向吸附到当前悬停的网格点 `(hoverPoint.x, hoverPoint.y)`，移动到新点附近时即时跳变吸附。
2. 保持现有的蓝紫色高亮指示，不添加额外的套环或强光点样式。
3. 在设置菜单中提供模式切换选项，允许用户在“鼠标吸附模式”与“原版自由光标模式”之间随时切换。

### 评论
将光标精确重定向到物理网格点上，能极大增强手眼协调训练中的“已精准锁定”反馈，同时保留不吸附选项可满足不同习惯用户的需求，是一个很实用的 UX 改进。

### 目标
1. 在 `UserSettings` 配置定义与默认值中扩展 `snapCursor: boolean` 属性（默认开启）。
2. 在 `SettingsModal.tsx` 设置弹窗中增加“鼠标磁性吸附网格点”Toggle 切换按钮。
3. 在 `StarCanvas.tsx` 中增加 `snapCursor` 属性控制，优化 `handleRightCanvasMouseMove` 及 Canvas 光标 CSS 类，确保在作答前后的全过程中均能平滑吸附跳变。
4. 在 `TrainingView.tsx` 中将用户设置的 `snapCursor` 状态透传给 `StarCanvas`。

### 基本原理
1. 通过 `settings.ts` 扩展持久化配置，确保用户的吸附偏好能在浏览器中保存。
2. 在 `StarCanvas` 的 MouseMove 处理程序中，根据 `findNearestGridPoint` 的判定结果设置 `hoverPoint`。
3. 根据 `snapCursor && hoverPoint !== null` 组合条件决定是否激活 `cursor-none` 类，仅在吸附模式且在感应范围内时隐藏系统指针并渲染点位吸附，在非吸附模式或越界时保持系统十字准星 `cursor-crosshair`。

### 标签
#intent/build #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/cursor-snapping #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 扩展用户偏好配置类型与默认值

在 `settings.ts` 中添加 `snapCursor` 字段，默认设为 `true`。

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  gridSize: number; // 网格维数 (2, 3, 4, 5)
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
  idleTimeout: 60,
  gridSize: 3,
};
~~~~~
~~~~~typescript.new
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  gridSize: number; // 网格维数 (2, 3, 4, 5)
  snapCursor: boolean; // 鼠标靠近网格点时是否吸附
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
  idleTimeout: 60,
  gridSize: 3,
  snapCursor: true,
};
~~~~~

#### Acts 2: 在设置弹窗中添加鼠标吸附模式切换按钮

在 `SettingsModal.tsx` 中添加 `handleToggleSnapCursor` 并增加对应控制选项。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
  const handleToggleAutoNext = () => {
    setCurrent((prev) => ({ ...prev, autoNext: !prev.autoNext }));
  };
~~~~~
~~~~~typescript.new
  const handleToggleAutoNext = () => {
    setCurrent((prev) => ({ ...prev, autoNext: !prev.autoNext }));
  };

  const handleToggleSnapCursor = () => {
    setCurrent((prev) => ({ ...prev, snapCursor: !(prev.snapCursor ?? true) }));
  };
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
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
~~~~~

#### Acts 3: 优化 StarCanvas 画布光标吸附与高亮逻辑

更新 `StarCanvas.tsx`，添加 `snapCursor` 参数并在鼠标划入感应区时控制吸附点与指针样式。

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
interface StarCanvasProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (clickPoint: Point, hitResult: HitResult) => void;
  disabled?: boolean;
  snapCursor?: boolean;
}

export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  snapCursor = true,
}: StarCanvasProps) {
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
        // 图层 1.5: 鼠标悬停高亮网格点（吸附模式或自由模式下在感应区内高亮）
        if (!disabled && hoverPoint) {
          drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
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
~~~~~
~~~~~typescript.new
  // === 交互事件：鼠标移动计算悬停高亮点 ===
  const handleRightCanvasMouseMove = (e: MouseEvent) => {
    if (disabled) {
      if (hoverPoint) setHoverPoint(null);
      return;
    }
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : hoverPoint
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
~~~~~
~~~~~typescript.new
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled
              ? 'cursor-default'
              : snapCursor && hoverPoint
                ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
~~~~~

#### Acts 4: 在 TrainingView 中向 StarCanvas 传递 snapCursor 配置

将 `settings.snapCursor` 传给 `StarCanvas`。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
      {/* 核心双 Canvas 交互区 */}
      <StarCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />
~~~~~
~~~~~typescript.new
      {/* 核心双 Canvas 交互区 */}
      <StarCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
        snapCursor={settings.snapCursor}
      />
~~~~~

### 下一步建议
1. 启动本地 Vite 开发服务器（`npm run dev`），在设置菜单中测试开启/关闭“鼠标靠近磁性吸附”。
2. 验证在吸附模式开启时，鼠标移动到网格点附近光标隐藏并精确跳变锁定到网格点，离开感应区后自动恢复十字光标。
