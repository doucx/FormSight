这是一个非常实用且符合用户体验的核心功能。添加夜间模式（Dark Mode）能显著改善暗光下的视觉疲劳问题，并为星空观感带来更高的拟真沉浸感。我将为你生成一个完整的修改计划。

## [WIP] feat: 为寻星练习添加夜间模式 (Dark Mode) 与主题切换功能

### 用户需求
用户需要在应用中添加一个夜间模式（Dark Mode）切换按钮，以便在暗光或夜间练习环境中减少视觉疲劳，提供更舒适的暗色调界面体验。

### 评论
对于“寻星练习 (Star-Hopping)”这类空间几何定位训练应用，夜间模式极具实用价值。真正的观星与天体定位往往在暗光环境下进行，暗色底色（如深蓝/夜空黑 `#0F172A`）配亮色星点不仅能降低屏幕刺眼感，还能增强几何锚点和网格干扰点的视觉对比度，提升视觉体验。

### 目标
1. **Tailwind 配置更新**: 在 `tailwind.config.js` 中启用 `darkMode: 'class'`，支持通过根 HTML 节点的 `dark` class 切换全站样式。
2. **设置状态持久化**: 在 `UserSettings` 接口及 `localStorage` 中新增 `theme: 'light' | 'dark'` 字段。
3. **全局样式响应**: 在 `App.tsx` 中使用 `useEffect` 根据 `settings.theme` 动态给 `document.documentElement` 增删 `.dark` 类。
4. **快捷入口与设置扩展**:
   - 在 `Dashboard` 顶栏工具区添加日间/夜间模式快捷切换按钮（太阳/月亮图标）。
   - 在 `SettingsModal` 中增加“主题选择”设置项。
5. **Canvas 画布适配**:
   - 增强 `StarCanvas` 属性，支持 `theme` 参数。
   - 在夜间模式下，将 Canvas 背景调整为深蓝夜空（`#0F172A`），锚点调为荧光白（`#FFFFFF`），干扰点调为星光灰（`#64748B`），让做答体验更加沉浸。

### 基本原理
通过 Tailwind CSS 的 `class` 策略控制 DOM 的夜间样式类。利用 React/Preact 的 `useEffect` 状态监听将用户主题配置同步至 `<html>` 标签的 `classList`。同时将 `theme` 参数传递给 HTML5 Canvas 绘图流程，实现全站 UI 与 Canvas 渲染层双重主题联动。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/dark-mode #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 配置 Tailwind CSS 启用深色模式 Class 策略

~~~~~act
patch_file
tailwind.config.js
~~~~~
~~~~~javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
~~~~~
~~~~~javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
~~~~~

#### Acts 2: 扩展用户设置类型与默认配置，添加 `theme` 字段

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'auto' | 'manual';

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
~~~~~typescript
export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'auto' | 'manual';
export type ThemeMode = 'light' | 'dark';

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
  theme: ThemeMode; // 主题模式 ('light': 日间, 'dark': 夜间)
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
  theme: 'light',
};
~~~~~

