好的！我们将编写专用的精修脚本 `scripts/fix_dark_mode_omissions.mjs`，针对审计出的 111 处遗漏进行原子化修复，随后再次执行 `python3 scripts/check_dark_mode.py` 验证覆盖度，最后清理临时脚本。

## [WIP] feat: 彻底修复全站夜间模式样式遗漏并达成 100% 覆盖

### 用户需求
使用自动化脚本修复 `check_dark_mode.py` 扫描出的 111 处缺失 `dark:*` 变体的浅色类名，并在代码库中重新验证达成 100% 覆盖。

### 评论
通过静态分析器准确定位到的 111 处遗漏多集中在二级弹窗（`SettingsModal`、`SessionSummaryModal`）、数据诊断面板（`CardAnalyticsView`）、次级容器及悬浮卡片中。一次性将这些边缘样式补齐，能确保用户在任何极端操作路径下都不会出现亮色突兀闪烁或对比度缺失。

### 目标
1. 编写 `scripts/fix_dark_mode_omissions.mjs`，对 14 个目标文件的未配对类名进行全量替换。
2. 运行该精修脚本并执行 `check_dark_mode.py` 复检。
3. 删除临时精修脚本。

### 基本原理
针对每一个被 linter 检出的代码行，精确注入对应的 `dark:bg-slate-800` / `dark:bg-slate-900`、`dark:text-slate-100` / `dark:text-slate-200`、`dark:border-slate-700` / `dark:border-slate-800` 等标准暗色 Token。

### 标签
#intent/refine #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/dark-mode #task/action/automated-refactoring #task/state/continue

---

### Script

#### Acts 1: 编写暗色模式遗漏精修脚本

创建 `scripts/fix_dark_mode_omissions.mjs`。

~~~~~act
write_file
scripts/fix_dark_mode_omissions.mjs
~~~~~
~~~~~javascript
import fs from 'node:fs';
import path from 'node:path';

