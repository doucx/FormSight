好的，理解你的需求。本次 UI 优化与功能重构的核心目标是**“去冗余文字、设计驱动、Anki 风格极简化”**，具体包含以下改进：

1. **设置功能 (Settings System)**：
   - 支持设置“点击作答后是否自动翻页” (`autoNext`)。
   - 支持设置“自动翻页延迟时间” (`autoNextDelay` ms，范围如 100ms ~ 2000ms)。
   - 支持设置“难度步长间隔粒度” (`stepGranularity`)：可选择**标准阶梯**或 **1px 精细阶梯** (35px, 34px ... 1px)，以更精准地探测与测试感知度数极限。
2. **UI 极简与去算法化**：
   - **Dashboard**: 移除 Banner 中透露算法实现的“自适应空间造型算法 v1.0”、“基于 3-Up/1-Down...” 等废话，改用极其干净现代的头部，并增加**设置按钮**。
   - **StarCanvas**: 移除“左图：观察参考”、“右图：点击答题区” 等多余标题文字，使用纯净设计语言。
   - **TrainingView**: 移除“观察左图相对几何关系…”等提示文案，将状态反馈（如击中/误差）极简化，类似于 Anki 简单高效的交互流。

下面是为您生成的 Quipu 计划与执行指令：

## [WIP] refactor: UI 极简重构与设置功能扩展 (自动翻页/延迟/1px步长)

### 用户需求
1. 将硬编码的 500ms 延迟改为可配置项（是否自动翻页、翻页间隔延迟）。
2. 支持 1px 细粒度的网格步长调整，用于更精准识别感知度数。
3. 隐藏主界面的算法披露文案（“自适应空间造型算法”、“基于 3-Up/1-Down...” 等）。
4. 移除“左图：观察参考”、“观察左图相对几何关系…”等教学式文字，改用类似 Anki 的极简设计。

### 评论
这些改动将显著提升训练效率。过多的文字解释会让训练者分心，去除干扰后，整体视觉风格将更符合专业训练工具的沉浸式体验。同时增加灵活的翻页策略和 1px 度数控制，增强了系统的数据准确度。

### 目标
1. 新建 `src/utils/settings.ts` 模块，提供本地设置持久化（自动翻页、延迟、1px步长精细度）。
2. 重构 `AdaptiveEngine` 支持 1px 精细度梯阶 (`35px, 34px ... 1px`)。
3. 创建 `SettingsModal.tsx` 设置弹窗。
4. 优化 `StarCanvas.tsx`，移除冗余标题标签。
5. 优化 `Dashboard.tsx`，移除算法废话，引入设置入口。
6. 优化 `TrainingView.tsx`，对接自定义延迟与自动翻页逻辑，精简答题栏。

### 基本原理
通过统一的本地配置驱动 `TrainingView` 中的定时器逻辑与 `AdaptiveEngine` 的梯阶选择，解耦视图与硬编码参数。同时大幅裁撤 DOM 中的提示性文本元素，仅保留极简的状态指标与 Canvas 主体。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/settings-and-minimalism #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建设置管理模块 `settings.ts`

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export type StepGranularity = 'standard' | 'fine';

export interface UserSettings {
  autoNext: boolean;            // 点击后是否自动翻页
  autoNextDelay: number;       // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 默认阶梯, 'fine': 1px逐级)
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load user settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}
~~~~~

#### Acts 2: 更新 `AdaptiveEngine` 以支持 1px 精细步长

~~~~~act
patch_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~typescript.old
/**
 * 网格步长难度序列（单位：px）
 * 从大到小排列：步长越小，网格点阵越密，选择难度越高
 */
export const GRID_STEP_SEQUENCE = [35, 30, 25, 20, 16, 13, 10, 8, 6, 5, 4, 3];

export type AdaptiveChange = 'up' | 'down' | 'same';

export class AdaptiveEngine {
  private currentStepIndex: number;
  private consecutiveCorrect: number = 0;

  constructor(initialGridStep: number = 20) {
    const idx = GRID_STEP_SEQUENCE.indexOf(initialGridStep);
    this.currentStepIndex = idx !== -1 ? idx : 3; // 默认 20px (索引 3)
  }

