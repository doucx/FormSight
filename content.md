好的，我已经分析了需求。色感识别训练模块在底层逻辑上已经支持自动切换下一题和自适应算子控制，但此前色感看板缺少偏好设置入口，设置弹窗（`SettingsModal`）也包含了仅针对寻星模式的几何干扰点网格大小和弱点扇区靶向强化配置。

我将为色感识别模块补充偏好设置入口，并支持在色感偏好设置中专注于配置“自动切换下一题”与“自适应算子模式”等通用参数。

## ## [WIP] feat: 为色感识别模块添加偏好设置功能

### 用户需求

用户希望为色感识别模块也提供偏好设置入口，设置项包含：
1. **自动切换下一题**（开关及延迟时间设置）
2. **自适应算子相关内容**（轮次胜率评估 vs 经典 3U1D 阶梯算子、通关正确率、评估题量、网格步长精细度）

### 评论

色感训练（Hue/Saturation/Value）在作答后与寻星练习同样需要流畅的自适应难度调整和翻页逻辑。通过为色感看板提供独立的偏好设置入口，并根据模块上下文（`appContext`）隐去仅属于寻星几何图层特有的网格点阵及角度扇区设置，能够极大地提升色感练习的用户体验（UX）。

### 目标

1. 扩展 `SettingsModal.tsx`，使其支持 `appContext?: 'star-hopping' | 'color-sense'` 属性。
2. 在色感模式（`color-sense`）下，仅保留“自动切换下一题”和“自适应算子模式/配置”，隐藏网格大小与扇区靶向强化设置。
3. 在 `ColorDashboard.tsx` 顶栏增加“偏好设置”按钮。
4. 在 `app.tsx` 中连接色感偏好设置的打开逻辑与上下文状态控制。

### 基本原理

色感训练视图 `ColorTrainingView.tsx` 内部本已对接 `settings` 的 `autoNext` 和 `AdaptiveEngine` 机制。通过增加 UI 入口与设置弹窗的按需定制展示，无需改动后端算法，即可让用户方便地调控色感练习时的自适应算子参数与自动翻页行为。

### 标签

#intent/build #flow/ready #priority/high #comp/ui #concept/config #scope/ux #ai/instruct #task/domain/ui #task/object/color-sense-settings #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新 `SettingsModal.tsx` 支持按模块上下文按需渲染

修改 `SettingsModal` 接收 `appContext` 参数，在色感模式下隐藏寻星专有的网格大小与弱点靶向设置，仅展示“自动切换下一题”和“自适应算子相关配置”。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
interface SettingsModalProps {
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
  onDataCleared?: () => void;
}

