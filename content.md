好的，我将在偏好设置（SettingsModal）中新增一个开关选项，允许用户自由开启或关闭“综合拾色悬停试探时颜色预览与色值状态实时联动”功能。

下面为您生成实施计划：

## [WIP] feat(settings): 为综合拾色悬停试探颜色实时联动增加偏好设置开关

### 用户需求
在偏好设置（`SettingsModal.tsx`）中添加一个新的配置项，允许用户控制是否启用“综合拾色悬停试探时颜色预览与色值状态实时联动”。并在 `ColorCanvas.tsx` 中根据该设置决定是否在悬停时实时联动预览色。

### 评论
通过增加此开关，用户可以根据个人习惯在“悬停即时预览”与“仅点击确认后预览”之间自由切换，满足不同熟练度用户的个性化需求。

### 目标
1. 扩展 `src/utils/settings.ts` 中的 `UserSettings` 接口与默认配置，新增 `enableHoverColorPreview` 属性。
2. 更新 `src/components/SettingsModal.tsx`，在设置弹窗中渲染该开关选项。
3. 更新 `src/components/ColorCanvas.tsx`，接收并应用该设置。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/config #scope/ux #ai/instruct #task/domain/settings #task/object/hover-color-preview-toggle #task/action/feature-implementation #task/state/begin

---

### Script

#### Acts 1: 扩展 settings.ts 默认配置与类型定义

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否显示滑块容错感应区
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  starAutoNextDelay: 500,
  colorAutoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
  colorTargetingMode: 'off',
  colorManualTargetSectors: [],
  idleTimeout: 60,
  gridSize: 3,
  sliderHitMargin: 12,
  showToleranceBand: true,
};
~~~~~
~~~~~typescript.new
  sliderHitMargin: number; // 色感滑块极值吸附感应区外延大小 (px)
  showToleranceBand: boolean; // 是否显示滑块容错感应区
  enableHoverColorPreview: boolean; // 综合拾色悬停时是否实时联动颜色预览
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  starAutoNextDelay: 500,
  colorAutoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
  colorTargetingMode: 'off',
  colorManualTargetSectors: [],
  idleTimeout: 60,
  gridSize: 3,
  sliderHitMargin: 12,
  showToleranceBand: true,
  enableHoverColorPreview: true,
};
~~~~~

#### Acts 2: 在 SettingsModal 中添加开关选项

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
          {/* 色感滑块容错感应区可视化开关 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">显示滑块容错感应区</div>
              <div className="text-xs text-slate-400">在悬停光标两侧实时显示 ΔE 动态容错区间</div>
            </div>
            <button
              type="button"
              onClick={() =>
                updateSettings({ showToleranceBand: !(current.showToleranceBand ?? true) })
              }
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(current.showToleranceBand ?? true) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>
~~~~~
~~~~~typescript.new
          {/* 色感滑块容错感应区可视化开关 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">显示滑块容错感应区</div>
              <div className="text-xs text-slate-400">在悬停光标两侧实时显示 ΔE 动态容错区间</div>
            </div>
            <button
              type="button"
              onClick={() =>
                updateSettings({ showToleranceBand: !(current.showToleranceBand ?? true) })
              }
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(current.showToleranceBand ?? true) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          {/* 综合拾色悬停颜色实时联动开关 */}
          {appContext === 'color-sense' && (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-700">综合拾色悬停颜色实时联动</div>
                <div className="text-xs text-slate-400">鼠标悬停滑块时右侧色块实时跟随试探预览</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    enableHoverColorPreview: !(current.enableHoverColorPreview ?? true),
                  })
                }
                className="text-indigo-600 hover:opacity-80 transition-opacity"
              >
                {(current.enableHoverColorPreview ?? true) ? (
                  <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-300" />
                )}
              </button>
            </div>
          )}
~~~~~

#### Acts 3: 在 ColorCanvas 中接入 enableHoverColorPreview 设置

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number | [number, number, number]) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}
~~~~~
~~~~~typescript.new
interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number | [number, number, number]) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: ColorCanvasProps) {
~~~~~
~~~~~typescript.new
export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  enableHoverColorPreview = true,
}: ColorCanvasProps) {
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-75"
              style={{
                backgroundColor: hsvToHex(
                  allHoverVals.H !== null ? allHoverVals.H : userH,
                  allHoverVals.S !== null ? allHoverVals.S : userS,
                  allHoverVals.V !== null ? allHoverVals.V : userV,
                ),
              }}
            />
~~~~~
~~~~~typescript.new
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-75"
              style={{
                backgroundColor: hsvToHex(
                  enableHoverColorPreview && allHoverVals.H !== null ? allHoverVals.H : userH,
                  enableHoverColorPreview && allHoverVals.S !== null ? allHoverVals.S : userS,
                  enableHoverColorPreview && allHoverVals.V !== null ? allHoverVals.V : userV,
                ),
              }}
            />
~~~~~

#### Acts 4: 在 ColorTrainingView 中传递该设置属性

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
        hitMargin={settings.sliderHitMargin ?? 12}
        showToleranceBand={settings.showToleranceBand ?? true}
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
        showToleranceBand={settings.showToleranceBand ?? true}
        enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
      />
~~~~~

### 下一步建议
- **运行构建与测试**: 执行 `npm run check` 和 `npm run build` 确保所有代码修改逻辑清晰并成功编译。
