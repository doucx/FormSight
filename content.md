我们将完善 `src/locales/zh-CN.json` 与 `src/locales/en-US.json` 中的卡片专用词条与时间单位，并重构 `src/components/common/ModeCard.tsx`，将内部时间格式化函数与所有界面文案接入 `useTranslation()` 动态查表。

## [WIP] refactor: 重构 ModeCard 组件与时间格式化以接入多语言词典

### 用户需求
在全局语言包（`zh-CN.json` / `en-US.json`）中补充卡片交互（自适应训练按钮、基准测试按钮、偏好设置提示词、弱点分析提示词、实验性角标）与时间单位；重构 `ModeCard.tsx` 组件，使用 `useTranslation()` 动态解析全部文案与今日练习时间。

### 评论
卡片（`ModeCard`）是主页发现大盘中最高频展现的视觉单元。将其内部的按钮、指标标签、Tooltip 及动态时间格式化彻底查表化，可确保主页在语言切换时达到 100% 完整的双语沉浸体验。

### 目标
1. **完善语言包**：在 `zh-CN.json` 与 `en-US.json` 的 `common` 与 `card` 命名空间中补充时间单位、刷题单位、Tooltip 及卡片按钮文案。
2. **重构 ModeCard 组件**：引入 `useTranslation()`，实现支持多语言本地化的时间格式化逻辑，替换所有硬编码中文。

### 基本原理
1. 在语言包中提供 `common.sec`、`common.min`、`common.minFull`、`common.trials`，使 `formatTodayTime` 可以根据当前 `t` 函数格式化出符合中英文习惯的用时字符串（如中文 `1分30秒` / 英文 `1m 30s`）。
2. 将卡片上的“实验性”、“能力层阶”、“正确率”、“开始自适应训练”、“20 题基准测试”以及 Tooltip 文本均替换为 `t()` 查表。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/mode-card-i18n #task/action/implementation #task/state/continue #task/status/active

---

### Script

#### Acts 1: 补充语言包中的卡片词条与时间单位

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "level": "能力层阶",
    "clear": "清空",
    "empty": "未设置",
    "official": "官方",
    "custom": "自定义"
  },
  "shell": {
~~~~~
~~~~~json.new
    "level": "能力层阶",
    "clear": "清空",
    "empty": "未设置",
    "official": "官方",
    "custom": "自定义",
    "sec": "秒",
    "min": "分",
    "minFull": "分钟",
    "trialsUnit": "题"
  },
  "card": {
    "todayTrials": "今日刷题",
    "analyticsTooltip": "{{title}} 弱点分析",
    "settingsTooltip": "{{title}} 偏好设置",
    "experimentalBadge": "实验性",
    "skillLevel": "能力层阶",
    "levelBadge": "Level {{level}}",
    "accuracy": "正确率",
    "startAdaptive": "开始自适应训练",
    "startBenchmark": "20 题基准测试"
  },
  "shell": {
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "level": "Skill Level",
    "clear": "Clear",
    "empty": "Not set",
    "official": "Official",
    "custom": "Custom"
  },
  "shell": {
~~~~~
~~~~~json.new
    "level": "Skill Level",
    "clear": "Clear",
    "empty": "Not set",
    "official": "Official",
    "custom": "Custom",
    "sec": "s",
    "min": "m ",
    "minFull": "min",
    "trialsUnit": "trials"
  },
  "card": {
    "todayTrials": "Today",
    "analyticsTooltip": "{{title}} Weakness Analytics",
    "settingsTooltip": "{{title}} Preferences",
    "experimentalBadge": "Experimental",
    "skillLevel": "Skill Level",
    "levelBadge": "Level {{level}}",
    "accuracy": "Accuracy",
    "startAdaptive": "Adaptive Training",
    "startBenchmark": "20-Trial Benchmark"
  },
  "shell": {
~~~~~

#### Acts 2: 重构 `ModeCard.tsx` 支持多语言

~~~~~act
write_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~tsx
import { Award, BarChart2, FlaskConical, Play, Sliders, Target, TrendingUp } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useTranslation } from '../../core/i18n';

export function formatTodayTimeWithT(ms: number, t: (key: string) => string): string {
  if (ms <= 0) return `0${t('common.sec')}`;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}${t('common.sec')}`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0
    ? `${min}${t('common.min')}${sec}${t('common.sec')}`
    : `${min}${t('common.minFull')}`;
}

interface ModeCardProps {
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  accuracy: number;
  hasAnalytics?: boolean;
  isExperimental?: boolean;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  accuracy,
  hasAnalytics = false,
  isExperimental = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
  const { t } = useTranslation();

  return (
    <div className="group bg-white border border-gray-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <Icon className="w-6 h-6" />
            </div>

            {/* 卡片级专属操作快捷入口 */}
            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
              {hasAnalytics && onOpenAnalytics && (
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                  title={t('card.analyticsTooltip', { title })}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                title={t('card.settingsTooltip', { title })}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-semibold text-slate-400">{t('card.todayTrials')}</div>
            <div className="text-xs font-bold text-slate-500 font-mono">
              {todayCount} {t('common.trialsUnit')}
              {todayCount > 0 && todayTimeMs > 0 && (
                <span className="text-[11px] text-slate-400 font-normal ml-1">
                  ({formatTodayTimeWithT(todayTimeMs, t)})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          {isExperimental && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
              <FlaskConical className="w-3 h-3 text-amber-600" />
              {t('card.experimentalBadge')}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">{desc}</p>

        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
              <TrendingUp className="w-3 h-3 text-indigo-500" />
              {t('card.skillLevel')}
            </div>
            <div className="text-xl font-black text-slate-800">
              {t('card.levelBadge', { level: currentLevel })}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
              <Award className="w-3 h-3 text-emerald-500" />
              {t('card.accuracy')}
            </div>
            <div className="text-xl font-black text-slate-800">{accuracy}%</div>
          </div>
        </div>
      </div>

      {/* 动作按钮区 */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onStartTraining}
          className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {t('card.startAdaptive')}
        </button>
        <button
          type="button"
          onClick={onStartBenchmark}
          className="w-full py-2.5 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Target className="w-3.5 h-3.5 text-gray-500" />
          {t('card.startBenchmark')}
        </button>
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
1. **全局冒烟测试**：运行 `npm test` 确认所有测试通过。
2. **在浏览器中验证**：打开全局设置切换为 English，检查主页卡片的所有角标、提示、按钮与今日时间是否均优雅切换为英文。
