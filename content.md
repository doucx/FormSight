经过问题排查，找到了问题的根本原因：

在 `src/index.css` 中，Tailwind v3 样式导入指令误写成了 `@tailwindcss base;`（使用了 Tailwind v4 的 `@tailwindcss` 语法），而 `package.json` 中安装的是 `tailwindcss: ^3.4.1`。
这导致 Tailwind 编译器未能识别与载入基础 CSS 样式库，所有的 Tailwind 工具类（包括 `flex`, `flex-col`, `md:flex-row`, `grid`, `bg-gray-50`, `rounded-*` 等）全面失效。

页面因此退化为浏览器默认无样式的 HTML 堆叠展示，导致：
1. 左图与右图所在的 `<div>` 元素保持默认 `display: block` 行为，呈从上到下排列；
2. 整个主页失去所有网格布局、颜色、内边距和圆角样式，显得像纯 HTML 网页。

同时，项目依赖中已安装 `lucide-preact` 图标库，我们将利用该库全面升级主页 Dashboard 和训练界面的 UI，提升整套系统的精致感与专业度。

下面是修复与 UI 优化的执行计划：

## [WIP] fix(ui): 修复 Tailwind 指令语法并全面优化 UI 界面

### 错误分析

1. **语法误用导致 Tailwind 失效**：`src/index.css` 误用了 `@tailwindcss` 替代 `@tailwind`，导致 Tailwind CSS v3 解释器忽略了全局 base/components/utilities 规则。
2. **布局退化**：由于 CSS 规则未加载，`StarCanvas` 容器上的 `flex flex-col md:flex-row` 未能转化为 CSS flex 属性，左右 Canvas 容器以标准 `block` 方式从上到下单列排布。
3. **视觉缺失**：主页与卡片组件依赖的 Tailwind 工具类无法生效，页面回退至无样式的 HTML 布局。

### 用户需求

1. 修复左右图被从上到下排列的问题，恢复为从左到右横向并排。
2. 美化主页及整体 UI，摆脱基础 HTML 感，建立现代、精细的视觉风格。

### 评论

这是一个非常典型的样式构建层配置错误。修复后，基于 Tailwind 的工具类即可全面恢复。在此基础上结合 `lucide-preact` 图标组件对主页、指标看板和交互栏进行整体升级，能显著提升用户使用体验。

### 目标

1. 修复 `src/index.css` 中的 Tailwind 指令。
2. 优化 `StarCanvas.tsx` 中的响应式布局类与画板容器美化。
3. 重构 `Dashboard.tsx` 和 `TrainingView.tsx`，引入 `lucide-preact` 矢量图标，升级页面卡片、极坐标能力指标图与头部控制栏的视觉呈现。

### 基本原理

修正 CSS 基础指令以开启完整的 Tailwind CSS 编译链路，同时微调 Flex/Grid 布局中的断点（`flex-row` 优先，在大屏/中屏下保持并列）。结合 SVG 图标与层次感强的卡片渐变/阴影，提升应用质感。

### 标签

#intent/fix #intent/tune #flow/ready #priority/high #comp/ui #scope/ux #ai/instruct #task/domain/ui #task/object/layout-and-styling #task/action/bug-fix-and-redesign #task/state/begin

---

### Script

#### Acts 1: 修复 `index.css` 中的 Tailwind 语法指令

~~~~~act
patch_file
src/index.css
~~~~~
~~~~~css
@tailwindcss base;
@tailwindcss components;
@tailwindcss utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  user-select: none;
}
~~~~~
~~~~~css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  user-select: none;
}
~~~~~

#### Acts 2: 调整 `StarCanvas.tsx` 布局与左右图排布结构

优化左图和右图的响应式 Flex 容器，确保在适屏状态下呈从左到右并排显示，同时增加画板卡片的精致边框和阴影。

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~tsx
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      {/* 左侧参考 Canvas */}
      <div className="flex flex-col items-center">
        <span className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
          左图: 观察参考
        </span>
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[420px] aspect-square rounded-lg border border-gray-200 bg-white shadow-sm"
        />
      </div>

      {/* 右侧交互 Canvas */}
      <div className="flex flex-col items-center">
        <span className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
          右图: 点击答题区
        </span>
        <canvas
          ref={rightCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleRightCanvasClick}
          className={`w-full max-w-[420px] aspect-square rounded-lg border border-gray-200 bg-white shadow-sm transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair hover:border-gray-400'
          }`}
        />
      </div>
    </div>
  );
~~~~~
~~~~~tsx
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

#### Acts 3: 使用 Lucide 图标与全新高颜值卡片重构 `Dashboard.tsx`

引入 `lucide-preact` 矢量图标，增加视觉对比度、圆角阴影和渐变悬停效果。