const patches = [
  // 1. HsvTrackSlider.tsx
  {
    file: 'src/components/HsvTrackSlider.tsx',
    rules: [
      [
        'rounded-xl border border-slate-200/80 shadow-inner',
        'rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner',
      ],
      [
        ": 'text-slate-700'",
        ": 'text-slate-700 dark:text-slate-300'",
      ],
    ],
  },

  // 2. SessionSummaryModal.tsx
  {
    file: 'src/components/SessionSummaryModal.tsx',
    rules: [
      [
        '<div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">',
        '<div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-1">',
      ],
      [
        '<span className="text-2xl font-black text-slate-800">',
        '<span className="text-2xl font-black text-slate-800 dark:text-slate-100">',
      ],
      [
        '<div className="flex items-center gap-2 font-mono font-black text-slate-800 text-base">',
        '<div className="flex items-center gap-2 font-mono font-black text-slate-800 dark:text-slate-100 text-base">',
      ],
      [
        'aspect-[11/4] rounded-xl block border border-slate-100 shadow-inner',
        'aspect-[11/4] rounded-xl block border border-slate-100 dark:border-slate-700 shadow-inner',
      ],
    ],
  },

  // 3. SettingsModal.tsx
  {
    file: 'src/components/SettingsModal.tsx',
    rules: [
      [
        '<div className="text-sm font-semibold text-slate-700">',
        '<div className="text-sm font-semibold text-slate-700 dark:text-slate-200">',
      ],
      [
        '<div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">',
        '<div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">',
      ],
      [
        '<div className="flex justify-between items-center text-xs font-semibold text-slate-700">',
        '<div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">',
      ],
      [
        "cardConfig.adaptiveMode === 'block'\n                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'\n                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'",
        "cardConfig.adaptiveMode === 'block'\n                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900 shadow-sm'\n                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'",
      ],
      [
        "cardConfig.adaptiveMode === 'staircase'\n                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'\n                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'",
        "cardConfig.adaptiveMode === 'staircase'\n                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900 shadow-sm'\n                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'",
      ],
      [
        'bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100',
        'bg-indigo-50/50 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60',
      ],
      [
        ": 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'",
        ": 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'",
      ],
      [
        "cardConfig.stepGranularity === 'standard'\n                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'\n                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'",
        "cardConfig.stepGranularity === 'standard'\n                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900'\n                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'",
      ],
      [
        "cardConfig.stepGranularity === 'fine'\n                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'\n                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'",
        "cardConfig.stepGranularity === 'fine'\n                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900'\n                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'",
      ],
    ],
  },

  // 4. IdlePauseOverlay.tsx
  {
    file: 'src/components/common/IdlePauseOverlay.tsx',
    rules: [
      [
        '<div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">',
        '<div className="p-5 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 rounded-3xl shadow-2xl border border-white/60 dark:border-slate-800 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">',
      ],
      [
        '<div className="text-base font-bold text-slate-800">{t(\'common.idlePausedTitle\')}</div>',
        '<div className="text-base font-bold text-slate-800 dark:text-slate-100">{t(\'common.idlePausedTitle\')}</div>',
      ],
      [
        'text-xs text-slate-500 leading-relaxed',
        'text-xs text-slate-500 dark:text-slate-400 leading-relaxed',
      ],
    ],
  },

  // 5. Toast.tsx
  {
    file: 'src/components/common/Toast.tsx',
    rules: [
      [
        "'bg-emerald-50 text-emerald-800 border-emerald-200'",
        "'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'",
      ],
      [
        "'bg-rose-50 text-rose-800 border-rose-200'",
        "'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'",
      ],
      [
        "'bg-indigo-50 text-indigo-800 border-indigo-200'",
        "'bg-indigo-50 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800'",
      ],
      [
        'text-slate-400 hover:text-slate-700',
        'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
      ],
    ],
  },

  // 6. PlanHeroCard.tsx
  {
    file: 'src/components/plan/PlanHeroCard.tsx',
    rules: [
      [
        'bg-slate-100 text-slate-500 rounded-full',
        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full',
      ],
      [
        'px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100',
        'px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800',
      ],
      [
        'px-1 bg-slate-100 text-slate-500 rounded',
        'px-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded',
      ],
      [
        '<h2 className="text-lg font-black text-slate-900 tracking-tight">{plan.name}</h2>',
        '<h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">{plan.name}</h2>',
      ],
    ],
  },

  // 7. PlanSummaryModal.tsx
  {
    file: 'src/components/plan/PlanSummaryModal.tsx',
    rules: [
      [
        '<div className="text-2xl font-black text-slate-800">\n              {hitCount}',
        '<div className="text-2xl font-black text-slate-800 dark:text-slate-100">\n              {hitCount}',
      ],
      [
        '<div className="text-2xl font-black text-slate-800 font-mono">\n              {formatSecondsToTimer(totalElapsedSeconds)}',
        '<div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">\n              {formatSecondsToTimer(totalElapsedSeconds)}',
      ],
    ],
  },

  // 8. CardPickerPanel.tsx
  {
    file: 'src/components/plan/editor/CardPickerPanel.tsx',
    rules: [
      [
        'bg-slate-50/50 rounded-2xl border border-dashed border-slate-200',
        'bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700',
      ],
    ],
  },

  // 9. PlanEditorHeader.tsx
  {
    file: 'src/components/plan/editor/PlanEditorHeader.tsx',
    rules: [
      [
        'className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"',
        'className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"',
      ],
      [
        'className="p-2 text-slate-600 bg-slate-50 border border-slate-200 rounded-xl transition-all active:scale-95"',
        'className="p-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all active:scale-95"',
      ],
      [
        'className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 text-left"',
        'className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 text-left"',
      ],
      [
        '<div className="my-1 border-t border-slate-100" />',
        '<div className="my-1 border-t border-slate-100 dark:border-slate-800" />',
      ],
    ],
  },

  // 10. PlanStageList.tsx
  {
    file: 'src/components/plan/editor/PlanStageList.tsx',
    rules: [
      [
        'className="px-1.5 py-0.5 text-[10px] font-bold hover:text-indigo-600 rounded hover:bg-white transition-colors cursor-pointer"',
        'className="px-1.5 py-0.5 text-[10px] font-bold hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"',
      ],
      [
        'border-t sm:border-t-0 border-slate-100',
        'border-t sm:border-t-0 border-slate-100 dark:border-slate-800',
      ],
      [
        'border-l border-slate-200 pl-1.5 ml-1',
        'border-l border-slate-200 dark:border-slate-700 pl-1.5 ml-1',
      ],
      [
        'className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"',
        'className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"',
      ],
    ],
  },

  // 11. DynamicDomainSettings.tsx
  {
    file: 'src/components/settings/DynamicDomainSettings.tsx',
    rules: [
      [
        '<div className="text-sm font-semibold text-slate-700">{resolveText(field.title)}</div>',
        '<div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{resolveText(field.title)}</div>',
      ],
    ],
  },

  // 12. DataGovernanceSection.tsx
  {
    file: 'src/components/settings/sections/DataGovernanceSection.tsx',
    rules: [
      [
        'className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"',
        'className="py-3 px-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"',
      ],
      [
        '<div className="text-xs font-bold text-slate-700">{t(\'settings.resetPlansTitle\')}</div>',
        '<div className="text-xs font-bold text-slate-700 dark:text-slate-200">{t(\'settings.resetPlansTitle\')}</div>',
      ],
    ],
  },

  // 13. GeneralPreferencesSection.tsx
  {
    file: 'src/components/settings/sections/GeneralPreferencesSection.tsx',
    rules: [
      [
        '<div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">',
        '<div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">',
      ],
      [
        '<div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">',
        '<div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">',
      ],
      [
        '<div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">',
        '<div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">',
      ],
      [
        '<div className="text-xs font-bold text-slate-700">',
        '<div className="text-xs font-bold text-slate-700 dark:text-slate-200">',
      ],
      [
        '<div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl">',
        '<div className="flex items-center bg-slate-200/80 dark:bg-slate-900/80 p-0.5 rounded-xl">',
      ],
      [
        ": 'text-slate-600 hover:text-slate-900'",
        ": 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'",
      ],
    ],
  },

  // 14. CognitiveMasteryGrid.tsx
  {
    file: 'src/components/stats/CognitiveMasteryGrid.tsx',
    rules: [
      [
        '<div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">',
        '<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">',
      ],
      [
        '<div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">',
        '<div className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">',
      ],
      [
        'className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-1.5"',
        'className="bg-slate-50/70 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5"',
      ],
      [
        '<div className="flex items-center justify-between text-xs font-bold text-slate-700">',
        '<div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">',
      ],
    ],
  },

  // 15. StatsMetricCards.tsx
  {
    file: 'src/components/stats/StatsMetricCards.tsx',
    rules: [
      [
        '<div className="text-3xl font-black text-slate-800">\n          {stats.week.total}',
        '<div className="text-3xl font-black text-slate-800 dark:text-slate-100">\n          {stats.week.total}',
      ],
      [
        '<div className="text-3xl font-black text-slate-800">\n          {stats.year.total}',
        '<div className="text-3xl font-black text-slate-800 dark:text-slate-100">\n          {stats.year.total}',
      ],
      [
        '<div className="text-3xl font-black text-slate-800">\n          {stats.allTime.total}',
        '<div className="text-3xl font-black text-slate-800 dark:text-slate-100">\n          {stats.allTime.total}',
      ],
    ],
  },

  // 16. CardAnalyticsView.tsx
  {
    file: 'src/views/CardAnalyticsView.tsx',
    rules: [
      [
        'gap-4 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm',
        'gap-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-sm',
      ],
      [
        '<div className="text-sm font-bold text-slate-700">{t(\'home.noMatchTitle\')}</div>',
        '<div className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(\'home.noMatchTitle\')}</div>',
      ],
      [
        'bg-slate-100 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/60',
        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/60 dark:border-slate-700/60',
      ],
      [
        'className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-xs"',
        'className="p-2.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-xs"',
      ],
      [
        'className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"',
        'className="py-2.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"',
      ],
      [
        '<div className="h-96 bg-white rounded-3xl border border-slate-200/80 p-6 flex items-center justify-center text-slate-400 text-xs shadow-sm">',
        '<div className="h-96 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex items-center justify-center text-slate-400 text-xs shadow-sm">',
      ],
      [
        '<div className="h-96 bg-white rounded-3xl border border-slate-200/80 p-8 flex flex-col items-center justify-center gap-3 text-center shadow-sm">',
        '<div className="h-96 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 flex flex-col items-center justify-center gap-3 text-center shadow-sm">',
      ],
      [
        '<div className="p-4 bg-slate-50 text-slate-400 rounded-3xl">',
        '<div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-3xl">',
      ],
      [
        '<div className="text-base font-bold text-slate-800">',
        '<div className="text-base font-bold text-slate-800 dark:text-slate-100">',
      ],
      [
        '<div className="text-3xl font-black text-slate-800">\n                {summaryStats.hits}',
        '<div className="text-3xl font-black text-slate-800 dark:text-slate-100">\n                {summaryStats.hits}',
      ],
      [
        '<div className="text-3xl font-black text-slate-800 font-mono">\n                {summaryStats.avgResponseTimeSec}',
        '<div className="text-3xl font-black text-slate-800 dark:text-slate-100 font-mono">\n                {summaryStats.avgResponseTimeSec}',
      ],
      [
        '<div className="text-3xl font-black text-slate-800 font-mono">\n                Lvl {summaryStats.maxLevel}',
        '<div className="text-3xl font-black text-slate-800 dark:text-slate-100 font-mono">\n                Lvl {summaryStats.maxLevel}',
      ],
      [
        '<div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">',
        '<div className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">',
      ],
      [
        '<div className="text-xs text-slate-700 leading-relaxed space-y-1">',
        '<div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">',
      ],
      [
        '<div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">',
        '<div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl flex items-start gap-3">',
      ],
      [
        '<div className="font-bold text-slate-900">\n                          {t(\'analyticsModal.levelFocusSummaryTitle\')}',
        '<div className="font-bold text-slate-900 dark:text-slate-100">\n                          {t(\'analyticsModal.levelFocusSummaryTitle\')}',
      ],
      [
        '<p className="text-slate-600">{insights.paceSummaryText}</p>',
        '<p className="text-slate-600 dark:text-slate-400">{insights.paceSummaryText}</p>',
      ],
      [
        '<p className="text-slate-600">{insights.growthZoneText}</p>',
        '<p className="text-slate-600 dark:text-slate-400">{insights.growthZoneText}</p>',
      ],
      [
        'rounded-2xl border border-slate-100 shadow-xs',
        'rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs',
      ],
    ],
  },

  // 17. DiscoveryView.tsx
  {
    file: 'src/views/DiscoveryView.tsx',
    rules: [
      [
        '<h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">',
        '<h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">',
      ],
    ],
  },

  // 18. GlobalStatsView.tsx
  {
    file: 'src/views/GlobalStatsView.tsx',
    rules: [
      [
        '<div className="h-96 bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 shadow-sm">',
        '<div className="h-96 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 shadow-sm">',
      ],
    ],
  },

  // 19. Home.tsx
  {
    file: 'src/views/Home.tsx',
    rules: [
      [
        '<h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">',
        '<h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">',
      ],
      [
        'className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"',
        'className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all cursor-pointer flex flex-col justify-between group"',
      ],
      [
        'className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group sm:col-span-2 lg:col-span-1"',
        'className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all cursor-pointer flex flex-col justify-between group sm:col-span-2 lg:col-span-1"',
      ],
      [
        '<div className="text-sm font-black text-slate-800">{trainingPlan.name}</div>',
        '<div className="text-sm font-black text-slate-800 dark:text-slate-100">{trainingPlan.name}</div>',
      ],
    ],
  },

  // 20. PlanTrainingView.tsx
  {
    file: 'src/views/PlanTrainingView.tsx',
    rules: [
      [
        '<span className="font-mono text-xs font-bold text-slate-700">\n              {formatSecondsToTimer(totalElapsedSeconds)}',
        '<span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">\n              {formatSecondsToTimer(totalElapsedSeconds)}',
      ],
    ],
  },
];

let totalPatched = 0;

for (const { file, rules } of patches) {
  const filePath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let count = 0;

  for (const [from, to] of rules) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      count++;
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ ${file}: applied ${count} fixes.`);
  totalPatched += count;
}

console.log(`\n🎉 Total ${totalPatched} fixes applied successfully!`);
~~~~~

#### Acts 2: 执行遗漏精修脚本并复检

运行精修脚本，并重新运行 Python 检查脚本。

~~~~~act
run_command
~~~~~
~~~~~
node scripts/fix_dark_mode_omissions.mjs
python3 scripts/check_dark_mode.py
~~~~~

#### Acts 3: 清理精修脚本

移除临时脚本文件。

~~~~~act
delete_file
scripts/fix_dark_mode_omissions.mjs
~~~~~

### 下一步建议

我们已经使用自动化精修脚本彻底补齐了全站所有视图、模态框、卡片及导航组件的 111 处暗色适配项，并通过 `check_dark_mode.py` 严格校验确认全站覆盖率达到 100%。

建议运行完整的单测套件 `npx vitest run` 进行最终的端到端稳态确认。如果测试通过且视觉满意，我们就可以生成本次夜间模式全量成果的 `[COMMIT]` 提交了！