export function SettingsModal({ settings, onClose, onSave, onDataCleared }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
~~~~~
~~~~~typescript.new
interface SettingsModalProps {
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
  onDataCleared?: () => void;
  appContext?: 'star-hopping' | 'color-sense';
}

export function SettingsModal({
  settings,
  onClose,
  onSave,
  onDataCleared,
  appContext = 'star-hopping',
}: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">训练偏好设置</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
~~~~~
~~~~~typescript.new
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">
              {appContext === 'color-sense' ? '色感训练偏好设置' : '寻星训练偏好设置'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
          {/* 干扰点网格大小 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">干扰点网格大小</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[2, 3, 4, 5].map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => updateSettings({ gridSize: size })}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.gridSize ?? 3) === size
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          {/* 专项靶向强化训练设置 */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Crosshair className="w-4 h-4 text-indigo-600" />
              弱点专项靶向强化
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'off', label: '关闭 (全随机)' },
                { id: 'auto', label: '智能自动' },
                { id: 'manual', label: '手动指定' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => updateSettings({ targetingMode: m.id as TargetingMode })}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    current.targetingMode === m.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* 手动勾选扇区 */}
            {current.targetingMode === 'manual' && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-[11px] font-semibold text-slate-500">
                  选择需要靶向强化的角度扇区：
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {SECTOR_NAMES.map((name, idx) => {
                    const selected = (current.manualTargetSectors || []).includes(idx);
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => handleSectorToggle(idx)}
                        className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                          selected
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
~~~~~
~~~~~typescript.new
          {/* 仅寻星训练模式下显示干扰点网格大小与弱点靶向设置 */}
          {appContext === 'star-hopping' && (
            <>
              {/* 干扰点网格大小 */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">干扰点网格大小</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[2, 3, 4, 5].map((size) => (
                    <button
                      type="button"
                      key={size}
                      onClick={() => updateSettings({ gridSize: size })}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        (current.gridSize ?? 3) === size
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {size}x{size}
                    </button>
                  ))}
                </div>
              </div>

              {/* 专项靶向强化训练设置 */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Crosshair className="w-4 h-4 text-indigo-600" />
                  弱点专项靶向强化
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'off', label: '关闭 (全随机)' },
                    { id: 'auto', label: '智能自动' },
                    { id: 'manual', label: '手动指定' },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => updateSettings({ targetingMode: m.id as TargetingMode })}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        current.targetingMode === m.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* 手动勾选扇区 */}
                {current.targetingMode === 'manual' && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500">
                      选择需要靶向强化的角度扇区：
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SECTOR_NAMES.map((name, idx) => {
                        const selected = (current.manualTargetSectors || []).includes(idx);
                        return (
                          <button
                            type="button"
                            key={name}
                            onClick={() => handleSectorToggle(idx)}
                            className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                              selected
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
~~~~~

#### Acts 2: 在 `ColorDashboard.tsx` 顶栏增加偏好设置按钮

在色感看板的主顶栏增加 `偏好设置` 按钮，并透传 `onOpenSettings` 属性。

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
import { Award, Clock, Play, RotateCw, Target, TrendingUp } from 'lucide-preact';
import type { ColorMode } from '../utils/colorUtils';
import { type ColorProfileData, formatTotalTime } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
}
~~~~~
~~~~~typescript.new
import { Award, Clock, Play, RotateCw, Sliders, Target, TrendingUp } from 'lucide-preact';
import type { ColorMode } from '../utils/colorUtils';
import { type ColorProfileData, formatTotalTime } from '../utils/db';

interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
export function ColorDashboard({
  profiles,
  onStart,
  onBackToHome,
}: ColorDashboardProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToHome}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
          >
            ← 返回主页
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              色感训练 <span className="text-indigo-600 font-light text-xl">Color Recognition</span>
            </h1>
          </div>
        </div>
      </div>
~~~~~
~~~~~typescript.new
export function ColorDashboard({
  profiles,
  onStart,
  onBackToHome,
  onOpenSettings,
}: ColorDashboardProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToHome}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
          >
            ← 返回主页
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              色感训练 <span className="text-indigo-600 font-light text-xl">Color Recognition</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="偏好设置"
          >
            <Sliders className="w-4 h-4" />
            偏好设置
          </button>
        </div>
      </div>
~~~~~

#### Acts 3: 在 `app.tsx` 连接色感偏好设置回调与设置上下文状态

添加 `settingsContext` 变量，区分寻星练习和色感训练的偏好设置模式，并将其传递给 `SettingsModal`。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
~~~~~
~~~~~typescript.new
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsContext, setSettingsContext] = useState<'star-hopping' | 'color-sense'>(
    'star-hopping',
  );
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
      {currentApp === 'star-hopping' &&
        (currentView === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
            onStart={handleStartTraining}
            onRefreshProfiles={refreshProfiles}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAnalytics={handleOpenAnalytics}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <TrainingView
            mode={activeMode}
            sessionType={sessionType}
            initialLevel={activeLevel}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}

      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <ColorTrainingView
            mode={activeColorMode}
            sessionType={colorSessionType}
            initialLevel={activeColorLevel}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
          onDataCleared={refreshProfiles}
        />
      )}
~~~~~
~~~~~typescript.new
      {currentApp === 'star-hopping' &&
        (currentView === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
            onStart={handleStartTraining}
            onRefreshProfiles={refreshProfiles}
            onOpenSettings={() => {
              setSettingsContext('star-hopping');
              setIsSettingsOpen(true);
            }}
            onOpenAnalytics={handleOpenAnalytics}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <TrainingView
            mode={activeMode}
            sessionType={sessionType}
            initialLevel={activeLevel}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}

      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsContext('color-sense');
              setIsSettingsOpen(true);
            }}
          />
        ) : (
          <ColorTrainingView
            mode={activeColorMode}
            sessionType={colorSessionType}
            initialLevel={activeColorLevel}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
          onDataCleared={refreshProfiles}
          appContext={settingsContext}
        />
      )}
~~~~~

### 下一步建议

- 可以在未来添加色感训练专有的指标弱点分析（比如针对 Hue, Value, Saturation 的差异容错曲线分析面板）。
- 验证改动后可以在终端运行 `npm run check` 检查 TypeScript 类型约束与 Biome 格式约束。
