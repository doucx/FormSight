没问题！我们将将这个滑块极值吸附感应区的大小（`sliderHitMargin`）暴露为可持久化的配置项，并在偏好设置弹窗中提供【关闭 (0px)】、【8px】、【12px (默认)】与【20px (超大感应区)】供用户灵活选择。

以下是具体的实施计划：

## [WIP] feat(settings): 将色感滑块极值吸附感应区暴露为设置项

### 用户需求
将色感训练中滑块轨道的极值吸附感应外延像素大小（`sliderHitMargin`）提取为用户偏好设置项，允许用户在设置菜单中自定义（0px / 8px / 12px / 20px）。

### 评论
将硬编码的 UI 交互容差提升为配置项，提高了系统的灵活性，能适应不同硬件设备（如高 DPI 屏幕、触控屏或高敏鼠标）的使用习惯。

### 目标
1. 在 `UserSettings` 类型定义与默认配置中新增 `sliderHitMargin` 字段（默认 `12` px）。
2. 更新 `ColorCanvas` 组件，支持从外部传入 `hitMargin` 动态控制内外扩展样式。
3. 在 `ColorTrainingView` 中将设置项传递给 `ColorCanvas`。
4. 在 `SettingsModal` 设置面板中添加“色感滑块极值吸附外延感应区”配置按钮。

### 基本原理
通过内联样式依据 `hitMargin` 动态计算感应容器的 `padding` 和负 `margin`，在保持 DOM 结构精简的同时实现精准的感应区延伸；用户在设置弹窗更改后会实时存储至 `localStorage` 并在训练界面生效。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/config #scope/ux #ai/instruct #task/domain/ui #task/object/color-canvas #task/action/expose-setting #task/state/begin

---

### Script

#### Acts 1: 更新 UserSettings 类型与默认配置

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯 (12级), 'fine': 精细阶梯 (35级))
  adaptiveMode: AdaptiveMode; // 自适应算子模式 ('block': 轮次胜率评估, 'staircase': 经典3U1D)
  targetAccuracy: number; // 目标通关正确率 (0.7, 0.8, 0.85, 0.9)
  blockSize: number; // 每轮评估题数 (10, 15, 20)
  targetingMode: TargetingMode; // 专项靶向训练模式 ('off': 关闭, 'auto': 智能自动, 'manual': 手动指定)
  manualTargetSectors: number[]; // 手动锁定的扇区索引数组 [0~7]
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
export interface UserSettings {
  autoNext: boolean; // 点击后是否自动翻页
  autoNextDelay: number; // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 标准阶梯 (12级), 'fine': 精细阶梯 (35级))
  adaptiveMode: AdaptiveMode; // 自适应算子模式 ('block': 轮次胜率评估, 'staircase': 经典3U1D)
  targetAccuracy: number; // 目标通关正确率 (0.7, 0.8, 0.85, 0.9)
  blockSize: number; // 每轮评估题数 (10, 15, 20)
  targetingMode: TargetingMode; // 专项靶向训练模式 ('off': 关闭, 'auto': 智能自动, 'manual': 手动指定)
  manualTargetSectors: number[]; // 手动锁定的扇区索引数组 [0~7]
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  gridSize: number; // 网格维数 (2, 3, 4, 5)
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
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
  sliderHitMargin: 12,
};
~~~~~

#### Acts 2: 更新 ColorCanvas 支持配置化的 hitMargin

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
}

export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: ColorCanvasProps) {
~~~~~
~~~~~typescript.new
interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  hitMargin?: number;
}

export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
}: ColorCanvasProps) {
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
        {/* Track Extended Hit Area */}
        <div
          onClick={isTargetActiveMode ? handleActiveTrackClick : undefined}
          onKeyDown={
            isTargetActiveMode
              ? (e) => {
                  if (
                    (e.key === 'Enter' || e.key === ' ') &&
                    hoverVal !== null &&
                    !disabled &&
                    !showAnswer
                  ) {
                    e.preventDefault();
                    onAnswer(hoverVal);
                  }
                }
              : undefined
          }
          role={isTargetActiveMode ? 'button' : undefined}
          tabIndex={isTargetActiveMode && !showAnswer && !disabled ? 0 : undefined}
          onMouseMove={isTargetActiveMode ? handleMouseMove : undefined}
          onMouseLeave={isTargetActiveMode ? handleMouseLeave : undefined}
          className={`relative flex-1 py-1.5 -my-1.5 px-3 -mx-3 flex items-center ${
            isTargetActiveMode && !showAnswer && !disabled ? 'cursor-none' : 'cursor-default'
          }`}
        >
~~~~~
~~~~~typescript.new
        {/* Track Extended Hit Area */}
        <div
          onClick={isTargetActiveMode ? handleActiveTrackClick : undefined}
          onKeyDown={
            isTargetActiveMode
              ? (e) => {
                  if (
                    (e.key === 'Enter' || e.key === ' ') &&
                    hoverVal !== null &&
                    !disabled &&
                    !showAnswer
                  ) {
                    e.preventDefault();
                    onAnswer(hoverVal);
                  }
                }
              : undefined
          }
          role={isTargetActiveMode ? 'button' : undefined}
          tabIndex={isTargetActiveMode && !showAnswer && !disabled ? 0 : undefined}
          onMouseMove={isTargetActiveMode ? handleMouseMove : undefined}
          onMouseLeave={isTargetActiveMode ? handleMouseLeave : undefined}
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
          className={`relative flex-1 flex items-center ${
            isTargetActiveMode && !showAnswer && !disabled ? 'cursor-none' : 'cursor-default'
          }`}
        >
~~~~~

#### Acts 3: 在 ColorTrainingView 中传递 hitMargin 设置

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript.old
      {/* 色彩交互 Canvas */}
      <ColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />
~~~~~
~~~~~typescript.new
      {/* 色彩交互 Canvas */}
      <ColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
        hitMargin={settings.sliderHitMargin ?? 12}
      />
~~~~~

#### Acts 4: 在 SettingsModal 中增加极值吸附感应区配置项

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
          {/* 无操作闲置暂停计时 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">无操作闲置暂停计时</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '关闭', value: 0 },
                { label: '30秒', value: 30 },
                { label: '1分钟', value: 60 },
                { label: '2分钟', value: 120 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => updateSettings({ idleTimeout: opt.value })}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.idleTimeout ?? 60) === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
~~~~~
~~~~~typescript.new
          {/* 无操作闲置暂停计时 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">无操作闲置暂停计时</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '关闭', value: 0 },
                { label: '30秒', value: 30 },
                { label: '1分钟', value: 60 },
                { label: '2分钟', value: 120 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => updateSettings({ idleTimeout: opt.value })}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.idleTimeout ?? 60) === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 色感滑块极值吸附外延感应区 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">色感滑块极值吸附外延感应区</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '关闭 (0px)', value: 0 },
                { label: '8px', value: 8 },
                { label: '12px', value: 12 },
                { label: '20px', value: 20 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => updateSettings({ sliderHitMargin: opt.value })}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.sliderHitMargin ?? 12) === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
~~~~~

### 下一步建议
1. 打开偏好设置弹窗，测试切换“关闭 (0px)”、“8px”、“12px”及“20px”。
2. 进入色感练习视图，验证滑块吸附感应范围是否根据设置即时变化。