#### Acts 3: 在 `App.tsx` 中建立 DOM 深色类监听与主题切换处理器

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
import { type UserSettings, loadSettings } from './utils/settings';
~~~~~
~~~~~typescript
import { type UserSettings, loadSettings, saveSettings } from './utils/settings';
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 打开弱点分析
~~~~~
~~~~~typescript
  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 响应主题切换，更新根节点的 class
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleToggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updated = { ...settings, theme: newTheme };
    setSettings(updated);
    saveSettings(updated);
  };

  // 打开弱点分析
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
      {currentView === 'dashboard' ? (
        <Dashboard
          profiles={profiles}
          totalTimeMs={totalTimeMs}
          onStart={handleStartTraining}
          onRefreshProfiles={refreshProfiles}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAnalytics={handleOpenAnalytics}
        />
      ) : (
~~~~~
~~~~~typescript
      {currentView === 'dashboard' ? (
        <Dashboard
          profiles={profiles}
          totalTimeMs={totalTimeMs}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onStart={handleStartTraining}
          onRefreshProfiles={refreshProfiles}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAnalytics={handleOpenAnalytics}
        />
      ) : (
~~~~~

#### Acts 4: 适配 `StarCanvas` Canvas 绘图背景与星点夜间配色

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
~~~~~
~~~~~typescript
interface StarCanvasProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (clickPoint: Point, hitResult: HitResult) => void;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  theme = 'light',
}: StarCanvasProps) {
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
  // === 绘图主逻辑 ===
  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const hoverRadius = Math.max(2.5, dotRadius * 1.6);

    // 1. 渲染左侧参考图 (Reference Canvas)
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 绘制锚点 A
        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', dotRadius);

        // 绘制锚点 C (若存在)
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', dotRadius);
        }

        // 绘制真理点 B
        drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', dotRadius);
      }
    }

    // 2. 渲染右侧交互区 (Interactive Canvas)
    const rightCanvas = rightCanvasRef.current;
    if (rightCanvas) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 图层 1: 极坐标/双极透视干扰点阵 (底层)
        const gridPoints = question.distractorPoints;
        for (const p of gridPoints) {
          drawDot(ctx, p.x, p.y, '#888888', dotRadius);
        }

        // 图层 1.5: 鼠标悬停高亮网格点
        if (!disabled && !showAnswer && hoverPoint) {
          drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
        }

        // 图层 2: 锚点 (顶层)
        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', dotRadius);
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', dotRadius);
        }

        // 图层 3: 做答后的视觉反馈 (反馈层)
        if (showAnswer) {
          const { x: bx, y: by } = question.targetB;

          // 绘制真理点 B 实体点
          drawDot(ctx, bx, by, '#000000', dotRadius);

          // 绘制深绿色十字高亮线
          const chSize = 12;
          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx - chSize, by);
          ctx.lineTo(bx + chSize, by);
          ctx.moveTo(bx, by - chSize);
          ctx.lineTo(bx, by + chSize);
          ctx.stroke();

          // 如果回答错或有用户点击坐标，绘制误差连线与点击位置
          if (userAnswer) {
            const { hitResult } = userAnswer;
            const chosenPoint = hitResult.nearestGridPoint;

            if (!hitResult.isHit) {
              // 绘制红色虚线误差指示
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(chosenPoint.x, chosenPoint.y);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.setLineDash([]); // 恢复实线

              // 用户点击位置标记 (红点 - 锚定在网格点中心)
              drawDot(ctx, chosenPoint.x, chosenPoint.y, '#FF0000', dotRadius);
            }
          }
        }
      }
    }
  }, [question, showAnswer, userAnswer, hoverPoint, disabled]);