  /**
   * 获取当前难度的 GridStep 像素值
   */
  public getCurrentStep(): number {
    return GRID_STEP_SEQUENCE[this.currentStepIndex];
  }
~~~~~
~~~~~typescript.new
/**
 * 标准网格步长难度序列（单位：px）
 */
export const STANDARD_STEP_SEQUENCE = [35, 30, 25, 20, 16, 13, 10, 8, 6, 5, 4, 3];

/**
 * 1px 精细步长难度序列 (35px -> 1px)
 */
export const FINE_STEP_SEQUENCE = Array.from({ length: 35 }, (_, i) => 35 - i);

export type AdaptiveChange = 'up' | 'down' | 'same';

export class AdaptiveEngine {
  private stepSequence: number[];
  private currentStepIndex: number;
  private consecutiveCorrect: number = 0;

  constructor(initialGridStep: number = 20, isFineGranularity: boolean = false) {
    this.stepSequence = isFineGranularity ? FINE_STEP_SEQUENCE : STANDARD_STEP_SEQUENCE;
    
    // 找到与 initialGridStep 最接近的索引
    let closestIdx = 0;
    let minDiff = Math.abs(this.stepSequence[0] - initialGridStep);
    for (let i = 1; i < this.stepSequence.length; i++) {
      const diff = Math.abs(this.stepSequence[i] - initialGridStep);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    this.currentStepIndex = closestIdx;
  }

  /**
   * 获取当前难度的 GridStep 像素值
   */
  public getCurrentStep(): number {
    return this.stepSequence[this.currentStepIndex];
  }
~~~~~

~~~~~act
patch_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~typescript.old
      // 连续答对 3 题 -> 增加难度 (降低 GridStep 步长)
      if (this.consecutiveCorrect >= 3) {
        this.consecutiveCorrect = 0;
        if (this.currentStepIndex < GRID_STEP_SEQUENCE.length - 1) {
          this.currentStepIndex += 1;
          return { newStep: this.getCurrentStep(), change: 'up' };
        }
      }
    } else {
      // 答错 1 题 -> 重置计数并立刻降低难度 (增大 GridStep 步长)
      this.consecutiveCorrect = 0;
      if (this.currentStepIndex > 0) {
        this.currentStepIndex -= 1;
        return { newStep: this.getCurrentStep(), change: 'down' };
      }
    }
~~~~~
~~~~~typescript.new
      // 连续答对 3 题 -> 增加难度 (降低 GridStep 步长)
      if (this.consecutiveCorrect >= 3) {
        this.consecutiveCorrect = 0;
        if (this.currentStepIndex < this.stepSequence.length - 1) {
          this.currentStepIndex += 1;
          return { newStep: this.getCurrentStep(), change: 'up' };
        }
      }
    } else {
      // 答错 1 题 -> 重置计数并立刻降低难度 (增大 GridStep 步长)
      this.consecutiveCorrect = 0;
      if (this.currentStepIndex > 0) {
        this.currentStepIndex -= 1;
        return { newStep: this.getCurrentStep(), change: 'down' };
      }
    }
~~~~~

~~~~~act
patch_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~typescript.old
  public setGridStep(step: number): void {
    const idx = GRID_STEP_SEQUENCE.indexOf(step);
    if (idx !== -1) {
      this.currentStepIndex = idx;
      this.consecutiveCorrect = 0;
    }
  }
~~~~~
~~~~~typescript.new
  public setGridStep(step: number): void {
    const idx = this.stepSequence.indexOf(step);
    if (idx !== -1) {
      this.currentStepIndex = idx;
      this.consecutiveCorrect = 0;
    }
  }
~~~~~

#### Acts 3: 创建设置面板组件 `SettingsModal.tsx`

~~~~~act
write_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { X, Sliders, ToggleLeft, ToggleRight } from 'lucide-preact';
import { UserSettings, saveSettings } from '../utils/settings';

interface SettingsModalProps {
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });

  const handleToggleAutoNext = () => {
    setCurrent((prev) => ({ ...prev, autoNext: !prev.autoNext }));
  };

  const handleDelayChange = (e: Event) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    setCurrent((prev) => ({ ...prev, autoNextDelay: val }));
  };

  const handleGranularityChange = (granularity: 'standard' | 'fine') => {
    setCurrent((prev) => ({ ...prev, stepGranularity: granularity }));
  };

  const handleConfirm = () => {
    saveSettings(current);
    onSave(current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">训练偏好设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* 自动翻页 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">自动切换下一题</div>
              <div className="text-xs text-slate-400">点击答题后无需手动按空格</div>
            </div>
            <button
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

          {/* 难度步长粒度 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">网格步长精细度</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleGranularityChange('standard')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'standard'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                标准阶梯 (5px梯度)
              </button>
              <button
                onClick={() => handleGranularityChange('fine')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  current.stepGranularity === 'fine'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                精细阶梯 (1px逐级)
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 精简 `StarCanvas.tsx` 页面视觉提示

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      {/* 左侧参考 Canvas */}
      <div className="flex flex-col items-center bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          <span className="text-xs font-bold text-gray-600 tracking-wider uppercase">
            左图：观察参考
          </span>
        </div>
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner"
        />
      </div>

      {/* 右侧交互 Canvas */}
      <div className="flex flex-col items-center bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-bold text-gray-600 tracking-wider uppercase">
            右图：点击答题区
          </span>
        </div>
        <canvas
          ref={rightCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleRightCanvasClick}
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
        />
      </div>
    </div>
  );
~~~~~
~~~~~typescript.new
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
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
        />
      </div>
    </div>
  );
