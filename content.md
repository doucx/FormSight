好的，我将为你生成一个计划，将计划训练流顶部的全局进度栏从深色背景重构为与系统其他头部组件完全统一的明亮卡片风格（Light Modern UI）。

## [WIP] style: 统一计划训练流顶部进度栏的设计风格与配色

### 用户需求
将计划训练界面顶部的流水线全局进度栏背景颜色与组件风格调整为与系统内其他组件（如 TrainingShell / DashboardShell）一致的明亮卡片设计。

### 评论
原深色 `indigo-950` 背景与下方训练区白底卡片风格产生了视觉割裂。将其统一为 `bg-white border-slate-200/80 shadow-sm` 的卡片风格，能保持全系统设计语言的高度一致与清爽感。

### 目标
重构 `src/views/PlanTrainingView.tsx` 中的全局阶段进度条样式，采用白底卡片容器、靛蓝浅底阶段标签与灰色系轻量操作按钮。

### 基本原理
对齐 `TrainingShell` 与 `DashboardShell` 的视觉基调：外层采用 `bg-white border border-slate-200/80 rounded-2xl shadow-sm`，文字采用深灰色 `text-slate-800`，阶段徽章采用 `bg-indigo-50 text-indigo-700 border-indigo-100`，跳过按钮采用 `bg-slate-50 hover:bg-indigo-50 border-slate-200/80`，实现呼吸感一致的视觉流。

### 标签
#intent/tune #flow/ready #priority/low #comp/ui #scope/ux #ai/instruct #task/domain/ui #task/object/plan-progress-bar #task/action/style #task/state/continue

---

### Script

#### Acts 1: 重构 `PlanTrainingView.tsx` 顶部栏配色与样式

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript.old
      {/* 顶部流水线全局进度与操作栏 */}
      <div className="max-w-5xl mx-auto mb-4 bg-indigo-950 text-white px-5 py-3 rounded-2xl shadow-md flex items-center justify-between border border-indigo-800/60">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black bg-indigo-600 px-2.5 py-1 rounded-xl">
            阶段 {currentStepIndex + 1} / {validItems.length}
          </span>
          <span className="text-xs font-bold text-indigo-100">{plan.name}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-indigo-200 font-mono font-bold hidden sm:block">
            目标: {currentStep.targetTrials} 题
          </div>
          <button
            type="button"
            onClick={handleSkipCurrentStage}
            className="px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:text-white bg-indigo-900 hover:bg-indigo-800 border border-indigo-700/80 rounded-xl transition-all flex items-center gap-1"
            title="跳过当前阶段进入下一阶段"
          >
            <FastForward className="w-3.5 h-3.5" />
            跳过此阶段
          </button>
        </div>
      </div>
~~~~~
~~~~~typescript.new
      {/* 顶部流水线全局进度与操作栏 */}
      <div className="max-w-5xl mx-auto mb-4 bg-white border border-slate-200/80 px-4 sm:px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-xl">
            阶段 {currentStepIndex + 1} / {validItems.length}
          </span>
          <span className="text-xs font-bold text-slate-800 tracking-tight">{plan.name}</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-xs text-slate-400 font-mono font-semibold hidden sm:block">
            本阶段目标: <strong className="text-slate-700">{currentStep.targetTrials}</strong> 题
          </div>
          <button
            type="button"
            onClick={handleSkipCurrentStage}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="跳过当前阶段进入下一阶段"
          >
            <FastForward className="w-3.5 h-3.5 text-indigo-500" />
            跳过此阶段
          </button>
        </div>
      </div>
~~~~~

### 下一步建议
- **视觉审查**：启动计划训练流，检查顶部阶段栏与紧随其后的 `TrainingShell` 状态栏在边框、间距、圆角与阴影层级上是否完美融为一体。