~~~~~
~~~~~typescript
  // === 绘图主逻辑 ===
  useEffect(() => {
    const isDark = theme === 'dark';
    const bgFill = isDark ? '#0F172A' : '#FFFFFF';
    const anchorColor = isDark ? '#FFFFFF' : '#000000';
    const gridColor = isDark ? '#64748B' : '#888888';
    const hoverColor = isDark ? '#818CF8' : '#4F46E5';
    const highlightCross = isDark ? '#22C55E' : '#00AA00';
    const errorColor = isDark ? '#EF4444' : '#FF0000';

    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const hoverRadius = Math.max(2.5, dotRadius * 1.6);

    // 1. 渲染左侧参考图 (Reference Canvas)
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = bgFill;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 绘制锚点 A
        drawDot(ctx, question.anchorA.x, question.anchorA.y, anchorColor, dotRadius);

        // 绘制锚点 C (若存在)
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, anchorColor, dotRadius);
        }

        // 绘制真理点 B
        drawDot(ctx, question.targetB.x, question.targetB.y, anchorColor, dotRadius);
      }
    }

    // 2. 渲染右侧交互区 (Interactive Canvas)
    const rightCanvas = rightCanvasRef.current;
    if (rightCanvas) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = bgFill;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 图层 1: 极坐标/双极透视干扰点阵 (底层)
        const gridPoints = question.distractorPoints;
        for (const p of gridPoints) {
          drawDot(ctx, p.x, p.y, gridColor, dotRadius);
        }

        // 图层 1.5: 鼠标悬停高亮网格点
        if (!disabled && !showAnswer && hoverPoint) {
          drawDot(ctx, hoverPoint.x, hoverPoint.y, hoverColor, hoverRadius);
        }

        // 图层 2: 锚点 (顶层)
        drawDot(ctx, question.anchorA.x, question.anchorA.y, anchorColor, dotRadius);
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, anchorColor, dotRadius);
        }

        // 图层 3: 做答后的视觉反馈 (反馈层)
        if (showAnswer) {
          const { x: bx, y: by } = question.targetB;

          // 绘制真理点 B 实体点
          drawDot(ctx, bx, by, anchorColor, dotRadius);

          // 绘制深绿色十字高亮线
          const chSize = 12;
          ctx.strokeStyle = highlightCross;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx - chSize, by);
          ctx.lineTo(bx + chSize, by);
          ctx.moveTo(bx, by - chSize);
          ctx.lineTo(bx, by + chSize);
          ctx.stroke();

          // 如果回答错或有用户点击坐标，绘制误差连线与点击位置
          if (userAnswer) {
            const { hitResult } = userAnswer;
            const chosenPoint = hitResult.nearestGridPoint;

            if (!hitResult.isHit) {
              // 绘制红色虚线误差指示
              ctx.strokeStyle = errorColor;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(chosenPoint.x, chosenPoint.y);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.setLineDash([]); // 恢复实线

              // 用户点击位置标记 (红点 - 锚定在网格点中心)
              drawDot(ctx, chosenPoint.x, chosenPoint.y, errorColor, dotRadius);
            }
          }
        }
      }
    }
  }, [question, showAnswer, userAnswer, hoverPoint, disabled, theme]);
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
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
~~~~~typescript
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      {/* 左侧参考 Canvas */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-sm">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 dark:border-slate-700 shadow-inner"
        />
      </div>

      {/* 右侧交互 Canvas */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-sm">
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
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 dark:border-slate-700 shadow-inner transition-all ${
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

#### Acts 5: 在 Dashboard 顶栏增加日间/夜间模式快捷按钮与 Dark Mode UI 适配

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript
import {
  Award,
  BarChart2,
  Clock,
  type Compass,
  Crosshair,
  Download,
  Play,
  RotateCw,
  Sliders,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-preact';
import { useRef } from 'preact/hooks';
import type { TrainingMode } from '../types';
import { type UserProfileData, exportAllData, formatTotalTime, importAllData } from '../utils/db';

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  totalTimeMs: number;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
}
~~~~~
~~~~~typescript
import {
  Award,
  BarChart2,
  Clock,
  type Compass,
  Crosshair,
  Download,
  Moon,
  Play,
  RotateCw,
  Sliders,
  Sun,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-preact';
import { useRef } from 'preact/hooks';
import type { TrainingMode } from '../types';
import { type UserProfileData, exportAllData, formatTotalTime, importAllData } from '../utils/db';
import type { ThemeMode } from '../utils/settings';

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  totalTimeMs: number;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
}
~~~~~

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript
export function Dashboard({
  profiles,
  totalTimeMs,
  onStart,
  onRefreshProfiles,
  onOpenSettings,
  onOpenAnalytics,
}: DashboardProps) {
~~~~~
~~~~~typescript
export function Dashboard({
  profiles,
  totalTimeMs,
  theme = 'light',
  onToggleTheme,
  onStart,
  onRefreshProfiles,
  onOpenSettings,
  onOpenAnalytics,
}: DashboardProps) {
~~~~~

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAnalytics()}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="弱点分析"
          >
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            弱点分析
          </button>
~~~~~
~~~~~typescript
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
              title={theme === 'dark' ? '切换日间模式' : '切换夜间模式'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenAnalytics()}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="弱点分析"
          >
            <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            弱点分析
          </button>
~~~~~

#### Acts 6: 在 `SettingsModal` 中增加“主题模式”配置区块

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
import {
  Crosshair,
  Flame,
  Sliders,
  Target,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import { clearAllData } from '../utils/db';
import { type TargetingMode, type UserSettings, saveSettings } from '../utils/settings';
~~~~~
~~~~~typescript
import {
  Crosshair,
  Flame,
  Moon,
  Sliders,
  Sun,
  Target,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import { clearAllData } from '../utils/db';
import { type TargetingMode, type ThemeMode, type UserSettings, saveSettings } from '../utils/settings';
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
  const handleGridSizeChange = (size: number) => {
    setCurrent((prev) => ({ ...prev, gridSize: size }));
  };
~~~~~
~~~~~typescript
  const handleGridSizeChange = (size: number) => {
    setCurrent((prev) => ({ ...prev, gridSize: size }));
  };

  const handleThemeChange = (theme: ThemeMode) => {
    setCurrent((prev) => ({ ...prev, theme }));
  };
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
        <div className="space-y-5">
          {/* 自动翻页 */}
~~~~~
~~~~~typescript
        <div className="space-y-5">
          {/* 主题选择 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">界面主题模式</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  current.theme === 'light'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                日间明亮模式
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  current.theme === 'dark'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                夜间暗色模式
              </button>
            </div>
          </div>

          {/* 自动翻页 */}
~~~~~

#### Acts 7: 在 `TrainingView` 中将 `theme` 传递给 `StarCanvas`

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
        theme={settings.theme}
      />
~~~~~

### 下一步建议
1. **暗色 UI 全局增强**: 后续可以为各个 Modal (如 `AnalyticsModal` 和 `SessionSummaryModal`) 及图表部分的 Canvas 增加更完整的 `dark:` 适配类，以提供全视角的夜间视觉沉浸体验。
2. **跟随系统（System Preference）**: 可以增加 `auto` 模式，通过 `window.matchMedia('(prefers-color-scheme: dark)')` 自动响应操作系统的深色主题偏好。