~~~~~

#### Acts 5: 优化 `Dashboard.tsx` 页面（去文字化 + 设置入口）

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript.old
import {
  Compass,
  Crosshair,
  RotateCw,
  Download,
  Upload,
  Play,
  Target,
  Sparkles,
  TrendingUp,
  Award,
} from 'lucide-preact';
import { TrainingMode } from '../types';
import { UserProfileData, exportAllData, importAllData } from '../utils/db';

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
}
~~~~~
~~~~~typescript.new
import {
  Compass,
  Crosshair,
  RotateCw,
  Download,
  Upload,
  Play,
  Target,
  TrendingUp,
  Award,
  Sliders,
} from 'lucide-preact';
import { TrainingMode } from '../types';
import { UserProfileData, exportAllData, importAllData } from '../utils/db';

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript.old
export function Dashboard({ profiles, onStart, onRefreshProfiles }: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `star_hopping_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        alert('✅ 数据导入成功！');
        onRefreshProfiles();
      } else {
        alert('❌ 导入失败，数据格式不匹配。');
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* 顶部 Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl shadow-xl border border-slate-800">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              自适应空间造型算法 v1.0
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              寻星练习 <span className="text-indigo-400 font-light">Star-Hopping</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              基于 3-Up/1-Down 阶梯梯度的空间眼力与几何推演训练系统，精确度量并提升观察定点能力。
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExport}
              className="px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-400" />
              导出数据
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              导入数据
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </div>
      </div>
~~~~~
~~~~~typescript.new
export function Dashboard({ profiles, onStart, onRefreshProfiles, onOpenSettings }: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `star_hopping_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        alert('✅ 数据导入成功！');
        onRefreshProfiles();
      } else {
        alert('❌ 导入失败，数据格式不匹配。');
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* 极简 Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          寻星练习 <span className="text-indigo-600 font-light text-xl">Star-Hopping</span>
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="偏好设置"
          >
            <Sliders className="w-4 h-4" />
            设置
          </button>
          <button
            onClick={handleExport}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all"
            title="导出数据"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all"
            title="导入数据"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>
~~~~~

#### Acts 6: 更新 `TrainingView.tsx` 交互逻辑与底栏设计

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { ArrowLeft, Clock, Target, CheckCircle2, XCircle, ChevronRight } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion } from '../utils/geometry';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, SessionData } from '../utils/db';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialGridStep: number;
  onExit: () => void;
}
~~~~~
~~~~~typescript.new
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { ArrowLeft, Clock, CheckCircle2, XCircle, ChevronRight } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion } from '../utils/geometry';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, SessionData } from '../utils/db';
import { UserSettings } from '../utils/settings';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialGridStep: number;
  settings: UserSettings;
  onExit: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
export function TrainingView({
  mode,
  sessionType,
  initialGridStep,
  onExit,
}: TrainingViewProps) {
  // === 会话状态 ===
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(new AdaptiveEngine(initialGridStep));
~~~~~
~~~~~typescript.new
export function TrainingView({
  mode,
  sessionType,
  initialGridStep,
  settings,
  onExit,
}: TrainingViewProps) {
  // === 会话状态 ===
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(initialGridStep, settings.stepGranularity === 'fine')
  );
  const autoNextTimerRef = useRef<number | null>(null);
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
    // 3. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
    } else {
      // 500ms 后自动进入下一张图
      setTimeout(() => {
        const nextStep = adaptiveEngineRef.current.getCurrentStep();
        setShowAnswer(false);
        setUserAnswer(null);
        setQuestion(generateQuestion(mode, nextStep));
        setQuestionStartTime(Date.now());
      }, 500);
    }
  };

  // === 切题 ===
  const handleNextQuestion = () => {
    if (isFinished) return;

    const nextStep = adaptiveEngineRef.current.getCurrentStep();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextStep));
    setQuestionStartTime(Date.now());
  };