~~~~~act
write_file
src/views/Dashboard.tsx
~~~~~
~~~~~tsx
import { h } from 'preact';
import { useRef } from 'preact/hooks';
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

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  subtitle: string;
  desc: string;
  icon: typeof Compass;
  badgeColor: string;
}> = [
  {
    id: 'single',
    title: '单锚点模式',
    subtitle: 'Single Anchor',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    icon: Target,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'double_h',
    title: '水平双锚点',
    subtitle: 'Double Horiz',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    icon: Crosshair,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'double_r',
    title: '旋转双锚点',
    subtitle: 'Double Rotated',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    icon: RotateCw,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

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

      {/* 3 个训练卡片区 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MODES_CONFIG.map((config) => {
          const profile = profiles[config.id];
          const totalCards = profile?.totalTrainedCards || 0;
          const accuracy =
            totalCards > 0
              ? Math.round((profile!.totalHits / totalCards) * 100)
              : 0;
          const currentDegree = profile?.currentDegreeStep || 20;
          const IconComponent = config.icon;

          return (
            <div
              key={config.id}
              className="group bg-white border border-gray-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${config.badgeColor}`}
                  >
                    {config.subtitle}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {config.title}
                </h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">
                  {config.desc}
                </p>

                {/* 核心指标统计 */}
                <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                      <TrendingUp className="w-3 h-3 text-indigo-500" />
                      能力度数
                    </div>
                    <div className="text-xl font-black text-slate-800">
                      {currentDegree}{' '}
                      <span className="text-xs font-normal text-slate-500">px</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                      <Award className="w-3 h-3 text-emerald-500" />
                      正确率
                    </div>
                    <div className="text-xl font-black text-slate-800">
                      {accuracy}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 动作按钮区 */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => onStart(config.id, 'training')}
                  className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  开始自适应训练
                </button>
                <button
                  onClick={() => onStart(config.id, 'benchmark')}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5 text-gray-500" />
                  20 题基准测试
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 优化 `TrainingView.tsx` 页面视觉样式

升级训练顶栏指标栏、控制按钮与作答反馈区的 UI 结构与颜色层级。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~tsx
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion } from '../utils/geometry';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, SessionData } from '../utils/db';
~~~~~
~~~~~tsx
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { ArrowLeft, Clock, Target, CheckCircle2, XCircle, ChevronRight } from 'lucide-preact';
import { TrainingMode, QuestionData, Point, HitResult, TrialRecord } from '../types';
import { StarCanvas } from '../components/StarCanvas';
import { generateQuestion } from '../utils/geometry';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveTrialRecord, saveSession, SessionData } from '../utils/db';
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~tsx
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏控制面板 */}
      <header className="w-full bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleFinishSession}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ← 退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>

        {/* 核心监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">
              已练张数
            </span>
            <span className="font-extrabold text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">
              本次正确率
            </span>
            <span className="font-extrabold text-gray-800">
              {currentAccuracy}%
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">
              当前网格步长
            </span>
            <span className="font-extrabold text-indigo-600">
              {question.gridStep} px
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">
              用时
            </span>
            <span className="font-mono font-bold text-gray-800">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>
      </header>

      {/* 核心双 Canvas 交互区 */}
      <StarCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />

      {/* 底部提示与操作栏 */}
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          {!showAnswer ? (
            <p className="text-xs text-gray-500 font-medium">
              👉 请观察左图，并在右图点击对应位置的目标点
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold px-2 py-0.5 rounded ${
                  userAnswer?.hitResult.isHit
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {userAnswer?.hitResult.isHit ? '✅ 击中!' : '❌ 未击中'}
              </span>
              <span className="text-xs text-gray-500">
                偏差距离: {userAnswer?.hitResult.errorDistance} px
              </span>
            </div>
          )}
        </div>

        {isFinished ? (
          <button
            onClick={handleFinishSession}
            className="px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors"
          >
            完成测试并退出
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            disabled={!showAnswer}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-colors ${
              showAnswer
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            下一题 (Space)
          </button>
        )}
      </div>
    </div>
  );
~~~~~
~~~~~tsx
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏控制面板 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleFinishSession}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>

        {/* 核心监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              本次正确率
            </span>
            <span className="font-black text-gray-800">
              {currentAccuracy}%
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前网格步长
            </span>
            <span className="font-black text-indigo-600">
              {question.gridStep} px
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>
      </header>

      {/* 核心双 Canvas 交互区 */}
      <StarCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />

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
    </div>
  );
~~~~~

### 下一步建议

1. 执行上述变更后，启动本地 Vite 调试（`npm run dev`），验证 Tailwind CSS 是否已正常编译载入。
2. 确认在桌面宽度下左右 Canvas 保持水平排列，且交互悬停高亮与点击反馈无误。