~~~~~
~~~~~typescript.new
    // 3. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
    } else if (settings.autoNext) {
      // 自动翻页延时
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, settings.autoNextDelay);
    }
  };

  // === 切题 ===
  const handleNextQuestion = () => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextStep = adaptiveEngineRef.current.getCurrentStep();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextStep));
    setQuestionStartTime(Date.now());
  };
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
      {/* 底部提示与操作栏 */}
      <div className="w-full max-w-2xl bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          {!showAnswer ? (
            <p className="text-xs font-medium text-gray-500 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500 animate-pulse" />
              观察左图相对几何关系，在右图点击推演出的目标位置
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
                  userAnswer?.hitResult.isHit
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {userAnswer?.hitResult.isHit ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> 准确击中!
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" /> 未击中
                  </>
                )}
              </span>
              <span className="text-xs font-medium text-gray-500">
                像素偏差: <strong className="text-gray-800">{userAnswer?.hitResult.errorDistance} px</strong>
              </span>
            </div>
          )}
        </div>

        {isFinished ? (
          <button
            onClick={handleFinishSession}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-200 transition-all"
          >
            完成测试并退出
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            disabled={!showAnswer}
            className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1 ${
              showAnswer
                ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-200 active:scale-95'
                : 'bg-gray-300 shadow-none cursor-not-allowed opacity-60'
            }`}
          >
            下一题 (Space)
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
~~~~~
~~~~~typescript.new
      {/* 底部操作与简略反馈 */}
      <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-between min-h-[56px]">
        <div>
          {showAnswer && userAnswer && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                  userAnswer.hitResult.isHit
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {userAnswer.hitResult.isHit ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                {userAnswer.hitResult.isHit ? '击中' : '偏差'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {userAnswer.hitResult.errorDistance} px
              </span>
            </div>
          )}
        </div>

        {isFinished ? (
          <button
            onClick={handleFinishSession}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
          >
            完成并退出
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            disabled={!showAnswer}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
              showAnswer
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            下一题
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
~~~~~

#### Acts 7: 在 `App.tsx` 中集成设置管理与弹窗

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
import { useState, useEffect } from 'preact/hooks';
import { TrainingMode } from './types';
import { Dashboard } from './views/Dashboard';
import { TrainingView } from './views/TrainingView';
import { getAllUserProfiles, UserProfileData } from './utils/db';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });
~~~~~
~~~~~typescript.new
import { useState, useEffect } from 'preact/hooks';
import { TrainingMode } from './types';
import { Dashboard } from './views/Dashboard';
import { TrainingView } from './views/TrainingView';
import { SettingsModal } from './components/SettingsModal';
import { getAllUserProfiles, UserProfileData } from './utils/db';
import { UserSettings, loadSettings } from './utils/settings';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentView === 'dashboard' ? (
        <Dashboard
          profiles={profiles}
          onStart={handleStartTraining}
          onRefreshProfiles={refreshProfiles}
        />
      ) : (
        <TrainingView
          mode={activeMode}
          sessionType={sessionType}
          initialGridStep={activeDegreeStep}
          onExit={handleExitTraining}
        />
      )}
    </div>
  );
}
~~~~~
~~~~~typescript.new
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentView === 'dashboard' ? (
        <Dashboard
          profiles={profiles}
          onStart={handleStartTraining}
          onRefreshProfiles={refreshProfiles}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : (
        <TrainingView
          mode={activeMode}
          sessionType={sessionType}
          initialGridStep={activeDegreeStep}
          settings={settings}
          onExit={handleExitTraining}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}
    </div>
  );
}
~~~~~

---

### 下一步建议
1. **启动测试**: 可以通过运行 `npm run dev` 验证界面改动，测试设置对话框中的自动翻页开关、延迟 Slider 以及 1px 细粒度步长是否生效。
2. **状态记录**: 若测试符合要求，后续可在单独的 `[COMMIT]` 计划中提交改动。
